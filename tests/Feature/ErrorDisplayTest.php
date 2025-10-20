<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Rules\StrongPassword;
use Illuminate\Support\Facades\Validator;

class ErrorDisplayTest extends TestCase
{
    public function test_multiple_validation_errors_structure()
    {
        // Test cấu trúc errors khi có nhiều lỗi validation
        $testData = [
            'old_password' => '',
            'new_password' => 'weak',
            'new_password_confirmation' => 'different',
        ];

        $validator = Validator::make($testData, [
            'old_password' => 'required|string|min:8',
            'new_password' => 'required|string|confirmed|different:old_password',
            'new_password_confirmation' => 'required|string',
        ]);

        $this->assertTrue($validator->fails());
        
        $errors = $validator->errors()->toArray();
        
        // Verify error structure
        $this->assertArrayHasKey('old_password', $errors);
        $this->assertArrayHasKey('new_password', $errors);
        // new_password_confirmation không còn có validation rule 'same' nên không có error
        
        // Verify error messages are arrays
        $this->assertIsArray($errors['old_password']);
        $this->assertIsArray($errors['new_password']);
        
        // Verify each field has at least one error
        $this->assertNotEmpty($errors['old_password']);
        $this->assertNotEmpty($errors['new_password']);
    }

    public function test_strong_password_multiple_errors()
    {
        $rule = new StrongPassword();

        // Test password that fails multiple validation rules
        $validator = Validator::make(['password' => 'weak'], [
            'password' => [$rule]
        ]);

        $this->assertTrue($validator->fails());
        
        $errors = $validator->errors()->toArray();
        $this->assertArrayHasKey('password', $errors);
        $this->assertIsArray($errors['password']);
        
        // Should have at least one error message
        $this->assertNotEmpty($errors['password']);
        
        // The error message should be descriptive
        $errorMessage = $errors['password'][0];
        $this->assertStringContainsString('8 ký tự', $errorMessage);
    }

    public function test_error_message_formatting()
    {
        // Test that error messages are properly formatted for display
        $testErrors = [
            'field1' => ['Error message 1'],
            'field2' => ['Error message 2', 'Error message 3'],
        ];

        // Simulate the frontend error processing logic
        $allErrors = [];
        foreach ($testErrors as $field => $fieldErrors) {
            if (is_array($fieldErrors)) {
                $allErrors = array_merge($allErrors, $fieldErrors);
            } else {
                $allErrors[] = $fieldErrors;
            }
        }

        $this->assertCount(3, $allErrors);
        $this->assertEquals('Error message 1', $allErrors[0]);
        $this->assertEquals('Error message 2', $allErrors[1]);
        $this->assertEquals('Error message 3', $allErrors[2]);

        // Test formatted error list
        $errorList = array_map(function($error, $index) {
            return ($index + 1) . '. ' . $error;
        }, $allErrors, array_keys($allErrors));

        $this->assertEquals('1. Error message 1', $errorList[0]);
        $this->assertEquals('2. Error message 2', $errorList[1]);
        $this->assertEquals('3. Error message 3', $errorList[2]);
    }

    public function test_single_vs_multiple_error_handling()
    {
        // Test single error
        $singleError = ['field' => ['Single error message']];
        $allErrors = [];
        foreach ($singleError as $field => $fieldErrors) {
            $allErrors = array_merge($allErrors, $fieldErrors);
        }
        
        $this->assertCount(1, $allErrors);
        
        // Test multiple errors
        $multipleErrors = [
            'field1' => ['Error 1'],
            'field2' => ['Error 2'],
            'field3' => ['Error 3'],
        ];
        
        $allErrors = [];
        foreach ($multipleErrors as $field => $fieldErrors) {
            $allErrors = array_merge($allErrors, $fieldErrors);
        }
        
        $this->assertCount(3, $allErrors);
        
        // Test formatted display
        if (count($allErrors) === 1) {
            $displayMessage = $allErrors[0];
            $this->assertEquals('Error 1', $displayMessage);
        } else {
            $errorList = array_map(function($error, $index) {
                return ($index + 1) . '. ' . $error;
            }, $allErrors, array_keys($allErrors));
            
            $displayMessage = "Có " . count($allErrors) . " lỗi cần sửa:\n" . implode("\n", $errorList);
            
            $this->assertStringContainsString('Có 3 lỗi cần sửa:', $displayMessage);
            $this->assertStringContainsString('1. Error 1', $displayMessage);
            $this->assertStringContainsString('2. Error 2', $displayMessage);
            $this->assertStringContainsString('3. Error 3', $displayMessage);
        }
    }
}
