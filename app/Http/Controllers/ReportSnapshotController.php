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
            'message' => 'Đã chốt sổ báo cáo thành công!',
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
