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
        if ($objective->owner_id !== $user->user_id) {
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

        $objective = Objective::findOrFail($objectiveId);

        // Kiểm tra quyền: Chỉ chủ sở hữu của Objective được tạo
        if ($objective->owner_id !== $user->user_id) {
            return $request->expectsJson()
                ? response()->json(['success' => false, 'message' => 'Bạn không có quyền tạo Key Result cho Objective này.'], 403)
                : redirect()->back()->withErrors(['error' => 'Bạn không có quyền tạo Key Result cho Objective này.']);
        }

        $validated = $request->validate([
            'kr_title' => 'required|string|max:255',
            'target_value' => 'required|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',
            'unit' => 'required|in:number,percent,completion',
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
                    'cycle_id' => $objective->cycle_id,
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
        $objective = Objective::findOrFail($objectiveId);
        $keyResult = KeyResult::where('objective_id', $objectiveId)->where('kr_id', $keyResultId)->firstOrFail();

        // Kiểm tra quyền: Chỉ chủ sở hữu của Objective được cập nhật
        if ($objective->owner_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền cập nhật Key Result này.'], 403);
        }

        $validated = $request->validate([
            'kr_title' => 'required|string|max:255',
            'target_value' => 'required|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',
            'unit' => 'required|in:number,percent,completion',
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
        $objective = Objective::findOrFail($objectiveId);
        $keyResult = KeyResult::where('objective_id', $objectiveId)->where('kr_id', $keyResultId)->firstOrFail();

        // Kiểm tra quyền: Chỉ chủ sở hữu của Objective được xóa
        if ($objective->owner_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa Key Result này.'], 403);
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
}