<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\Cycle;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class ObjectiveController extends Controller
{
    /**
     * Display a listing of objectives
     */
    public function index(): View
    {
        $objectives = Objective::with(['user', 'cycle', 'keyResults'])
                               ->paginate(10);
        return view('objectives.index', compact('objectives'));
    }

    /**
     * Show the form for creating a new objective with Tailwind
     */
    public function create(Request $request): View
    {
        $cycle_id = $request->query('cycle_id', null);
        return view('objectives.create', compact('cycle_id'));
    }

    /**
     * Store a newly created objective
     */
    public function store(Request $request): RedirectResponse
    {
       $validated = $request->validate([

            // validate objective
            'obj_title'       => 'required|string|max:255',
            'level' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'status'      => 'required|in:draft,active,completed',
            'progress_percent'    => 'nullable|numeric|min:0|max:100',
            'cycle_id' => 'nullable|integer|exists:cycles,cycle_id', 

            // validate key results
            'key_results' => 'nullable|array',
            'key_results.*.kr_title' => 'required|string|max:255',
            'key_results.*.target_value' => 'required|numeric|min:0',
            'key_results.*.current_value' => 'nullable|numeric|min:0',
            'key_results.*.unit' => 'required|string|max:255',
            'key_results.*.status' => 'nullable|string|max:255',
            'key_results.*.weight' => 'nullable|integer|min:0|max:100',
            'key_results.*.progress_percent' => 'nullable|numeric|min:0|max:100',
        ]); 


        DB::transaction(function() use ($validated, $request) {

            $objectiveData = [
                'obj_title' => $validated['obj_title'],
                'level' => $validated['level'],
                'description' => $validated['description'],
                'status' => $validated['status'],
                'progress_percent' => $validated['progress_percent'],
                'user_id' => Auth::id() ?? 2,
                'cycle_id' => $validated['cycle_id'], // Mặc định cycle_id là 2
            ];  
            $objective = Objective::create($objectiveData);

            $keyResults = $request->input('key_results', []);
            foreach($keyResults as $kr){
                if(empty($kr['kr_title'])){
                    continue;
                }
                $keyResultData = [
                    'kr_title' => $kr['kr_title'],
                    'target_value' => $kr['target_value'],
                    'current_value' => $kr['current_value'],
                    'unit' => $kr['unit'],
                    'status' => 'active',
                    'weight' => $kr['weight'],
                    'progress_percent' => $kr['progress_percent'] ?? 0,
                    'objective_id' => $objective->objective_id,
                    'cycle_id' => $objective->cycle_id,
                ];
                KeyResult::create($keyResultData);
            }




        });

       
        
        return redirect()->route('cycles.show', $validated['cycle_id'])
            ->with('success', 'Objective created successfully!');
    }

    /**
     * Display the specified objective
     */
    public function show(string $id): View
    {
        $objective = Objective::with('keyResults')->findOrFail($id);
        return view('objectives.show', compact('objective'));
    }

    /**
     * Show the form for editing the specified objective
     */
    public function edit(string $id): View
    {
        $objective = Objective::findOrFail($id);
        return view('objectives.edit', compact('objective'));
    }

    /**
     * Update the specified objective
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'status'      => 'required|in:draft,active,completed',
            'progress'    => 'nullable|numeric|min:0|max:100'
        ]);

        $objective = Objective::findOrFail($id);
        $objective->update($validated);
        
        return redirect()->route('objectives.index')
            ->with('success', 'Objective updated successfully!');
    }

    /**
     * Remove the specified objective
     */
    public function destroy(string $id): RedirectResponse
    {
        $objective = Objective::findOrFail($id);
        $objective->delete();
        
        return redirect()->route('objectives.index')
            ->with('success', 'Objective deleted successfully!');
    }
}