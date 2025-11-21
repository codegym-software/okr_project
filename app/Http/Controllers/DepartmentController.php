<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\Role;

class DepartmentController extends Controller
{
    /**
     * Hiển thị danh sách tất cả các đơn vị
     */
    public function index(Request $request): JsonResponse|View
    {
        $departments = Department::with([
            'users' => fn($q) => $q->select('user_id', 'full_name', 'email', 'department_id')
        ])
        ->orderBy('created_at', 'asc')
        ->get();

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'data' => $departments]);
        }

        return view('app');
    }

    /**
     * Form tạo mới đơn vị
     */
    public function create(): View
    {
        return view('app');
    }

    /**
     * Lưu đơn vị mới
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'd_name'        => 'required|string|max:255',
            'd_description' => 'nullable|string|max:1000',
        ]);

        $department = Department::create($validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Tạo đơn vị thành công!',
                'data'    => $department
            ]);
        }

        return redirect()->route('departments.index')
                         ->with('success', 'Tạo đơn vị thành công!');
    }

    /**
     * Chi tiết đơn vị
     */
    public function show(Department $department): JsonResponse|View
    {
       if (request()->wantsJson()) {
            return response()->json(['success' => true, 'data' => $department]);
        }

        return view('app');
    }

    /**
     * Form chỉnh sửa
     */
    public function edit(Department $department): View
    {
        return view('app', compact('department'));
    }

    /**
     * Cập nhật đơn vị
     */
    public function update(Request $request, Department $department): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'd_name'        => 'required|string|max:255',
            'd_description' => 'nullable|string|max:1000',
        ]);

        $department->update($validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Cập nhật thành công!',
                'data'    => $department
            ]);
        }

        return redirect()->route('departments.index')
                         ->with('success', 'Cập nhật thành công!');
    }

    /**
     * Xóa đơn vị
     */
    public function destroy(Department $department): JsonResponse|RedirectResponse
    {
        // Không cho xóa nếu còn người dùng
        if ($department->users()->exists()) {
            $message = 'Không thể xóa vì vẫn còn nhân viên thuộc đơn vị này.';
            if (request()->wantsJson()) {
                return response()->json(['success' => false, 'message' => $message], 422);
            }
            return redirect()->route('departments.index')->withErrors($message);
        }

        $department->delete();

        if (request()->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Xóa đơn vị thành công!']);
        }

        return redirect()->route('departments.index')
                         ->with('success', 'Xóa đơn vị thành công!');
    }

    /**
     * Form gán người dùng vào đơn vị
     */
    public function assignUsers(Department $department): View
    {
        $users = User::all();
        return view('app', compact('department', 'users'));
    }

    /**
     * Thực hiện gán người dùng + vai trò
     */
    public function storeAssignUsers(Request $request, Department $department): JsonResponse|RedirectResponse
    {
        if (!Auth::user()->canManageUsers() && !Auth::user()->isManager()) {
            $msg = 'Bạn không có quyền gán người dùng.';
            return $request->wantsJson()
                ? response()->json(['success' => false, 'message' => $msg], 403)
                : redirect()->back()->withErrors($msg);
        }

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,user_id',
            'role'       => 'required|in:manager,member,Manager,Member',
        ]);

        // Vì không còn phân biệt unit/team nên dùng level mặc định là 'unit'
        $roleName = strtolower(trim($validated['role']));

        $role = Role::whereRaw('LOWER(role_name) = ?', [$roleName])
                    ->where('level', 'unit')
                    ->firstOrFail();

        User::whereIn('user_id', $validated['user_ids'])
            ->update([
                'department_id' => $department->department_id,
                'role_id'       => $role->role_id,
            ]);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Gán người dùng và vai trò thành công!']);
        }

        return redirect()->route('departments.index')
                         ->with('success', 'Gán người dùng và vai trò thành công!');
    }
}