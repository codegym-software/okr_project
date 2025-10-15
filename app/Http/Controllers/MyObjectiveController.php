<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\Department;
use App\Models\Cycle;
use App\Models\KeyResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class MyObjectiveController extends Controller
{
    /**
     * Hiển thị danh sách OKR theo quyền người dùng
     */
    public function index(Request $request): View|JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            abort(403, 'Unauthorized: No authenticated user found.');
        }

        $startTime = microtime(true);

        // Xác định level dựa trên role
        $allowedLevels = $this->getAllowedLevels($user->role ? $user->role->role_name : 'member');
        $currentLevel = $allowedLevels[0]; // Lấy level đầu tiên làm mặc định cho index

        $query = Objective::with(['user', 'department', 'keyResults', 'cycle'])
            ->whereIn('level', $allowedLevels);

        // Admin có thể xem tất cả objectives, các role khác chỉ xem của mình/phòng ban
        if (!$user->isAdmin()) {
            $query->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                      ->orWhereHas('department', function ($q) use ($user) {
                          $q->where('department_id', $user->department_id);
                      });
            });
        }

        $query->orderBy('created_at', 'desc');

        // Ghi log truy vấn SQL và bindings trước khi paginate
        Log::info('Index objectives', [
            'user_id' => $user->id,
            'allowed_levels' => $allowedLevels,
            'current_level' => $currentLevel,
            'department_id' => $user->department_id,
            'role_name' => $user->role ? $user->role->role_name : 'unknown'
        ]);

        $objectives = $query->get();

        $endTime = microtime(true);
        $executionTime = round(($endTime - $startTime) * 1000, 2);

        Log::info('Objectives loaded successfully', [
            'user_id' => $user->id,
            'count' => $objectives->count(),
            'execution_time_ms' => $executionTime
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'data' => $objectives,
                'meta' => [
                    'allowed_levels' => $allowedLevels,
                    'current_level' => $currentLevel,
                    'execution_time_ms' => $executionTime
                ]
            ]);
        }

        return view('app');
    }

    /**
     * Hiển thị form tạo Objective
     */
    public function create(Request $request): View
    {
        return view('app');
    }

    /**
     * Lưu Objective mới
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        
        $request->validate([
            'obj_title' => 'required|string|max:255',
            'level' => 'required|string|in:Công ty,Phòng ban,Nhóm,Cá nhân',
            'description' => 'nullable|string',
            'cycle_id' => 'required|exists:cycles,cycle_id',
            'department_id' => 'nullable|exists:departments,department_id',
        ]);

        // Kiểm tra quyền tạo Objective theo level
        $allowedLevels = $this->getAllowedLevels($user->role ? $user->role->role_name : 'member');
        if (!in_array($request->level, $allowedLevels)) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Bạn không có quyền tạo Objective cấp ' . $request->level], 403);
            }
            return redirect()->back()->withErrors(['error' => 'Bạn không có quyền tạo Objective cấp ' . $request->level]);
        }

        // Kiểm tra quyền tạo Objective cho phòng ban
        if ($request->level === 'Phòng ban' && $request->department_id) {
            // Admin có thể tạo cho bất kỳ phòng ban nào, Manager và Member chỉ cho phòng ban của mình
            if (!$user->isAdmin() && $user->department_id != $request->department_id) {
                if ($request->expectsJson()) {
                    return response()->json(['success' => false, 'message' => 'Bạn chỉ có thể tạo Objective cho phòng ban của mình'], 403);
                }
                return redirect()->back()->withErrors(['error' => 'Bạn chỉ có thể tạo Objective cho phòng ban của mình']);
            }
        }

        $objective = Objective::create([
            'obj_title' => $request->obj_title,
            'level' => $request->level,
            'description' => $request->description,
            'user_id' => $user->id,
            'cycle_id' => $request->cycle_id,
            'department_id' => $request->department_id,
            'status' => 'active',
            'progress_percent' => 0,
        ]);

        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $objective]);
        }
        return redirect()->route('my-objectives.index')->with('success', 'Tạo objective thành công!');
    }

    /**
     * Hiển thị form chỉnh sửa Objective
     */
    public function edit(string $id): View
    {
        return view('app');
    }

    /**
     * Cập nhật Objective
     */
    public function update(Request $request, string $id)
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($id);

        // Kiểm tra quyền sở hữu và level
        if ($objective->user_id !== $user->id) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Bạn không có quyền chỉnh sửa objective này'], 403);
            }
            return back()->withErrors(['error' => 'Bạn không có quyền chỉnh sửa objective này']);
        }

        // Kiểm tra quyền thay đổi level nếu có
        if ($request->has('level') && $request->level !== $objective->level) {
            $allowedLevels = $this->getAllowedLevels($user->role ? $user->role->role_name : 'member');
            if (!in_array($request->level, $allowedLevels)) {
                if ($request->expectsJson()) {
                    return response()->json(['success' => false, 'message' => 'Bạn không có quyền thay đổi Objective sang cấp ' . $request->level], 403);
                }
                return back()->withErrors(['error' => 'Bạn không có quyền thay đổi Objective sang cấp ' . $request->level]);
            }
        }

        $request->validate([
            'obj_title' => 'nullable|string|max:255',
            'level' => 'nullable|string|in:Công ty,Phòng ban,Nhóm,Cá nhân',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive,completed',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
        ]);

        $objective->update($request->only([
            'obj_title', 'level', 'description', 'status', 'progress_percent'
        ]));

        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $objective]);
        }
        return redirect()->route('my-objectives.index')->with('success', 'Cập nhật objective thành công!');
    }

    /**
     * Xóa Objective
     */
    public function destroy(string $id)
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($id);

        // Kiểm tra quyền sở hữu
        if ($objective->user_id !== $user->user_id) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa objective này'], 403);
            }
            return back()->withErrors(['error' => 'Bạn không có quyền xóa objective này']);
        }

        $objective->delete();

        if (request()->expectsJson()) {
            return response()->json(['success' => true, 'message' => 'Xóa objective thành công!']);
        }
        return redirect()->route('my-objectives.index')->with('success', 'Xóa objective thành công!');
    }

    /**
     * Lấy thông tin user và các level được phép
     */
    public function getUserLevels(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $allowedLevels = $this->getAllowedLevels($user->role ? $user->role->role_name : 'member');
        
        return response()->json([
            'success' => true,
            'user_role' => $user->role ? $user->role->role_name : 'member',
            'allowed_levels' => $allowedLevels,
            'user_department_id' => $user->department_id
        ]);
    }

    /**
     * Lấy danh sách level được phép tạo theo role
     */
    private function getAllowedLevels(string $roleName): array
    {
        return match (strtolower($roleName)) {
            'admin' => ['Công ty', 'Phòng ban', 'Nhóm', 'Cá nhân'],
            'manager' => ['Phòng ban', 'Nhóm', 'Cá nhân'],
            'member' => ['Nhóm', 'Cá nhân'], // Member chỉ có thể tạo objectives cấp Nhóm và Cá nhân
            default => ['Nhóm', 'Cá nhân'],
        };
    }
}