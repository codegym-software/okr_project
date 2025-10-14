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

        // Cho phép mọi người check-in

        return view('app');
    }

    /**
     * Lưu check-in mới
     */
    public function store(Request $request, $objectiveId, $krId): RedirectResponse
    {
        $user = Auth::user();
        $keyResult = KeyResult::findOrFail($krId);

        // Cho phép mọi người check-in

        $request->validate([
            'check_in_type' => 'required|in:percentage,quantity',
            'progress_value' => 'required|numeric|min:0',
            'progress_percent' => 'required|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:1000',
            'is_completed' => 'boolean',
        ]);

        try {
            DB::transaction(function () use ($request, $user, $keyResult) {
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

            return redirect()->route('my-objectives.index')
                ->with('success', $message);

        } catch (\Exception $e) {
            Log::error('Error creating check-in', [
                'error' => $e->getMessage(),
                'kr_id' => $krId,
                'user_id' => $user->user_id,
            ]);

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

        // Cho phép mọi người xem lịch sử check-in

        $checkIns = $keyResult->checkIns()
            ->with('user')
            ->latest()
            ->paginate(10);

        return view('app');
    }

    /**
     * Xóa check-in (chỉ cho phép xóa check-in gần đây nhất)
     */
    public function destroy($objectiveId, $krId, $checkInId): RedirectResponse
    {
        $user = Auth::user();
        $checkIn = CheckIn::with('keyResult')->findOrFail($checkInId);

        // Cho phép mọi người xóa check-in của mình
        if ($checkIn->user_id !== $user->user_id) {
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

            return redirect()->route('check-ins.history', [$objectiveId, $krId])
                ->with('success', 'Xóa check-in thành công!');

        } catch (\Exception $e) {
            Log::error('Error deleting check-in', [
                'error' => $e->getMessage(),
                'check_in_id' => $checkInId,
                'user_id' => $user->user_id,
            ]);

            return redirect()->back()
                ->withErrors(['error' => 'Xóa check-in thất bại: ' . $e->getMessage()]);
        }
    }

}
