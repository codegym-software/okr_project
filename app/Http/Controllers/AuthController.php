<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Session;
use Aws\CognitoIdentityProvider\CognitoIdentityProviderClient;
use Aws\Exception\AwsException;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Rules\StrongPassword;

class AuthController extends Controller
{
    protected $cognitoClient=null;

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

    public function showChangePasswordForm()
    {
        return view('app');
    }

    // Xử lý đổi mật khẩu
    public function changePassword(Request $request)
    {
        // Kiểm tra nếu người dùng đăng nhập bằng OAuth (Google, Facebook, etc.)
        $user = Auth::user();
        if ($user && $user->google_id) {
            Log::info('OAuth user attempted to change password', [
                'user_id' => $user->user_id,
                'email' => $user->email,
                'google_id' => $user->google_id
            ]);
            
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn đang đăng nhập bằng Google. Để đổi mật khẩu, vui lòng truy cập tài khoản Google của bạn.',
                    'oauth_user' => true,
                    'provider' => 'Google'
                ], 400);
            }
            
            return back()->withErrors(['error' => 'Bạn đang đăng nhập bằng Google. Để đổi mật khẩu, vui lòng truy cập tài khoản Google của bạn.'])->withInput();
        }

        // Validate input với rules mạnh mẽ hơn
        $validator = Validator::make($request->all(), [
            'old_password' => [
                'required',
                'string',
                'min:8',
                function ($attribute, $value, $fail) {
                    // Kiểm tra mật khẩu hiện tại không được để trống hoặc chỉ có khoảng trắng
                    if (empty(trim($value))) {
                        $fail('Mật khẩu hiện tại không được để trống.');
                    }
                },
            ],
            'new_password' => [
                'required',
                'string',
                'confirmed',
                'different:old_password', // Mật khẩu mới phải khác mật khẩu cũ
                new StrongPassword(), // Sử dụng custom validation rule
            ],
            'new_password_confirmation' => [
                'required',
                'string',
            ],
        ], [
            'old_password.required' => 'Mật khẩu hiện tại là bắt buộc.',
            'old_password.min' => 'Mật khẩu hiện tại phải có ít nhất 8 ký tự.',
            'new_password.required' => 'Mật khẩu mới là bắt buộc.',
            'new_password.confirmed' => 'Xác nhận mật khẩu mới không khớp.',
            'new_password.different' => 'Mật khẩu mới phải khác mật khẩu hiện tại.',
            'new_password_confirmation.required' => 'Xác nhận mật khẩu mới là bắt buộc.',
        ]);

        if ($validator->fails()) {
            Log::warning('Validation failed for change password', [
                'errors' => $validator->errors()->toArray(),
                'user_id' => Auth::id()
            ]);
            
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()->toArray()
                ], 422);
            }
            
            return back()->withErrors($validator)->withInput();
        }

        // Lấy access token từ session
        $accessToken = Session::get('cognito_access_token');
        Log::info('Retrieved access token from session', [
            'has_access_token' => !empty($accessToken),
            'user_id' => Auth::id()
        ]);

        if (!$accessToken) {
            Log::error('No access token found in session', [
                'user_id' => Auth::id(),
                'session_keys' => array_keys(Session::all())
            ]);
            
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn cần đăng nhập để đổi mật khẩu.'
                ], 401);
            }
            
            return redirect()->route('login')->with('error', 'Bạn cần đăng nhập để đổi mật khẩu.');
        }

        // Lấy access token từ session
        $accessToken = Session::get('cognito_access_token');
        Log::info('Retrieved access token from session', [
            'has_access_token' => !empty($accessToken),
            'user_id' => Auth::id()
        ]);

        if (!$accessToken) {
            Log::error('No access token found in session', [
                'user_id' => Auth::id(),
                'session_keys' => array_keys(Session::all())
            ]);
            return redirect()->route('login')->with('error', 'Bạn cần đăng nhập để đổi mật khẩu.');
        }

        // Verify access token trước
        try {
            Log::info('Verifying access token with Cognito getUser API', [
                'user_id' => Auth::id(),
                'access_token_length' => strlen($accessToken)
            ]);
            
            $userInfo = $this->cognitoClient->getUser([
                'AccessToken' => $accessToken,
            ]);
            
            Log::info('Access token verified successfully', ['user_id' => Auth::id()]);
            
        } catch (AwsException $e) {
            $errorCode = $e->getAwsErrorCode();
            Log::error("Access token verification failed", [
                'error_code' => $errorCode,
                'error_message' => $e->getAwsErrorMessage(),
                'user_id' => Auth::id()
            ]);

            if ($errorCode === 'InvalidAccessTokenException') {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
                        'redirect' => '/login'
                    ], 401);
                }
                return redirect()->route('login')->with('error', 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            } else {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Có lỗi xảy ra khi xác thực. Vui lòng thử lại sau.',
                        'error_code' => $errorCode,
                        'error_details' => $e->getAwsErrorMessage()
                    ], 500);
                }
                return back()->withErrors(['error' => 'Có lỗi xảy ra khi xác thực. Vui lòng thử lại sau.'])->withInput();
            }
        }

        // Lấy username từ user info để verify mật khẩu hiện tại
        $username = null;
        foreach ($userInfo['UserAttributes'] as $attribute) {
            if ($attribute['Name'] === 'email') {
                $username = $attribute['Value'];
                break;
            }
        }

        if (!$username) {
            Log::error('Could not find username from user info', [
                'user_id' => Auth::id(),
                'user_attributes' => $userInfo['UserAttributes']
            ]);
            return back()->withErrors(['error' => 'Không thể lấy thông tin người dùng. Vui lòng thử lại sau.'])->withInput();
        }

        // Skip password verification for now - let Cognito changePassword handle it
        // This is because USER_PASSWORD_AUTH might not be enabled in the User Pool
        Log::info('Skipping current password verification - will let changePassword API handle it', [
            'user_id' => Auth::id(),
            'username' => $username
        ]);

        // Bây giờ thực hiện đổi mật khẩu
        try {
            Log::info('Calling Cognito changePassword API', [
                'user_id' => Auth::id(),
                'access_token_length' => strlen($accessToken),
                'username' => $username,
                'old_password_length' => strlen($request->old_password),
                'new_password_length' => strlen($request->new_password)
            ]);
            $result = $this->cognitoClient->changePassword([
                'AccessToken' => $accessToken,
                'PreviousPassword' => $request->old_password,
                'ProposedPassword' => $request->new_password,
            ]);

            Log::info('Password changed successfully', [
                'user_id' => Auth::id(),
                'cognito_response' => $result->toArray()
            ]);

            // Nếu là user được mời, đánh dấu đã kích hoạt (không còn trạng thái invited)
            $userModel = Auth::user();
            if ($userModel && $userModel->is_invited) {
                $userModel->is_invited = false;
                if (!$userModel->invited_at) {
                    $userModel->invited_at = now();
                }
                $userModel->save();
            }

            // Xóa token cũ sau khi đổi mật khẩu
            Session::forget('cognito_access_token');
            Session::forget('cognito_refresh_token');
            Session::forget('cognito_id_token');
            Session::flush(); // Xóa toàn bộ session
            Auth::logout();

            Log::info('User logged out after password change', [
                'user_id' => Auth::id()
            ]);
            
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.',
                    'redirect' => '/login',
                    'logout' => true
                ]);
            }
            
            return redirect()->route('login')->with('success', 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');

        } catch (AwsException $e) {
            $errorCode = $e->getAwsErrorCode(); // Lấy code lỗi chính xác
            $errorMessage = $e->getAwsErrorMessage();
            Log::error("Change password failed", [
                'error_code' => $errorCode,
                'error_message' => $errorMessage,
                'user_id' => Auth::id(),
                'username' => $username,
                'old_password_length' => strlen($request->old_password),
                'new_password_length' => strlen($request->new_password),
                'access_token_length' => strlen($accessToken)
            ]);

            $translatedMessage = 'Có lỗi xảy ra. Vui lòng thử lại sau.';

            if (strpos($errorMessage, 'Password did not conform with policy') !== false) {
                if (strpos($errorMessage, 'numeric characters') !== false) {
                    $translatedMessage = 'Mật khẩu phải chứa ít nhất một số.';
                } elseif (strpos($errorMessage, 'uppercase characters') !== false) {
                    $translatedMessage = 'Mật khẩu phải chứa ít nhất một chữ hoa.';
                } elseif (strpos($errorMessage, 'lowercase characters') !== false) {
                    $translatedMessage = 'Mật khẩu phải chứa ít nhất một chữ thường.';
                } elseif (strpos($errorMessage, 'special characters') !== false) {
                    $translatedMessage = 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt.';
                } else {
                    $translatedMessage = 'Mật khẩu không đáp ứng chính sách bảo mật.';
                }
            } elseif (strpos($errorMessage, 'must be at least 8 characters') !== false) {
                $translatedMessage = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
            } elseif (
                strpos($errorMessage, 'Incorrect password') !== false ||
                strpos($errorMessage, 'InvalidPassword') !== false ||
                strpos($errorMessage, 'Incorrect username or password') !== false ||
                strpos($errorMessage, 'Invalid user credentials') !== false ||
                ($errorCode === 'NotAuthorizedException') ||
                ($errorCode === 'InvalidPasswordException') ||
                ($errorCode === 'InvalidUserPoolConfigurationException')
            ) {
                $translatedMessage = 'Mật khẩu hiện tại không đúng.'; // Dịch và thông báo cụ thể
            } elseif ($errorCode === 'InvalidAccessTokenException') {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
                        'redirect' => '/login'
                    ], 401);
                }
                return redirect()->route('login')->with('error', 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            } elseif ($errorCode === 'LimitExceededException') {
                $translatedMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau.';
            } else {
                Log::warning("Unhandled error", [
                    'error_code' => $errorCode,
                    'error_message' => $errorMessage
                ]);
                
                // Cung cấp thông tin chi tiết hơn cho unhandled errors
                $translatedMessage = "Có lỗi xảy ra khi xác thực. Vui lòng thử lại sau. (Lỗi: {$errorCode})";
            }

            if ($request->expectsJson()) {
                // Check if it's a password-related error
                if (strpos($translatedMessage, 'Mật khẩu hiện tại không đúng') !== false) {
                    return response()->json([
                        'success' => false,
                        'message' => $translatedMessage,
                        'errors' => ['old_password' => [$translatedMessage]]
                    ], 422);
                }
                
                return response()->json([
                    'success' => false,
                    'message' => $translatedMessage
                ], 400);
            }
            
            return back()->withErrors(['error' => $translatedMessage]);
        }
    }

    // Hiển thị form đăng nhập riêng
    public function showLoginForm()
    {
        // Nếu đã đăng nhập, redirect về dashboard
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }
        return view('app');
    }

    // Xử lý đăng nhập trực tiếp với Cognito (không redirect đến Hosted UI)
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            // Sử dụng Cognito SDK để authenticate trực tiếp
            $clientId = config('services.cognito.client_id', '3ar8acocnqav49qof9qetdj2dj');
            $clientSecret = env('AWS_COGNITO_CLIENT_SECRET');
            
            // Tính toán SECRET_HASH nếu có client secret
            $authParameters = [
                'USERNAME' => $credentials['email'],
                'PASSWORD' => $credentials['password'],
            ];
            
            if ($clientSecret) {
                // Tính toán SECRET_HASH cho USER_PASSWORD_AUTH
                $message = $credentials['email'] . $clientId;
                $authParameters['SECRET_HASH'] = base64_encode(hash_hmac('sha256', $message, $clientSecret, true));
            }
            
            Log::info('Attempting Cognito login', [
                'email' => $credentials['email'],
                'has_client_secret' => !empty($clientSecret),
                'auth_flow' => 'USER_PASSWORD_AUTH',
            ]);
            
            $result = $this->cognitoClient->initiateAuth([
                'AuthFlow' => 'USER_PASSWORD_AUTH',
                'ClientId' => $clientId,
                'AuthParameters' => $authParameters,
            ]);

            $authResult = $result->get('AuthenticationResult');
            
            if (!$authResult) {
                return back()->withErrors([
                    'email' => 'Đăng nhập thất bại. Vui lòng thử lại.',
                ])->withInput();
            }

            // Giải mã ID token để lấy thông tin user
            $idToken = $authResult['IdToken'] ?? null;
            if (!$idToken) {
                return back()->withErrors([
                    'email' => 'Không thể lấy thông tin người dùng.',
                ])->withInput();
            }

            // Giải mã ID token
            $tokenParts = explode('.', $idToken);
            if (count($tokenParts) !== 3) {
                return back()->withErrors([
                    'email' => 'Token không hợp lệ.',
                ])->withInput();
            }

            $payload = json_decode(base64_decode(strtr($tokenParts[1], '-_', '+/')), true);
            $email = $payload['email'] ?? $payload['cognito:username'] ?? null;

            if (!$email) {
                return back()->withErrors([
                    'email' => 'Không thể lấy email từ token.',
                ])->withInput();
            }

            // Tìm hoặc tạo user trong database
            $user = User::where('email', $email)->first();
            
            if (!$user) {
                // Tạo user mới nếu chưa tồn tại
                $user = User::create([
                    'email' => $email,
                    'full_name' => $payload['name'] ?? $payload['given_name'] ?? 'User',
                    'status' => 'active',
                ]);
            }

            // Kiểm tra trạng thái tài khoản
            if ($user->status === 'inactive') {
                return back()->withErrors([
                    'email' => 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
                ])->withInput();
            }

            // Nếu là user được mời, bắt buộc đổi mật khẩu lần đầu tại trang ngoài
            if ($user->is_invited) {
                Session::put('first_login_email', $email);
                Session::put('first_login_name', $user->full_name);

                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Đăng nhập lần đầu. Vui lòng đổi mật khẩu.',
                        'redirect' => route('first-login.change.form'),
                        'force_change_password' => true,
                    ]);
                }

                return redirect()->route('first-login.change.form')
                    ->with('success', 'Vui lòng đổi mật khẩu trước khi đăng nhập lần đầu.');
            }

            // Lưu tokens vào session chỉ khi cho phép vào hệ thống
            Session::put('cognito_access_token', $authResult['AccessToken'] ?? null);
            Session::put('cognito_refresh_token', $authResult['RefreshToken'] ?? null);
            Session::put('cognito_id_token', $authResult['IdToken'] ?? null);

            // Đăng nhập user vào Laravel
            Auth::login($user);
            $request->session()->regenerate();

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Đăng nhập thành công!',
                    'redirect' => '/dashboard',
                ]);
            }

            return redirect()->intended('/dashboard')->with('success', 'Đăng nhập thành công!');

        } catch (AwsException $e) {
            $errorCode = $e->getAwsErrorCode();
            $awsErrorMessage = $e->getAwsErrorMessage();
            
            Log::error('Cognito login error', [
                'error_code' => $errorCode,
                'error_message' => $awsErrorMessage,
                'email' => $credentials['email'] ?? 'unknown',
                'full_error' => $e->getMessage(),
            ]);

            $errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';

            if ($errorCode === 'NotAuthorizedException') {
                $errorMessage = 'Email hoặc mật khẩu không chính xác.';
            } elseif ($errorCode === 'UserNotConfirmedException') {
                $errorMessage = 'Tài khoản chưa được xác nhận. Vui lòng kiểm tra email để xác nhận tài khoản.';
            } elseif ($errorCode === 'PasswordResetRequiredException') {
                $errorMessage = 'Bạn cần đặt lại mật khẩu. Vui lòng sử dụng chức năng "Quên mật khẩu".';
            } elseif ($errorCode === 'UserNotFoundException') {
                $errorMessage = 'Email không tồn tại trong hệ thống. Vui lòng đăng ký tài khoản mới.';
            } elseif ($errorCode === 'InvalidParameterException') {
                // Có thể do USER_PASSWORD_AUTH chưa được bật
                if (strpos($awsErrorMessage, 'USER_PASSWORD_AUTH') !== false || 
                    strpos($awsErrorMessage, 'AuthFlow') !== false) {
                    $errorMessage = 'Hệ thống xác thực chưa được cấu hình đúng. Vui lòng liên hệ quản trị viên.';
                    Log::error('USER_PASSWORD_AUTH may not be enabled', [
                        'error' => $awsErrorMessage,
                    ]);
                } else {
                    $errorMessage = 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại.';
                }
            } elseif ($errorCode === 'ResourceNotFoundException') {
                $errorMessage = 'Không tìm thấy ứng dụng xác thực. Vui lòng liên hệ quản trị viên.';
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $errorMessage,
                    'error_code' => $errorCode,
                ], 401);
            }

            return back()->withErrors([
                'email' => $errorMessage,
            ])->withInput();
        } catch (\Exception $e) {
            Log::error('Login error', [
                'error' => $e->getMessage(),
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Có lỗi xảy ra. Vui lòng thử lại sau.'
                ], 500);
            }

            return back()->withErrors([
                'email' => 'Có lỗi xảy ra. Vui lòng thử lại sau.',
            ])->withInput();
        }
    }

    // Redirect đến Hosted UI của Cognito (giữ lại cho tương thích)
    public function redirectToCognito()
    {
        $base = rtrim(env('AWS_COGNITO_DOMAIN', 'https://ap-southeast-2rqig6bh9c.auth.ap-southeast-2.amazoncognito.com'), '/');
        $url = $base.'/login?'.http_build_query([
            'client_id'     => config('services.cognito.client_id', '3ar8acocnqav49qof9qetdj2dj'),
            'response_type' => 'code',
            'scope'         => 'email openid phone aws.cognito.signin.user.admin',
            'redirect_uri'  => env('COGNITO_REDIRECT_URI', 'http://localhost:8000/auth/callback'),
        ]);
        return redirect($url);
    }

    // Redirect trực tiếp đến Google OAuth (không qua Cognito Hosted UI)
    public function redirectToGoogle()
    {
        $clientId = config('services.google.client_id');
        $redirectUri = config('services.google.redirect');

        if (!$clientId) {
            Log::error('Google OAuth client_id not configured');
            return redirect()->route('login')->withErrors([
                'email' => 'Google OAuth chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
            ]);
        }

        if (!$redirectUri) {
            $redirectUri = 'http://localhost:8000/auth/google-callback';
            Log::warning('Google redirect URI not configured, using default', ['redirect_uri' => $redirectUri]);
        }

        // Đảm bảo redirect URI không có trailing slash và đúng format
        $redirectUri = rtrim($redirectUri, '/');
        
        // Nếu redirect URI từ config có vấn đề, dùng giá trị mặc định
        if (strpos($redirectUri, 'localhost:8000') === false && strpos($redirectUri, '127.0.0.1:8000') === false) {
            $redirectUri = 'http://localhost:8000/auth/google-callback';
            Log::warning('Redirect URI seems incorrect, using default', ['original' => config('services.google.redirect'), 'new' => $redirectUri]);
        }

        // Tạo state để bảo mật
        $state = bin2hex(random_bytes(16));
        Session::put('oauth_state', $state);

        $params = [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'access_type' => 'offline',
            'prompt' => 'consent',
        ];

        $url = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);

        Log::info("Google OAuth Redirect", [
            'redirect_uri' => $redirectUri,
            'redirect_uri_from_config' => config('services.google.redirect'),
            'redirect_uri_from_env' => env('GOOGLE_REDIRECT_URI'),
            'client_id' => $clientId,
            'full_url' => $url
        ]);

        // Debug: Hiển thị redirect URI để kiểm tra
        if (config('app.debug')) {
            Log::info("DEBUG - Redirect URI being used: " . $redirectUri);
            // Lưu vào session để có thể xem sau
            Session::put('debug_redirect_uri', $redirectUri);
        }

        return redirect($url);
    }

    // Xử lý callback từ Google OAuth
    public function handleGoogleCallback(Request $request)
    {
        $code = $request->query('code');
        $state = $request->query('state');
        $error = $request->query('error');

        // Kiểm tra error từ Google
        if ($error) {
            Log::error('Google OAuth error', ['error' => $error]);
            return redirect()->route('login')->withErrors([
                'email' => 'Đăng nhập Google thất bại: ' . $error,
            ]);
        }

        // Kiểm tra state để bảo mật
        $storedState = Session::get('oauth_state');
        if (!$state || $state !== $storedState) {
            Log::error('Invalid OAuth state', [
                'received' => $state,
                'stored' => $storedState,
            ]);
            return redirect()->route('login')->withErrors([
                'email' => 'Xác thực không hợp lệ. Vui lòng thử lại.',
            ]);
        }

        Session::forget('oauth_state');

        if (!$code) {
            return redirect()->route('login')->withErrors([
                'email' => 'Không nhận được mã xác thực từ Google.',
            ]);
        }

        try {
            $clientId = config('services.google.client_id');
            $clientSecret = config('services.google.client_secret');
            $redirectUri = config('services.google.redirect');

            if (!$redirectUri) {
                $redirectUri = url('/auth/google-callback');
            }

            // Đổi code lấy access token
            $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $redirectUri,
            ]);

            Log::info('Google token request', [
                'redirect_uri' => $redirectUri,
                'has_client_secret' => !empty($clientSecret),
            ]);

            if ($tokenResponse->failed()) {
                Log::error('Google token request failed', [
                    'response' => $tokenResponse->body(),
                ]);
                return redirect()->route('login')->withErrors([
                    'email' => 'Không thể lấy token từ Google.',
                ]);
            }

            $tokens = $tokenResponse->json();
            $accessToken = $tokens['access_token'] ?? null;

            if (!$accessToken) {
                return redirect()->route('login')->withErrors([
                    'email' => 'Không nhận được access token từ Google.',
                ]);
            }

            // Lấy thông tin user từ Google
            $userResponse = Http::withToken($accessToken)->get('https://www.googleapis.com/oauth2/v2/userinfo');

            if ($userResponse->failed()) {
                Log::error('Google user info request failed', [
                    'response' => $userResponse->body(),
                ]);
                return redirect()->route('login')->withErrors([
                    'email' => 'Không thể lấy thông tin từ Google.',
                ]);
            }

            $googleUser = $userResponse->json();
            $email = $googleUser['email'] ?? null;
            $name = $googleUser['name'] ?? ($googleUser['given_name'] ?? '') . ' ' . ($googleUser['family_name'] ?? '') ?? 'User';
            $googleId = $googleUser['id'] ?? null;
            $avatarUrl = $googleUser['picture'] ?? null;

            if (!$email) {
                return redirect()->route('login')->withErrors([
                    'email' => 'Không thể lấy email từ Google.',
                ]);
            }

            // Tìm hoặc tạo user trong database
            $user = User::where('email', $email)->first();

            if (!$user) {
                // Tạo user mới
                $user = User::create([
                    'email' => $email,
                    'full_name' => $name,
                    'google_id' => $googleId,
                    'avatar_url' => $avatarUrl,
                    'status' => 'active',
                ]);
            } else {
                // Cập nhật thông tin Google nếu chưa có
                if (!$user->google_id) {
                    $user->google_id = $googleId;
                }
                if (!$user->avatar_url && $avatarUrl) {
                    $user->avatar_url = $avatarUrl;
                }
                if ($user->full_name !== $name) {
                    $user->full_name = $name;
                }
                $user->save();
            }

            // Kiểm tra trạng thái tài khoản
            if ($user->status === 'inactive') {
                return redirect()->route('login')->withErrors([
                    'email' => 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
                ]);
            }

            // Đăng nhập user
            Auth::login($user);
            $request->session()->regenerate();

            // Lưu Google access token vào session (nếu cần)
            Session::put('google_access_token', $accessToken);

            Log::info('Google OAuth login successful', [
                'email' => $email,
                'user_id' => $user->user_id,
            ]);

            return redirect()->intended('/dashboard')->with('success', 'Đăng nhập thành công!');

        } catch (\Exception $e) {
            Log::error('Google OAuth callback error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->route('login')->withErrors([
                'email' => 'Có lỗi xảy ra khi đăng nhập với Google. Vui lòng thử lại.',
            ]);
        }
    }

    // Hiển thị form đăng ký riêng
    public function showSignupForm()
    {
        // Nếu đã đăng nhập, redirect về dashboard
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }
        return view('app');
    }

    // Xử lý đăng ký trực tiếp với Cognito (không redirect đến Hosted UI)
    public function signup(Request $request)
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email|max:255',
                'password' => ['required', 'string', 'min:8', 'confirmed', new StrongPassword()],
                'password_confirmation' => 'required|string',
                'full_name' => 'required|string|max:255',
            ], [
                'email.required' => 'Email là bắt buộc.',
                'email.email' => 'Email không hợp lệ.',
                'email.max' => 'Email không được vượt quá 255 ký tự.',
                'password.required' => 'Mật khẩu là bắt buộc.',
                'password.min' => 'Mật khẩu phải có ít nhất 8 ký tự.',
                'password.confirmed' => 'Xác nhận mật khẩu không khớp.',
                'password_confirmation.required' => 'Xác nhận mật khẩu là bắt buộc.',
                'full_name.required' => 'Họ và tên là bắt buộc.',
                'full_name.max' => 'Họ và tên không được vượt quá 255 ký tự.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Signup validation failed', [
                'errors' => $e->errors(),
                'email' => $request->email ?? 'unknown',
            ]);
            
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
                    'errors' => $e->errors()
                ], 422);
            }
            throw $e;
        }

        try {
            $clientId = config('services.cognito.client_id', '3ar8acocnqav49qof9qetdj2dj');
            $clientSecret = env('AWS_COGNITO_CLIENT_SECRET');
            $userPoolId = env('AWS_COGNITO_USER_POOL_ID');

            // Chuẩn bị parameters cho signUp
            $signUpParams = [
                'ClientId' => $clientId,
                'Username' => $validated['email'],
                'Password' => $validated['password'],
                'UserAttributes' => [
                    ['Name' => 'email', 'Value' => $validated['email']],
                    ['Name' => 'name', 'Value' => $validated['full_name']],
                ],
            ];

            // Tính toán SECRET_HASH nếu có client secret
            if ($clientSecret) {
                // SECRET_HASH = HMAC_SHA256(Username + ClientId, ClientSecret)
                $message = $validated['email'] . $clientId;
                $signUpParams['SecretHash'] = base64_encode(hash_hmac('sha256', $message, $clientSecret, true));
            }

            // Tạo user trong Cognito (sẽ tự động throw UsernameExistsException nếu đã tồn tại)
            $result = $this->cognitoClient->signUp($signUpParams);

            // Tự động xác nhận email nếu có UserPoolId (admin operation)
            if ($userPoolId) {
                try {
                    $this->cognitoClient->adminUpdateUserAttributes([
                        'UserPoolId' => $userPoolId,
                        'Username' => $validated['email'],
                        'UserAttributes' => [
                            ['Name' => 'email_verified', 'Value' => 'true'],
                        ],
                    ]);
                } catch (\Exception $e) {
                    Log::warning('Could not auto-verify email', ['error' => $e->getMessage()]);
                }
            }

            // Tìm hoặc tạo user trong database
            $user = User::where('email', $validated['email'])->first();
            
            if (!$user) {
                // Tạo user mới trong database
                $user = User::create([
                    'email' => $validated['email'],
                    'full_name' => $validated['full_name'],
                    'status' => 'active',
                    'sub' => $result['UserSub'] ?? null,
                ]);
            } else {
                // User đã tồn tại - cập nhật thông tin và sub nếu chưa có
                if (!$user->sub && isset($result['UserSub'])) {
                    $user->sub = $result['UserSub'];
                }
                if ($user->full_name !== $validated['full_name']) {
                    $user->full_name = $validated['full_name'];
                }
                if ($user->status !== 'active') {
                    $user->status = 'active';
                }
                $user->save();
            }

            // Tự động đăng nhập sau khi đăng ký
            Auth::login($user);
            $request->session()->regenerate();

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Đăng ký thành công!',
                    'redirect' => '/dashboard'
                ]);
            }

            return redirect()->route('dashboard')->with('success', 'Đăng ký thành công!');

        } catch (AwsException $e) {
            $errorCode = $e->getAwsErrorCode();
            $errorMessage = 'Đăng ký thất bại. Vui lòng thử lại.';
            $errorField = 'email';

            Log::error('Cognito signup error', [
                'error_code' => $errorCode,
                'error_message' => $e->getAwsErrorMessage(),
                'aws_error_message' => $e->getMessage(),
                'email' => $validated['email'] ?? 'unknown',
                'full_exception' => $e->getTraceAsString(),
            ]);

            if ($errorCode === 'UsernameExistsException') {
                // Kiểm tra xem user có trong database không
                $existingUser = User::where('email', $validated['email'])->first();
                if ($existingUser) {
                    // User đã tồn tại trong cả Cognito và database
                    $errorMessage = 'Email này đã được sử dụng. Vui lòng đăng nhập.';
                } else {
                    // User tồn tại trong Cognito nhưng chưa có trong database
                    // Có thể do user được tạo bởi admin hoặc từ lần đăng ký trước
                    $errorMessage = 'Email này đã được đăng ký trong hệ thống. Vui lòng đăng nhập.';
                }
                $errorField = 'email';
            } elseif ($errorCode === 'InvalidPasswordException') {
                $errorMessage = 'Mật khẩu không đáp ứng yêu cầu của hệ thống. Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&).';
                $errorField = 'password';
            } elseif ($errorCode === 'InvalidParameterException') {
                // Kiểm tra chi tiết lỗi
                $awsMsg = strtolower($awsErrorMessage ?? '');
                if (strpos($awsMsg, 'email') !== false) {
                    $errorMessage = 'Email không hợp lệ. Vui lòng kiểm tra lại.';
                    $errorField = 'email';
                } elseif (strpos($awsMsg, 'password') !== false || strpos($awsMsg, 'mật khẩu') !== false) {
                    $errorMessage = 'Mật khẩu không hợp lệ. Vui lòng kiểm tra lại.';
                    $errorField = 'password';
                } else {
                    $errorMessage = 'Thông tin không hợp lệ: ' . $awsErrorMessage;
                    $errorField = 'email';
                }
            } elseif ($errorCode === 'LimitExceededException') {
                $errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau vài phút.';
                $errorField = 'email';
            } elseif ($errorCode === 'InvalidUserPoolConfigurationException') {
                $errorMessage = 'Cấu hình hệ thống xác thực không hợp lệ. Vui lòng liên hệ quản trị viên.';
                $errorField = 'email';
            } else {
                // Lỗi khác - hiển thị message từ AWS
                $errorMessage = 'Đăng ký thất bại: ' . ($awsErrorMessage ?: $errorCode);
                $errorField = 'email';
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $errorMessage,
                    'errors' => [$errorField => [$errorMessage]]
                ], 422);
            }

            return back()->withErrors([
                $errorField => $errorMessage,
            ])->withInput();
        } catch (\Exception $e) {
            Log::error('Signup error', [
                'error' => $e->getMessage(),
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Có lỗi xảy ra. Vui lòng thử lại sau.'
                ], 500);
            }

            return back()->withErrors([
                'email' => 'Có lỗi xảy ra. Vui lòng thử lại sau.',
            ])->withInput();
        }
    }

    // Redirect đến trang đăng ký (giữ lại cho tương thích)
    public function redirectToSignup()
    {
        return redirect()->route('signup');
    }

    // Xử lý callback từ Cognito
    public function handleCallback(Request $request)
    {
        $code = $request->query('code');
        if (!$code) {
            return redirect('/dashboard')->with('error', 'Đăng nhập thất bại');
        }

        // Gửi yêu cầu lấy token
        $tokenUrl = rtrim(env('AWS_COGNITO_DOMAIN', 'https://ap-southeast-2rqig6bh9c.auth.ap-southeast-2.amazoncognito.com'), '/').'/oauth2/token';
        $requestData = [
            'grant_type'    => 'authorization_code',
            'client_id'     => config('services.cognito.client_id', '3ar8acocnqav49qof9qetdj2dj'),
            'code'          => $code,
            'redirect_uri'  => env('COGNITO_REDIRECT_URI', 'http://localhost:8000/auth/callback'),
        ];

        $clientSecret = env('AWS_COGNITO_CLIENT_SECRET');
        if ($clientSecret) {
            $requestData['client_secret'] = $clientSecret;
            Log::info("Added client_secret to request");
        }

        $response = Http::asForm()->post($tokenUrl, $requestData);

        if ($response->failed()) {
            Log::error("Token request failed: " . $response->body());
            return redirect('/dashboard')->with('error', 'Lỗi lấy token: ' . $response->body());
        }

        $tokens = $response->json();
        Log::info("Tokens received: " . json_encode($tokens));

        // ✅ Lưu access_token, refresh_token, id_token vào session (THÊM MỚI)
        Session::put('cognito_access_token', $tokens['access_token'] ?? null);
        Session::put('cognito_refresh_token', $tokens['refresh_token'] ?? null);
        Session::put('cognito_id_token', $tokens['id_token'] ?? null);

        // Lấy ID token (chứa thông tin người dùng)
        $idToken = $tokens['id_token'] ?? null;
        if (!$idToken) {
            return redirect('/dashboard')->with('error', 'Không tìm thấy ID token');
        }

        // Giải mã ID token để lấy thông tin
        $tokenParts = explode('.', $idToken);
        if (count($tokenParts) !== 3) {
            return redirect('/dashboard')->with('error', 'ID token không hợp lệ');
        }

        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[1]));
        $userData = json_decode($payload, true);

        // Log toàn bộ thông tin từ token để debug
        Log::info("Full user data from token: " . json_encode($userData, JSON_PRETTY_PRINT));

        $sub = $userData['sub'] ?? null;
        $email = $userData['email'] ?? null;

        if (!$sub || !$email) {
            return redirect('/dashboard')->with('error', 'Không thể lấy thông tin người dùng từ ID token');
        }

        // Xác định provider từ token data
        $provider = $this->detectProvider($userData);
        Log::info("Detected provider: " . $provider);

        // Lấy role_id mặc định (Member) cho user mới
        $memberRoleId = \App\Models\Role::where('role_name', 'Member')->value('role_id');

        // Lấy thông tin từ Google
        $fullName = $userData['name'] ?? ($userData['given_name'] ?? '') . ' ' . ($userData['family_name'] ?? '') ?? 'User';
        $avatarUrl = $userData['picture'] ?? null;

        // Tìm user theo email
        $user = User::where('email', $email)->first();

        if (!$user) {
            // User mới: gán role/status mặc định
            $user = User::create([
                'sub' => $sub,
                'email' => $email,
                'google_id' => $provider === 'Google' ? ($userData['sub'] ?? null) : null,
                'role_id' => $memberRoleId,
                'status' => 'active',
                'full_name' => $fullName,
                'avatar_url' => $avatarUrl,
                'is_invited' => false, // Tự đăng ký
                'invited_at' => null,
            ]);
        } else {
            // User cũ: KHÔNG ghi đè role/status nếu đã có
            $user->sub = $sub;
            $user->google_id = $provider === 'Google' ? ($userData['sub'] ?? null) : $user->google_id;
            
            // Nếu user được mời và đăng nhập lần đầu
            if ($user->is_invited && !$user->invited_at) {
                $user->is_invited = false; // Đã kích hoạt
                $user->invited_at = now(); // Ghi nhận thời gian kích hoạt
                Log::info('Invited user activated account', [
                    'email' => $user->email,
                    'activated_at' => now()
                ]);
            }
            
            if (!$user->role_id) {
                $user->role_id = $memberRoleId;
            }
            if (!$user->status) {
                $user->status = 'active';
            }
            
            $user->save();
        }

        // Kiểm tra trạng thái user
        if ($user->status === 'inactive') {
            return redirect('/login')->with('error', 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin.');
        }

        Log::info("User saved/updated: " . $user->email . " via " . $provider);

        // Xóa cache users list để admin thấy user mới ngay lập tức
        \Cache::forget('users_list');

        Auth::login($user);

        return redirect('/dashboard')->with('success', 'Đăng nhập thành công từ ' . $provider);
    }

    // Phát hiện provider từ token data
    private function detectProvider($userData)
    {
        // Kiểm tra các claim đặc trưng của từng provider
        if (isset($userData['identities'])) {
            foreach ($userData['identities'] as $identity) {
                if (isset($identity['providerName'])) {
                    return $identity['providerName'];
                }
            }
        }

        // Kiểm tra các claim khác để xác định provider
        if (isset($userData['aud']) && strpos($userData['aud'], 'google') !== false) {
            return 'Google';
        }

        if (isset($userData['aud']) && strpos($userData['aud'], 'facebook') !== false) {
            return 'Facebook';
        }

        // Kiểm tra nếu có thông tin từ Google trong token
        if (isset($userData['picture']) || isset($userData['given_name']) || isset($userData['family_name'])) {
            return 'Google';
        }

        return 'Cognito';
    }

    // Hiển thị form quên mật khẩu
    public function showForgotPasswordForm()
    {
        return view('app');
    }

    // Xử lý quên mật khẩu trực tiếp với Cognito
    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        try {
            $clientId = config('services.cognito.client_id', '3ar8acocnqav49qof9qetdj2dj');
            $clientSecret = env('AWS_COGNITO_CLIENT_SECRET');

            // Chuẩn bị parameters cho forgotPassword
            $forgotPasswordParams = [
                'ClientId' => $clientId,
                'Username' => $validated['email'],
            ];

            // Tính toán SECRET_HASH nếu có client secret
            if ($clientSecret) {
                $message = $validated['email'] . $clientId;
                $forgotPasswordParams['SecretHash'] = base64_encode(hash_hmac('sha256', $message, $clientSecret, true));
            }

            // Gửi code reset password
            $this->cognitoClient->forgotPassword($forgotPasswordParams);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Mã xác nhận đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
                ]);
            }

            return back()->with('success', 'Mã xác nhận đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.');

        } catch (AwsException $e) {
            $errorCode = $e->getAwsErrorCode();
            $errorMessage = 'Không thể gửi mã xác nhận. Vui lòng thử lại.';

            if ($errorCode === 'UserNotFoundException') {
                $errorMessage = 'Email không tồn tại trong hệ thống.';
            } elseif ($errorCode === 'LimitExceededException') {
                $errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau vài phút.';
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $errorMessage
                ], 400);
            }

            return back()->withErrors(['email' => $errorMessage])->withInput();
        }
    }

    // Xử lý confirm forgot password (nhập code và mật khẩu mới)
    public function confirmForgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string',
            'password' => ['required', 'string', 'min:8', 'confirmed', new StrongPassword()],
        ]);

        try {
            $clientId = config('services.cognito.client_id', '3ar8acocnqav49qof9qetdj2dj');
            $clientSecret = env('AWS_COGNITO_CLIENT_SECRET');

            // Chuẩn bị parameters cho confirmForgotPassword
            $confirmForgotPasswordParams = [
                'ClientId' => $clientId,
                'Username' => $validated['email'],
                'ConfirmationCode' => $validated['code'],
                'Password' => $validated['password'],
            ];

            // Tính toán SECRET_HASH nếu có client secret
            if ($clientSecret) {
                $message = $validated['email'] . $clientId;
                $confirmForgotPasswordParams['SecretHash'] = base64_encode(hash_hmac('sha256', $message, $clientSecret, true));
            }

            $this->cognitoClient->confirmForgotPassword($confirmForgotPasswordParams);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.',
                    'redirect' => '/login'
                ]);
            }

            return redirect()->route('login')->with('success', 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');

        } catch (AwsException $e) {
            $errorCode = $e->getAwsErrorCode();
            $errorMessage = 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';

            if ($errorCode === 'CodeMismatchException') {
                $errorMessage = 'Mã xác nhận không đúng. Vui lòng kiểm tra lại.';
            } elseif ($errorCode === 'ExpiredCodeException') {
                $errorMessage = 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới.';
            } elseif ($errorCode === 'InvalidPasswordException') {
                $errorMessage = 'Mật khẩu không đáp ứng yêu cầu. Vui lòng kiểm tra lại.';
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $errorMessage
                ], 400);
            }

            return back()->withErrors(['code' => $errorMessage])->withInput();
        }
    }

    /**
     * Hiển thị trang đổi mật khẩu cho người dùng được mời (chưa vào hệ thống)
     */
    public function showFirstLoginChangePassword()
    {
        if (!Session::get('first_login_email')) {
            return redirect()->route('login')->withErrors('Phiên đổi mật khẩu đã hết hạn. Vui lòng đăng nhập lại.');
        }

        return view('app');
    }

    /**
     * Xử lý đổi mật khẩu lần đầu cho user được mời
     */
    public function handleFirstLoginChangePassword(Request $request)
    {
        $email = Session::get('first_login_email');
        if (!$email) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Phiên đổi mật khẩu đã hết hạn. Vui lòng đăng nhập lại.',
                    'redirect' => route('login'),
                ], 400);
            }
            return redirect()->route('login')->withErrors('Phiên đổi mật khẩu đã hết hạn. Vui lòng đăng nhập lại.');
        }

        $validator = Validator::make($request->all(), [
            'password' => ['required', 'string', 'min:8', 'confirmed', new StrongPassword()],
        ], [
            'password.required' => 'Mật khẩu mới là bắt buộc.',
            'password.confirmed' => 'Xác nhận mật khẩu không khớp.',
            'password.min' => 'Mật khẩu phải có ít nhất 8 ký tự.',
        ]);

        if ($validator->fails()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ.',
                    'errors' => $validator->errors(),
                ], 422);
            }
            return back()->withErrors($validator)->withInput();
        }

        try {
            $this->cognitoClient->adminSetUserPassword([
                'UserPoolId' => env('AWS_COGNITO_USER_POOL_ID'),
                'Username' => $email,
                'Password' => $request->password,
                'Permanent' => true,
            ]);

            $user = User::where('email', $email)->first();
            if ($user) {
                $user->is_invited = false;
                if (!$user->invited_at) {
                    $user->invited_at = now();
                }
                $user->save();
            }

            Session::forget('first_login_email');
            Session::forget('first_login_name');

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Đổi mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.',
                    'redirect' => route('login'),
                ]);
            }

            return redirect()->route('login')->with('success', 'Đổi mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.');

        } catch (AwsException $e) {
            Log::error('First login change password failed', [
                'email' => $email,
                'error_code' => $e->getAwsErrorCode(),
                'error_message' => $e->getAwsErrorMessage(),
            ]);

            $message = 'Không thể đổi mật khẩu. Vui lòng thử lại hoặc liên hệ quản trị viên.';
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $message,
                ], 500);
            }
            return back()->withErrors(['password' => $message])->withInput();
        }
    }

    // Đăng xuất
    public function logout()
    {
        Auth::logout();

        // ✅ Xóa token khỏi session (THÊM MỚI)
        Session::forget('cognito_access_token');
        Session::forget('cognito_refresh_token');
        Session::forget('cognito_id_token');
        return redirect('/login')->with('success', 'Đăng xuất thành công!');
    }
}
