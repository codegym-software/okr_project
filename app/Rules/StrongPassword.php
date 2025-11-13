<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class StrongPassword implements ValidationRule
{
    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // Kiểm tra độ dài tối thiểu
        if (strlen($value) < 8) {
            $fail('Mật khẩu phải có ít nhất 8 ký tự.');
            return;
        }

        // Kiểm tra độ dài tối đa
        if (strlen($value) > 128) {
            $fail('Mật khẩu không được vượt quá 128 ký tự.');
            return;
        }

        // Kiểm tra chứa chữ thường
        if (!preg_match('/[a-z]/', $value)) {
            $fail('Mật khẩu phải chứa ít nhất một chữ thường.');
            return;
        }

        // Kiểm tra chứa chữ hoa
        if (!preg_match('/[A-Z]/', $value)) {
            $fail('Mật khẩu phải chứa ít nhất một chữ hoa.');
            return;
        }

        // Kiểm tra chứa số
        if (!preg_match('/[0-9]/', $value)) {
            $fail('Mật khẩu phải chứa ít nhất một số.');
            return;
        }

        // Kiểm tra chứa ký tự đặc biệt
        if (!preg_match('/[@$!%*?&]/', $value)) {
            $fail('Mật khẩu phải chứa ít nhất một ký tự đặc biệt (@$!%*?&).');
            return;
        }

        // Kiểm tra không chứa khoảng trắng
        if (preg_match('/\s/', $value)) {
            $fail('Mật khẩu không được chứa khoảng trắng.');
            return;
        }

        // Kiểm tra chỉ chứa các ký tự được phép
        if (!preg_match('/^[A-Za-z0-9@$!%*?&]+$/', $value)) {
            $fail('Mật khẩu chỉ được chứa chữ cái, số và các ký tự đặc biệt: @$!%*?&');
            return;
        }

    }
}
