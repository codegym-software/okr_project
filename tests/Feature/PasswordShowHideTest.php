<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Rules\StrongPassword;
use Illuminate\Support\Facades\Validator;

class PasswordShowHideTest extends TestCase
{
    public function test_password_validation_still_works_with_show_hide()
    {
        $rule = new StrongPassword();

        // Test that password validation still works regardless of show/hide state
        $testPasswords = [
            'ValidPass123!',
            'Admin123!',
            'Password123!',
            'User123!',
        ];

        foreach ($testPasswords as $password) {
            $validator = Validator::make(['password' => $password], [
                'password' => [$rule]
            ]);
            
            $this->assertFalse($validator->fails(), 
                "Password '{$password}' should be valid regardless of show/hide state");
        }
    }

    public function test_password_validation_still_rejects_weak_passwords()
    {
        $rule = new StrongPassword();

        // Test that weak passwords are still rejected
        $weakPasswords = [
            'weak',
            'WEAKPASS',
            'weakpass',
            'WeakPass',
            'WeakPass123',
            'Weak Pass123!',
        ];

        foreach ($weakPasswords as $password) {
            $validator = Validator::make(['password' => $password], [
                'password' => [$rule]
            ]);
            
            $this->assertTrue($validator->fails(), 
                "Password '{$password}' should still be rejected as weak");
        }
    }

    public function test_form_validation_rules_unchanged()
    {
        // Test that form validation rules are still the same
        $validator = Validator::make([], [
            'old_password' => 'required|string|min:8',
            'new_password' => 'required|string|confirmed|different:old_password',
            'new_password_confirmation' => 'required|string|same:new_password',
        ]);

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('old_password', $validator->errors()->toArray());
        $this->assertArrayHasKey('new_password', $validator->errors()->toArray());
        $this->assertArrayHasKey('new_password_confirmation', $validator->errors()->toArray());
    }
}
