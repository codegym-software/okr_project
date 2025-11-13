<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\Cycle;
use App\Models\Department;
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
    public function index(Request $request)
    {
        $objectives = Objective::with(['user', 'cycle', 'keyResults'])->get();
        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $objectives]);
        }
        return view('app');
    }

    /**
     * Show the form for creating a new objective
     */
    public function create(Request $request): View
    {
        return view('app');
    }

    /**
     * Store a newly created objective
     */
    public function store(Request $request)
    {
        $request->validate([
            'obj_title' => 'required|string|max:255',
            'level' => 'required|string|in:Công ty,Phòng ban,Nhóm,Cá nhân',
            'description' => 'nullable|string',
            'cycle_id' => 'required|exists:cycles,cycle_id',
            'department_id' => 'nullable|exists:departments,department_id',
        ]);

        $objective = Objective::create([
            'obj_title' => $request->obj_title,
            'level' => $request->level,
            'description' => $request->description,
            'user_id' => Auth::id(),
            'cycle_id' => $request->cycle_id,
            'department_id' => $request->department_id,
            'status' => 'active',
            'progress_percent' => 0,
        ]);

        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $objective]);
        }
        return redirect()->route('objectives.index')->with('success', 'Tạo objective thành công!');
    }

    /**
     * Display the specified objective
     */
    public function show(string $id): View
    {
        return view('app');
    }

    /**
     * Show the form for editing the specified objective
     */
    public function edit(string $id): View
    {
        return view('app');
    }

    /**
     * Update the specified objective
     */
    public function update(Request $request, string $id)
    {
        $objective = Objective::findOrFail($id);
        
        $request->validate([
            'obj_title' => 'nullable|string|max:255',
            'level' => 'nullable|string|in:Công ty,Phòng ban,Nhóm,Cá nhân',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive,completed',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
        ]);

        $objective->update($request->only([
            'obj_title', 'level', 'description', 'status', 'progress_percent'
        ]));

        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $objective]);
        }
        return redirect()->route('objectives.index')->with('success', 'Cập nhật objective thành công!');
    }

    /**
     * Remove the specified objective
     */
    public function destroy(string $id)
    {
        $objective = Objective::findOrFail($id);
        $objective->delete();

        if (request()->expectsJson()) {
            return response()->json(['success' => true, 'message' => 'Xóa objective thành công!']);
        }
        return redirect()->route('objectives.index')->with('success', 'Xóa objective thành công!');
    }
}