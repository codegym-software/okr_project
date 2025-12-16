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
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;
use Carbon\Carbon;

class MyObjectiveController extends Controller
{
    public function archive(Request $request, $id): JsonResponse
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($id);

        if ($objective->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn chỉ được lưu trữ OKR của mình.'], 403);
        }

        if ($objective->archived_at) {
            return response()->json(['success' => false, 'message' => 'OKR đã được lưu trữ.'], 422);
        }

        $objective->archived_at = now();
        $objective->save();

        return response()->json(['success' => true, 'message' => 'OKR đã được lưu trữ.']);
    }

    public function unarchive(Request $request, $id): JsonResponse
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($id);

        if ($objective->user_id !== $user->user_id && !$user->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Không có quyền.'], 403);
        }

        $objective->archived_at = null;
        $objective->save();

        return response()->json(['success' => true, 'message' => 'Đã bỏ lưu trữ OKR.']);
    }

    /**
     * Hiển thị danh sách Objective của người dùng (chủ sở hữu hoặc được gán).
     */
    public function index(Request $request): JsonResponse|View
    {
        $user = Auth::user()->load('department');
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $currentCycleId = null;
        $currentCycleName = null;
        
        // Kiểm tra nếu là request từ dashboard
        $isDashboard = $request->boolean('dashboard') || $request->has('dashboard');

        if (!$request->filled('cycle_id')) {
            $now = Carbon::now('Asia/Ho_Chi_Minh');
            $year = $now->year;
            $quarter = ceil($now->month / 3);
            $cycleNameDisplay = "Quý {$quarter} năm {$year}";

            $currentCycle = Cycle::where('start_date', '<=', $now)
                ->where('end_date', '>=', $now)
                ->first();

            if (!$currentCycle) {
                $possibleNames = [$cycleNameDisplay, "Q{$quarter} {$year}", "Q{$quarter} - {$year}"];
                $currentCycle = Cycle::whereIn('cycle_name', $possibleNames)->first();
            }

            if ($currentCycle) {
                $currentCycleId = $currentCycle->cycle_id;
                $currentCycleName = $currentCycle->cycle_name;
                $request->merge(['cycle_id' => $currentCycleId]);
            } else {
                $currentCycleName = $cycleNameDisplay;
            }
        } else {
            $currentCycle = Cycle::find($request->cycle_id);
            if ($currentCycle) $currentCycleName = $currentCycle->cycle_name;
        }
        
        $userId = $user->user_id;
        $query = Objective::with(['keyResults.assignedUser.department', 'keyResults.assignedUser.role', 'department', 'cycle', 'assignments.user.department', 'assignments.user.role', 'assignments.role', 'user.department', 'user.role'])
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)
                ->orWhereHas('keyResults', function ($subQuery) use ($userId) {
                    $subQuery->where('assigned_to', $userId);
                });
            });


        // Filter by view_mode: 'levels' or 'personal'
        $viewMode = $request->input('view_mode', 'levels'); 
        if ($viewMode === 'personal') {
            $query->where('level', 'person');
        } else { // 'levels'
            $query->whereIn('level', ['company', 'unit', 'team']);
        }

        if ($request->has('archived') && $request->archived == '1') {
            $query->whereNotNull('archived_at')
                ->orWhereHas('keyResults', function ($q) {
                    $q->whereNotNull('archived_at');
                });
        } else {
            $query->whereNull('archived_at');
        }

        if ($request->filled('cycle_id')) {
            $query->where('cycle_id', $request->cycle_id);
        }
        
        // Filter my_okr nếu có (chỉ cho dashboard)
        if ($isDashboard && $request->boolean('my_okr')) {
            $query->where('user_id', $user->user_id);
        }

        if ($request->boolean('include_archived_kr')) {
            $query->with(['keyResults' => function ($q) {
                $q->with(['assignedUser.department', 'assignedUser.role']);
            }]);
        } else {
            $query->with([
                'keyResults' => fn($q) => $q
                    ->with(['assignedUser.department', 'assignedUser.role'])
                    ->whereNull('archived_at'),
            ]);
        }

        // Dashboard có thể cần per_page lớn hơn
        $perPage = $isDashboard ? ($request->integer('per_page') ?: 1000) : 10;
        $objectives = $query->orderBy('created_at', 'desc')->paginate($perPage);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'data' => $objectives,
                'current_cycle_id' => $currentCycleId,
                'current_cycle_name' => $currentCycleName,
                'user_department_name' => $user->department->d_name ?? null,
            ]);
        }

        $cycles = Cycle::all();
        return view('app', compact('objectives', 'cycles', 'currentCycleId'));
    }

    public function archivedKeyResults(Request $request)
    {
        $user = Auth::user();
        $archivedKRs = KeyResult::with('objective')
            ->whereHas('objective', fn($q) => $q->where('user_id', $user->user_id))
            ->whereNotNull('archived_at')
            ->get();

        return response()->json(['success' => true, 'data' => $archivedKRs]);
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
     * Lưu Objective mới 
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
            'status' => 'nullable|in:on_track,at_risk,behind,completed',
            'cycle_id' => 'nullable|exists:cycles,cycle_id',
            'department_id' => 'nullable|exists:departments,department_id',
            'key_results' => 'nullable|array',
            'key_results.*.kr_title' => 'required|string|max:255',
            'key_results.*.target_value' => 'required|numeric|min:0',
            'key_results.*.current_value' => 'nullable|numeric|min:0',
            'key_results.*.unit' => 'required|in:number,percent,currency,completion',
            'key_results.*.status' => 'required|in:not_start,on_track,at_risk,in_trouble,completed',
            'assignments' => 'nullable|array',
            'assignments.*.email' => 'required|email|exists:users,email',
        ]);

        // Tự động lấy current cycle nếu không có cycle_id
        if (empty($validated['cycle_id'])) {
            $currentCycle = $this->getCurrentCycle();
            if ($currentCycle) {
                $validated['cycle_id'] = $currentCycle->cycle_id;
            } else {
                return $request->expectsJson()
                    ? response()->json(['success' => false, 'message' => 'Không tìm thấy chu kỳ hiện tại. Vui lòng chọn chu kỳ.'], 422)
                    : redirect()->back()->withErrors(['error' => 'Không tìm thấy chu kỳ hiện tại. Vui lòng chọn chu kỳ.']);
            }
        }

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
            // if ($isAdmin && $validated['level'] !== 'company') {
            //     return $request->expectsJson()
            //         ? response()->json(['success' => false, 'message' => 'Admin chỉ được tạo OKR cấp công ty.'], 403)
            //         : redirect()->back()->withErrors(['error' => 'Admin chỉ được tạo OKR cấp công ty.']);
            // }
            
            // Manager và Member: kiểm tra quyền
            if (!$isAdmin) {
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
                // Tự động tính status từ progress và chu kỳ
                $initialProgress = 0.0;
                $cycle = Cycle::find($validated['cycle_id']);
                $initialStatus = $this->calculateStatusFromProgress($initialProgress, $cycle);
                
                $objective = Objective::create([
                    'obj_title' => $validated['obj_title'],
                    'description' => $validated['description'] ?? null,
                    'level' => $validated['level'],
                    'status' => $validated['status'] ?? $initialStatus, // Tự động tính nếu không có
                    'cycle_id' => $validated['cycle_id'],
                    'department_id' => $validated['department_id'] ?? null,
                    'user_id' => $user->user_id,
                    'progress_percent' => $initialProgress,
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
                            'cycle_id' => $objective->cycle_id ?? null, 
                            'department_id' => $objective->department_id ?? null,
                            'user_id' => $user->user_id, 
                        ]);
                    }
                    // Cập nhật updated_at của Objective khi tạo KR mới
                    $objective->touch();
                }

                // Tự động tính lại progress và status từ KeyResults (nếu có)
                if (isset($validated['key_results']) && count($validated['key_results']) > 0) {
                    $objective->refresh();
                    $objective->updateProgressFromKeyResults();
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

                return $objective->load(['keyResults', 'department', 'cycle', 'user.department', 'user.role', 'assignments.user.department', 'assignments.user.role', 'assignments.role']);
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
            'status' => 'nullable|in:on_track,at_risk,behind,completed',
            'cycle_id' => 'nullable|exists:cycles,cycle_id',
            'department_id' => 'nullable|exists:departments,department_id',
            'assignments' => 'nullable|array',
            'assignments.*.email' => 'required|email|exists:users,email',
        ]);

        // Tự động lấy current cycle nếu không có cycle_id (giữ nguyên cycle cũ nếu đang sửa)
        if (empty($validated['cycle_id'])) {
            // Khi sửa, giữ nguyên cycle_id của Objective hiện tại
            $validated['cycle_id'] = $objective->cycle_id;
            
            // Nếu Objective cũng không có cycle_id, lấy current cycle
            if (empty($validated['cycle_id'])) {
                $currentCycle = $this->getCurrentCycle();
                if ($currentCycle) {
                    $validated['cycle_id'] = $currentCycle->cycle_id;
                } else {
                    return $request->expectsJson()
                        ? response()->json(['success' => false, 'message' => 'Không tìm thấy chu kỳ hiện tại. Vui lòng chọn chu kỳ.'], 422)
                        : redirect()->back()->withErrors(['error' => 'Không tìm thấy chu kỳ hiện tại. Vui lòng chọn chu kỳ.']);
                }
            }
        }

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
        // if ($isAdmin && $validated['level'] !== 'company') {
        //     return $request->expectsJson()
        //         ? response()->json(['success' => false, 'message' => 'Admin chỉ được cập nhật OKR cấp công ty.'], 403)
        //         : redirect()->back()->withErrors(['error' => 'Admin chỉ được cập nhật OKR cấp công ty.']);
        // }
        
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
                // Tự động tính status từ progress và chu kỳ hiện tại nếu không có status trong request
                $status = $validated['status'] ?? null;
                if (!$status) {
                    $currentProgress = $objective->progress_percent ?? 0.0;
                    $cycle = $objective->cycle ?? $objective->cycle()->first();
                    $status = $this->calculateStatusFromProgress($currentProgress, $cycle);
                }
                
                $objective->update([
                    'obj_title' => $validated['obj_title'],
                    'description' => $validated['description'] ?? null,
                    'level' => $validated['level'],
                    'status' => $status,
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

                return $objective->load(['keyResults', 'department', 'cycle', 'user.department', 'user.role', 'assignments.user.department', 'assignments.user.role', 'assignments.role']);
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
        // if ($isAdmin && $objective->level !== 'company') {
        //     return response()->json(['success' => false, 'message' => 'Admin chỉ được xóa OKR cấp công ty.'], 403);
        // }
        
        // Manager chỉ được xóa OKR cấp unit hoặc person
        if ($user->isManager() && !in_array($objective->level, ['unit', 'person'])) {
            return response()->json(['success' => false, 'message' => 'Manager chỉ được xóa OKR cấp phòng ban hoặc cá nhân.'], 403);
        }
        
        // Member chỉ được xóa OKR cấp person
        if ($user->isMember() && $objective->level !== 'person') {
            return response()->json(['success' => false, 'message' => 'Member chỉ được xóa OKR cấp cá nhân.'], 403);
        }

        // Chặn xóa nếu chu kỳ đã đóng (status != active)
        // $objective->load('cycle');
        // if ($objective->cycle && strtolower((string)$objective->cycle->status) !== 'active') {
        //     return response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể xóa Objective.'], 403);
        // }

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

        $objective = Objective::with([
            'keyResults' => function ($query) {
                $query->with(['assignedUser.role', 'assignedUser.department', 'checkIns.user'])->orderBy('created_at');
            },
            'department',
            'cycle',
            'assignments.user.department',
            'assignments.user.role',
            'assignments.role',
            'comments',
            'childObjectives' => function ($query) {
                $query->with(['sourceObjective.user', 'sourceObjective.department']);
            },
            'sourceLinks' => function ($query) {
                $query->with(['targetObjective.user', 'targetObjective.department']);
            }
        ])
            ->where('user_id', $user->user_id) 
            ->find($id);

        if (!$objective) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy hoặc bạn không có quyền xem.'], 404);
        }

        // Manually construct the response to ensure all data is included
        $data = $objective->attributesToArray();
        $data['user'] = $objective->user;
        $data['department'] = $objective->department;
        $data['cycle'] = $objective->cycle;
        $data['key_results'] = $objective->keyResults->map(function($kr) { return $kr->toArray(); })->values()->all();
        $data['child_objectives'] = $objective->childObjectives->map(function($link) { return $link->toArray(); })->values()->all();
        $data['source_links'] = $objective->sourceLinks->map(function($link) { return $link->toArray(); })->values()->all();
        $data['comments'] = $objective->comments->map(function($comment) { return $comment->toArray(); })->values()->all();
        $data['progress_percent'] = $objective->progress_percent;

        return response()->json(['success' => true, 'data' => $data]);
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

        // Tìm KeyResult, bao gồm cả archived để có thể xem chi tiết
        $keyResult = KeyResult::with(['objective', 'cycle'])
            ->where('kr_id', $id)
            ->first();

        if (!$keyResult) {
            return response()->json([
                'success' => false, 
                'message' => 'Không tìm thấy Key Result với ID: ' . $id
            ], 404);
        }

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
        return match (strtolower($roleName)) {
            'admin' => ['company'],  
            'ceo' => ['company'],
            'manager' => ['unit', 'person'],  
            'member' => ['person'],  
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
            return $assignedUser->department_id === $objective->department_id;
        }
        return true;
    }

    /**
     * Lấy danh sách OKR cần check-in (chưa check-in > 7 ngày hoặc chưa check-in lần nào)
     */
    public function getCheckInReminders(): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
            }

            $now = Carbon::now();

            // Lấy OKR cá nhân của user trong chu kỳ active
            $objectives = Objective::where('user_id', $user->user_id)
                ->where('level', 'person')
                ->whereHas('cycle', function ($query) {
                    $query->where('status', 'active');
                })
                ->with(['keyResults' => function ($query) {
                    $query->where('status', '!=', 'completed')
                        ->whereNull('archived_at')
                        ->with(['checkIns' => function ($q) {
                            $q->latest('created_at')->limit(1);
                        }]);
                }])
                ->get();

            Log::info('Check-in reminders: Found objectives', [
                'user_id' => $user->user_id,
                'objectives_count' => $objectives->count(),
            ]);

            $reminders = [];
            
            foreach ($objectives as $objective) {
                // Sử dụng keyResults (camelCase) thay vì key_results
                $keyResults = $objective->keyResults ?? $objective->key_results ?? collect();
                
                if (!$keyResults || $keyResults->isEmpty()) {
                    continue;
                }

                $krsNeedingCheckIn = [];
                
                foreach ($keyResults as $kr) {
                    $needsReminder = false;
                    $lastCheckInDate = null;
                    $daysSinceLastCheckIn = null;

                    // Lấy check-in mới nhất
                    $checkIns = $kr->checkIns ?? collect();
                    $latestCheckIn = $checkIns->isNotEmpty() 
                        ? $checkIns->first() 
                        : null;
                    
                    if ($latestCheckIn) {
                        $lastCheckInDate = Carbon::parse($latestCheckIn->created_at);
                        $daysSinceLastCheckIn = $now->diffInDays($lastCheckInDate);
                        
                        // Nhắc nhở nếu chưa check-in trong tuần này (>= 7 ngày)
                        // Hoặc nếu chưa check-in trong 1 ngày để nhắc nhở sớm hơn (hiển thị ngay khi đăng nhập)
                        if ($daysSinceLastCheckIn >= 1) {
                            $needsReminder = true;
                        }
                    } else {
                        // Chưa check-in lần nào - luôn nhắc nhở ngay
                        $krCreatedAt = $kr->created_at ? Carbon::parse($kr->created_at) : Carbon::parse($objective->created_at);
                        $daysSinceCreation = $now->diffInDays($krCreatedAt);
                        
                        // Nhắc nhở ngay nếu chưa check-in lần nào (không cần grace period)
                        $needsReminder = true;
                        $daysSinceLastCheckIn = $daysSinceCreation;
                    }

                    if ($needsReminder) {
                        $krsNeedingCheckIn[] = [
                            'kr_id' => $kr->kr_id,
                            'kr_title' => $kr->kr_title,
                            'progress_percent' => $kr->progress_percent ?? 0,
                            'current_value' => $kr->current_value ?? 0,
                            'target_value' => $kr->target_value ?? 0,
                            'unit' => $kr->unit ?? '',
                            'days_since_last_checkin' => $daysSinceLastCheckIn,
                            'last_checkin_date' => $lastCheckInDate ? $lastCheckInDate->format('Y-m-d H:i:s') : null,
                        ];
                    }
                }

                if (!empty($krsNeedingCheckIn)) {
                    $reminders[] = [
                        'objective_id' => $objective->objective_id,
                        'objective_title' => $objective->obj_title,
                        'key_results' => $krsNeedingCheckIn,
                        'total_krs_needing_checkin' => count($krsNeedingCheckIn),
                    ];
                }
            }

            $totalObjectives = count($reminders);
            $totalKeyResults = array_sum(array_column($reminders, 'total_krs_needing_checkin'));

            Log::info('Check-in reminders: Summary', [
                'user_id' => $user->user_id,
                'total_objectives' => $totalObjectives,
                'total_key_results' => $totalKeyResults,
                'has_reminders' => $totalKeyResults > 0,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'reminders' => $reminders,
                    'total_objectives' => $totalObjectives,
                    'total_key_results' => $totalKeyResults,
                    'has_reminders' => $totalKeyResults > 0,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getCheckInReminders: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi lấy thông báo nhắc nhở: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lấy chu kỳ hiện tại (active cycle)
     */
    private function getCurrentCycle(): ?Cycle
    {
        $now = Carbon::now('Asia/Ho_Chi_Minh');
        
        // Tìm cycle đang active (start_date <= now <= end_date)
        $currentCycle = Cycle::where('start_date', '<=', $now)
            ->where('end_date', '>=', $now)
            ->where('status', 'active')
            ->first();

        if ($currentCycle) {
            return $currentCycle;
        }

        // Nếu không tìm thấy, tìm theo tên cycle (Quý X năm Y)
        $year = $now->year;
        $quarter = ceil($now->month / 3);
        $possibleNames = [
            "Quý {$quarter} năm {$year}",
            "Q{$quarter} {$year}",
            "Q{$quarter} - {$year}",
        ];

        $currentCycle = Cycle::whereIn('cycle_name', $possibleNames)
            ->where('status', 'active')
            ->first();

        return $currentCycle;
    }

    /**
     * Tính trạng thái Objective dựa trên tiến độ và thời gian trong chu kỳ
     * 
     * @param float $progress Tiến độ (0-100)
     * @param \App\Models\Cycle|null $cycle Chu kỳ của Objective
     * @return string Trạng thái: on_track, at_risk, behind, completed
     */
    private function calculateStatusFromProgress(float $progress, ?\App\Models\Cycle $cycle = null): string
    {
        // Nếu đã hoàn thành 100%
        if ($progress >= 100) {
            return 'completed';
        }
        
        // Nếu không có chu kỳ, dùng logic cũ dựa trên progress
        if (!$cycle || !$cycle->start_date || !$cycle->end_date) {
            if ($progress >= 80) {
                return 'on_track';
            }
            if ($progress >= 50) {
                return 'at_risk';
            }
            return 'behind';
        }
        
        $now = \Carbon\Carbon::now('Asia/Ho_Chi_Minh');
        $startDate = \Carbon\Carbon::parse($cycle->start_date);
        $endDate = \Carbon\Carbon::parse($cycle->end_date);
        
        // Tính % thời gian đã trôi qua trong chu kỳ
        $totalDays = $startDate->diffInDays($endDate);
        if ($totalDays <= 0) {
            // Chu kỳ đã kết thúc hoặc không hợp lệ
            if ($progress >= 100) {
                return 'completed';
            }
            return 'behind';
        }
        
        $elapsedDays = $startDate->diffInDays($now);
        $expectedProgress = min(100, max(0, ($elapsedDays / $totalDays) * 100));
        
        // Nếu thời gian đã trôi qua < 10% và progress = 0%, coi như đúng tiến độ (mới tạo)
        if ($expectedProgress < 10 && $progress == 0) {
            return 'on_track';
        }
        
        // Nếu thời gian đã trôi qua < 5%, luôn là đúng tiến độ (quá sớm để đánh giá)
        if ($expectedProgress < 5) {
            return 'on_track';
        }
        
        // So sánh progress thực tế với progress mong đợi
        $difference = $progress - $expectedProgress;
        
        // Đúng tiến độ: progress >= expected - 5% (có buffer nhỏ)
        if ($difference >= -5) {
            return 'on_track';
        }
        
        // Có nguy cơ: progress < expected - 5% nhưng >= expected - 20%
        if ($difference >= -20) {
            return 'at_risk';
        }
        
        // Chậm tiến độ: progress < expected - 20%
        return 'behind';
    }
}
