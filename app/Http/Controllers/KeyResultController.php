<?php

namespace App\Http\Controllers;

use App\Models\KeyResult;
use App\Models\Objective;
use Illuminate\Http\Request;

class KeyResultController extends Controller
{
    public function index($objectiveId)
    {
        $objective = Objective::with('keyResults')->findOrFail($objectiveId);
        $keyResults = $objective->keyResults;

        return view('key_results.index', compact('objective', 'keyResults'));
    }

    public function show($objectiveId, $keyResultId)
    {
        $objective = Objective::findOrFail($objectiveId);

        $keyResult = KeyResult::with('objective')
            ->where('obj_id', $objectiveId)
            ->where('kr_id', $keyResultId)
            ->firstOrFail();

        return view('key_results.show', compact('objective', 'keyResult'));
    }

    public function create($objectiveId)
    {
        $objective = Objective::findOrFail($objectiveId);
        return view('key_results.create', compact('objective'));
    }

    public function store(Request $request, $objectiveId)
    {
        $validated = $request->validate([
            'kr_title' => 'required|string|max:255',
            'kr_desc' => 'nullable|string|max:1000',
            'metric_type' => 'required|in:number,percent,completion,currency,hours,items,score',
            'target_value' => 'required|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:255',
        ]);

        // Calculate progress percentage
        $current = $validated['current_value'] ?? 0;
        $target = $validated['target_value'];
        $progress = $target > 0 ? ($current / $target) * 100 : 0;

        KeyResult::create([
            'kr_title' => $validated['kr_title'],
            'kr_desc' => $validated['kr_desc'] ?? null,
            'metric_type' => $validated['metric_type'],
            'target_value' => $target,
            'current_value' => $current,
            'unit' => $validated['unit'] ?? null,
            'status' => $validated['status'] ?? null,
            'progress_percent' => $progress,
            'obj_id' => $objectiveId,
        ]);

        return redirect()
            ->route('objectives.show', $objectiveId)
            ->with('success', 'Key Result has been added successfully!');
    }

    public function destroy($objectiveId, $krId)
    {
        $kr = KeyResult::findOrFail($krId);
        $kr->delete();

        return response()->json(['success' => true, 'message' => 'Key Result has been deleted']);
    }
}