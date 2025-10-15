<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\Cycle;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class MyObjectiveController extends Controller
{
    /**
     * Hiển thị danh sách Objective của người dùng.
     */
    public function index(Request $request): JsonResponse|View
    {
        $user = Auth::user();
        $objectives = Objective::with(['keyResults', 'department', 'cycle'])
            ->where('user_id', $user->user_id)
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
        ]);

        // Kiểm tra quyền tạo dựa trên cấp độ
        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        if (!in_array($validated['level'], $allowedLevels)) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Bạn không có quyền tạo Objective ở cấp độ này.'], 403)
                : redirect()->back()->withErrors(['error' => 'Bạn không có quyền tạo Objective ở cấp độ này.']);
        }

        // Kiểm tra department_id cho cấp độ không phải company
        if ($validated['level'] !== 'company' && empty($validated['department_id'])) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Phải chọn phòng ban cho cấp độ không phải company.'], 422)
                : redirect()->back()->withErrors(['error' => 'Phải chọn phòng ban cho cấp độ không phải company.']);
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
                    'user_id' => $user->user_id, // Lưu user_id để xác định chủ sở hữu
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

                return $objective->load(['keyResults', 'department', 'cycle']);
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
        $objective = Objective::findOrFail($id);

        // Kiểm tra quyền: Chỉ chủ sở hữu (user_id) được cập nhật
        if ($objective->user_id !== $user->user_id) {
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
        ]);

        // Kiểm tra quyền cập nhật cấp độ
        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        if (!in_array($validated['level'], $allowedLevels)) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Bạn không có quyền cập nhật Objective sang cấp độ này.'], 403)
                : redirect()->back()->withErrors(['error' => 'Bạn không có quyền cập nhật Objective sang cấp độ này.']);
        }

        try {
            $objective = DB::transaction(function () use ($validated, $objective) {
                $objective->update($validated);
                return $objective->load(['keyResults', 'department', 'cycle']);
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
        $objective = Objective::findOrFail($id);

        // Kiểm tra quyền: Chỉ chủ sở hữu (user_id) được xóa
        if ($objective->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa Objective này.'], 403);
        }

        try {
            DB::transaction(function () use ($objective) {
                $objective->keyResults()->delete();
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
        $objective = Objective::with(['keyResults', 'department', 'cycle'])->findOrFail($id);

        // Kiểm tra quyền: Chỉ chủ sở hữu (user_id) được xem
        if ($objective->user_id !== $user->user_id) {
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
        $keyResult = KeyResult::with(['objective', 'cycle'])->findOrFail($id);

        // Kiểm tra quyền: Chỉ chủ sở hữu của Objective được xem
        if ($keyResult->objective->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xem Key Result này.'], 403);
        }

        return response()->json(['success' => true, 'data' => $keyResult]);
    }

    /**
     * Lấy danh sách cấp độ được phép dựa trên vai trò (API JSON).
     */
    public function getAllowedLevelsApi(): JsonResponse
    {
        $user = Auth::user();
        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        return response()->json(['success' => true, 'data' => $allowedLevels]);
    }

    /**
     * Lấy danh sách cấp độ Objective được phép dựa trên vai trò.
     */
    private function getAllowedLevels(string $roleName): array
    {
        return match (strtolower($roleName)) {
            'admin' => ['Công ty', 'Phòng ban', 'Nhóm', 'Cá nhân'],
            'manager' => ['Phòng ban', 'Nhóm', 'Cá nhân'],
            'member' => ['Nhóm', 'Cá nhân'],
            default => ['Nhóm', 'Cá nhân'],
        };
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
}