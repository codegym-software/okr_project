<?php

namespace App\Http\Controllers;

use App\Models\CheckIn;
use App\Models\KeyResult;
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
        $keyResult = KeyResult::with(['objective', 'checkIns' => function($query) {
            $query->latest()->limit(5);
        }])->findOrFail($krId);

        // Load user relationship nếu chưa có
        if (!$user->relationLoaded('role')) {
            $user->load('role');
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
        $keyResult = KeyResult::findOrFail($krId);

        // Load user relationship nếu chưa có
        if (!$user->relationLoaded('role')) {
            $user->load('role');
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

                Log::info('Check-in created', [
                    'check_in_id' => $checkIn->check_in_id,
                    'kr_id' => $keyResult->kr_id,
                    'user_id' => $user->user_id,
                    'progress_percent' => $request->progress_percent,
                ]);
            });

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
        // Load objective relationship nếu chưa có
        if (!$keyResult->relationLoaded('objective')) {
            $keyResult->load('objective');
        }

        // Admin có quyền check-in cho tất cả
        if ($user->isAdmin()) {
            return true;
        }

        // Người sở hữu Key Result có thể check-in
        if ($keyResult->objective && $keyResult->objective->user_id == $user->user_id) {
            return true;
        }

        // Manager/Member chỉ có thể check-in trong phòng ban của mình (trừ cá nhân)
        if ($user->department_id && $keyResult->objective && $keyResult->objective->department_id) {
            if ($keyResult->objective->department_id == $user->department_id && 
                $keyResult->objective->level !== 'Cá nhân') {
                return true;
            }
        }

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
}