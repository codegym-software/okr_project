<?php

namespace App\Http\Controllers;

use App\Models\CheckIn;
use App\Models\KeyResult;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckInController extends Controller
{
    /**
     * Hiển thị form check-in cho Key Result
     */
    public function create($objectiveId, $krId): View
    {
        $user = Auth::user();
        $keyResult = KeyResult::with(['objective.cycle', 'cycle', 'checkIns' => function($query) {
            $query->latest()->limit(5);
        }])->findOrFail($krId);

        // Load user relationship nếu chưa có
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        // Chặn check-in nếu chu kỳ đã đóng (status != active)
        if (($keyResult->cycle && strtolower((string)$keyResult->cycle->status) !== 'active') || ($keyResult->objective && $keyResult->objective->cycle && strtolower((string)$keyResult->objective->cycle->status) !== 'active')) {
            abort(403, 'Chu kỳ đã đóng. Không thể check-in.');
        }

        // Kiểm tra quyền check-in: chỉ người sở hữu Key Result mới có quyền check-in
        if (!$this->canCheckIn($user, $keyResult)) {
            abort(403, 'Bạn không có quyền check-in cho Key Result này.');
        }

        return view('app');
    }

    /**
     * Lưu check-in mới
     */
    public function store(Request $request, $objectiveId, $krId)
    {
        $user = Auth::user();
        $keyResult = KeyResult::with(['objective.cycle', 'cycle'])->findOrFail($krId);

        // Load user relationship nếu chưa có
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        // Chặn check-in nếu chu kỳ đã đóng (status != active)
        if (($keyResult->cycle && strtolower((string)$keyResult->cycle->status) !== 'active') || ($keyResult->objective && $keyResult->objective->cycle && strtolower((string)$keyResult->objective->cycle->status) !== 'active')) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể check-in.'], 403);
            }
            abort(403, 'Chu kỳ đã đóng. Không thể check-in.');
        }

        // Kiểm tra quyền check-in
        if (!$this->canCheckIn($user, $keyResult)) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền check-in cho Key Result này.'
                ], 403);
            }
            abort(403, 'Bạn không có quyền check-in cho Key Result này.');
        }

        $request->validate([
            'check_in_type' => 'required|in:percentage,quantity',
            'progress_value' => 'required|numeric|min:0',
            'progress_percent' => 'required|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:1000',
            'is_completed' => 'boolean',
        ]);

        try {
            $checkIn = null;
            DB::transaction(function () use ($request, $user, $keyResult, &$checkIn) {
                // Tạo check-in mới
                $checkIn = CheckIn::create([
                    'kr_id' => $keyResult->kr_id,
                    'user_id' => $user->user_id,
                    'progress_value' => $request->progress_value,
                    'progress_percent' => $request->progress_percent,
                    'notes' => $request->notes,
                    'check_in_type' => $request->check_in_type,
                    'is_completed' => $request->boolean('is_completed') || $request->progress_percent >= 100,
                ]);

                // Cập nhật current_value và progress_percent của Key Result
                $keyResult->update([
                    'current_value' => $request->progress_value,
                    'progress_percent' => $request->progress_percent,
                ]);

                // Nếu hoàn thành, cập nhật status
                if ($checkIn->is_completed) {
                    $keyResult->update(['status' => 'completed']);
                }

                // Tự động cập nhật progress của Objective từ KeyResults
                if ($keyResult->objective) {
                    $keyResult->objective->updateProgressFromKeyResults();
                }

                Log::info('Check-in created', [
                    'check_in_id' => $checkIn->check_in_id,
                    'kr_id' => $keyResult->kr_id,
                    'user_id' => $user->user_id,
                    'progress_percent' => $request->progress_percent,
                ]);
            });

            // Gửi thông báo cho quản lý trong cùng phòng ban (sau khi check-in đã được lưu)
            // Gọi ngoài transaction để đảm bảo check-in vẫn được lưu dù thông báo có lỗi
            $this->notifyManagers($user, $keyResult, $checkIn);

            $message = $request->progress_percent >= 100 
                ? 'Chúc mừng! Key Result đã hoàn thành 100%.' 
                : 'Cập nhật tiến độ thành công!';

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'data' => [
                        'check_in' => $checkIn,
                        'key_result' => $keyResult->fresh()
                    ]
                ]);
            }

            return redirect()->route('my-objectives.index')
                ->with('success', $message);

        } catch (\Exception $e) {
            Log::error('Error creating check-in', [
                'error' => $e->getMessage(),
                'kr_id' => $krId,
                'user_id' => $user->user_id,
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cập nhật tiến độ thất bại: ' . $e->getMessage()
                ], 500);
            }

            return redirect()->back()
                ->withErrors(['error' => 'Cập nhật tiến độ thất bại: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Hiển thị lịch sử check-ins của Key Result
     */
    public function history($objectiveId, $krId): View
    {
        $user = Auth::user();
        $keyResult = KeyResult::with(['objective', 'checkIns.user'])
            ->findOrFail($krId);

        // Load user relationship nếu chưa có
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        // Kiểm tra quyền xem lịch sử: người sở hữu hoặc quản lý có thể xem
        if (!$this->canViewHistory($user, $keyResult)) {
            abort(403, 'Bạn không có quyền xem lịch sử check-in của Key Result này.');
        }

        $checkIns = $keyResult->checkIns()
            ->with('user')
            ->latest()
            ->paginate(10);

        return view('app');
    }

    /**
     * API để lấy lịch sử check-ins (JSON)
     */
    public function getHistory(Request $request, $objectiveId, $krId)
    {
        $user = Auth::user();
        $keyResult = KeyResult::with(['objective'])->findOrFail($krId);

        // Load user relationship nếu chưa có
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        // Kiểm tra quyền xem lịch sử
        if (!$this->canViewHistory($user, $keyResult)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem lịch sử check-in của Key Result này.'
            ], 403);
        }

        $checkIns = $keyResult->checkIns()
            ->with('user')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'key_result' => $keyResult,
                'check_ins' => $checkIns
            ]
        ]);
    }

    /**
     * Xóa check-in (chỉ cho phép xóa check-in gần đây nhất của chính mình)
     */
    public function destroy(Request $request, $objectiveId, $krId, $checkInId)
    {
        $user = Auth::user();
        $checkIn = CheckIn::with('keyResult')->findOrFail($checkInId);
        $checkIn->load('keyResult.cycle', 'keyResult.objective.cycle');

        // Chặn xóa check-in nếu chu kỳ đã đóng (bảo toàn lịch sử)
        if (($checkIn->keyResult && $checkIn->keyResult->cycle && strtolower((string)$checkIn->keyResult->cycle->status) !== 'active') ||
            ($checkIn->keyResult && $checkIn->keyResult->objective && $checkIn->keyResult->objective->cycle && strtolower((string)$checkIn->keyResult->objective->cycle->status) !== 'active')) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng. Không thể xóa check-in.'], 403);
            }
            abort(403, 'Chu kỳ đã đóng. Không thể xóa check-in.');
        }

        // Load user relationship nếu chưa có
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        // Kiểm tra quyền xóa: chỉ có thể xóa check-in của chính mình
        if ($checkIn->user_id !== $user->user_id) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn chỉ có thể xóa check-in của chính mình.'
                ], 403);
            }
            abort(403, 'Bạn chỉ có thể xóa check-in của chính mình.');
        }

        try {
            DB::transaction(function () use ($checkIn) {
                // Xóa check-in
                $checkIn->delete();

                // Cập nhật lại Key Result với check-in gần đây nhất
                $latestCheckIn = CheckIn::where('kr_id', $checkIn->kr_id)
                    ->latest()
                    ->first();

                if ($latestCheckIn) {
                    $checkIn->keyResult->update([
                        'current_value' => $latestCheckIn->progress_value,
                        'progress_percent' => $latestCheckIn->progress_percent,
                        'status' => $latestCheckIn->is_completed ? 'completed' : 'active',
                    ]);
                } else {
                    // Nếu không còn check-in nào, reset về giá trị ban đầu
                    $checkIn->keyResult->update([
                        'current_value' => 0,
                        'progress_percent' => 0,
                        'status' => 'active',
                    ]);
                }

                // Tự động cập nhật progress của Objective từ KeyResults
                if ($checkIn->keyResult->objective) {
                    $checkIn->keyResult->objective->updateProgressFromKeyResults();
                }
            });

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Xóa check-in thành công!'
                ]);
            }

            return redirect()->route('check-in.history', [$objectiveId, $krId])
                ->with('success', 'Xóa check-in thành công!');

        } catch (\Exception $e) {
            Log::error('Error deleting check-in', [
                'error' => $e->getMessage(),
                'check_in_id' => $checkInId,
                'user_id' => $user->user_id,
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Xóa check-in thất bại: ' . $e->getMessage()
                ], 500);
            }

            return redirect()->back()
                ->withErrors(['error' => 'Xóa check-in thất bại: ' . $e->getMessage()]);
        }
    }

    /**
     * Kiểm tra quyền check-in
     */
    private function canCheckIn($user, $keyResult): bool
    {
        // 1. Người sở hữu Key Result có thể check-in
        if ($keyResult->user_id == $user->user_id) {
            return true;
        }

        // 2. Người được giao Key Result có thể check-in
        if ($keyResult->assigned_to == $user->user_id) {
            return true;
        }

        // 3. Người sở hữu Objective chứa Key Result có thể check-in
        if ($keyResult->objective && $keyResult->objective->user_id == $user->user_id) {
            return true;
        }

        // Tất cả các trường hợp khác đều không có quyền check-in
        return false;
    }

    /**
     * Kiểm tra quyền xem lịch sử check-in
     */
    private function canViewHistory($user, $keyResult): bool
    {
        // Load objective relationship nếu chưa có
        if (!$keyResult->relationLoaded('objective')) {
            $keyResult->load('objective');
        }

        // Tất cả user đều có quyền xem lịch sử check-in
        return true;
    }

    /**
     * Gửi thông báo cho tất cả quản lý trong cùng phòng ban khi có check-in
     */
    private function notifyManagers(User $user, KeyResult $keyResult, CheckIn $checkIn): void
    {
        try {
            // Load objective nếu chưa có
            if (!$keyResult->relationLoaded('objective')) {
                $keyResult->load('objective');
            }

            // Ưu tiên lấy department_id từ KeyResult hoặc Objective, nếu không có thì dùng của user
            $departmentId = $keyResult->department_id 
                ?? $keyResult->objective->department_id 
                ?? $user->department_id;
            
            if (!$departmentId) {
                Log::info('No department found for notification', [
                    'user_id' => $user->user_id,
                    'kr_id' => $keyResult->kr_id,
                ]);
                return;
            }

            // Lấy cycle_id từ KeyResult hoặc Objective
            $cycleId = $keyResult->cycle_id ?? $keyResult->objective->cycle_id ?? null;
            
            if (!$cycleId) {
                Log::warning('No cycle_id found for notification', [
                    'kr_id' => $keyResult->kr_id,
                ]);
                return;
            }

            // Tìm tất cả quản lý trong cùng phòng ban (trừ chính user đã check-in)
            $managers = User::where('department_id', $departmentId)
                ->where('user_id', '!=', $user->user_id) // Không gửi thông báo cho chính người check-in
                ->whereHas('role', function($query) {
                    $query->whereRaw('LOWER(role_name) = ?', ['manager']);
                })
                ->get();

            if ($managers->isEmpty()) {
                Log::info('No managers found in department', [
                    'department_id' => $departmentId,
                ]);
                return;
            }

            // Tạo thông báo cho từng quản lý
            $objectiveTitle = $keyResult->objective->obj_title ?? 'N/A';
            $krTitle = $keyResult->kr_title ?? 'N/A';
            $progressPercent = $checkIn->progress_percent;
            $memberName = $user->full_name ?? $user->email;

            $message = "{$memberName} đã check-in Key Result '{$krTitle}' trong Objective '{$objectiveTitle}' với tiến độ {$progressPercent}%";

            // Tạo URL đến trang objective với KR cụ thể
            $objectiveId = $keyResult->objective->objective_id ?? null;
            $krId = $keyResult->kr_id ?? null;
            $actionUrl = config('app.url') . "/my-objectives?highlight_kr={$krId}&objective_id={$objectiveId}";

            foreach ($managers as $manager) {
                NotificationService::send(
                    $manager->user_id,
                    $message,
                    'check_in',
                    $cycleId,
                    $actionUrl,
                    'Xem chi tiết'
                );
            }

            Log::info('Manager notifications sent', [
                'check_in_id' => $checkIn->check_in_id,
                'user_id' => $user->user_id,
                'department_id' => $departmentId,
                'managers_count' => $managers->count(),
            ]);

        } catch (\Exception $e) {
            // Log lỗi nhưng không làm gián đoạn quá trình check-in
            Log::error('Error sending manager notifications', [
                'error' => $e->getMessage(),
                'check_in_id' => $checkIn->check_in_id ?? null,
                'user_id' => $user->user_id,
            ]);
        }
    }
}