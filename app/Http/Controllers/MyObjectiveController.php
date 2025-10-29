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
use Carbon\Carbon;

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

        $isAdmin = $user->role && strtolower($user->role->role_name) === 'admin';
        $isDashboard = $request->has('dashboard') && $request->dashboard == '1';


        $currentCycleId = null;
        $currentCycleName = null;

        if (!$request->filled('cycle_id')) {
        $now = Carbon::now('Asia/Ho_Chi_Minh');
        $year = $now->year;
        $quarter = ceil($now->month / 3);
        $cycleNameDisplay = "Quý {$quarter} năm {$year}";

        // Tìm chu kỳ theo khoảng thời gian (an toàn hơn khi cycle_name có nhiều định dạng)
        $currentCycle = Cycle::where('start_date', '<=', $now)
            ->where('end_date', '>=', $now)
            ->first();

        // Nếu không tìm được theo ngày, thử các tên chu kỳ thông dụng (Q1 2025, Q1 - 2025, Quý 1 năm 2025)
        if (!$currentCycle) {
            $possibleNames = [
                $cycleNameDisplay,
                "Q{$quarter} {$year}",
                "Q{$quarter} - {$year}",
            ];
            $currentCycle = Cycle::whereIn('cycle_name', $possibleNames)->first();
        }

        if ($currentCycle) {
            $currentCycleId = $currentCycle->cycle_id;
            $currentCycleName = $currentCycle->cycle_name;
            $request->merge(['cycle_id' => $currentCycleId]);
        } else {
            // nếu vẫn không tìm được, để currentCycleName hiển thị mặc định
            $currentCycleName = $cycleNameDisplay;
        }
        } else {
            // Nếu có cycle_id trong request, vẫn tính current để trả về
            $now = Carbon::now('Asia/Ho_Chi_Minh');
            $year = $now->year;
            $quarter = ceil($now->month / 3);
            $cycleNameDisplay = "Quý {$quarter} năm {$year}";

            $currentCycle = Cycle::where('start_date', '<=', $now)
                ->where('end_date', '>=', $now)
                ->first();

            if (!$currentCycle) {
                $possibleNames = [
                    $cycleNameDisplay,
                    "Q{$quarter} {$year}",
                    "Q{$quarter} - {$year}",
                ];
                $currentCycle = Cycle::whereIn('cycle_name', $possibleNames)->first();
            }

            if ($currentCycle) {
                $currentCycleId = $currentCycle->cycle_id;
                $currentCycleName = $currentCycle->cycle_name;
            } else {
                $currentCycleName = $cycleNameDisplay;
            }
        }
        // === XÂY DỰNG QUERY ===
        $query = Objective::with(['keyResults', 'department', 'cycle', 'assignments.user', 'assignments.role']);

        // Lọc archived
        if ($request->has('archived') && $request->archived == '1') {
            $query->whereNotNull('archived_at');
        } else {
            $query->whereNull('archived_at');
        }

        // Filter quyền
        $query->where(function ($q) use ($user, $request, $isAdmin, $isDashboard) {
            if ($request->has('my_okr') && $request->my_okr == '1') {
                $q->where('user_id', $user->user_id);
                return;
            }

            if ($isDashboard) {
                if ($isAdmin) return;
                if ($user->department_id) {
                    $q->where('department_id', $user->department_id);
                } else {
                    $q->where('user_id', $user->user_id);
                }
                return;
            }

            if ($isAdmin) return;

            $roleName = $user->role?->role_name;
            if ($roleName && strtolower($roleName) === 'manager') return;

            $q->where(function ($sub) use ($user) {
                $sub->where('user_id', $user->user_id);
                if ($user->department_id) {
                    $sub->orWhere('department_id', $user->department_id);
                }
            });
        });

        // === FILTER THEO CHU KỲ (ưu tiên từ request hoặc tự động) ===
        if ($request->filled('cycle_id')) {
            $query->where('cycle_id', $request->cycle_id);
        }

        $objectives = $query->paginate(10);

        // === TRẢ KẾT QUẢ ===
        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'data' => $objectives,
                'current_cycle_id' => $currentCycleId,
                'current_cycle_name' => $currentCycle?->cycle_name
            ]);
        }

        $cycles = Cycle::all();
        return view('app', compact('objectives', 'cycles', 'currentCycleId'));
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
            'key_results.*.unit' => 'required|in:number,percent,completion,bai,num,bài',
            'key_results.*.status' => 'required|in:draft,active,completed',
            'assignments' => 'nullable|array',
            'assignments.*.email' => 'required|email|exists:users,email',
        ]);

        // Đảm bảo user có role, nếu không có thì gán role mặc định
        if (!$user->role) {
            $defaultRole = \App\Models\Role::where('role_name', 'member')->first();
            if ($defaultRole) {
                $user->role_id = $defaultRole->role_id;
                $user->save();
            }
        }

        $roleName = $user->role ? $user->role->role_name : 'member';
        $allowedLevels = $this->getAllowedLevels($roleName);
        if (!in_array($validated['level'], $allowedLevels)) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Bạn không có quyền tạo Objective ở cấp độ này.'], 403)
                : redirect()->back()->withErrors(['error' => 'Bạn không có quyền tạo Objective ở cấp độ này.']);
        }

        // Chỉ yêu cầu department_id cho cấp độ unit, không yêu cầu cho person và company
        if ($validated['level'] === 'unit' && empty($validated['department_id'])) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Phải chọn phòng ban cho cấp độ phòng ban (unit).'], 422)
                : redirect()->back()->withErrors(['error' => 'Phải chọn phòng ban cho cấp độ phòng ban (unit).']);
        }

        $isAdmin = $user->role && strtolower($user->role->role_name) === 'admin';

    // Chặn tạo OKR nếu chu kỳ đã đóng (status != active)
    $cycle = Cycle::find($validated['cycle_id']);
    if ($cycle && strtolower((string)$cycle->status) !== 'active') {
            return $request->expectsJson()
        ? response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể tạo Objective mới.'], 403)
        : redirect()->back()->withErrors(['error' => 'Chu kỳ đã đóng. Không thể tạo Objective mới.']);
        }
        
        // Cho phép tất cả user tạo Objective cá nhân (person)
        if ($validated['level'] === 'person') {
            // Tất cả user đều có thể tạo Objective cá nhân
            // Không cần kiểm tra thêm
        } else {
            // Kiểm tra quyền cho các level khác
            if ($isAdmin && $validated['level'] !== 'company') {
                return $request->expectsJson()
                    ? response()->json(['success' => false, 'message' => 'Admin chỉ được tạo OKR cấp công ty.'], 403)
                    : redirect()->back()->withErrors(['error' => 'Admin chỉ được tạo OKR cấp công ty.']);
            }
            
            // Manager và Member: kiểm tra quyền
            if (!$isAdmin) {
                // Manager chỉ tạo unit (phòng ban) hoặc person (cá nhân)
                if ($user->isManager() && !in_array($validated['level'], ['unit', 'person'])) {
                    return $request->expectsJson()
                        ? response()->json(['success' => false, 'message' => 'Manager chỉ được tạo OKR cấp phòng ban hoặc cá nhân.'], 403)
                        : redirect()->back()->withErrors(['error' => 'Manager chỉ được tạo OKR cấp phòng ban hoặc cá nhân.']);
                }

                // Member chỉ tạo person (cá nhân)
                if ($user->isMember() && $validated['level'] !== 'person') {
                    return $request->expectsJson()
                        ? response()->json(['success' => false, 'message' => 'Member chỉ được tạo OKR cấp cá nhân.'], 403)
                        : redirect()->back()->withErrors(['error' => 'Member chỉ được tạo OKR cấp cá nhân.']);
                }

                // Kiểm tra quyền truy cập department cho level unit
                if ($validated['level'] === 'unit' && !empty($validated['department_id'])) {
                    // Manager/Member chỉ được tạo cho phòng ban của mình
                    if (!$user->department_id || (int)$validated['department_id'] !== (int)$user->department_id) {
                        return $request->expectsJson()
                            ? response()->json(['success' => false, 'message' => 'Bạn chỉ được tạo Objective cho phòng ban của mình.'], 403)
                            : redirect()->back()->withErrors(['error' => 'Bạn chỉ được tạo Objective cho phòng ban của mình.']);
                    }
                }
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
                            'cycle_id' => $objective->cycle_id ?? null, // Đảm bảo cycle_id có thể null
                            'department_id' => $objective->department_id ?? null,
                            'user_id' => $user->user_id, // Lưu người tạo KR
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

        $isAdmin = $user->role && strtolower($user->role->role_name) === 'admin';
        
        // Kiểm tra ownership: chỉ owner hoặc admin mới được sửa (nhưng admin có giới hạn)
        if (!$isAdmin && $objective->user_id !== $user->user_id) {
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

    // Chặn sửa nếu chu kỳ đã đóng (status != active)
    $cycle = Cycle::find($validated['cycle_id']);
    if ($cycle && strtolower((string)$cycle->status) !== 'active') {
            return $request->expectsJson()
        ? response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể chỉnh sửa Objective.'], 403)
        : redirect()->back()->withErrors(['error' => 'Chu kỳ đã đóng. Không thể chỉnh sửa Objective.']);
        }

        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        if (!in_array($validated['level'], $allowedLevels)) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Bạn không có quyền cập nhật Objective sang cấp độ này.'], 403)
                : redirect()->back()->withErrors(['error' => 'Bạn không có quyền cập nhật Objective sang cấp độ này.']);
        }

        // Admin CHỈ được cập nhật OKR cấp công ty (company)
        if ($isAdmin && $validated['level'] !== 'company') {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Admin chỉ được cập nhật OKR cấp công ty.'], 403)
                : redirect()->back()->withErrors(['error' => 'Admin chỉ được cập nhật OKR cấp công ty.']);
        }
        
        // Manager và Member: kiểm tra quyền
        if (!$isAdmin) {
            // Manager chỉ sửa unit (phòng ban) hoặc person (cá nhân)
            if ($user->isManager() && !in_array($validated['level'], ['unit', 'person'])) {
                return $request->expectsJson()
                    ? response()->json(['success' => false, 'message' => 'Manager chỉ được sửa OKR cấp phòng ban hoặc cá nhân.'], 403)
                    : redirect()->back()->withErrors(['error' => 'Manager chỉ được sửa OKR cấp phòng ban hoặc cá nhân.']);
            }

            // Member chỉ sửa person (cá nhân)
            if ($user->isMember() && $validated['level'] !== 'person') {
                return $request->expectsJson()
                    ? response()->json(['success' => false, 'message' => 'Member chỉ được sửa OKR cấp cá nhân.'], 403)
                    : redirect()->back()->withErrors(['error' => 'Member chỉ được sửa OKR cấp cá nhân.']);
            }

            // Kiểm tra quyền truy cập department cho level unit
            if ($validated['level'] === 'unit' && !empty($validated['department_id'])) {
                // Manager/Member chỉ được sửa cho phòng ban của mình
                if (!$user->department_id || (int)$validated['department_id'] !== (int)$user->department_id) {
                    return $request->expectsJson()
                        ? response()->json(['success' => false, 'message' => 'Bạn chỉ được sửa Objective cho phòng ban của mình.'], 403)
                        : redirect()->back()->withErrors(['error' => 'Bạn chỉ được sửa Objective cho phòng ban của mình.']);
                }
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

                // Cập nhật department_id cho tất cả Key Results của Objective
                KeyResult::where('objective_id', $objective->objective_id)
                    ->update(['department_id' => $validated['department_id'] ?? null]);

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

        $isAdmin = $user->role && strtolower($user->role->role_name) === 'admin';
        
        // Kiểm tra ownership: chỉ owner được xóa (trừ admin)
        if (!$isAdmin && $objective->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn chỉ được xóa Objective do bạn tạo.'], 403);
        }
        
        // Admin CHỈ được xóa OKR cấp công ty (company)
        if ($isAdmin && $objective->level !== 'company') {
            return response()->json(['success' => false, 'message' => 'Admin chỉ được xóa OKR cấp công ty.'], 403);
        }
        
        // Manager chỉ được xóa OKR cấp unit hoặc person
        if ($user->isManager() && !in_array($objective->level, ['unit', 'person'])) {
            return response()->json(['success' => false, 'message' => 'Manager chỉ được xóa OKR cấp phòng ban hoặc cá nhân.'], 403);
        }
        
        // Member chỉ được xóa OKR cấp person
        if ($user->isMember() && $objective->level !== 'person') {
            return response()->json(['success' => false, 'message' => 'Member chỉ được xóa OKR cấp cá nhân.'], 403);
        }

        // Chặn xóa nếu chu kỳ đã đóng (status != active)
        $objective->load('cycle');
        if ($objective->cycle && strtolower((string)$objective->cycle->status) !== 'active') {
            return response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể xóa Objective.'], 403);
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
     * Lấy danh sách cấp độ Objective được phép dựa trên vai trò.
     */
    public function getAllowedLevelsApi(): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        return response()->json(['success' => true, 'data' => $allowedLevels]);
    }

    /**
     * Lấy danh sách cấp độ Objective được phép dựa trên vai trò.
     * - Admin: chỉ tạo OKR cấp công ty (company)
     * - Manager: tạo OKR cấp phòng ban (unit) và cá nhân (person)
     * - Member: chỉ tạo OKR cấp cá nhân (person)
     */
    private function getAllowedLevels(string $roleName): array
    {
        return match ($roleName) {
            'admin' => ['company', 'person'],  // Admin CHỈ tạo OKR cấp công ty
            'manager' => ['unit', 'person'],  // Manager tạo OKR phòng ban + cá nhân
            'member' => ['person'],  // Member chỉ tạo OKR cá nhân
            default => ['person'],
        };
    }

    /**
     * Kiểm tra xem người dùng có quyền truy cập department không.
     */
    private function userCanAccessDepartment($user, $department): bool
    {
        if ($user->role->role_name === 'admin') {
            return true;
        }
        if ($user->role->role_name === 'manager' && $user->department_id === $department->department_id) {
            return true;
        }
        // Member có thể truy cập department của chính họ
        if ($user->role->role_name === 'member' && $user->department_id === $department->department_id) {
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
}
