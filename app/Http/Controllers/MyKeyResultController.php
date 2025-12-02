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
use App\Models\User;

class MyKeyResultController extends Controller
{
    /**
     * Hiển thị danh sách Key Results của người dùng 
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $keyResults = KeyResult::with(['objective', 'cycle', 'assignedUser'])
            ->active() 
            ->where(function ($query) use ($user) {
                $query->whereHas('objective', function ($q) use ($user) {
                    $q->where('user_id', $user->user_id);
                })->orWhere('user_id', $user->user_id);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $keyResults
        ]);
    }

    /**
     * Lưu Key Result mới.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $objectiveId = $request->input('objective_id');

        if (!$objectiveId) {
            return $this->errorResponse($request, 'Không tìm thấy ID của Objective.', 422);
        }

        $objective = Objective::with('cycle')->findOrFail($objectiveId);

        if ($objective->cycle && strtolower($objective->cycle->status) !== 'active') {
            return $this->errorResponse($request, 'Chu kỳ đã đóng. Không thể tạo Key Result.', 403);
        }

        if ($objective->user_id !== $user->user_id) {
            return $this->errorResponse($request, 'Bạn không có quyền tạo Key Result cho Objective này.', 403);
        }

        $validated = $request->validate([
            'kr_title' => 'required|string|max:255',
            'target_value' => 'required|numeric|min:0',
            'current_value' => [
                'nullable',
                'numeric',
                'min:0',
                function ($attribute, $value, $fail) use ($request) {
                    $target = (float) $request->input('target_value');
                    $current = is_null($value) ? 0 : (float) $value;
                    if ($current > $target) {
                        $fail('Giá trị hiện tại phải nhỏ hơn hoặc bằng giá trị mục tiêu.');
                    }
                },
            ],
            'unit' => 'required|in:number,percent,completion,bai,num,bài',
            'status' => 'required|in:draft,active,completed',
            'weight' => 'nullable|numeric|min:0|max:100',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
            'assigned_to' => 'nullable|exists:users,user_id',
        ], [
            'kr_title.required' => 'Tiêu đề Key Result là bắt buộc.',
            'unit.required' => 'Đơn vị là bắt buộc.',
            'target_value.required' => 'Giá trị mục tiêu là bắt buộc.',
            'target_value.numeric' => 'Giá trị mục tiêu phải là số.',
        ]);

        try {
            $created = DB::transaction(function () use ($validated, $objective, $user, $request) {
                $target = (float) $validated['target_value'];
                $current = (float) ($validated['current_value'] ?? 0);
                $progress = $target > 0 ? max(0, min(100, ($current / $target) * 100)) : 0;

                // === XỬ LÝ assigned_to ===
                $assignedTo = $validated['assigned_to'] ?? null;
                $finalAssignedTo = null;

                if ($assignedTo !== null) {
                    // Giao ngay cho người khác
                    if (!$this->canAssign($user, $objective)) {
                        throw new \Exception('Bạn không có quyền giao Key Result.', 403);
                    }
                    $assignee = User::findOrFail($assignedTo);
                    if ($objective->level === 'unit' && $assignee->department_id !== $objective->department_id) {
                        throw new \Exception('Chỉ được giao cho người trong cùng phòng ban.', 422);
                    }
                    $finalAssignedTo = $assignee->user_id;
                } else {
                    // Không gửi assigned_to
                    $finalAssignedTo = $validated['status'] === 'active' ? $user->user_id : null;
                }

                // KR active phải có người thực hiện
                if ($validated['status'] === 'active' && is_null($finalAssignedTo)) {
                    throw new \Exception('Key Result đang active phải có người thực hiện.', 422);
                }

                // === TẠO KEY RESULT ===
                $keyResult = KeyResult::create([
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
                    'user_id' => $user->user_id,
                    'archived_at' => null,
                    'assigned_to' => $finalAssignedTo,
                ]);
                
                // Refresh để đảm bảo kr_id được load từ database
                $keyResult->refresh();
                
                // Tự động cập nhật progress của Objective từ KeyResults
                $objective->updateProgressFromKeyResults();
                
                return $keyResult->load('objective', 'cycle', 'assignedUser');
            });

            return $this->successResponse($request, 'Key Result được tạo thành công!', $created);

        } catch (\Exception $e) {
            $status = in_array($e->getCode(), [400, 403, 422, 500]) ? $e->getCode() : 500;
            $message = $e->getMessage() ?: 'Tạo Key Result thất bại.';

            Log::error('Tạo Key Result thất bại', [
                'objective_id' => $objectiveId,
                'user_id' => $user->user_id,
                'error' => $e->getMessage(),
                'code' => $status
            ]);

            return $this->errorResponse($request, $message, $status);
        }
    }

    /**
     * Cập nhật Key Result.
     */
    public function update(Request $request, string $objectiveId, string $keyResultId): JsonResponse
    {
        $user = Auth::user();
        $objective = Objective::with('cycle')->findOrFail($objectiveId);
        $keyResult = KeyResult::where('objective_id', $objectiveId)
            ->where('kr_id', $keyResultId)
            ->firstOrFail();

        $canEdit = $objective->user_id === $user->user_id || 
                $keyResult->assigned_to === $user->user_id || 
                $user->isAdmin();

        if (!$canEdit) {
            return response()->json(['success' => false, 'message' => 'Không có quyền.'], 403);
        }

        if ($keyResult->isArchived()) {
            return response()->json(['success' => false, 'message' => 'Không thể chỉnh sửa Key Result đã lưu trữ.'], 403);
        }

        if (($objective->cycle && strtolower($objective->cycle->status) !== 'active') ||
            ($keyResult->cycle && strtolower($keyResult->cycle->status) !== 'active')) {
            return response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể chỉnh sửa Key Result.'], 403);
        }

        if ($objective->user_id !== $user->user_id && $keyResult->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền chỉnh sửa Key Result này.'], 403);
        }

        $validated = $request->validate([
            'kr_title' => 'required|string|max:255',
            'target_value' => 'required|numeric|min:0',
            'current_value' => [
                'nullable',
                'numeric',
                'min:0',
                function ($attribute, $value, $fail) use ($request) {
                    $target = (float) $request->input('target_value');
                    $current = is_null($value) ? 0 : (float) $value;
                    if ($current > $target) {
                        $fail('Giá trị hiện tại phải nhỏ hơn hoặc bằng giá trị mục tiêu.');
                    }
                },
            ],
            'unit' => 'required|in:number,percent,completion,bai,num,bài',
            'status' => 'required|in:draft,active,completed',
            'weight' => 'nullable|numeric|min:0|max:100',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
            'assigned_to' => 'nullable|exists:users,user_id',
        ], [
            'kr_title.required' => 'Tiêu đề Key Result là bắt buộc.',
            'unit.required' => 'Đơn vị là bắt buộc.',
            'target_value.required' => 'Giá trị mục tiêu là bắt buộc.',
        ]);

        try {
            $updated = DB::transaction(function () use ($validated, $keyResult, $user, $objective) {
                $target = (float) $validated['target_value'];
                $current = (float) ($validated['current_value'] ?? 0);
                $progress = $target > 0 ? max(0, min(100, ($current / $target) * 100)) : 0;

                // === XỬ LÝ assigned_to ===
                $assignedToInput = $validated['assigned_to'] ?? null;

                if ($assignedToInput !== null && $assignedToInput !== $keyResult->assigned_to) {
                    if (!$this->canAssign($user, $objective)) {
                        throw new \Exception('Bạn không có quyền thay đổi người thực hiện.', 403);
                    }

                    $assignee = User::findOrFail($assignedToInput);
                    if ($objective->level === 'unit' && $assignee->department_id !== $objective->department_id) {
                        throw new \Exception('Chỉ được giao cho người trong cùng phòng ban.', 422);
                    }

                    $keyResult->assigned_to = $assignee->user_id;
                }
                // Không thay đổi nếu không gửi hoặc gửi giống cũ

                // === CẬP NHẬT CÁC TRƯỜNG KHÁC ===
                $keyResult->update([
                    'kr_title' => $validated['kr_title'],
                    'target_value' => $target,
                    'current_value' => $current,
                    'unit' => $validated['unit'],
                    'status' => $validated['status'],
                    'weight' => $validated['weight'] ?? $keyResult->weight,
                    'progress_percent' => $validated['progress_percent'] ?? $progress,
                    'assigned_to' => $keyResult->assigned_to,
                ]);

                // Tự động cập nhật progress của Objective từ KeyResults
                $objective->updateProgressFromKeyResults();

                return $keyResult->load('objective', 'cycle', 'assignedUser');
            });

            return response()->json([
                'success' => true,
                'message' => 'Key Result được cập nhật thành công!',
                'data' => $updated
            ]);

        } catch (\Exception $e) {
            $status = in_array($e->getCode(), [400, 403, 422, 500]) ? $e->getCode() : 500;
            $message = $e->getMessage() ?: 'Cập nhật thất bại.';

            Log::error('Cập nhật Key Result thất bại', [
                'kr_id' => $keyResultId,
                'user_id' => $user->user_id,
                'error' => $e->getMessage(),
                'code' => $status
            ]);

            return response()->json(['success' => false, 'message' => $message], $status);
        }
    }

    /**
     * XÓA VĨNH VIỄN Key Result 
     */
    public function destroy(string $objectiveId, string $keyResultId): JsonResponse
    {
        $user = Auth::user();
        $objective = Objective::with('cycle')->findOrFail($objectiveId);
        $keyResult = KeyResult::where('objective_id', $objectiveId)
            ->where('kr_id', $keyResultId)
            ->firstOrFail();

        if ($objective->user_id !== $user->user_id && $keyResult->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa Key Result này.'], 403);
        }

        try {
            DB::transaction(function () use ($keyResult, $objective) {
                $keyResult->forceDelete();
                
                // Tự động cập nhật progress của Objective từ KeyResults
                $objective->updateProgressFromKeyResults();
            });

            return response()->json(['success' => true, 'message' => 'Key Result đã được xóa vĩnh viễn!']);
        } catch (\Exception $e) {
            Log::error('Xóa Key Result thất bại', [
                'kr_id' => $keyResultId,
                'user_id' => $user->user_id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['success' => false, 'message' => 'Xóa thất bại.'], 500);
        }
    }

    /**
     * Lưu trữ Key Result
     */
    public function archive(Request $request, string $objectiveId, string $keyResultId): JsonResponse
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($objectiveId);
        $keyResult = KeyResult::where('objective_id', $objectiveId)
            ->where('kr_id', $keyResultId)
            ->firstOrFail();

        if ($keyResult->archived_at) {
            return response()->json(['success' => false, 'message' => 'Key Result đã được lưu trữ.'], 400);
        }

        if ($objective->user_id !== $user->user_id && $keyResult->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Không có quyền.'], 403);
        }

        try {
            $keyResult->update(['archived_at' => now()]);
            
            // Tự động cập nhật progress của Objective từ KeyResults (loại trừ KR đã archive)
            $objective->updateProgressFromKeyResults();
            
            return response()->json([
                'success' => true,
                'message' => 'Lưu trữ thành công!',
                'data' => $keyResult->load('objective', 'cycle')
            ]);
        } catch (\Exception $e) {
            Log::error('Lưu trữ KR lỗi', ['kr_id' => $keyResultId, 'error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Lỗi hệ thống.'], 500);
        }
    }

    /**
     * Bỏ lưu trữ Key Result
     */
    public function unarchive(Request $request, string $objectiveId, string $keyResultId): JsonResponse
    {
        $user = Auth::user();
        $keyResult = KeyResult::where('objective_id', $objectiveId)
            ->where('kr_id', $keyResultId)
            ->whereNotNull('archived_at')
            ->firstOrFail();

        $objective = Objective::findOrFail($objectiveId);

        if ($objective->user_id !== $user->user_id && $keyResult->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Không có quyền.'], 403);
        }

        try {
            $keyResult->update(['archived_at' => null]);

            // Tự động cập nhật progress của Objective từ KeyResults
            $objective->updateProgressFromKeyResults();

            $fullObjective = Objective::with(['keyResults' => fn($q) => $q->active()])
                ->where('objective_id', $objectiveId)
                ->first();

            return response()->json([
                'success' => true,
                'message' => 'Bỏ lưu trữ thành công!',
                'data' => $fullObjective 
            ]);
        } catch (\Exception $e) {
            Log::error('Bỏ lưu trữ KR lỗi', ['kr_id' => $keyResultId, 'error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Lỗi hệ thống.'], 500);
        }
    }

    /**
     * Giao Key Result cho người dùng thực hiện
     */
    public function assign(Request $request, string $objectiveId, string $keyResultId): JsonResponse
    {
        $user = Auth::user();
        $keyResult = KeyResult::where('objective_id', $objectiveId)
            ->findOrFail($keyResultId);

        $objective = Objective::findOrFail($objectiveId);

        // Chỉ owner OKR hoặc admin mới được giao
        if ($objective->user_id !== $user->user_id && !$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền giao Key Result này.'
            ], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,user_id'
        ]);

        $assignee = User::findOrFail($validated['user_id']);

        // (Tùy chọn) Kiểm tra cùng phòng ban
        if ($objective->level === 'unit' && $assignee->department_id !== $objective->department_id) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ được giao cho người trong cùng phòng ban.'
            ], 422);
        }

        $keyResult->assigned_to = $assignee->user_id;
        $keyResult->save();
        
        $updatedObjective = $objective->fresh()->load('keyResults.assignedUser', 'user');

        return response()->json([
            'success' => true,
            'message' => "Đã giao KR cho {$assignee->full_name}",
            'data' => [
                'objective' => $updatedObjective
            ]
        ]);
    }

    private function canAssign(User $user, Objective $objective): bool
    {
        if ($objective->cycle && strtolower($objective->cycle->status) !== 'active') {
            return false;
        }
        return $objective->user_id === $user->user_id || $user->isAdmin();
    }

    // === HÀM HỖ TRỢ ===
    private function successResponse($request, $message, $data = null)
    {
        if ($request && $request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $data
            ]);
        }

        return redirect()->route('my-key-results.index')->with('success', $message);
    }

    private function errorResponse($request, $message, $status)
    {
        if ($request && $request->expectsJson()) {
            return response()->json(['success' => false, 'message' => $message], $status);
        }

        return redirect()->back()->withErrors(['error' => $message])->withInput();
    }
}