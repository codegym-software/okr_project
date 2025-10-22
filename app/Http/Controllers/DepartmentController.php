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
     * Hiển thị danh sách phòng ban và đội nhóm.
     */
    public function index(Request $request): JsonResponse|View
    {
        $type = $request->query('type');
        $query = Department::query();

        if ($type && in_array($type, ['phòng ban', 'đội nhóm'])) {
            $query->where('type', $type);
        }

        $departments = $query->with([
            'parentDepartment',
            'users' => function ($query) {
                $query->select('user_id', 'full_name', 'email', 'department_id');
            }
        ])
            ->orderBy('created_at', 'asc')
            ->get();

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'data' => $departments]);
        }

        return view('app');
    }

    /**
     * Hiển thị form tạo phòng ban hoặc đội nhóm.
     */
    public function create(): View
    {
        $departments = Department::where('type', 'phòng ban')->get(); // Lấy danh sách phòng ban cho parent_department_id
        return view('app', compact('departments'));
    }

    /**
     * Lưu phòng ban hoặc đội nhóm mới.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        

        $validated = $request->validate([
            'd_name' => 'required|string|max:255',
            'd_description' => 'nullable|string|max:255',
            'type' => 'required|in:phòng ban,đội nhóm',
            'parent_department_id' => [
                'nullable',
                'exists:departments,department_id',
                function ($attribute, $value, $fail) use ($request) {
                    if ($request->input('type') === 'đội nhóm' && !$value) {
                        $fail('Đội nhóm phải thuộc một phòng ban.');
                    }
                    if ($request->input('type') === 'phòng ban' && $value) {
                        $fail('Phòng ban không thể có phòng ban cha.');
                    }
                },
            ],
            'email' => 'nullable|email|max:255',
        ]);

        $department = Department::create($validated);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Tạo ' . $validated['type'] . ' thành công!', 'data' => $department]);
        }

        return redirect()->route('departments.index')->with('success', 'Tạo ' . $validated['type'] . ' thành công!');
    }

    /**
     * Hiển thị chi tiết phòng ban hoặc đội nhóm.
     */
    public function show(Department $department): JsonResponse|View
    {
        if (request()->wantsJson()) {
            return response()->json(['success' => true, 'data' => $department->load('parentDepartment')]);
        }

        return view('app');
    }

    /**
     * Hiển thị form chỉnh sửa phòng ban hoặc đội nhóm.
     */
    public function edit(Department $department): View
    {
        $departments = Department::where('type', 'phòng ban')->where('department_id', '!=', $department->department_id)->get();
        return view('app', compact('department', 'departments'));
    }

    /**
     * Cập nhật phòng ban hoặc đội nhóm.
     */
    public function update(Request $request, Department $department): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'd_name' => 'required|string|max:255',
            'd_description' => 'nullable|string|max:255',
            'type' => 'required|in:phòng ban,đội nhóm',
            'parent_department_id' => [
                'nullable',
                'exists:departments,department_id',
                function ($attribute, $value, $fail) use ($request, $department) {
                    if ($request->input('type') === 'đội nhóm' && !$value) {
                        $fail('Đội nhóm phải thuộc một phòng ban.');
                    }
                    if ($request->input('type') === 'phòng ban' && $value) {
                        $fail('Phòng ban không thể có phòng ban cha.');
                    }
                    // Ngăn đội nhóm là cha của chính nó
                    if ($value == $department->department_id) {
                        $fail('Phòng ban cha không thể là chính nó.');
                    }
                },
            ],
        ]);

        $department->update($validated);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Cập nhật ' . $validated['type'] . ' thành công!', 'data' => $department]);
        }

        return redirect()->route('departments.index')->with('success', 'Cập nhật ' . $validated['type'] . ' thành công!');
    }

    /**
     * Xóa phòng ban hoặc đội nhóm.
     */
    public function destroy(Department $department): JsonResponse|RedirectResponse
    {
        // Kiểm tra xem phòng ban có đội nhóm con hoặc người dùng không
        if ($department->type === 'phòng ban' && Department::where('parent_department_id', $department->department_id)->exists()) {
            if (request()->wantsJson()) {
                return response()->json(['success' => false, 'message' => 'Không thể xóa phòng ban vì có đội nhóm thuộc về nó.'], 422);
            }
            return redirect()->route('departments.index')->withErrors(['error' => 'Không thể xóa phòng ban vì có đội nhóm thuộc về nó.']);
        }

        if ($department->users()->exists()) {
            if (request()->wantsJson()) {
                return response()->json(['success' => false, 'message' => 'Không thể xóa phòng ban vì có người dùng thuộc về nó.'], 422);
            }
            return redirect()->route('departments.index')->withErrors(['error' => 'Không thể xóa phòng ban vì có người dùng thuộc về nó.']);
        }

        $type = $department->type;
        $department->delete();

        if (request()->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Xóa ' . $type . ' thành công!']);
        }

        return redirect()->route('departments.index')->with('success', 'Xóa ' . $type . ' thành công!');
    }

    /**
     * Hiển thị form gán người dùng cho phòng ban.
     */
    public function assignUsers(Department $department): View
    {
        $users = User::all(); // Lấy tất cả người dùng
        return view('app', compact('department', 'users'));
    }

    /**
     * Gán người dùng cho phòng ban.
     */
    public function storeAssignUsers(Request $request, Department $department): JsonResponse|RedirectResponse
    {
        // Kiểm tra quyền admin hoặc unit manager
        if (!Auth::user()->canManageUsers() && !Auth::user()->isDeptManager()) {
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'message' => 'Bạn không có quyền gán người dùng.'], 403);
            }
            return redirect()->back()->withErrors('Bạn không có quyền gán người dùng.');
        }

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,user_id',
            'role' => 'nullable|string|in:manager,member,Manager,Member',
        ]);

        // Xác định role_id từ role (nếu có)
        $roleId = null;
        if (!empty($validated['role'])) {
            $roleName = strtolower($validated['role']);
            $role = Role::whereRaw('LOWER(role_name) = ?', [$roleName])->first();
            if (!$role) {
                if ($request->wantsJson()) {
                    return response()->json(['success' => false, 'message' => 'Vai trò không hợp lệ.'], 422);
                }
                return redirect()->back()->withErrors('Vai trò không hợp lệ.');
            }
            $roleId = $role->role_id;

            // Chỉ admin được gán vai trò manager
            // if ($roleName === 'manager' && !Auth::user()->isAdmin()) {
            //     if ($request->wantsJson()) {
            //         return response()->json(['success' => false, 'message' => 'Chỉ admin được gán vai trò Manager.'], 403);
            //     }
            //     return redirect()->back()->withErrors('Chỉ admin được gán vai trò Manager.');
            // }
        }

        // Cập nhật department_id và role_id (nếu có) cho các user được chọn
        $updateData = ['department_id' => $department->department_id];
        if ($roleId !== null) {
            $updateData['role_id'] = $roleId;
        }
        User::whereIn('user_id', $validated['user_ids'])->update($updateData);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Gán người dùng và vai trò thành công!']);
        }

        return redirect()->route('departments.index')->with('success', 'Gán người dùng và vai trò thành công!');
    }
}