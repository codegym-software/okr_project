<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Rules\StrongPassword;
use Illuminate\Support\Facades\Validator;

class PasswordValidationTest extends TestCase
{
    public function test_no_duplicate_confirmation_errors()
    {
        // Test với dữ liệu có lỗi confirmation mismatch
        $testData = [
            'old_password' => 'OldPassword123!',
            'new_password' => 'NewPassword123!',
            'new_password_confirmation' => 'DifferentPassword123!',
        ];

        $validator = Validator::make($testData, [
            'old_password' => 'required|string|min:8',
            'new_password' => 'required|string|confirmed|different:old_password',
            'new_password_confirmation' => 'required|string',
        ]);

        $this->assertTrue($validator->fails());
        
        $errors = $validator->errors()->toArray();
        
        // Chỉ nên có 1 lỗi confirmation, không duplicate
        $this->assertArrayHasKey('new_password', $errors);
        $this->assertArrayNotHasKey('new_password_confirmation', $errors);
        
        // Kiểm tra chỉ có 1 lỗi confirmation
        $confirmationErrors = array_filter($errors['new_password'], function($error) {
            return strpos($error, 'khớp') !== false || strpos($error, 'match') !== false;
        });
        
        $this->assertCount(1, $confirmationErrors, 'Should only have 1 confirmation error, not duplicates');
    }

    public function test_password_mismatch_error_message()
    {
        // Test với dữ liệu có lỗi confirmation mismatch
        $testData = [
            'old_password' => 'OldPassword123!',
            'new_password' => 'NewPassword123!',
            'new_password_confirmation' => 'DifferentPassword123!',
        ];

        $validator = Validator::make($testData, [
            'old_password' => 'required|string|min:8',
            'new_password' => 'required|string|confirmed|different:old_password',
            'new_password_confirmation' => 'required|string',
        ]);

        $this->assertTrue($validator->fails());
        
        $errors = $validator->errors()->toArray();
        
        // Kiểm tra error message cụ thể (sử dụng message thực tế)
        $this->assertStringContainsString('confirmation does not match', $errors['new_password'][0]);
    }

    public function test_weak_password_error_message()
    {
        // Test với mật khẩu yếu
        $testData = [
            'old_password' => 'OldPassword123!',
            'new_password' => 'weak',
            'new_password_confirmation' => 'weak',
        ];

        $validator = Validator::make($testData, [
            'old_password' => 'required|string|min:8',
            'new_password' => ['required', 'string', 'confirmed', 'different:old_password', new StrongPassword()],
            'new_password_confirmation' => 'required|string',
        ]);

        $this->assertTrue($validator->fails());
        
        $errors = $validator->errors()->toArray();
        
        // Kiểm tra có lỗi về độ mạnh mật khẩu
        $this->assertArrayHasKey('new_password', $errors);
        $this->assertNotEmpty($errors['new_password']);
        
        // Kiểm tra có ít nhất 1 lỗi về độ mạnh mật khẩu
        $strengthErrors = array_filter($errors['new_password'], function($error) {
            return strpos($error, 'ký tự') !== false || 
                   strpos($error, 'chữ hoa') !== false || 
                   strpos($error, 'chữ thường') !== false ||
                   strpos($error, 'số') !== false ||
                   strpos($error, 'ký tự đặc biệt') !== false;
        });
        
        $this->assertNotEmpty($strengthErrors, 'Should have at least one password strength error');
    }

    public function test_old_password_validation()
    {
        // Test với mật khẩu hiện tại để trống
        $testData = [
            'old_password' => '',
            'new_password' => 'NewPassword123!',
            'new_password_confirmation' => 'NewPassword123!',
        ];

        $validator = Validator::make($testData, [
            'old_password' => 'required|string|min:8',
            'new_password' => 'required|string|confirmed|different:old_password',
            'new_password_confirmation' => 'required|string',
        ]);

        $this->assertTrue($validator->fails());
        
        $errors = $validator->errors()->toArray();
        
        // Kiểm tra có lỗi về mật khẩu hiện tại (sử dụng message thực tế)
        $this->assertStringContainsString('required', $errors['old_password'][0]);
    }
}
