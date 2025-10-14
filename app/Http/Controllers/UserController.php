<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\Role;
use App\Models\Department;

class UserController extends Controller
{
    public function __construct()
    {
        // Middleware sẽ được áp dụng trong routes
    }

    /**
     * Hiển thị danh sách người dùng
     */
    public function index()
    {
        return view('app');
    }

    public function show($id)
    {
        return view('app');
    }

    /**
     * Cập nhật vai trò người dùng
     */
    public function update(Request $request, $id)
    {
        // Middleware đã kiểm tra quyền Admin

        $request->validate([
            'role_id' => 'nullable|exists:roles,role_id',
            'department_id' => 'nullable|exists:departments,department_id',
        ]);

        $user = User::findOrFail($id);

        // Không cho phép thay đổi vai trò của Admin
        if ($user->isAdmin()) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Không thể thay đổi vai trò của Admin.'], 400);
            }
            return redirect()->back()->withErrors('Không thể thay đổi vai trò của Admin.');
        }

        // Kiểm tra xem có thể thay đổi vai trò không
        if ($user->user_id === Auth::id() && !Auth::user()->isAdmin()) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Bạn không thể thay đổi vai trò của chính mình.'], 400);
            }
            return redirect()->back()->withErrors('Bạn không thể thay đổi vai trò của chính mình.');
        }

        $oldRole = $user->role ? $user->role->role_name : 'Chưa có vai trò';
        $oldDepartment = $user->department ? $user->department->d_name : 'Chưa gán';

        // Chỉ cập nhật các trường được gửi
        if ($request->has('role_id')) {
            $user->role_id = $request->role_id;
        }
        if ($request->has('department_id')) {
            $user->department_id = $request->department_id;
        }
        $user->save();

        // Clear cache when user is updated
        \Cache::forget('users_list');

        // Reload relationship để có thể truy cập role và department mới
        $user->load(['role', 'department']);
        $newRole = $user->role ? $user->role->role_name : 'Chưa có vai trò';
        $newDepartment = $user->department ? $user->department->d_name : 'Chưa gán';

        // Tạo thông báo dựa trên trường được cập nhật
        $messages = [];
        if ($request->has('role_id')) {
            $messages[] = "vai trò từ {$oldRole} thành {$newRole}";
        }
        if ($request->has('department_id')) {
            $messages[] = "phòng ban từ {$oldDepartment} thành {$newDepartment}";
        }
        
        $message = "Đã cập nhật " . implode(' và ', $messages) . " của {$user->full_name}.";

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message
            ]);
        }

        return redirect()->route('users.index')
            ->with('success', $message);
    }

    /**
     * Cập nhật trạng thái người dùng
     */
    public function updateStatus(Request $request, $id)
    {
        // Middleware đã kiểm tra quyền Admin

        $request->validate([
            'status' => 'required|in:active,inactive',
        ]);

        $user = User::findOrFail($id);

        // Không cho phép thay đổi trạng thái của Admin
        if ($user->isAdmin()) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Không thể thay đổi trạng thái của Admin.'], 400);
            }
            return redirect()->back()->withErrors('Không thể thay đổi trạng thái của Admin.');
        }

        // Không cho phép Admin tự vô hiệu hóa chính mình
        if ($user->user_id === Auth::id() && $request->status === 'inactive') {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Bạn không thể vô hiệu hóa tài khoản của chính mình.'], 400);
            }
            return redirect()->back()->withErrors('Bạn không thể vô hiệu hóa tài khoản của chính mình.');
        }

        $oldStatus = $user->status ?? 'active';
        $newStatus = $request->status;

        $user->status = $newStatus;
        $user->save();

        // Clear cache when user status is updated
        \Cache::forget('users_list');

        $statusText = $newStatus === 'active' ? 'Kích hoạt' : 'Vô hiệu hóa';

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Đã cập nhật trạng thái của {$user->full_name} thành {$statusText}."
            ]);
        }

        return redirect()->route('users.index')
            ->with('success', "Đã cập nhật trạng thái của {$user->full_name} thành {$statusText}.");
    }

    /**
     * Xóa người dùng (chỉ Admin)
     */
    public function destroy($id)
    {
        // Middleware đã kiểm tra quyền Admin

        $user = User::findOrFail($id);

        // Không cho phép xóa Admin
        if ($user->isAdmin()) {
            return redirect()->back()->withErrors('Không thể xóa tài khoản Admin.');
        }

        // Không cho phép xóa chính mình
        if ($user->user_id === Auth::id()) {
            return redirect()->back()->withErrors('Bạn không thể xóa tài khoản của chính mình.');
        }

        $userName = $user->full_name;
        $user->delete();

        return redirect()->route('users.index')
            ->with('success', "Đã xóa người dùng {$userName}.");
    }
}
