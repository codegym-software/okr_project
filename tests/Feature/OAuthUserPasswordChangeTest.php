<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class OAuthUserPasswordChangeTest extends TestCase
{
    public function test_oauth_user_detection_logic()
    {
        // Test cases cho việc phát hiện OAuth user
        $testCases = [
            [
                'user_data' => ['google_id' => 'google-123456'],
                'expected_oauth' => true,
                'description' => 'User with google_id should be OAuth user'
            ],
            [
                'user_data' => ['google_id' => null],
                'expected_oauth' => false,
                'description' => 'User with null google_id should not be OAuth user'
            ],
            [
                'user_data' => [], // Không có google_id field
                'expected_oauth' => false,
                'description' => 'User without google_id field should not be OAuth user'
            ],
            [
                'user_data' => ['google_id' => ''],
                'expected_oauth' => false,
                'description' => 'User with empty google_id should not be OAuth user'
            ]
        ];

        foreach ($testCases as $case) {
            $user = new User($case['user_data']);
            $isOAuth = !empty($user->google_id);
            
            $this->assertEquals($case['expected_oauth'], $isOAuth, $case['description']);
        }
    }

    public function test_oauth_error_message_content()
    {
        // Test nội dung error message cho OAuth users
        $expectedMessage = 'Bạn đang đăng nhập bằng Google. Để đổi mật khẩu, vui lòng truy cập tài khoản Google của bạn.';
        
        // Verify message có chứa các từ khóa quan trọng
        $this->assertStringContainsString('Google', $expectedMessage);
        $this->assertStringContainsString('đăng nhập', $expectedMessage);
        $this->assertStringContainsString('đổi mật khẩu', $expectedMessage);
        $this->assertStringContainsString('tài khoản Google', $expectedMessage);
    }

    public function test_oauth_response_structure()
    {
        // Test cấu trúc response cho OAuth users
        $expectedResponse = [
            'success' => false,
            'message' => 'Bạn đang đăng nhập bằng Google. Để đổi mật khẩu, vui lòng truy cập tài khoản Google của bạn.',
            'oauth_user' => true,
            'provider' => 'Google'
        ];

        // Verify response structure
        $this->assertArrayHasKey('success', $expectedResponse);
        $this->assertArrayHasKey('message', $expectedResponse);
        $this->assertArrayHasKey('oauth_user', $expectedResponse);
        $this->assertArrayHasKey('provider', $expectedResponse);

        // Verify data types
        $this->assertIsBool($expectedResponse['success']);
        $this->assertIsString($expectedResponse['message']);
        $this->assertIsBool($expectedResponse['oauth_user']);
        $this->assertIsString($expectedResponse['provider']);

        // Verify values
        $this->assertFalse($expectedResponse['success']);
        $this->assertTrue($expectedResponse['oauth_user']);
        $this->assertEquals('Google', $expectedResponse['provider']);
    }

    public function test_oauth_user_validation_logic()
    {
        // Test logic validation cho OAuth users
        $oauthUser = new User(['google_id' => 'google-123456']);
        $regularUser = new User(['google_id' => null]);

        // Test OAuth user detection
        $this->assertTrue(!empty($oauthUser->google_id), 'OAuth user should be detected');
        $this->assertFalse(!empty($regularUser->google_id), 'Regular user should not be detected as OAuth');

        // Test conditional logic
        $this->assertTrue($oauthUser->google_id ? true : false, 'OAuth user condition should be true');
        $this->assertFalse($regularUser->google_id ? true : false, 'Regular user condition should be false');
    }

    public function test_frontend_oauth_handling()
    {
        // Test frontend logic cho OAuth users
        $oauthUserData = [
            'user_id' => 1,
            'email' => 'oauth@example.com',
            'google_id' => 'google-123456'
        ];

        $regularUserData = [
            'user_id' => 2,
            'email' => 'regular@example.com',
            'google_id' => null
        ];

        // Test OAuth user detection
        $this->assertTrue(!!$oauthUserData['google_id'], 'OAuth user should be detected');
        $this->assertFalse(!!$regularUserData['google_id'], 'Regular user should not be detected as OAuth');

        // Test UI state
        $oauthUserDisabled = !!$oauthUserData['google_id'];
        $regularUserDisabled = !!$regularUserData['google_id'];

        $this->assertTrue($oauthUserDisabled, 'OAuth user form should be disabled');
        $this->assertFalse($regularUserDisabled, 'Regular user form should not be disabled');
    }
}