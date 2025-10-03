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

class AuthController extends Controller
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

    public function showChangePasswordForm()
    {
        return view('auth.change-password');
    }

    // Xử lý đổi mật khẩu
    public function changePassword(Request $request)
    {
        // Validate input
        $validator = Validator::make($request->all(), [
            'old_password' => 'required|string|min:8', // Điều chỉnh theo policy của Cognito User Pool
            'new_password' => 'required|string|min:8|confirmed',
            'new_password_confirmation' => 'required|string|same:new_password',
        ]);

        if ($validator->fails()) {
            Log::warning('Validation failed for change password', [
                'errors' => $validator->errors()->toArray(),
                'user_id' => Auth::id()
            ]);
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
            return redirect()->route('login')->with('error', 'Bạn cần đăng nhập để đổi mật khẩu.');
        }

        try {
            // Bước 1: Verify access token hợp lệ trước khi đổi mật khẩu
            Log::info('Verifying access token with getUser API', [
                'user_id' => Auth::id(),
                'access_token_length' => strlen($accessToken)
            ]);
            $this->cognitoClient->getUser([
                'AccessToken' => $accessToken,
            ]);
            Log::info('Access token verified successfully', ['user_id' => Auth::id()]);

            // Bước 2: Gọi changePassword nếu token OK
            Log::info('Calling Cognito changePassword API', [
                'user_id' => Auth::id(),
                'access_token_length' => strlen($accessToken)
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

            // Xóa token cũ sau khi đổi mật khẩu
            Session::forget('cognito_access_token');
            Session::forget('cognito_refresh_token');
            Session::forget('cognito_id_token');

            Log::info('Cleared session tokens after password change', [
                'user_id' => Auth::id(),
                'remaining_session_keys' => array_keys(Session::all())
            ]);

            // Đăng xuất người dùng để yêu cầu đăng nhập lại
            Auth::logout();

            Log::info('User logged out after password change', [
                'user_id' => Auth::id()
            ]);
            return redirect()->route('login')->with('success', 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');

        } catch (AwsException $e) {
            $errorCode = $e->getAwsErrorCode(); // Lấy code lỗi chính xác
            $errorMessage = $e->getAwsErrorMessage();
            Log::error("Change password failed", [
                'error_code' => $errorCode,
                'error_message' => $errorMessage,
                'user_id' => Auth::id()
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
                strpos($errorMessage, 'Incorrect username or password') !== false || // Thêm để bắt case phổ biến
                ($errorCode === 'NotAuthorizedException') // Sử dụng error code để detect mật khẩu cũ sai
            ) {
                $translatedMessage = 'Mật khẩu cũ không đúng.'; // Dịch và thông báo cụ thể
            } elseif ($errorCode === 'InvalidAccessTokenException') {
                return redirect()->route('login')->with('error', 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            } elseif ($errorCode === 'LimitExceededException') {
                $translatedMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau.';
            } else {
                Log::warning("Unhandled error", [
                    'error_code' => $errorCode,
                    'error_message' => $errorMessage
                ]);
            }

            return back()->withErrors(['error' => $translatedMessage]);
        }
    }

    // Redirect đến Hosted UI của Cognito
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

    // Redirect đến Google thông qua Cognito
    public function redirectToGoogle()
    {
        $base = rtrim(env('AWS_COGNITO_DOMAIN', 'https://ap-southeast-2rqig6bh9c.auth.ap-southeast-2.amazoncognito.com'), '/');
        $url = $base.'/login?'.http_build_query([
            'client_id'     => config('services.cognito.client_id', '3ar8acocnqav49qof9qetdj2dj'),
            'response_type' => 'code',
            'scope'         => 'email openid phone aws.cognito.signin.user.admin',
            'redirect_uri'  => env('COGNITO_REDIRECT_URI', 'http://localhost:8000/auth/callback'),
        ]);

        Log::info("Google Redirect URL: " . $url);

        return redirect($url);
    }

    // Redirect đến trang đăng ký
    public function redirectToSignup()
    {
        $base = rtrim(env('AWS_COGNITO_DOMAIN', 'https://ap-southeast-2rqig6bh9c.auth.ap-southeast-2.amazoncognito.com'), '/');
        $url = $base.'/login?'.http_build_query([
            'client_id'     => config('services.cognito.client_id', '3ar8acocnqav49qof9qetdj2dj'),
            'response_type' => 'code',
            'scope'         => 'email openid phone aws.cognito.signin.user.admin',
            'redirect_uri'  => env('COGNITO_REDIRECT_URI', 'http://localhost:8000/auth/callback'),
        ]);

        Log::info("Signup Redirect URL: " . $url);

        return redirect($url);
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

        // Lưu vào database với thông tin đầy đủ
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'sub' => $sub,
                'email' => $email,
                'google_id' => $provider === 'Google' ? ($userData['sub'] ?? null) : null,
            ]
        );

        Log::info("User saved/updated: " . $user->email . " via " . $provider);

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

    // Quên mật khẩu
    public function forgotPassword()
    {
        $forgotUrl = rtrim(env('AWS_COGNITO_DOMAIN', 'https://ap-southeast-2rqig6bh9c.auth.ap-southeast-2.amazoncognito.com'), '/').'/forgotPassword?' . http_build_query([
            'client_id' => config('services.cognito.client_id', '3ar8acocnqav49qof9qetdj2dj'),
            'response_type' => 'code',
            'scope' => 'email+openid',
            'redirect_uri' => env('COGNITO_REDIRECT_URI', 'http://localhost:8000/auth/callback'),
        ]);

        Log::info("Forgot Password URL: " . $forgotUrl);

        return redirect($forgotUrl);
    }

    // Đăng xuất
    public function logout()
    {
        Auth::logout();

        // ✅ Xóa token khỏi session (THÊM MỚI)
        Session::forget('cognito_access_token');
        Session::forget('cognito_refresh_token');
        Session::forget('cognito_id_token');
        return redirect('/dashboard')->with('success', 'Đăng xuất thành công!');
    }
}
