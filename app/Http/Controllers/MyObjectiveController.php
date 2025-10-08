<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\Department;
use App\Models\Cycle;
use App\Models\KeyResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class MyObjectiveController extends Controller
{
    /**
     * Hiển thị danh sách OKR cấp phòng ban
     */
    public function index(): View
    {
        $user = Auth::user();
        $startTime = microtime(true);

        $query = Objective::with(['user', 'department', 'keyResults', 'cycle', 'parentKeyResult.objective'])
            ->where('level', 'Phòng ban')
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                      ->orWhereHas('department', function ($q) use ($user) {
                          $q->where('department_id', $user->department_id);
                      });
            })
            ->orderBy('created_at', 'desc');

        // Ghi log truy vấn SQL và bindings trước khi paginate
        Log::info('Index objectives', [
            'user_id' => $user->id,
            'department_id' => $user->department_id,
            'role' => $user->role->role_name,
            'query' => $query->toSql(),
            'bindings' => $query->getBindings()
        ]);

        $objectives = $query->paginate(10);

        Log::info('Objectives count', [
            'user_id' => $user->id,
            'objectives_count' => $objectives->count()
        ]);

        $executionTime = microtime(true) - $startTime;
        if ($executionTime > 3) {
            Log::warning('Tải danh sách OKR vượt quá 3 giây: ' . $executionTime . 's');
        }

        return view('my-objectives.index', compact('objectives'));
    }

    /**
     * Hiển thị form tạo OKR cấp phòng ban
     */
    public function create(): View
    {
        $user = Auth::user();
        $departments = [];
        $cycles = Cycle::all();
        $allowedLevels = [];

        if ($user->role->role_name === 'Admin') {
            $departments = Department::all();
            $allowedLevels = ['Phòng ban'];
        } elseif ($user->role->role_name === 'Manager') {
            $departments = [$user->department];
            $allowedLevels = ['Phòng ban'];
        } else {
            $objectives = Objective::with(['user', 'department', 'keyResults', 'cycle', 'parentKeyResult.objective'])
                ->where('level', 'Phòng ban')
                ->where(function ($query) use ($user) {
                    $query->where('user_id', $user->id)
                          ->orWhereHas('department', function ($q) use ($user) {
                              $q->where('department_id', $user->department_id);
                          });
                })
                ->orderBy('created_at', 'desc')
                ->paginate(10);

            return view('my-objectives.index', [
                'objectives' => $objectives,
                'error' => 'Bạn không có quyền tạo OKR cấp phòng ban.'
            ]);
        }

        $companyKeyResults = KeyResult::whereHas('objective', function ($query) {
            $query->where('level', 'Công ty');
        })->with(['objective'])->get();

        return view('my-objectives.create', compact('departments', 'allowedLevels', 'cycles', 'companyKeyResults', 'user'));
    }

    /**
     * Lấy chi tiết Key Result qua AJAX
     */
    public function getKeyResultDetails(Request $request, $id): JsonResponse
    {
        $startTime = microtime(true);

        $keyResult = KeyResult::with(['objective'])
            ->whereHas('objective', function ($query) {
                $query->where('level', 'Công ty');
            })
            ->findOrFail($id);

        $executionTime = microtime(true) - $startTime;
        if ($executionTime > 3) {
            Log::warning('Tải chi tiết Key Result vượt quá 3 giây: ' . $executionTime . 's');
        }

        return response()->json([
            'kr_title' => $keyResult->kr_title,
            'target_value' => $keyResult->target_value,
            'current_value' => $keyResult->current_value,
            'unit' => $keyResult->unit,
            'status' => $keyResult->status,
            'weight' => $keyResult->weight,
            'progress_percent' => $keyResult->progress_percent,
            'objective_title' => $keyResult->objective->obj_title,
            'objective_description' => $keyResult->objective->description,
        ]);
    }

    /**
     * Lưu OKR (Objective và Key Results)
     */
    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        if (!in_array($user->role->role_name, ['Admin', 'Manager'])) {
            return redirect()->back()
                ->withErrors(['error' => 'Bạn không có quyền tạo OKR cấp phòng ban.'])
                ->withInput();
        }

        $validated = $request->validate([
            'obj_title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'status' => 'required|in:draft,active,completed',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
            'level' => 'required|in:Phòng ban',
            'department_id' => 'required|integer|exists:departments,department_id',
            'cycle_id' => 'required|integer|exists:cycles,cycle_id',
            'parent_key_result_id' => 'nullable|integer|exists:key_results,kr_id',
            'key_results' => 'required|array|min:1',
            'key_results.*.kr_title' => 'required|string|max:255',
            'key_results.*.target_value' => 'required|numeric',
            'key_results.*.current_value' => 'required|numeric',
            'key_results.*.unit' => 'required|string|max:50',
            'key_results.*.status' => 'required|in:draft,active,completed',
            'key_results.*.weight' => 'required|numeric|min:0|max:100',
            'key_results.*.progress_percent' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($user->role->role_name === 'Manager' && $user->department_id === $validated['department_id']) {
            return redirect()->back()
                ->withErrors(['error' => 'Bạn chỉ có thể tạo OKR cho phòng ban của mình.'])
                ->withInput();
        }

        if ($validated['parent_key_result_id']) {
            $parentKeyResult = KeyResult::where('kr_id', $validated['parent_key_result_id'])
                ->whereHas('objective', function ($query) use ($validated) {
                    $query->where('level', 'Công ty')
                          ->where('cycle_id', $validated['cycle_id']);
                })
                ->first();

            if (!$parentKeyResult) {
                return redirect()->back()
                    ->withErrors(['error' => 'Key Result cấp công ty không hợp lệ hoặc không thuộc chu kỳ hiện tại.'])
                    ->withInput();
            }
        }

        try {
            $startTime = microtime(true);

            DB::transaction(function () use ($validated, $user) {
                $objective = Objective::create([
                    'obj_title' => $validated['obj_title'],
                    'level' => $validated['level'],
                    'description' => $validated['description'],
                    'status' => $validated['status'],
                    'progress_percent' => $validated['progress_percent'] ?? 0,
                    'user_id' => $user->id,
                    'cycle_id' => $validated['cycle_id'],
                    'department_id' => $validated['department_id'],
                    'parent_key_result_id' => $validated['parent_key_result_id'],
                ]);

                foreach ($validated['key_results'] as $kr) {
                    KeyResult::create([
                        'kr_title' => $kr['kr_title'],
                        'target_value' => $kr['target_value'],
                        'current_value' => $kr['current_value'],
                        'unit' => $kr['unit'],
                        'status' => $kr['status'],
                        'weight' => $kr['weight'],
                        'progress_percent' => $kr['progress_percent'] ?? 0,
                        'objective_id' => $objective->objective_id,
                        'user_id' => $user->id,
                    ]);
                }
            });

            $executionTime = microtime(true) - $startTime;
            if ($executionTime > 2) {
                Log::warning('Lưu OKR vượt quá 2 giây: ' . $executionTime . 's');
            }

            return redirect()->route('my-objectives.index')
                ->with('success', 'OKR cấp phòng ban được tạo thành công!');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Lưu OKR thất bại: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Hiển thị form chỉnh sửa Objective
     */
    public function edit(string $id): View
    {
        $user = Auth::user();
        $objective = Objective::with('department')->findOrFail($id);
        $departments = [];
        $cycles = Cycle::all();
        $companyKeyResults = KeyResult::whereHas('objective', function ($query) use ($objective) {
            $query->where('level', 'Công ty')
                  ->where('cycle_id', $objective->cycle_id);
        })->with(['objective'])->get();

        $allowedLevels = $this->getAllowedLevels($user->role->role_name);
        Log::info('Checking edit permissions', [
            'user_id' => $user->id,
            'role' => $user->role->role_name,
            'objective_id' => $id,
            'objective_level' => $objective->level,
            'allowed_levels' => $allowedLevels,
            'objective_department_id' => $objective->department_id,
            'user_department_id' => $user->department_id
        ]);

        if (!in_array($objective->level, $allowedLevels) || 
            ($user->role->role_name === 'Manager' && $objective->department_id !== $user->department_id)) {
            Log::warning('User does not have permission to edit objective', [
                'user_id' => $user->id,
                'objective_id' => $id
            ]);
            return view('my-objectives.index', [
                'objectives' => Objective::where('level', 'Phòng ban')
                    ->where(function ($query) use ($user) {
                        $query->where('user_id', $user->id)
                              ->orWhereHas('department', function ($q) use ($user) {
                                  $q->where('department_id', $user->department_id);
                              });
                    })
                    ->orderBy('created_at', 'desc')
                    ->paginate(10),
                'error' => 'Bạn không có quyền chỉnh sửa Objective này.'
            ]);
        }

        if ($user->role->role_name === 'Admin') {
            $departments = Department::all();
        } elseif ($user->role->role_name === 'Manager') {
            $departments = [$user->department];
        }

        return view('my-objectives.edit', compact('objective', 'departments', 'cycles', 'companyKeyResults', 'user'));
    }

    /**
     * Cập nhật Objective
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($id);

        if ($user->role->role_name === 'Manager' && $objective->department_id !== $user->department_id) {
            return redirect()->back()
                ->withErrors(['error' => 'Bạn không có quyền cập nhật Objective này.']);
        }

        $validated = $request->validate([
            'obj_title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'status' => 'required|in:draft,active,completed',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
            'level' => 'required|in:Phòng ban',
            'department_id' => 'required|integer|exists:departments,department_id',
            'cycle_id' => 'required|integer|exists:cycles,cycle_id',
            'parent_key_result_id' => 'nullable|integer|exists:key_results,kr_id',
        ]);

        if ($user->role->role_name === 'Manager' && $user->department_id === $validated['department_id']) {
            return redirect()->back()
                ->withErrors(['error' => 'Bạn chỉ có thể cập nhật OKR cho phòng ban của mình.']);
        }

        if ($validated['parent_key_result_id']) {
            $parentKeyResult = KeyResult::where('kr_id', $validated['parent_key_result_id'])
                ->whereHas('objective', function ($query) use ($validated) {
                    $query->where('level', 'Công ty')
                          ->where('cycle_id', $validated['cycle_id']);
                })
                ->first();

            if (!$parentKeyResult) {
                return redirect()->back()
                    ->withErrors(['error' => 'Key Result cấp công ty không hợp lệ hoặc không thuộc chu kỳ hiện tại.'])
                    ->withInput();
            }
        }

        try {
            DB::transaction(function () use ($validated, $objective) {
                $objective->update([
                    'obj_title' => $validated['obj_title'],
                    'level' => $validated['level'],
                    'description' => $validated['description'],
                    'status' => $validated['status'],
                    'progress_percent' => $validated['progress_percent'] ?? 0,
                    'department_id' => $validated['department_id'],
                    'cycle_id' => $validated['cycle_id'],
                    'parent_key_result_id' => $validated['parent_key_result_id'],
                    'parent_objective_id' => null, // Xóa liên kết với Objective cấp công ty
                ]);
            });

            return redirect()->route('my-objectives.index')
                ->with('success', 'Objective được cập nhật thành công!');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Cập nhật Objective thất bại: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Xóa Objective
     */
    public function destroy(string $id): RedirectResponse
    {
        $user = Auth::user();
        $objective = Objective::findOrFail($id);

        if ($user->role->role_name === 'Manager' && $objective->department_id !== $user->department_id) {
            return redirect()->back()
                ->withErrors(['error' => 'Bạn không có quyền xóa Objective này.']);
        }

        try {
            DB::transaction(function () use ($objective) {
                $objective->keyResults()->delete();
                $objective->delete();
            });

            return redirect()->route('my-objectives.index')
                ->with('success', 'Objective đã được xóa thành công!');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Xóa Objective thất bại: ' . $e->getMessage()]);
        }
    }

    /**
     * Lấy danh sách cấp Objective được phép dựa trên vai trò
     */
    private function getAllowedLevels(string $roleName): array
    {
        return match ($roleName) {
            'Admin' => ['Công ty', 'Phòng ban', 'Cá nhân'],
            'Manager' => ['Phòng ban'],
            'Member' => ['Cá nhân'],
            default => ['Cá nhân'],
        };
    }
}