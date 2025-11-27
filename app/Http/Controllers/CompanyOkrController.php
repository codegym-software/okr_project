<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\Cycle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\View\View;

class CompanyOkrController extends Controller
{
    /**
     * Hiển thị OKR toàn công ty
     */
    public function index(Request $request): JsonResponse|View
    {
        $currentCycleId = null;
        $currentCycleName = null;

        // === 1. XÁC ĐỊNH CHU KỲ HIỆN TẠI - GIỐNG HỆT MyObjectiveController ===
        if (!$request->filled('cycle_id')) {
            $now = Carbon::now('Asia/Ho_Chi_Minh');
            $year = $now->year;
            $quarter = ceil($now->month / 3);
            $cycleNameDisplay = "Quý {$quarter} năm {$year}";

            $currentCycle = Cycle::where('start_date', '<=', $now)
                ->where('end_date', '>=', $now)
                ->first();

            if (!$currentCycle) {
                $possibleNames = [$cycleNameDisplay, "Q{$quarter} {$year}", "Q{$quarter} - {$year}"];
                $currentCycle = Cycle::whereIn('cycle_name', $possibleNames)->first();
            }

            if ($currentCycle) {
                $currentCycleId = $currentCycle->cycle_id;
                $currentCycleName = $currentCycle->cycle_name;
                $request->merge(['cycle_id' => $currentCycleId]);
            } else {
                $currentCycleName = $cycleNameDisplay;
            }
        } else {
            $currentCycle = Cycle::find($request->cycle_id);
            if ($currentCycle) {
                $currentCycleId = $currentCycle->cycle_id;
                $currentCycleName = $currentCycle->cycle_name;
            }
        }

        // === 2. QUERY OKR CÔNG KHAI (chỉ company + unit) ===
        $query = Objective::with([
                'keyResults' => fn($q) => $q->with('assignedUser')->whereNull('archived_at'),
                'department',
                'cycle',
                'user' => fn($q) => $q->select('user_id', 'full_name', 'avatar_url'),
            ])
            ->whereNull('archived_at')
            ->whereIn('level', ['company', 'unit'])
            ->when($request->filled('cycle_id'), fn($q) => $q->where('cycle_id', $request->cycle_id))
            ->orderByRaw("CASE WHEN level = 'company' THEN 1 ELSE 2 END")
            ->orderBy('department_id')
            ->orderBy('created_at', 'desc');

        $objectives = $query->get();

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'data' => $objectives,                    // ← mảng Objective
                'current_cycle_id' => $currentCycleId,
                'current_cycle_name' => $currentCycleName,
            ]);
        }

        // Nếu truy cập trực tiếp bằng trình duyệt (không cần login)
        $cycles = Cycle::orderByDesc('start_date')->get();
        return view('app', compact('objectives', 'cycles', 'currentCycleId', 'currentCycleName'));
    }

    /**
     * Chi tiết 1 Objective (nếu cần cho modal)
     */
    public function show(string $id): JsonResponse
    {
        try {
            $objective = Objective::with([
                    'keyResults' => fn($q) => $q->active()->with('assignedUser'),
                    'department',
                    'cycle',
                    'user',
                    'assignments.user'
                ])
                ->findOrFail($id);

            $user = Auth::user();
            if (!$user->isAdmin() && $objective->level !== 'company' 
                && ($objective->level === 'unit' && $objective->department_id !== $user->department_id)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền xem'], 403);
            }

            return response()->json(['success' => true, 'data' => $objective]);

        } catch (\Exception $e) {
            Log::error('CompanyOkrController::show error', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Lỗi tải chi tiết'], 500);
        }
    }

    // Helper methods (giữ nguyên)
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

    private function calculateOverallProgress($objectives)
    {
        $totalWeight = 0;
        $weightedProgress = 0;

        foreach ($objectives as $obj) {
            $objProgress = $obj->keyResults->avg('progress_percent') ?? 0;
            $weight = $obj->level === 'company' ? 1.5 : 1;
            $totalWeight += $weight;
            $weightedProgress += $objProgress * $weight;
        }

        return $totalWeight > 0 ? round($weightedProgress / $totalWeight, 1) : 0;
    }
}
