<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\Cycle;
use App\Models\Department;
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
        // === 1. LẤY TẤT CẢ PHÒNG BAN & XỬ LÝ CHU KỲ HIỆN TẠI ===
        $departments = Department::orderBy('d_name')->get();
        $cycles = Cycle::orderByDesc('start_date')->get();
        
        $currentCycleId = null;
        $currentCycleName = null;

        if (!$request->filled('cycle_id')) {
            $now = Carbon::now('Asia/Ho_Chi_Minh');
            $activeCycle = $cycles->first(function ($cycle) use ($now) {
                return Carbon::parse($cycle->start_date)->lte($now) && Carbon::parse($cycle->end_date)->gte($now);
            });

            if ($activeCycle) {
                $currentCycleId = $activeCycle->cycle_id;
            } else if ($cycles->isNotEmpty()) {
                 $currentCycleId = $cycles->first()->cycle_id; // Mặc định là chu kỳ mới nhất
            }
            $request->merge(['cycle_id' => $currentCycleId]);

        } else {
            $currentCycleId = $request->cycle_id;
        }

        $currentCycle = $cycles->firstWhere('cycle_id', (int)$currentCycleId);
        $currentCycleName = $currentCycle->cycle_name ?? 'Không có chu kỳ';


        // === 2. QUERY OKR DỰA TRÊN BỘ LỌC ===
        $query = Objective::with([
                'keyResults' => fn($q) => $q->with('assignedUser.department')->whereNull('archived_at'),
                'department',
                'cycle',
                'user' => fn($q) => $q->select('user_id', 'full_name', 'avatar_url'),
            ])
            ->whereNull('archived_at');
        
        // Lọc theo cycle_id
        if ($request->filled('cycle_id')) {
            $query->where('cycle_id', $request->cycle_id);
        }

        // Lọc theo loại (công ty / phòng ban)
        $filterType = $request->input('filter_type', 'company'); // Mặc định là OKR công ty
        if ($filterType === 'department') {
            $query->where('level', 'unit'); // Chỉ lấy OKR cấp phòng ban
            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }
        } else {
            $query->where('level', 'company');
        }

        $objectives = $query->orderBy('created_at', 'desc')->paginate(10);

        // === 3. TRẢ VỀ RESPONSE ===
        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'data' => [
                    'objectives' => $objectives,
                    'departments' => $departments,
                    'cycles' => $cycles,
                ],
                'current_cycle_id' => $currentCycleId,
                'current_cycle_name' => $currentCycleName,
            ]);
        }

        // Dành cho trường hợp render từ server side (ít khả năng xảy ra)
        return view('app', [
            'objectives' => $objectives, 
            'departments' => $departments,
            'cycles' => $cycles, 
            'currentCycleId' => $currentCycleId, 
            'currentCycleName' => $currentCycleName
        ]);
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
