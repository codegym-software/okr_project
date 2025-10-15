<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\Cycle;
use App\Models\Department;
use App\Models\OkrAssignment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class MyObjectiveController extends Controller
{
    /**
     * Hiển thị danh sách Objective của người dùng (chủ sở hữu hoặc được gán).
     */
    public function index(Request $request): JsonResponse|View
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $objectives = Objective::with(['keyResults', 'department', 'cycle', 'assignments.user', 'assignments.role'])
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->user_id)
                      ->orWhereHas('assignments', function ($query) use ($user) {
                          $query->where('user_id', $user->user_id);
                      });
            })
            ->paginate(10);

        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $objectives]);
        }

        return view('app');
    }

    /**
     * Hiển thị form tạo Objective.
     */
    public function create(): View
    {
        $cycles = Cycle::all();
        $departments = Department::all();
        return view('my-objectives.create', compact('cycles', 'departments'));
    }

    /**
     * Lưu Objective mới (hỗ trợ tạo kèm Key Results).
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        if (!$user) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Unauthenticated'], 401)
                : redirect()->back()->withErrors(['error' => 'Unauthenticated']);
        }

        $validated = $request->validate([
            'obj_title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'level' => 'required|in:company,unit,team,person',
            'status' => 'required|in:draft,active,completed',
            'cycle_id' => 'required|exists:cycles,cycle_id',
            'department_id' => 'nullable|exists:departments,department_id',
            'key_results' => 'nullable|array',
            'key_results.*.kr_title' => 'required|string|max:255',
            'key_results.*.target_value' => 'required|numeric|min:0',
            'key_results.*.current_value' => 'nullable|numeric|min:0',
            'key_results.*.unit' => 'required|in:number,percent,completion',
            'key_results.*.status' => 'required|in:draft,active,completed',
            'assignments' => 'nullable|array',
            'assignments.*.email' => 'required|email|exists:users,email',
        ]);

        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        if (!in_array($validated['level'], $allowedLevels)) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Bạn không có quyền tạo Objective ở cấp độ này.'], 403)
                : redirect()->back()->withErrors(['error' => 'Bạn không có quyền tạo Objective ở cấp độ này.']);
        }

        if ($validated['level'] !== 'company' && empty($validated['department_id'])) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Phải chọn phòng ban cho cấp độ không phải company.'], 422)
                : redirect()->back()->withErrors(['error' => 'Phải chọn phòng ban cho cấp độ không phải company.']);
        }

        // Kiểm tra quyền truy cập department
        if ($validated['level'] !== 'company' && !empty($validated['department_id'])) {
            $department = Department::find($validated['department_id']);
            if (!$department || !$this->userCanAccessDepartment($user, $department)) {
                return $request->expectsJson()
                    ? response()->json(['success' => false, 'message' => 'Bạn không có quyền truy cập phòng ban này.'], 403)
                    : redirect()->back()->withErrors(['error' => 'Bạn không có quyền truy cập phòng ban này.']);
            }
        }

        try {
            $objective = DB::transaction(function () use ($validated, $user) {
                $objective = Objective::create([
                    'obj_title' => $validated['obj_title'],
                    'description' => $validated['description'] ?? null,
                    'level' => $validated['level'],
                    'status' => $validated['status'],
                    'cycle_id' => $validated['cycle_id'],
                    'department_id' => $validated['department_id'] ?? null,
                    'user_id' => $user->user_id,
                ]);

                if (isset($validated['key_results'])) {
                    foreach ($validated['key_results'] as $krData) {
                        $target = (float) $krData['target_value'];
                        $current = (float) ($krData['current_value'] ?? 0);
                        $progress = $target > 0 ? max(0, min(100, ($current / $target) * 100)) : 0;

                        KeyResult::create([
                            'kr_title' => $krData['kr_title'],
                            'target_value' => $target,
                            'current_value' => $current,
                            'unit' => $krData['unit'],
                            'status' => $krData['status'],
                            'progress_percent' => $progress,
                            'objective_id' => $objective->objective_id,
                            'cycle_id' => $objective->cycle_id,
                        ]);
                    }
                }

                // Gán người dùng
                if (isset($validated['assignments'])) {
                    foreach ($validated['assignments'] as $assignment) {
                        $assignedUser = User::where('email', $assignment['email'])->first();
                        if ($assignedUser && $this->canAssignUser($user, $assignedUser, $objective)) {
                            OkrAssignment::create([
                                'user_id' => $assignedUser->user_id,
                                'objective_id' => $objective->objective_id,
                            ]);
                        }
                    }
                }

                return $objective->load(['keyResults', 'department', 'cycle', 'assignments.user', 'assignments.role']);
            });

            return $request->expectsJson()
                ? response()->json(['success' => true, 'message' => 'Objective được tạo thành công!', 'data' => $objective])
                : redirect()->route('my-objectives.index')->with('success', 'Objective được tạo thành công!');
        } catch (\Exception $e) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Tạo Objective thất bại: ' . $e->getMessage()], 500)
                : redirect()->back()->withErrors(['error' => 'Tạo Objective thất bại: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Cập nhật Objective hiện có.
     */
    public function update(Request $request, string $id): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        if (!$user) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Unauthenticated'], 401)
                : redirect()->back()->withErrors(['error' => 'Unauthenticated']);
        }

        $objective = Objective::findOrFail($id);

        // Kiểm tra quyền cập nhật: chủ sở hữu HOẶC cùng phòng ban (admin luôn được phép)
        if (!$this->canUpdateObjective($user, $objective)) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Bạn không có quyền cập nhật Objective này.'], 403)
                : redirect()->back()->withErrors(['error' => 'Bạn không có quyền cập nhật Objective này.']);
        }

        $validated = $request->validate([
            'obj_title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'level' => 'required|in:company,unit,team,person',
            'status' => 'required|in:draft,active,completed',
            'cycle_id' => 'required|exists:cycles,cycle_id',
            'department_id' => 'nullable|exists:departments,department_id',
            'assignments' => 'nullable|array',
            'assignments.*.email' => 'required|email|exists:users,email',
        ]);

        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        if (!in_array($validated['level'], $allowedLevels)) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Bạn không có quyền cập nhật Objective sang cấp độ này.'], 403)
                : redirect()->back()->withErrors(['error' => 'Bạn không có quyền cập nhật Objective sang cấp độ này.']);
        }

        // Kiểm tra quyền truy cập department
        if ($validated['level'] !== 'company' && !empty($validated['department_id'])) {
            $department = Department::find($validated['department_id']);
            if (!$department || !$this->userCanAccessDepartment($user, $department)) {
                return $request->expectsJson()
                    ? response()->json(['success' => false, 'message' => 'Bạn không có quyền truy cập phòng ban này.'], 403)
                    : redirect()->back()->withErrors(['error' => 'Bạn không có quyền truy cập phòng ban này.']);
            }
        }

        try {
            $objective = DB::transaction(function () use ($validated, $objective, $user) {
                $objective->update([
                    'obj_title' => $validated['obj_title'],
                    'description' => $validated['description'] ?? null,
                    'level' => $validated['level'],
                    'status' => $validated['status'],
                    'cycle_id' => $validated['cycle_id'],
                    'department_id' => $validated['department_id'] ?? null,
                ]);

                // Cập nhật assignments
                if (isset($validated['assignments'])) {
                    // Xóa assignments cũ
                    $objective->assignments()->delete();
                    // Thêm assignments mới
                    foreach ($validated['assignments'] as $assignment) {
                        $assignedUser = User::where('email', $assignment['email'])->first();
                        if ($assignedUser && $this->canAssignUser($user, $assignedUser, $objective)) {
                            OkrAssignment::create([
                                'user_id' => $assignedUser->user_id,
                                'objective_id' => $objective->objective_id,
                            ]);
                        }
                    }
                }

                return $objective->load(['keyResults', 'department', 'cycle', 'assignments.user', 'assignments.role']);
            });

            return $request->expectsJson()
                ? response()->json(['success' => true, 'message' => 'Objective được cập nhật thành công!', 'data' => $objective])
                : redirect()->route('my-objectives.index')->with('success', 'Objective được cập nhật thành công!');
        } catch (\Exception $e) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Cập nhật Objective thất bại: ' . $e->getMessage()], 500)
                : redirect()->back()->withErrors(['error' => 'Cập nhật Objective thất bại: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Xóa Objective.
     */
    public function destroy(string $id): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $objective = Objective::findOrFail($id);

        // Kiểm tra quyền xóa: chủ sở hữu HOẶC cùng phòng ban (admin luôn được phép)
        if (!$this->canDeleteObjective($user, $objective)) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa Objective này.'], 403);
        }

        try {
            DB::transaction(function () use ($objective) {
                $objective->keyResults()->delete();
                $objective->assignments()->delete();
                $objective->delete();
            });

            return response()->json(['success' => true, 'message' => 'Objective đã được xóa thành công!']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Xóa Objective thất bại: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Lấy chi tiết Objective (API JSON).
     */
    public function getObjectiveDetails(string $id): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $objective = Objective::with(['keyResults', 'department', 'cycle', 'assignments.user', 'assignments.role'])
            ->findOrFail($id);

        if ($objective->user_id !== $user->user_id && 
            !OkrAssignment::where('objective_id', $id)->where('user_id', $user->user_id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xem Objective này.'], 403);
        }

        return response()->json(['success' => true, 'data' => $objective]);
    }

    /**
     * Lấy chi tiết Key Result (API JSON).
     */
    public function getKeyResultDetails(string $id): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $keyResult = KeyResult::with(['objective', 'cycle'])->findOrFail($id);

        // Kiểm tra quyền: Chủ sở hữu hoặc người được gán
        if ($keyResult->objective->user_id !== $user->user_id &&
            !OkrAssignment::where('objective_id', $keyResult->objective_id)
                         ->where('user_id', $user->user_id)
                         ->exists()) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xem Key Result này.'], 403);
        }

        return response()->json(['success' => true, 'data' => $keyResult]);
    }

    /**
     * Lấy danh sách cấp độ Objective được phép dựa trên vai trò (API JSON).
     */
    public function getAllowedLevelsApi(): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $allowedLevels = $this->getAllowedLevels($user->role ? $user->role->role_name : 'member');
        return response()->json(['success' => true, 'data' => $allowedLevels]);
    }

    /**
     * Lấy danh sách cấp độ Objective được phép dựa trên vai trò.
     */
    private function getAllowedLevels(string $roleName): array
    {
        return match (strtolower($roleName)) {
            'admin' => ['company', 'unit', 'team', 'person'],
            'manager' => ['unit', 'team', 'person'],
            'member' => ['person'],
            default => ['person'],
        };
    }

    /**
     * Lấy thông tin user và các level được phép
     */
    public function getUserLevels(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
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
     * Dev: Seed sample objectives for current user
     */
    public function seedForCurrentUser(): \Illuminate\Http\JsonResponse
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        if (!app()->environment('local')) {
            return response()->json(['success' => false, 'message' => 'Not allowed in this environment'], 403);
        }

        $cycle = \App\Models\Cycle::orderByDesc('cycle_id')->first();
        if (!$cycle) {
            $cycle = \App\Models\Cycle::create([
                'cycle_name' => 'Q' . now()->quarter . ' ' . now()->year,
                'start_date' => now()->startOfQuarter(),
                'end_date' => now()->endOfQuarter(),
                'status' => 'active',
                'description' => 'Auto-created for seeding'
            ]);
        }

        $created = [];

        foreach ([
            ['title' => 'Improve product quality', 'level' => 'person'],
            ['title' => 'Increase team velocity', 'level' => 'team'],
            ['title' => 'Grow revenue', 'level' => 'unit'],
        ] as $spec) {
            $objective = \App\Models\Objective::create([
                'obj_title' => $spec['title'],
                'description' => 'Seeded objective for testing',
                'level' => $spec['level'],
                'status' => 'active',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $spec['level'] === 'company' ? null : ($user->department_id ?? null),
                'user_id' => $user->user_id,
            ]);

            $krs = [
                ['kr_title' => 'Reduce bugs reported', 'target_value' => 100, 'current_value' => 10, 'unit' => 'number', 'status' => 'active'],
                ['kr_title' => 'Automated test coverage', 'target_value' => 80, 'current_value' => 30, 'unit' => 'percent', 'status' => 'active'],
            ];
            foreach ($krs as $kr) {
                \App\Models\KeyResult::create([
                    'kr_title' => $kr['kr_title'],
                    'target_value' => $kr['target_value'],
                    'current_value' => $kr['current_value'],
                    'unit' => $kr['unit'],
                    'status' => $kr['status'],
                    'weight' => 1,
                    'department_id' => $objective->department_id,
                    'objective_id' => $objective->objective_id,
                    'cycle_id' => $cycle->cycle_id,
                    'progress_percent' => 0,
                ]);
            }

            $created[] = $objective->load('keyResults');
        }

        return response()->json(['success' => true, 'data' => $created]);
    }

    /**
     * Kiểm tra xem người dùng có quyền truy cập department không.
     */
    private function userCanAccessDepartment($user, $department): bool
    {
        if ($user->role->role_name === 'admin') {
            return true;
        }
        // Manager và Member chỉ có quyền tạo objectives cho phòng ban của họ
        if ($user->department_id === $department->department_id) {
            return true;
        }
        return false;
    }

    /**
     * Kiểm tra xem người dùng có thể gán user khác cho Objective không.
     */
    private function canAssignUser($user, $assignedUser, $objective): bool
    {
        if ($user->role->role_name === 'admin') {
            return true;
        }
        if ($objective->level !== 'company' && $objective->department_id) {
            // Chỉ gán user trong cùng department cho Objective không phải company
            return $assignedUser->department_id === $objective->department_id;
        }
        return true; // Cho phép gán bất kỳ user nào cho Objective cấp company
    }

    /**
     * Kiểm tra quyền cập nhật Objective
     */
    private function canUpdateObjective($user, $objective): bool
    {
        // Admin có quyền cập nhật tất cả
        if ($user->role->role_name === 'admin') {
            return true;
        }

        // Chủ sở hữu có quyền cập nhật
        if ($objective->user_id === $user->user_id) {
            return true;
        }

        // Member không được cập nhật objectives của người khác
        if ($user->role->role_name === 'member') {
            return false;
        }

        // Manager chỉ được cập nhật objectives trong phòng ban của họ
        if ($user->role->role_name === 'manager' && 
            $objective->department_id && 
            $objective->department_id === $user->department_id) {
            return true;
        }

        return false;
    }

    /**
     * Kiểm tra quyền xóa Objective
     */
    private function canDeleteObjective($user, $objective): bool
    {
        // Admin có quyền xóa tất cả
        if ($user->role->role_name === 'admin') {
            return true;
        }

        // Chủ sở hữu có quyền xóa
        if ($objective->user_id === $user->user_id) {
            return true;
        }

        // Member không được xóa objectives của người khác
        if ($user->role->role_name === 'member') {
            return false;
        }

        // Manager chỉ được xóa objectives trong phòng ban của họ
        if ($user->role->role_name === 'manager' && 
            $objective->department_id && 
            $objective->department_id === $user->department_id) {
            return true;
        }

        return false;
    }
}