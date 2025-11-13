<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn cần đăng nhập để xem hồ sơ.'
            ], 401);
        }
        
        // Load relationships nếu chưa có
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }
        if (!$user->relationLoaded('department')) {
            $user->load('department');
        }
        
        return response()->json([
            'success' => true,
            'user' => [
                'user_id' => $user->user_id,
                'id' => $user->user_id, // Alias for compatibility
                'name' => $user->full_name,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'avatar' => $user->avatar_url,
                'status' => $user->status,
                'department_id' => $user->department_id,
                'role_id' => $user->role_id,
                'role' => $user->role ? [
                    'role_id' => $user->role->role_id,
                    'role_name' => $user->role->role_name
                ] : null,
                'department' => $user->department ? [
                    'department_id' => $user->department->department_id,
                    'd_name' => $user->department->d_name
                ] : null,
            ]
        ]);
    }

    public function update(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'full_name' => 'nullable|string|max:255',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        // Cập nhật thông tin cơ bản
        $user->full_name = $request->full_name;

        // Xử lý upload avatar
        if ($request->hasFile('avatar')) {
            // Xóa avatar cũ nếu có
            if ($user->avatar_url && Storage::disk('public')->exists(str_replace('/storage/', '', $user->avatar_url))) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar_url));
            }

            // Lưu avatar mới
            $path = $request->file('avatar')->store('avatars', 'public');
            $user->avatar_url = '/storage/' . $path;
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật hồ sơ thành công!',
            'user' => [
                'id' => $user->user_id,
                'name' => $user->full_name,
                'email' => $user->email,
                'avatar' => $user->avatar_url,
                'status' => $user->status,
                'role' => $user->role ? $user->role->role_name : null,
                'department' => $user->department ? $user->department->d_name : null,
            ],
            'redirect' => '/dashboard'
        ]);
    }
}