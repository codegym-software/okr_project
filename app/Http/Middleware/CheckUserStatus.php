<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckUserStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Kiểm tra đăng nhập
        if (Auth::check()) {
            $user = Auth::user();

            // Kiểm tra trạng thái tài khoản
            if ($user->status === 'inactive') {
                // Đăng xuất người dùng
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                // Redirect về trang đăng nhập với thông báo
                return redirect()->route('login')
                    ->withErrors('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.');
            }
        }

        return $next($request);
    }
}
