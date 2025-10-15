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
                'department_id' => 'nullable|exists:departments,department_id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
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
                throw new \Exception('Role không tồn tại với level này');
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
            $this->sendInvitationEmail($user, $cognitoResult['TemporaryPassword']);

            Log::info('User invited successfully', [
                'email' => $request->email,
                'role' => $request->role_name,
                'cognito_user_id' => $cognitoResult['User']['Username']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Email mời đã được gửi thành công đến ' . $request->email
            ]);

        } catch (AwsException $e) {
            Log::error('Cognito error when inviting user', [
                'error_code' => $e->getAwsErrorCode(),
                'error_message' => $e->getAwsErrorMessage(),
                'email' => $request->email ?? 'unknown'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo tài khoản trong hệ thống'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error inviting user', [
                'error' => $e->getMessage(),
                'email' => $request->email ?? 'unknown'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
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

            // 3. Lưu temporary password vào result để sử dụng trong email
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