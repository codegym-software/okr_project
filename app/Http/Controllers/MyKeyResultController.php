<?php

namespace App\Http\Controllers;

use App\Models\KeyResult;
use App\Models\Objective;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class MyKeyResultController extends Controller
{
    /**
     * Hiển thị danh sách Key Results của người dùng
     */
    public function index(Request $request): JsonResponse|View
    {
        $user = Auth::user();
        $keyResults = KeyResult::with(['objective.user'])
            ->whereHas('objective', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->paginate(10);

        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $keyResults]);
        }

        return view('my-key-results.index', compact('keyResults'));
    }

    /**
     * Hiển thị form tạo Key Result
     */
    public function create(string $objectiveId): View
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($objectiveId);

        // Kiểm tra quyền tạo KR
        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        if (!in_array($objective->level, $allowedLevels) || ($objective->user_id !== $user->id && $objective->level === 'person')) {
            abort(403, 'Bạn không có quyền tạo Key Result cho Objective này.');
        }

        return view('my-key-results.create', compact('objective'));
    }

    /**
     * Lưu Key Result
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $objectiveId = $request->input('objective_id');

        if (!$objectiveId) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Không tìm thấy ID của Objective.'], 422);
            }
            return redirect()->back()->withErrors(['error' => 'Không tìm thấy ID của Objective.'])->withInput();
        }

        $objective = Objective::findOrFail($objectiveId);

        // Kiểm tra quyền tạo KR
        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        if (!in_array($objective->level, $allowedLevels) || ($objective->user_id !== $user->id && $objective->level === 'person')) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Bạn không có quyền tạo Key Result cho Objective này.'], 403);
            }
            return redirect()->back()->withErrors(['error' => 'Bạn không có quyền tạo Key Result cho Objective này.']);
        }

        // Validate dữ liệu
        $validated = $request->validate([
            'kr_title' => 'required|string|max:255',
            'target_value' => 'required|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',
            'unit' => 'required|in:number,percent,completion',
            'status' => 'required|in:draft,active,completed',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
        ]);

        try {
            $created = DB::transaction(function () use ($validated, $objective, $user) {
                $target = (float)$validated['target_value'];
                $current = (float)($validated['current_value'] ?? 0);
                $progress = $target > 0 ? max(0, min(100, ($current / $target) * 100)) : 0;
                $keyResultData = [
                    'kr_title' => $validated['kr_title'],
                    'target_value' => $target,
                    'current_value' => $current,
                    'unit' => $validated['unit'],
                    'status' => $validated['status'],
                    'weight' => 0,
                    'progress_percent' => $validated['progress_percent'] ?? $progress,
                    'objective_id' => $objective->objective_id,
                    'cycle_id' => $objective->cycle_id,
                    'user_id' => $user->id,
                ];
                return KeyResult::create($keyResultData);
            });

            $created->load('objective', 'cycle');

            if ($request->expectsJson()) {
                return response()->json(['success' => true, 'message' => 'Key Result được tạo thành công!', 'data' => $created]);
            }
            return redirect()->route('my-key-results.index')->with('success', 'Key Result được tạo thành công!');
        } catch (\Exception $e) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Lưu Key Result thất bại: ' . $e->getMessage()], 500);
            }
            return redirect()->back()->withErrors(['error' => 'Lưu Key Result thất bại: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Hiển thị form chỉnh sửa Key Result
     */
    public function edit(string $objectiveId, string $keyResultId): View
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($objectiveId);
        $keyResult = KeyResult::findOrFail($keyResultId);

        // Kiểm tra quyền chỉnh sửa
        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        if (!in_array($objective->level, $allowedLevels) || ($objective->user_id !== $user->id && $objective->level === 'person')) {
            abort(403, 'Bạn không có quyền chỉnh sửa Key Result này.');
        }

        return view('my-key-results.edit', compact('objective', 'keyResult'));
    }

    /**
     * Cập nhật Key Result
     */
    public function update(Request $request, string $objectiveId, string $keyResultId): JsonResponse
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($objectiveId);
        $keyResult = KeyResult::where('objective_id', $objectiveId)->where('kr_id', $keyResultId)->firstOrFail();

        // Kiểm tra quyền chỉnh sửa
        $allowedLevels = $this->getAllowedLevels($user->role->role_name ?? 'member'); // Fallback if role_name is null
        if (!in_array($objective->level, $allowedLevels) || ($objective->user_id !== $user->id && $objective->level === 'person')) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền cập nhật Key Result này.'], 403);
        }

        // Validate dữ liệu with stricter rules
        $validated = $request->validate([
            'kr_title' => 'required|string|max:255', // Ensure non-nullable
            'target_value' => 'required|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',
            'unit' => 'required|in:number,percent,completion', // Ensure non-nullable
            'status' => 'required|in:draft,active,completed',
            'weight' => 'nullable|numeric|min:0|max:100',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
            'cycle_id' => 'nullable|exists:cycles,cycle_id',
        ], [
            'kr_title.required' => 'Tiêu đề Key Result là bắt buộc.',
            'unit.required' => 'Đơn vị là bắt buộc.',
        ]);

        try {
            DB::beginTransaction();

            $target = (float)($validated['target_value'] ?? $keyResult->target_value);
            $current = (float)($validated['current_value'] ?? $keyResult->current_value);
            $progress = $target > 0 ? max(0, min(100, ($current / $target) * 100)) : 0;

            $updateData = [
                'kr_title' => $validated['kr_title'] ?? $keyResult->kr_title,
                'target_value' => $target,
                'current_value' => $current,
                'unit' => $validated['unit'] ?? $keyResult->unit,
                'status' => $validated['status'],
                'weight' => $validated['weight'] ?? $keyResult->weight,
                'progress_percent' => $validated['progress_percent'] ?? $progress,
                'cycle_id' => $validated['cycle_id'] ?? $keyResult->cycle_id,
            ];

            $keyResult->update($updateData);
            $keyResult->load('objective', 'cycle');

            DB::commit();

            return response()->json(['success' => true, 'message' => 'Key Result được cập nhật thành công!', 'data' => $keyResult]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Update KeyResult failed: ' . $e->getMessage(), [
                'objective_id' => $objectiveId,
                'key_result_id' => $keyResultId,
                'payload' => $request->all(),
                'validated' => $validated,
                'stack_trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['success' => false, 'message' => 'Cập nhật Key Result thất bại: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Xóa Key Result
     */
    public function destroy(string $objectiveId, string $keyResultId): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($objectiveId);
        $keyResult = KeyResult::where('objective_id', $objectiveId)->where('kr_id', $keyResultId)->firstOrFail();

        // Kiểm tra quyền xóa
        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        if (!in_array($objective->level, $allowedLevels) || ($objective->user_id !== $user->id && $objective->level === 'person')) {
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

    /**
     * Lấy danh sách cấp Objective được phép dựa trên vai trò
     */
    private function getAllowedLevels(string $roleName): array
    {
        return match ($roleName) {
            'admin' => ['company', 'unit', 'team'],
            'manager' => ['unit', 'team',],
            'member' => ['team'],
            default => ['team'],
        };
    }
}