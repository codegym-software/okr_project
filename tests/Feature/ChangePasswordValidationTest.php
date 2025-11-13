<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Rules\StrongPassword;
use Illuminate\Support\Facades\Validator;

class ChangePasswordValidationTest extends TestCase
{
    public function test_strong_password_rule_validates_correctly()
    {
        $rule = new StrongPassword();

        // Test valid password
        $validator = Validator::make(['password' => 'ValidPass123!'], [
            'password' => [$rule]
        ]);
        $this->assertFalse($validator->fails());

        // Test password without uppercase
        $validator = Validator::make(['password' => 'invalidpass123!'], [
            'password' => [$rule]
        ]);
        $this->assertTrue($validator->fails());
        $this->assertStringContainsString('chữ hoa', $validator->errors()->first('password'));

        // Test password without lowercase
        $validator = Validator::make(['password' => 'INVALIDPASS123!'], [
            'password' => [$rule]
        ]);
        $this->assertTrue($validator->fails());
        $this->assertStringContainsString('chữ thường', $validator->errors()->first('password'));

        // Test password without numbers
        $validator = Validator::make(['password' => 'InvalidPassword!'], [
            'password' => [$rule]
        ]);
        $this->assertTrue($validator->fails());
        $this->assertStringContainsString('số', $validator->errors()->first('password'));

        // Test password without special characters
        $validator = Validator::make(['password' => 'InvalidPassword123'], [
            'password' => [$rule]
        ]);
        $this->assertTrue($validator->fails());
        $this->assertStringContainsString('ký tự đặc biệt', $validator->errors()->first('password'));

        // Test password too short
        $validator = Validator::make(['password' => 'Short1!'], [
            'password' => [$rule]
        ]);
        $this->assertTrue($validator->fails());
        $this->assertStringContainsString('8 ký tự', $validator->errors()->first('password'));

        // Test password with spaces
        $validator = Validator::make(['password' => 'Invalid Pass123!'], [
            'password' => [$rule]
        ]);
        $this->assertTrue($validator->fails());
        $this->assertStringContainsString('khoảng trắng', $validator->errors()->first('password'));

        // Test password with common patterns
        $validator = Validator::make(['password' => 'Password123!'], [
            'password' => [$rule]
        ]);
        $this->assertTrue($validator->fails());
        $this->assertStringContainsString('pattern phổ biến', $validator->errors()->first('password'));
    }

    public function test_password_validation_rules()
    {
        // Test required fields
        $validator = Validator::make([], [
            'old_password' => 'required|string|min:8',
            'new_password' => 'required|string|confirmed|different:old_password',
            'new_password_confirmation' => 'required|string|same:new_password',
        ]);

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('old_password', $validator->errors()->toArray());
        $this->assertArrayHasKey('new_password', $validator->errors()->toArray());
        $this->assertArrayHasKey('new_password_confirmation', $validator->errors()->toArray());

        // Test password confirmation mismatch
        $validator = Validator::make([
            'old_password' => 'OldPassword123!',
            'new_password' => 'NewPassword123!',
            'new_password_confirmation' => 'DifferentPassword123!',
        ], [
            'old_password' => 'required|string|min:8',
            'new_password' => 'required|string|confirmed|different:old_password',
            'new_password_confirmation' => 'required|string|same:new_password',
        ]);

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('new_password_confirmation', $validator->errors()->toArray());

        // Test same old and new password
        $validator = Validator::make([
            'old_password' => 'SamePassword123!',
            'new_password' => 'SamePassword123!',
            'new_password_confirmation' => 'SamePassword123!',
        ], [
            'old_password' => 'required|string|min:8',
            'new_password' => 'required|string|confirmed|different:old_password',
            'new_password_confirmation' => 'required|string|same:new_password',
        ]);

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('new_password', $validator->errors()->toArray());

        // Test valid input
        $validator = Validator::make([
            'old_password' => 'OldPassword123!',
            'new_password' => 'NewPassword123!',
            'new_password_confirmation' => 'NewPassword123!',
        ], [
            'old_password' => 'required|string|min:8',
            'new_password' => 'required|string|confirmed|different:old_password',
            'new_password_confirmation' => 'required|string|same:new_password',
        ]);

        $this->assertFalse($validator->fails());
    }
}