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
        
        // Xây dựng query dựa trên role
        $query = Objective::with(['user', 'cycle', 'keyResults', 'department']);
        
        if ($user->isManager()) {
            // Manager xem OKR phòng ban của mình, OKR nhóm và OKR cá nhân
            $query->where(function($q) use ($user) {
                $q->where('level', 'Cá nhân')
                  ->orWhere('level', 'Nhóm')
                  ->orWhere(function($subQ) use ($user) {
                      $subQ->where('level', 'Phòng ban')
                           ->where('department_id', $user->department_id);
                  });
            });
        } elseif ($user->isMember()) {
            // Member xem OKR cá nhân và OKR phòng ban của phòng ban mình
            $query->where(function($q) use ($user) {
                $q->where('level', 'Cá nhân')
                  ->orWhere(function($subQ) use ($user) {
                      $subQ->where('level', 'Phòng ban')
                           ->where('department_id', $user->department_id);
                  });
            });
        }
        // Admin xem tất cả (không cần filter)
        
        $objectives = $query->orderBy('created_at', 'desc')->paginate(10);
        return view('objectives.index', compact('objectives'));
    }

    /**
     * Show the form for creating a new objective with Tailwind
     */
    public function create(Request $request): View
    {
        $user = Auth::user();
        $cycle_id = $request->query('cycle_id', null);

        // Xác định các level được phép tạo theo role_id
        $allowedLevels = match($user->role_id) {
            1 => ['Công ty', 'Phòng ban', 'Nhóm', 'Cá nhân'], // Admin
            2 => ['Phòng ban', 'Nhóm', 'Cá nhân'], // Manager chỉ tạo OKR phòng ban, nhóm, cá nhân
            default => ['Nhóm', 'Cá nhân'],                   // Member
        };

        // Lấy danh sách phòng ban cho Manager và Admin
        $departments = collect();
        if ($user->isAdmin() || $user->isManager()) {
            $departments = \App\Models\Department::all();
        }

        // Lấy phòng ban của Manager (nếu có)
        $userDepartment = $user->department;

        // Lấy danh sách cycles
        $cycles = \App\Models\Cycle::where('status', 'active')->orderBy('start_date', 'desc')->get();

        return view('objectives.create', compact('cycle_id', 'allowedLevels', 'departments', 'userDepartment', 'cycles'));
    }

    /**
     * Store a newly created objective
     */
    public function store(Request $request): RedirectResponse
    {
        $startTime = microtime(true);
        $user = Auth::user();
        $level = $request->input('level', 'Cá nhân');

        // Xác định các level được phép tạo theo role_id
        switch ($user->role_id) {
            case 1: // Admin
                $allowedLevels = ['Công ty', 'Phòng ban', 'Nhóm', 'Cá nhân'];
                break;
            case 2: // Manager
                $allowedLevels = ['Phòng ban', 'Nhóm', 'Cá nhân'];
                break;
            case 3: // Member
            default:
                $allowedLevels = ['Nhóm', 'Cá nhân'];
                break;
        }

        // Kiểm tra quyền
        if (!in_array($level, $allowedLevels)) {
            return redirect()->back()
                ->withErrors(['level' => 'Bạn không có quyền tạo OKR cấp ' . $level . '.'])
                ->withInput();
        }

        // Validate dữ liệu
        $validationRules = [
            // Objective
            'obj_title' => 'required|string|max:255',
            'level' => 'required|string|in:' . implode(',', $allowedLevels),
            'description' => 'nullable|string|max:1000',
            'status' => 'required|in:draft,active,completed',
            'progress_percent' => 'nullable|numeric|min:0|max:100',
            'cycle_id' => 'required|integer|exists:cycles,cycle_id',
            'department_id' => 'nullable|integer|exists:departments,department_id',

            // Key Results - chỉ bắt buộc cho cấp phòng ban
            'key_results' => 'nullable|array',
            'key_results.*.kr_title' => 'nullable|string|max:255',
            'key_results.*.target_value' => 'nullable|numeric|min:0',
            'key_results.*.current_value' => 'nullable|numeric|min:0',
            'key_results.*.unit' => 'nullable|string|max:255',
            'key_results.*.status' => 'nullable|string|max:255',
            'key_results.*.weight' => 'nullable|integer|min:0|max:100',
            'key_results.*.progress_percent' => 'nullable|numeric|min:0|max:100',
        ];

        // Yêu cầu department_id và key_results khi tạo OKR phòng ban
        if ($level === 'Phòng ban') {
            $validationRules['department_id'] = 'required|integer|exists:departments,department_id';
            $validationRules['key_results'] = 'required|array|min:1';
            $validationRules['key_results.*.kr_title'] = 'required|string|max:255';
            $validationRules['key_results.*.target_value'] = 'required|numeric|min:0';
            $validationRules['key_results.*.unit'] = 'required|string|max:255';
        }

        $validated = $request->validate($validationRules);

        // Kiểm tra quyền tạo OKR phòng ban
        if ($level === 'Phòng ban') {
            if ($user->isManager()) {
                // Reload user để đảm bảo có department_id mới nhất
                $user->refresh();
                
                if (!$user->department_id) {
                    return redirect()->back()
                        ->withErrors(['department' => 'Bạn chưa được phân công phòng ban. Vui lòng liên hệ Admin để được gán phòng ban.'])
                        ->withInput();
                }
                
                // Manager chỉ có thể tạo OKR cho phòng ban của mình
                if ($validated['department_id'] && $validated['department_id'] != $user->department_id) {
                    return redirect()->back()
                        ->withErrors(['department_id' => 'Bạn chỉ có thể tạo OKR cho phòng ban của mình. Không được phép tạo OKR cho phòng ban khác.'])
                        ->withInput();
                }
                
                // Tự động gán phòng ban của Manager
                $validated['department_id'] = $user->department_id;
                
            } elseif ($user->isAdmin()) {
                // Admin có thể tạo OKR cho bất kỳ phòng ban nào
                if (!$validated['department_id']) {
                    return redirect()->back()
                        ->withErrors(['department_id' => 'Vui lòng chọn phòng ban cho OKR cấp phòng ban.'])
                        ->withInput();
                }
            } else {
                // Các vai trò khác (Member, etc.) không được phép tạo OKR phòng ban
                return redirect()->back()
                    ->withErrors(['level' => 'Bạn không có quyền tạo OKR cấp phòng ban. Chỉ Admin và Manager mới có thể tạo OKR phòng ban.'])
                    ->withInput();
            }
        }

        // Tạo Objective và Key Results trong transaction với tối ưu hóa performance
        $objective = DB::transaction(function() use ($validated, $request) {
            $objectiveData = [
                'obj_title' => $validated['obj_title'],
                'level' => $validated['level'],
                'description' => $validated['description'],
                'status' => $validated['status'],
                'progress_percent' => $validated['progress_percent'] ?? 0,
                'user_id' => Auth::id() ?? 2,
                'cycle_id' => $validated['cycle_id'],
                'department_id' => $validated['department_id'] ?? null,
            ];
            $objective = Objective::create($objectiveData);

            // Tối ưu hóa: Tạo Key Results bằng bulk insert thay vì từng cái một
            if (!empty($validated['key_results'])) {
                $keyResultsData = [];
                foreach ($validated['key_results'] as $kr) {
                    if (!empty($kr['kr_title'])) {
                        $keyResultsData[] = [
                            'kr_title' => $kr['kr_title'],
                            'target_value' => $kr['target_value'] ?? 0,
                            'current_value' => $kr['current_value'] ?? 0,
                            'unit' => $kr['unit'] ?? '',
                            'status' => $kr['status'] ?? 'in_progress',
                            'weight' => $kr['weight'] ?? 0,
                            'progress_percent' => $kr['progress_percent'] ?? 0,
                            'objective_id' => $objective->objective_id,
                            'cycle_id' => $objective->cycle_id,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }
                
                // Bulk insert để tăng performance
                if (!empty($keyResultsData)) {
                    KeyResult::insert($keyResultsData);
                }
            }
            
            return $objective;
        });

        $endTime = microtime(true);
        $responseTime = round(($endTime - $startTime) * 1000); // in milliseconds

        // Kiểm tra thời gian phản hồi có vượt quá 2 giây không
        $responseTimeSeconds = $responseTime / 1000;
        $performanceStatus = $responseTimeSeconds <= 2 ? '✅' : '⚠️';
        
        $successMessage = $level === 'Phòng ban' 
            ? "OKR phòng ban đã được tạo thành công! {$performanceStatus} Thời gian phản hồi: {$responseTime}ms. OKR này sẽ hiển thị trong danh sách OKR của phòng ban để các thành viên có thể xem."
            : "OKR đã được tạo thành công! {$performanceStatus} Thời gian phản hồi: {$responseTime}ms";

        // Log performance nếu vượt quá 2 giây
        if ($responseTimeSeconds > 2) {
            \Log::warning("OKR creation took longer than 2 seconds", [
                'response_time' => $responseTime,
                'level' => $level,
                'user_id' => Auth::id(),
                'key_results_count' => count($validated['key_results'] ?? [])
            ]);
        }

        return redirect()->route('objectives.index')
            ->with('success', $successMessage);
    }

    /**
     * Display the specified objective
     */
    public function show(string $id): View
    {
        $user = Auth::user();
        $objective = Objective::with(['keyResults', 'department'])->findOrFail($id);
        
        // Kiểm tra quyền xem OKR phòng ban
        if ($objective->level === 'Phòng ban') {
            if ($user->isManager()) {
                if (!$user->department_id || $objective->department_id !== $user->department_id) {
                    abort(403, 'Bạn không có quyền xem OKR phòng ban này.');
                }
            } elseif ($user->isMember()) {
                // Member chỉ có thể xem OKR phòng ban của phòng ban mình
                if (!$user->department_id || $objective->department_id !== $user->department_id) {
                    abort(403, 'Bạn không có quyền xem OKR phòng ban này.');
                }
            } elseif (!$user->isAdmin()) {
                abort(403, 'Bạn không có quyền xem OKR phòng ban.');
            }
        }
        
        return view('objectives.show', compact('objective'));
    }

    /**
     * Show the form for editing the specified objective
     */
    public function edit(string $id): View
    {
        $user = Auth::user();
        $objective = Objective::with('department')->findOrFail($id);
        
        // Kiểm tra quyền chỉnh sửa
        if ($objective->level === 'Phòng ban') {
            if ($user->isManager()) {
                if (!$user->department_id || $objective->department_id !== $user->department_id) {
                    abort(403, 'Bạn không có quyền chỉnh sửa OKR phòng ban này.');
                }
            } elseif (!$user->isAdmin()) {
                abort(403, 'Bạn không có quyền chỉnh sửa OKR phòng ban.');
            }
        } elseif ($objective->level === 'Cá nhân') {
            // OKR cá nhân chỉ có owner hoặc Admin mới được chỉnh sửa
            if ($user->isMember() && $objective->user_id !== $user->user_id) {
                abort(403, 'Bạn chỉ có thể chỉnh sửa OKR cá nhân của chính mình.');
            }
        }
        
        return view('objectives.edit', compact('objective'));
    }

    /**
     * Update the specified objective
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $user = Auth::user();
        $objective = Objective::with('department')->findOrFail($id);
        
        // Kiểm tra quyền cập nhật
        if ($objective->level === 'Phòng ban') {
            if ($user->isManager()) {
                if (!$user->department_id || $objective->department_id !== $user->department_id) {
                    abort(403, 'Bạn không có quyền cập nhật OKR phòng ban này.');
                }
            } elseif (!$user->isAdmin()) {
                abort(403, 'Bạn không có quyền cập nhật OKR phòng ban.');
            }
        } elseif ($objective->level === 'Cá nhân') {
            // OKR cá nhân chỉ có owner hoặc Admin mới được cập nhật
            if ($user->isMember() && $objective->user_id !== $user->user_id) {
                abort(403, 'Bạn chỉ có thể cập nhật OKR cá nhân của chính mình.');
            }
        }

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'status'      => 'required|in:draft,active,completed',
            'progress'    => 'nullable|numeric|min:0|max:100'
        ]);

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
        $objective = Objective::with('department')->findOrFail($id);
        
        // Kiểm tra quyền xóa
        if ($objective->level === 'Phòng ban') {
            if ($user->isManager()) {
                if (!$user->department_id || $objective->department_id !== $user->department_id) {
                    abort(403, 'Bạn không có quyền xóa OKR phòng ban này.');
                }
            } elseif (!$user->isAdmin()) {
                abort(403, 'Bạn không có quyền xóa OKR phòng ban.');
            }
        } elseif ($objective->level === 'Cá nhân') {
            // OKR cá nhân chỉ có owner hoặc Admin mới được xóa
            if ($user->isMember() && $objective->user_id !== $user->user_id) {
                abort(403, 'Bạn chỉ có thể xóa OKR cá nhân của chính mình.');
            }
        }
        
        $objective->delete();

        return redirect()->route('objectives.index')
            ->with('success', 'Objective deleted successfully!');
    }
}
