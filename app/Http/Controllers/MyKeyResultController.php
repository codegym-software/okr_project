<?php

namespace App\Http\Controllers;

use App\Models\KeyResult;
use App\Models\Objective;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class MyKeyResultController extends Controller
{
    /**
     * Hiển thị danh sách Key Results của người dùng dựa trên Objectives họ sở hữu.
     */
    public function index(Request $request): JsonResponse|View
    {
        $user = Auth::user();
        $keyResults = KeyResult::with(['objective'])
            ->whereHas('objective', function ($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->paginate(10);

        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $keyResults]);
        }

        return view('my-key-results.index', compact('keyResults'));
    }

    /**
     * Hiển thị form tạo Key Result.
     */
    public function create(string $objectiveId): View
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($objectiveId);

        // Kiểm tra quyền: Chỉ chủ sở hữu của Objective được tạo
        if ($objective->user_id !== $user->user_id) {
            abort(403, 'Bạn không có quyền tạo Key Result cho Objective này.');
        }

        return view('my-key-results.create', compact('objective'));
    }

    /**
     * Lưu Key Result mới.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $objectiveId = $request->input('objective_id');

        if (!$objectiveId) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Không tìm thấy ID của Objective.'], 422)
                : redirect()->back()->withErrors(['error' => 'Không tìm thấy ID của Objective.'])->withInput();
        }

        $objective = Objective::with('cycle')->findOrFail($objectiveId);

        // Chặn tạo KR nếu chu kỳ đã đóng
        if ($objective->cycle && strtolower((string)$objective->cycle->status) !== 'active') {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể tạo Key Result.'], 403)
                : redirect()->back()->withErrors(['error' => 'Chu kỳ đã đóng. Không thể tạo Key Result.'])->withInput();
        }

        // Load user relationships
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        // Kiểm tra quyền: Chủ sở hữu hoặc cùng phòng ban (với member/manager)
        $roleName = $user->role ? strtolower($user->role->role_name) : 'member';
        
        // Admin có full quyền
        $canCreate = false;
        if ($roleName === 'admin') {
            $canCreate = true;
        }
        // Chủ sở hữu của Objective được tạo
        elseif ($objective->user_id === $user->user_id) {
            $canCreate = true;
        }
        // Member/Manager chỉ được tạo KR cho Objective cùng phòng ban
        elseif (in_array($roleName, ['member', 'manager'])) {
            if ($objective->department_id && $user->department_id) {
                $canCreate = ((int)$objective->department_id === (int)$user->department_id);
            }
        }

        if (!$canCreate) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Bạn không có quyền tạo Key Result cho Objective của phòng ban khác.'], 403)
                : redirect()->back()->withErrors(['error' => 'Bạn không có quyền tạo Key Result cho Objective của phòng ban khác.']);
        }

        $validated = $request->validate([   
            'kr_title' => 'required|string|max:255',
            'target_value' => 'required|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',
            'unit' => 'required|in:number,percent,completion,bai,num,bài',
            'status' => 'required|in:draft,active,completed',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
        ], [
            'kr_title.required' => 'Tiêu đề Key Result là bắt buộc.',
            'unit.required' => 'Đơn vị là bắt buộc.',
        ]);

        try {
            $created = DB::transaction(function () use ($validated, $objective, $user) {
                $target = (float) $validated['target_value'];
                $current = (float) ($validated['current_value'] ?? 0);
                $progress = $target > 0 ? max(0, min(100, ($current / $target) * 100)) : 0;

                return KeyResult::create([
                    'kr_title' => $validated['kr_title'],
                    'target_value' => $target,
                    'current_value' => $current,
                    'unit' => $validated['unit'],
                    'status' => $validated['status'],
                    'weight' => $validated['weight'] ?? 0,
                    'progress_percent' => $validated['progress_percent'] ?? $progress,
                    'objective_id' => $objective->objective_id,
                    'cycle_id' => $objective->cycle_id ?? null,
                    'department_id' => $objective->department_id ?? null,
                    'user_id' => $user->user_id, // Lưu người tạo KR
                ])->load('objective', 'cycle');
            });

            return $request->expectsJson()
                ? response()->json(['success' => true, 'message' => 'Key Result được tạo thành công!', 'data' => $created])
                : redirect()->route('my-key-results.index')->with('success', 'Key Result được tạo thành công!');
        } catch (\Exception $e) {
            Log::error('Tạo Key Result thất bại: ' . $e->getMessage(), [
                'objective_id' => $objectiveId,
                'payload' => $request->all(),
                'validated' => $validated,
            ]);
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Tạo Key Result thất bại: ' . $e->getMessage()], 500)
                : redirect()->back()->withErrors(['error' => 'Tạo Key Result thất bại: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Cập nhật Key Result hiện có.
     */
    public function update(Request $request, string $objectiveId, string $keyResultId): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $objective = Objective::with('cycle')->findOrFail($objectiveId);
        $keyResult = KeyResult::with('cycle')->where('objective_id', $objectiveId)->where('kr_id', $keyResultId)->firstOrFail();

        // Chặn cập nhật nếu chu kỳ đã đóng
        if (($objective->cycle && strtolower((string)$objective->cycle->status) !== 'active') || ($keyResult->cycle && strtolower((string)$keyResult->cycle->status) !== 'active')) {
            return response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể chỉnh sửa Key Result.'], 403);
        }


        // Load user relationships
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        // Kiểm tra quyền: Chủ sở hữu hoặc cùng phòng ban (với member/manager)
        $roleName = $user->role ? strtolower($user->role->role_name) : 'member';
        
        // Admin có full quyền
        $canUpdate = false;
        if ($roleName === 'admin') {
            $canUpdate = true;
        }
        // Chủ sở hữu của Objective được cập nhật
        elseif ($objective->user_id === $user->user_id) {
            $canUpdate = true;
        }
        // Member/Manager chỉ được cập nhật KR của Objective cùng phòng ban
        elseif (in_array($roleName, ['member', 'manager'])) {
            if ($objective->department_id && $user->department_id) {
                $canUpdate = ((int)$objective->department_id === (int)$user->department_id);
            }
        }

        if (!$canUpdate) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền cập nhật Key Result của phòng ban khác.'], 403);

        }

        $validated = $request->validate([
            'kr_title' => 'required|string|max:255',
            'target_value' => 'required|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',
            'unit' => 'required|in:number,percent,completion,bai,num,bài',
            'status' => 'required|in:draft,active,completed',
            'weight' => 'nullable|numeric|min:0|max:100',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
            'cycle_id' => 'nullable|exists:cycles,cycle_id',
        ], [
            'kr_title.required' => 'Tiêu đề Key Result là bắt buộc.',
            'unit.required' => 'Đơn vị là bắt buộc.',
        ]);

        try {
            $keyResult = DB::transaction(function () use ($validated, $keyResult) {
                $target = (float) $validated['target_value'];
                $current = (float) ($validated['current_value'] ?? 0);
                $progress = $target > 0 ? max(0, min(100, ($current / $target) * 100)) : 0;

                $keyResult->update([
                    'kr_title' => $validated['kr_title'],
                    'target_value' => $target,
                    'current_value' => $current,
                    'unit' => $validated['unit'],
                    'status' => $validated['status'],
                    'weight' => $validated['weight'] ?? $keyResult->weight,
                    'progress_percent' => $validated['progress_percent'] ?? $progress,
                    'cycle_id' => $validated['cycle_id'] ?? $keyResult->cycle_id,
                ]);

                return $keyResult->load('objective', 'cycle');
            });

            return response()->json(['success' => true, 'message' => 'Key Result được cập nhật thành công!', 'data' => $keyResult]);
        } catch (\Exception $e) {
            Log::error('Cập nhật Key Result thất bại: ' . $e->getMessage(), [
                'objective_id' => $objectiveId,
                'key_result_id' => $keyResultId,
                'payload' => $request->all(),
                'validated' => $validated,
            ]);
            return response()->json(['success' => false, 'message' => 'Cập nhật Key Result thất bại: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Xóa Key Result.
     */
    public function destroy(string $objectiveId, string $keyResultId): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $objective = Objective::with('cycle')->findOrFail($objectiveId);
        $keyResult = KeyResult::with('cycle')->where('objective_id', $objectiveId)->where('kr_id', $keyResultId)->firstOrFail();

        // Chặn xóa nếu chu kỳ đã đóng
        if (($objective->cycle && strtolower((string)$objective->cycle->status) !== 'active') || ($keyResult->cycle && strtolower((string)$keyResult->cycle->status) !== 'active')) {
            return response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể xóa Key Result.'], 403);
        }


        // Load user relationships
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        // Kiểm tra quyền: Chủ sở hữu hoặc cùng phòng ban (với member/manager)
        $roleName = $user->role ? strtolower($user->role->role_name) : 'member';
        
        // Admin có full quyền
        $canDelete = false;
        if ($roleName === 'admin') {
            $canDelete = true;
        }
        // Chủ sở hữu của Objective được xóa
        elseif ($objective->user_id === $user->user_id) {
            $canDelete = true;
        }
        // Member/Manager chỉ được xóa KR của Objective cùng phòng ban
        elseif (in_array($roleName, ['member', 'manager'])) {
            if ($objective->department_id && $user->department_id) {
                $canDelete = ((int)$objective->department_id === (int)$user->department_id);
            }
        }

        if (!$canDelete) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa Key Result của phòng ban khác.'], 403);

        }

        try {
            DB::transaction(function () use ($keyResult) {
                $keyResult->delete();
            });

            return response()->json(['success' => true, 'message' => 'Key Result đã được xóa thành công!']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Xóa Key Result thất bại: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Kiểm tra quyền quản lý Objective
     */
    private function canManageObjective($user, $objective, $allowedLevels): bool
    {
        // Admin có quyền quản lý tất cả
        if ($user->isAdmin()) {
            return true;
        }

        // Người sở hữu Objective có thể quản lý KR của mình
        if ($objective->user_id === $user->user_id) {
            return true;
        }

        // Kiểm tra level có được phép không
        if (!in_array($objective->level, $allowedLevels)) {
            return false;
        }

        // Đối với member, CHỈ được tạo KR cho objectives mà họ sở hữu
        // KHÔNG được tạo cho objectives của người khác, kể cả được assign
        if ($user->isMember()) {
            // Member đã được kiểm tra ở trên (line 218-220)
            // Nếu không phải owner thì không có quyền
            return false;
        }

        // Đối với manager, được tạo KR cho objectives của phòng ban mình
        if ($user->isManager() && $user->department_id) {
            return $objective->department_id === $user->department_id;
        }

        return false;
    }

    /**
     * Kiểm tra quyền thêm KR cho Objective
     */
    public function canAddKR(Request $request, $objectiveId)
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($objectiveId);
        
        $allowedLevels = $this->getAllowedLevels($user->role ? $user->role->role_name : 'member');
        $canManage = $this->canManageObjective($user, $objective, $allowedLevels);
        
        return response()->json([
            'success' => true,
            'can_add_kr' => $canManage,
            'user_department_id' => $user->department_id,
            'objective_department_id' => $objective->department_id,
            'objective_level' => $objective->level,
            'user_role' => $user->role ? $user->role->role_name : 'member'
        ]);
    }

    /**
     * Lấy danh sách cấp Objective được phép dựa trên vai trò
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
     * Kiểm tra quyền quản lý Key Result
     */
    private function canManageKeyResult($user, $objective): bool
    {
        // Load role nếu chưa có
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        // Admin có quyền quản lý tất cả
        if ($user->role && $user->role->role_name === 'admin') {
            return true;
        }

        // Chủ sở hữu có quyền quản lý (nếu là owner)
        if ($objective->user_id === $user->user_id) {
            return true;
        }

        // Manager được quản lý objectives trong phòng ban của họ
        if ($user->role && $user->role->role_name === 'manager') {
            if ($objective->department_id && 
                $objective->department_id === $user->department_id) {
                return true;
            }
            return false;
        }

        // Member CHỈ được quản lý objectives mà họ sở hữu
        // KHÔNG được quản lý objectives của người khác, kể cả được assign hay cùng phòng ban
        if ($user->role && $user->role->role_name === 'member') {
            // Member đã được kiểm tra ở trên (line 290-292)
            // Nếu không phải owner thì không có quyền
            return false;
        }

        return false;
    }
}