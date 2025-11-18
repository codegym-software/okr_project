<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\Cycle;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Nette\Utils\Json;

class CompanyOkrController extends Controller
{
    /**
     * Hiển thị OKR toàn công ty
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        // Xác định chu kỳ hiện tại (giống logic trong MyObjectiveController)
        $currentCycle = $this->getCurrentCycle($request);
        $cycleId = $request->input('cycle_id') ?? $currentCycle?->cycle_id;

        // Query tất cả Objective công khai hoặc được phép xem
        $query = Objective::with([
                'keyResults' => fn($q) => $q->active()->with('assignedUser'),
                'department',
                'cycle',
                'user' => fn($q) => $q->select('user_id', 'fullName', 'avatar'),
                'assignments.user' => fn($q) => $q->select('users.user_id', 'fullName', 'avatar')
            ])
            ->whereNull('archived_at')
            ->whereHas('cycle', fn($q) => $q->where('status', 'active')->orWhere('status', 'closed')); // cho xem cả chu kỳ đã đóng

        // Lọc theo chu kỳ
        if ($cycleId) {
            $query->where('cycle_id', $cycleId);
        }

        // === PHÂN QUYỀN XEM THEO ROLE (tùy chỉnh theo chính sách công ty bạn) ===
        if (!$user->isAdmin()) {
            // Cách 1: Mọi người được xem tất cả (phổ biến ở công ty minh bạch)
            // → Không cần lọc gì thêm

            // Cách 2: Chỉ xem được OKR công ty + OKR phòng ban của mình (bảo mật hơn)
            $query->where(function ($q) use ($user) {
                $q->where('level', 'company')
                  ->orWhere(function ($sq) use ($user) {
                      $sq->where('level', 'unit')
                         ->where('department_id', $user->department_id ?? null);
                  });
                  // ->orWhere('level', 'team') ... nếu muốn
                  // ->orWhere('user_id', $user->user_id) ... nếu muốn xem cả KR cá nhân
            });
        }
        // Admin thì thấy hết → không lọc

        $objectives = $query->orderByRaw("
            CASE level 
                WHEN 'company' THEN 1
                WHEN 'unit' THEN 2
                WHEN 'team' THEN 3
                WHEN 'person' THEN 4
                ELSE 5 
            END
        ")
        ->orderBy('created_at', 'desc')
        ->get()
        ->groupBy('level'); // nhóm theo cấp độ cho dễ hiển thị

        $cycles = Cycle::orderByDesc('start_date')->get();

        // Tính tiến độ tổng thể (tùy chọn)
        $overallProgress = $this->calculateOverallProgress($objectives->flatten());

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'data' => [
                    'objectives' => $objectives,
                    'current_cycle' => $currentCycle,
                    'overall_progress' => $overallProgress,
                    'cycles' => $cycles,
                ]
            ]);
        }

        return view('app', compact(
            'objectives',
            'cycles',
            'currentCycle',
            'overallProgress'
        ));

        // return response()->json([
        //     'success' => true,
        //     'data' => [
        //         'objectives' => $objectives,
        //         'current_cycle' => $currentCycle,
        //         'overall_progress' => $overallProgress,
        //         'cycles' => $cycles,
        //     ]
        // ]);
    }

    /**
     * Chi tiết 1 Objective toàn công ty (có thể dùng modal)
     */
    public function show($id)
    {
        $objective = Objective::with([
                'keyResults' => fn($q) => $q->active()->with('assignedUser'),
                'department',
                'cycle',
                'user',
                'assignments.user'
            ])
            ->findOrFail($id);

        // Kiểm tra quyền xem (tương tự như index)
        if (!Auth::user()->isAdmin() && !in_array($objective->level, ['company']) 
            && ($objective->level === 'unit' && $objective->department_id !== Auth::user()->department_id)) {
            abort(403);
        }

        return response()->json([
            'success' => true,
            'data' => $objective
        ]);
    }

    // Helper: lấy chu kỳ hiện tại
    private function getCurrentCycle($request)
    {
        if ($request->filled('cycle_id')) {
            return Cycle::find($request->cycle_id);
        }

        $now = Carbon::now('Asia/Ho_Chi_Minh');
        return Cycle::where('start_date', '<=', $now)
            ->where('end_date', '>=', $now)
            ->first();
    }

    // Helper: tính % hoàn thành toàn công ty (theo weight hoặc trung bình)
    private function calculateOverallProgress($objectives)
    {
        $totalWeight = 0;
        $weightedProgress = 0;

        foreach ($objectives as $obj) {
            $objProgress = $obj->keyResults->avg('progress_percent') ?? 0;
            $weight = $obj->level === 'company' ? 1.5 : 1; // ưu tiên company hơn
            $totalWeight += $weight;
            $weightedProgress += $objProgress * $weight;
        }

        return $totalWeight > 0 ? round($weightedProgress / $totalWeight, 1) : 0;
    }
}