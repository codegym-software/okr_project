<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AdminOrCeo
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Bắt buộc đăng nhập
        if (!Auth::check()) {
            return redirect()->route('login')->withErrors('Bạn cần đăng nhập để truy cập trang này.');
        }

        $user = Auth::user();

        // Chỉ cho Admin hoặc CEO
        if (!$user->isAdmin() && !$user->isCeo()) {
            abort(403, 'Bạn không có quyền truy cập trang này. Chỉ Admin hoặc CEO mới có thể truy cập.');
        }

        return $next($request);
    }
}


