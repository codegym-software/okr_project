<?php

namespace App\Http\Controllers;

use App\Models\ReportSnapshot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReportSnapshotController extends Controller
{
    public function index(Request $request)
    {
        $snapshots = ReportSnapshot::with(['cycle', 'creator'])
            ->when($request->cycle_id, fn($q, $id) => $q->where('cycle_id', $id))
            ->when($request->level, fn($q, $level) => $q->where('data_snapshot->level', $level))
            ->when($request->department_name, fn($q, $name) => $q->where('data_snapshot->department_name', $name))
            ->latest('snapshotted_at')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $snapshots
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'cycle_id' => 'required|exists:cycles,cycle_id',
            'title' => 'required|string|max:255',
            'data_snapshot' => 'required|array',
        ]);

        $user = Auth::user();
        $userRole = strtolower($user->role->role_name ?? '');
        $dataSnapshot = $validated['data_snapshot'];
        $level = $dataSnapshot['level'] ?? 'departments'; // Default to departments if not set

        // Logic phân quyền
        if ($level === 'company') {
            // Cấp công ty: Chỉ Admin/CEO
            if (!in_array($userRole, ['admin', 'ceo'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền tạo báo cáo cấp Công ty.'
                ], 403);
            }
        } else {
            // Cấp phòng ban (unit/departments): Admin/CEO hoặc Manager
            $isManager = in_array($userRole, ['manager', 'trưởng phòng', 'giám đốc']);
            $isAdminOrCeo = in_array($userRole, ['admin', 'ceo']);
            
            if (!$isManager && !$isAdminOrCeo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền tạo báo cáo cấp Phòng ban.'
                ], 403);
            }
        }

        $cycle = \App\Models\Cycle::find($validated['cycle_id']);

        $snapshot = ReportSnapshot::create([
            'cycle_id' => $validated['cycle_id'],
            'cycle_name' => $cycle?->cycle_name, 
            'created_by' => Auth::id(),
            'title' => $validated['title'],
            'data_snapshot' => $validated['data_snapshot'],
            'snapshotted_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo báo cáo thành công!',
            'data' => $snapshot->load(['cycle', 'creator'])
        ], 201);
    }

    public function show($id)
    {
        $snapshot = ReportSnapshot::with(['cycle', 'creator'])->findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => $snapshot
        ]);
    }
}
