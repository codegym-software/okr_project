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
use Carbon\Carbon;

class MyKeyResultController extends Controller
{
    /**
     * Hiển thị danh sách Key Results của người dùng 
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $keyResults = KeyResult::with(['objective', 'cycle'])
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
            'current_value' => 'nullable|numeric|min:0',
            'unit' => 'required|in:number,percent,completion,bai,num,bài',
            'status' => 'required|in:draft,active,completed',
            'weight' => 'nullable|numeric|min:0|max:100',
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
                    'kr_id' => (string) \Str::uuid(), // Nếu chưa có
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
                    'archived_at' => null, // Mặc định chưa lưu trữ
                ])->load('objective', 'cycle');
            });

            return $this->successResponse($request, 'Key Result được tạo thành công!', $created);
        } catch (\Exception $e) {
            Log::error('Tạo Key Result thất bại', [
                'objective_id' => $objectiveId,
                'user_id' => $user->user_id,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse($request, 'Tạo Key Result thất bại.', 500);
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

        if ($keyResult->isArchived()) {
            return response()->json(['success' => false, 'message' => 'Không thể chỉnh sửa Key Result đã lưu trữ.'], 403);
        }

        if (
            ($objective->cycle && strtolower($objective->cycle->status) !== 'active') ||
            ($keyResult->cycle && strtolower($keyResult->cycle->status) !== 'active')
        ) {
            return response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể chỉnh sửa Key Result.'], 403);
        }

        if ($objective->user_id !== $user->user_id && $keyResult->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền chỉnh sửa Key Result này.'], 403);
        }

        $validated = $request->validate([
            'kr_title' => 'required|string|max:255',
            'target_value' => 'required|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',
            'unit' => 'required|in:number,percent,completion,bai,num,bài',
            'status' => 'required|in:draft,active,completed',
            'weight' => 'nullable|numeric|min:0|max:100',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
        ]);

        try {
            $updated = DB::transaction(function () use ($validated, $keyResult) {
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
                ]);

                return $keyResult->load('objective', 'cycle');
            });

            return response()->json([
                'success' => true,
                'message' => 'Key Result được cập nhật thành công!',
                'data' => $updated
            ]);
        } catch (\Exception $e) {
            Log::error('Cập nhật Key Result thất bại', [
                'kr_id' => $keyResultId,
                'user_id' => $user->user_id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['success' => false, 'message' => 'Cập nhật thất bại.'], 500);
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

        // if (
        //     ($objective->cycle && strtolower($objective->cycle->status) !== 'active') ||
        //     ($keyResult->cycle && strtolower($keyResult->cycle->status) !== 'active')
        // ) {
        //     return response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể xóa Key Result.'], 403);
        // }

        if ($objective->user_id !== $user->user_id && $keyResult->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa Key Result này.'], 403);
        }

        try {
            DB::transaction(function () use ($keyResult) {
                $keyResult->forceDelete(); 
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

            $fullObjective = Objective::with(['keyResults' => fn($q) => $q])
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