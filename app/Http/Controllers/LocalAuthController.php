<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class LocalAuthController extends Controller
{
    /**
     * Hiển thị form đăng nhập local
     */
    public function showLoginForm()
    {
        return view('app');
    }

    /**
     * Xử lý đăng nhập local
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        // Tìm user theo email
        $user = User::where('email', $credentials['email'])->first();

        if (!$user) {
            return back()->withErrors([
                'email' => 'Email không tồn tại trong hệ thống.',
            ])->withInput();
        }

        // Kiểm tra password
        if (!$user->validatePassword($credentials['password'])) {
            return back()->withErrors([
                'password' => 'Mật khẩu không chính xác.',
            ])->withInput();
        }

        // Kiểm tra trạng thái tài khoản
        if ($user->status === 'inactive') {
            return back()->withErrors([
                'email' => 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
            ])->withInput();
        }

        // Đăng nhập user
        Auth::login($user);

        $request->session()->regenerate();

        return redirect()->intended('/dashboard')->with('success', 'Đăng nhập thành công!');
    }

    /**
     * Đăng xuất
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/')->with('success', 'Đăng xuất thành công!');
    }
}
