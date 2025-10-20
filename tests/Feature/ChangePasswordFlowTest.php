<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Rules\StrongPassword;
use Illuminate\Support\Facades\Validator;

class ChangePasswordFlowTest extends TestCase
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

    public function test_change_password_validation_flow()
    {
        // Test các trường hợp validation sẽ fail trước khi gọi Cognito
        $testCases = [
            // Empty fields
            [
                'data' => [],
                'expected_errors' => ['old_password', 'new_password', 'new_password_confirmation']
            ],
            // Weak password
            [
                'data' => [
                    'old_password' => 'OldPassword123!',
                    'new_password' => 'weak',
                    'new_password_confirmation' => 'weak',
                ],
                'expected_errors' => ['new_password']
            ],
            // Password mismatch
            [
                'data' => [
                    'old_password' => 'OldPassword123!',
                    'new_password' => 'NewPassword123!',
                    'new_password_confirmation' => 'DifferentPassword123!',
                ],
                'expected_errors' => ['new_password_confirmation']
            ],
            // Same old and new password
            [
                'data' => [
                    'old_password' => 'SamePassword123!',
                    'new_password' => 'SamePassword123!',
                    'new_password_confirmation' => 'SamePassword123!',
                ],
                'expected_errors' => ['new_password']
            ],
        ];

        foreach ($testCases as $case) {
            $validator = Validator::make($case['data'], [
                'old_password' => [
                    'required',
                    'string',
                    'min:8',
                    function ($attribute, $value, $fail) {
                        if (empty(trim($value))) {
                            $fail('Mật khẩu hiện tại không được để trống.');
                        }
                    },
                ],
                'new_password' => [
                    'required',
                    'string',
                    'confirmed',
                    'different:old_password',
                    new StrongPassword(),
                ],
                'new_password_confirmation' => [
                    'required',
                    'string',
                    'same:new_password',
                ],
            ]);

            $this->assertTrue($validator->fails(), 'Validation should fail for case: ' . json_encode($case['data']));
            
            foreach ($case['expected_errors'] as $expectedError) {
                $this->assertArrayHasKey($expectedError, $validator->errors()->toArray(), 
                    'Should have error for field: ' . $expectedError);
            }
        }
    }

    public function test_validation_rules_structure()
    {
        // Test cấu trúc validation rules giống như trong AuthController
        $rules = [
            'old_password' => [
                'required',
                'string',
                'min:8',
                function ($attribute, $value, $fail) {
                    if (empty(trim($value))) {
                        $fail('Mật khẩu hiện tại không được để trống.');
                    }
                },
            ],
            'new_password' => [
                'required',
                'string',
                'confirmed',
                'different:old_password',
                new StrongPassword(),
            ],
            'new_password_confirmation' => [
                'required',
                'string',
                'same:new_password',
            ],
        ];

        // Test với dữ liệu hợp lệ
        $validData = [
            'old_password' => 'OldPassword123!',
            'new_password' => 'NewSecure123!',
            'new_password_confirmation' => 'NewSecure123!',
        ];

        $validator = Validator::make($validData, $rules);
        
        if ($validator->fails()) {
            $this->fail('Valid data should pass validation. Errors: ' . json_encode($validator->errors()->toArray()));
        }
        
        $this->assertFalse($validator->fails(), 'Valid data should pass validation');

        // Test với dữ liệu không hợp lệ
        $invalidData = [
            'old_password' => '   ', // Only spaces
            'new_password' => 'weak',
            'new_password_confirmation' => 'different',
        ];

        $validator = Validator::make($invalidData, $rules);
        $this->assertTrue($validator->fails(), 'Invalid data should fail validation');
        
        $errors = $validator->errors()->toArray();
        $this->assertArrayHasKey('old_password', $errors);
        $this->assertArrayHasKey('new_password', $errors);
        $this->assertArrayHasKey('new_password_confirmation', $errors);
    }
}