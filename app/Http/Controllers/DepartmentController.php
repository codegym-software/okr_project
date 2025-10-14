<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Department;
use Illuminate\Support\Facades\Auth;

class DepartmentController extends Controller
{
    //
    public function index() {
        return view('app');
    }

    public function create() {
        return view('app');
    }

    public function store(Request $request) {
        $request->validate([
            'd_name' => 'required|string|max:255',
            'd_description' => 'nullable|string',
        ]);

        Department::create($request->all());
        return redirect()->route('departments.index')->with('success', 'Tạo phòng ban thành công!').set_time_limit(300);
    }

    public function show(Department $department) {
        return view('app');
    }

    public function edit(Department $department) {
        return view('app');
    }

    public function update(Request $request, Department $department) {
        $request->validate([
            'd_name' => 'required|string|max:255',
            'd_description' => 'nullable|string',
        ]);

        $department->update($request->all());
        return redirect()->route('departments.index')->with('success', 'Cập nhật phòng ban thành công!').set_time_limit(300);
    }

    public function destroy(Department $department) {
        $department->delete();
        return redirect()->route('departments.index')->with('success', 'Xóa phòng ban thành công!').set_time_limit(300);
    }
}
