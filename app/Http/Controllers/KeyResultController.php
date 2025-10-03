<?php

namespace App\Http\Controllers;

use App\Models\KeyResult;
use App\Models\Objective;
use Illuminate\Http\Request;
use App\Models\Cycle;

class KeyResultController extends Controller
{
    public function show($objectiveId)
    {
        $objective = Objective::with('keyResults')->findOrFail($objectiveId);
        $keyResults = $objective->keyResults;
        $cycles = Cycle::all();

        return view('key_results.show', compact('objective', 'keyResults', 'cycles'));
    }

    public function create($objectiveId)
    {
        $objective = Objective::findOrFail($objectiveId);
        $cycles = Cycle::all();
        return view('key_results.create', compact('objective', 'cycles'));
    }

    public function store(Request $request, $objectiveId)
    {
        $validated = $request->validate([
            'kr_title' => 'required|string|max:255',
            'target_value' => 'required|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',
            'unit' => 'required|in:number,percent,completion',
            'status' => 'nullable|string|max:255',
            'weight' => 'nullable|integer|min:0|max:100',
            'cycle_id' => 'required|exists:cycles,cycle_id',
        ]);

        // Tính % tiến độ (nếu có current_value)
        $current = $validated['current_value'] ?? 0;
        $target = $validated['target_value'];
        $progress = $target > 0 ? ($current / $target) * 100 : 0;

        KeyResult::create([
            'kr_title' => $validated['kr_title'],
            'target_value' => $target,
            'current_value' => $current,
            'unit' => $validated['unit'],
            'status' => $validated['status'] ?? null,
            'weight' => $validated['weight'] ?? 0,
            'progress_percent' => $progress,
            'objective_id' => $objectiveId,
            'cycle_id' => $validated['cycle_id'],
        ]);

        return redirect()
            ->route('objectives.show', $objectiveId)
            ->with('success', 'Key Result đã được thêm thành công!');
    }

    public function destroy($objectiveId, $krId)
    {
        $kr = KeyResult::findOrFail($krId);
        $kr->delete();

        return response()->json(['success' => true, 'message' => 'Key Result đã được xóa']);
    }
}