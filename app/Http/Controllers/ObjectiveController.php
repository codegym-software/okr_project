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
        $user = Auth::user();
        // Kiểm tra role_name thông qua mối quan hệ với bảng roles
        if ($user->role->role_name !== 'admin') {
            abort(403, 'Unauthorized access');
        }

        $objectives = Objective::with(['user', 'cycle', 'keyResults'])
                               ->paginate(10);
        return view('objectives.index', compact('objectives'));
    }

    /**
     * Show the form for creating a new objective with Tailwind
     */
    public function create(Request $request): View
    {
        $user = Auth::user();
        // Kiểm tra role_name thông qua mối quan hệ với bảng roles
        if ($user->role->role_name !== 'admin') {
            abort(403, 'Unauthorized access');
        }

        $cycle_id = $request->query('cycle_id', null);

        // Xác định các level được phép tạo theo role_name
        $allowedLevels = match($user->role->role_name) {
            'admin' => ['Công ty', 'Phòng ban', 'Nhóm', 'Cá nhân'], // Admin
            default => [], // Không cho phép
        };

        return view('objectives.create', compact('cycle_id', 'allowedLevels'));
    }

    /**
     * Store a newly created objective
     */
    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        // Kiểm tra role_name thông qua mối quan hệ với bảng roles
        if ($user->role->role_name !== 'admin') {
            abort(403, 'Unauthorized access');
        }

        $level = $request->input('level', 'Công ty'); // Default to 'Công ty'

        // Xác định các level được phép tạo theo role_name
        switch ($user->role->role_name) {
            case 'admin': // Admin
                $allowedLevels = ['Công ty', 'Phòng ban', 'Nhóm', 'Cá nhân'];
                break;
            default:
                $allowedLevels = [];
                break;
        }

        // Kiểm tra quyền
        if (!in_array($level, $allowedLevels)) {
            return redirect()->back()
                ->withErrors(['level' => 'Bạn không có quyền tạo OKR cấp ' . $level . '.'])
                ->withInput();
        }

        // Validate dữ liệu
        $validated = $request->validate([
            // Objective
            'obj_title' => 'required|string|max:255',
            'level' => 'required|string|in:' . implode(',', $allowedLevels),
            'description' => 'nullable|string|max:1000',
            'status' => 'required|in:draft,active,completed',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
            'cycle_id' => 'nullable|integer|exists:cycles,cycle_id',
        ]);

        // Tạo Objective và Key Results trong transaction
        DB::transaction(function() use ($validated, $request) {
            $objectiveData = [
                'obj_title' => $validated['obj_title'],
                'level' => $validated['level'],
                'description' => $validated['description'],
                'status' => $validated['status'],
                'progress_percent' => $validated['progress_percent'] ?? 0,
                'user_id' => Auth::id() ?? 2,
                'cycle_id' => $validated['cycle_id'] ?? null,
            ];
            $objective = Objective::create($objectiveData);

            $keyResults = $request->input('key_results', []);
            foreach ($keyResults as $kr) {
                if (empty($kr['kr_title'])) continue;

                $keyResultData = [
                    'kr_title' => $kr['kr_title'],
                    'target_value' => $kr['target_value'],
                    'current_value' => $kr['current_value'] ?? 0,
                    'unit' => $kr['unit'],
                    'status' => $kr['status'] ?? 'active',
                    'weight' => $kr['weight'] ?? 0,
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
        $user = Auth::user();
        // Kiểm tra role_name thông qua mối quan hệ với bảng roles
        if ($user->role->role_name !== 'admin') {
            abort(403, 'Unauthorized access');
        }

        $objective = Objective::with('keyResults')->findOrFail($id);
        return view('objectives.show', compact('objective'));
    }

    /**
     * Show the form for editing the specified objective
     */
    public function edit(string $id): View
    {
        $user = Auth::user();
        // Kiểm tra role_name thông qua mối quan hệ với bảng roles
        if ($user->role->role_name !== 'admin') {
            abort(403, 'Unauthorized access');
        }

        $objective = Objective::findOrFail($id);
        return view('objectives.edit', compact('objective'));
    }

    /**
     * Update the specified objective
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $user = Auth::user();
        // Kiểm tra role_name thông qua mối quan hệ với bảng roles
        if ($user->role->role_name !== 'admin') {
            abort(403, 'Unauthorized access');
        }

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
        $user = Auth::user();
        // Kiểm tra role_name thông qua mối quan hệ với bảng roles
        if ($user->role->role_name !== 'admin') {
            abort(403, 'Unauthorized access');
        }

        $objective = Objective::findOrFail($id);
        $objective->delete();

        return redirect()->route('objectives.index')
            ->with('success', 'Objective deleted successfully!');
    }
}