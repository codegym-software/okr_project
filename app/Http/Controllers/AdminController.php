<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Models\User;
use App\Models\Role;
use App\Models\Department;
use Aws\CognitoIdentityProvider\CognitoIdentityProviderClient;
use Aws\Exception\AwsException;

class AdminController extends Controller
{
    protected $cognitoClient;

    public function __construct()
    {
        // Khởi tạo Cognito client
        $this->cognitoClient = new CognitoIdentityProviderClient([
            'region' => env('AWS_DEFAULT_REGION', 'ap-southeast-2'),
            'version' => 'latest',
            'credentials' => [
                'key' => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
            ],
        ]);
    }

    /**
     * Mời người dùng mới vào hệ thống
     */
    public function inviteUser(Request $request)
    {
        try {
            // 1. Validate input
            $validator = Validator::make($request->all(), [
                'email' => 'required|email|unique:users,email',
                'full_name' => 'required|string|max:255',
                'role_name' => 'required|in:member,manager',
                'level' => 'required|in:unit,team',
                'department_id' => 'required|exists:departments,department_id'
            ]);

            if ($validator->fails()) {
                $errors = $validator->errors();
                $errorMessages = [];
                
                // Tạo thông báo lỗi rõ ràng hơn
                if ($errors->has('email')) {
                    // Kiểm tra rule nào fail bằng cách xem failed rules
                    $failedRules = $validator->failed();
                    $emailError = $errors->first('email');
                    
                    // Kiểm tra xem rule 'unique' có fail không
                    if (isset($failedRules['email']['Unique'])) {
                        $errorMessages['email'] = ['Email này đã được sử dụng trong hệ thống. Vui lòng sử dụng email khác.'];
                    }
                    // Kiểm tra xem rule 'email' (format) có fail không
                    elseif (isset($failedRules['email']['Email'])) {
                        $errorMessages['email'] = ['Email không đúng định dạng. Vui lòng kiểm tra lại.'];
                    }
                    // Kiểm tra required
                    elseif (isset($failedRules['email']['Required'])) {
                        $errorMessages['email'] = ['Email là bắt buộc.'];
                    }
                    // Fallback: dùng message mặc định
                    else {
                        $errorMessages['email'] = [$emailError];
                    }
                }
                
                if ($errors->has('full_name')) {
                    $errorMessages['full_name'] = ['Họ và tên là bắt buộc và không được vượt quá 255 ký tự.'];
                }
                
                if ($errors->has('role_name')) {
                    $errorMessages['role_name'] = ['Vai trò không hợp lệ. Vui lòng chọn Thành viên hoặc Quản lý.'];
                }
                
                if ($errors->has('level')) {
                    $errorMessages['level'] = ['Cấp độ không hợp lệ. Vui lòng chọn Đơn vị hoặc Nhóm.'];
                }
                
                if ($errors->has('department_id')) {
                    $failedRules = $validator->failed();
                    if (isset($failedRules['department_id']['Required'])) {
                        $errorMessages['department_id'] = ['Phòng ban là bắt buộc. Vui lòng chọn phòng ban.'];
                    } else {
                        $errorMessages['department_id'] = ['Phòng ban không tồn tại. Vui lòng chọn lại.'];
                    }
                }
                
                // Nếu không có error messages tùy chỉnh, dùng mặc định
                if (empty($errorMessages)) {
                    $errorMessages = $errors->toArray();
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng kiểm tra lại thông tin đã nhập',
                    'errors' => $errorMessages
                ], 422);
            }

            // 2. Tạo user trong Cognito User Pool
            $cognitoResult = $this->createCognitoUser(
                $request->email,
                $request->full_name,
                $request->role_name
            );

            // 3. Lấy role_id từ role_name và level
            $role = Role::where('role_name', $request->role_name)
                        ->where('level', $request->level)
                        ->first();
            if (!$role) {
                throw new \Exception('Vai trò "' . $request->role_name . '" không tồn tại với cấp độ "' . $request->level . '". Vui lòng kiểm tra lại.');
            }

            // 4. Lưu vào database với is_invited = true
            $user = User::create([
                'email' => $request->email,
                'full_name' => $request->full_name,
                'role_id' => $role->role_id,
                'department_id' => $request->department_id,
                'status' => 'active',
                'is_invited' => true,
                'invited_at' => now(),
                'sub' => $cognitoResult['User']['Username'] // Cognito user ID
            ]);

            // 5. Gửi email mời
            try {
                $this->sendInvitationEmail($user, $cognitoResult['TemporaryPassword']);
            } catch (\Exception $emailError) {
                // Nếu gửi email thất bại, log nhưng không fail toàn bộ quá trình
                // Vì user đã được tạo thành công trong Cognito và database
                Log::error('Failed to send invitation email but user was created', [
                    'email' => $user->email,
                    'error' => $emailError->getMessage(),
                    'user_id' => $user->user_id
                ]);
                
                // Vẫn trả về success nhưng với thông báo cảnh báo
                return response()->json([
                    'success' => true,
                    'message' => 'Tài khoản đã được tạo thành công nhưng không thể gửi email mời. Vui lòng liên hệ quản trị viên để gửi lại email.',
                    'warning' => true
                ]);
            }

            Log::info('User invited successfully', [
                'email' => $request->email,
                'role' => $request->role_name,
                'level' => $request->level,
                'cognito_user_id' => $cognitoResult['User']['Username']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Email mời đã được gửi thành công đến ' . $request->email . '.'
            ]);

        } catch (AwsException $e) {
            $errorCode = $e->getAwsErrorCode();
            $errorMessage = $e->getAwsErrorMessage();
            
            Log::error('Cognito error when inviting user', [
                'error_code' => $errorCode,
                'error_message' => $errorMessage,
                'email' => $request->email ?? 'unknown'
            ]);

            // Xử lý các lỗi Cognito cụ thể
            $userFriendlyMessage = 'Có lỗi xảy ra khi tạo tài khoản trong hệ thống';
            
            if ($errorCode === 'UsernameExistsException') {
                $userFriendlyMessage = 'Email này đã tồn tại trong hệ thống xác thực. Vui lòng sử dụng email khác.';
            } elseif ($errorCode === 'InvalidParameterException') {
                $userFriendlyMessage = 'Thông tin người dùng không hợp lệ. Vui lòng kiểm tra lại email và tên.';
            } elseif ($errorCode === 'LimitExceededException') {
                $userFriendlyMessage = 'Đã vượt quá giới hạn tạo tài khoản. Vui lòng thử lại sau vài phút.';
            } elseif (str_contains($errorMessage, 'email')) {
                $userFriendlyMessage = 'Email không hợp lệ hoặc đã được sử dụng. Vui lòng kiểm tra lại.';
            }

            return response()->json([
                'success' => false,
                'message' => $userFriendlyMessage
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error inviting user', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'email' => $request->email ?? 'unknown'
            ]);

            // Xử lý các lỗi cụ thể
            $errorMessage = $e->getMessage();
            $userFriendlyMessage = 'Có lỗi xảy ra khi mời người dùng. Vui lòng thử lại sau.';
            
            if (str_contains($errorMessage, 'Role không tồn tại')) {
                $userFriendlyMessage = $errorMessage;
            } elseif (str_contains($errorMessage, 'email') || str_contains($errorMessage, 'Email')) {
                $userFriendlyMessage = 'Có lỗi xảy ra khi xử lý email. Vui lòng kiểm tra lại thông tin email.';
            } elseif (str_contains($errorMessage, 'Mail') || str_contains($errorMessage, 'mail')) {
                $userFriendlyMessage = 'Không thể gửi email mời. Tài khoản đã được tạo nhưng email chưa được gửi. Vui lòng liên hệ quản trị viên.';
            }

            return response()->json([
                'success' => false,
                'message' => $userFriendlyMessage
            ], 500);
        }
    }

    /**
     * Tạo user trong Cognito User Pool
     */
    private function createCognitoUser($email, $fullName, $roleName)
    {
        try {
            $temporaryPassword = $this->generateTemporaryPassword();
            
            // 1. Tạo user trong Cognito User Pool
            $result = $this->cognitoClient->adminCreateUser([
                'UserPoolId' => env('AWS_COGNITO_USER_POOL_ID'),
                'Username' => $email,
                'UserAttributes' => [
                    ['Name' => 'email', 'Value' => $email],
                    ['Name' => 'name', 'Value' => $fullName],
                    ['Name' => 'email_verified', 'Value' => 'true'],
                ],
                'TemporaryPassword' => $temporaryPassword,
                'MessageAction' => 'SUPPRESS', // Không gửi email tự động từ Cognito
            ]);

            // 2. Assign user to group (role-based) nếu có groups
            try {
                $this->cognitoClient->adminAddUserToGroup([
                    'UserPoolId' => env('AWS_COGNITO_USER_POOL_ID'),
                    'Username' => $email,
                    'GroupName' => 'okr-' . $roleName,
                ]);
            } catch (AwsException $e) {
                // Group có thể chưa tồn tại, log warning nhưng không fail
                Log::warning('Could not add user to group', [
                    'group' => 'okr-' . $roleName,
                    'error' => $e->getMessage()
                ]);
            }

            // 3. Chuyển mật khẩu tạm thời thành mật khẩu chính thức
            //    để user có thể đăng nhập trực tiếp bằng mật khẩu này
            try {
                $this->cognitoClient->adminSetUserPassword([
                    'UserPoolId' => env('AWS_COGNITO_USER_POOL_ID'),
                    'Username' => $email,
                    'Password' => $temporaryPassword,
                    'Permanent' => true,
                ]);
            } catch (AwsException $e) {
                // Nếu không set được mật khẩu permanent, log cảnh báo nhưng vẫn tiếp tục
                Log::warning('Could not set permanent password for invited user', [
                    'email' => $email,
                    'error_code' => $e->getAwsErrorCode(),
                    'error_message' => $e->getAwsErrorMessage(),
                ]);
            }

            // 4. Lưu temporary password vào result để sử dụng trong email
            $result['TemporaryPassword'] = $temporaryPassword;
            
            return $result;

        } catch (AwsException $e) {
            Log::error('Failed to create Cognito user', [
                'email' => $email,
                'error_code' => $e->getAwsErrorCode(),
                'error_message' => $e->getAwsErrorMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Tạo temporary password
     */
    private function generateTemporaryPassword()
    {
        // Tạo password đáp ứng policy của Cognito
        $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $lowercase = 'abcdefghijklmnopqrstuvwxyz';
        $numbers = '0123456789';
        $special = '!@#$%^&*';

        $password = '';
        $password .= $uppercase[rand(0, strlen($uppercase) - 1)];
        $password .= $lowercase[rand(0, strlen($lowercase) - 1)];
        $password .= $numbers[rand(0, strlen($numbers) - 1)];
        $password .= $special[rand(0, strlen($special) - 1)];

        // Thêm 4 ký tự ngẫu nhiên
        $all = $uppercase . $lowercase . $numbers . $special;
        for ($i = 0; $i < 4; $i++) {
            $password .= $all[rand(0, strlen($all) - 1)];
        }

        return str_shuffle($password);
    }

    /**
     * Gửi email mời
     */
    private function sendInvitationEmail($user, $temporaryPassword)
    {
        try {
            $data = [
                'user' => $user,
                'temporaryPassword' => $temporaryPassword,
                'loginUrl' => env('APP_URL') . '/auth/login',
                'appName' => env('APP_NAME', 'OKR System')
            ];

            Mail::send('emails.user-invitation', $data, function ($message) use ($user) {
                $message->to($user->email, $user->full_name)
                        ->subject('Mời tham gia hệ thống ' . env('APP_NAME', 'OKR'));
            });

            Log::info('Invitation email sent', [
                'email' => $user->email,
                'temporary_password' => $temporaryPassword
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to send invitation email', [
                'email' => $user->email,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Lấy danh sách lời mời
     */
    public function getInvitations(Request $request)
    {
        try {
            $invitations = User::where('is_invited', true)
                ->with(['role', 'department'])
                ->orderBy('invited_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $invitations
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get invitations', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'Không thể lấy danh sách lời mời'
            ], 500);
        }
    }
}