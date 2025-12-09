<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Objective;
use App\Models\Cycle;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class MyOKRController extends Controller
{
    /**
     * Hiển thị danh sách OKR cá nhân trong quý hiện tại (lấy từ DB)
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return redirect()->route('login');
        }

        $now = Carbon::now();
        $quarter = $now->quarter;
        $year = $now->year;

        // Ngày bắt đầu/kết thúc quý hiện tại
        $startOfQuarter = Carbon::create($year, ($quarter - 1) * 3 + 1, 1)->startOfMonth();
        $endOfQuarter   = (clone $startOfQuarter)->addMonths(2)->endOfMonth();

        // Lấy cycle đang hoạt động trong quý hiện tại (ưu tiên status active và nằm trong khoảng ngày)
        $currentCycle = Cycle::where(function ($q) use ($startOfQuarter, $endOfQuarter) {
                $q->whereDate('start_date', '<=', $endOfQuarter)
                  ->whereDate('end_date', '>=', $startOfQuarter);
            })
            ->orderBy('start_date', 'desc')
            ->first();

        if (!$currentCycle) {
            return view('app');
        }

        // Query objectives của user trong cycle hiện tại + eager load key results
        $query = Objective::with([
                'keyResults' => function ($q) {
                    $q->orderBy('weight', 'desc');
                },
                'keyResults.checkIns'
            ])
            ->where('user_id', $user->user_id)
            ->where('cycle_id', $currentCycle->cycle_id);

        // Lọc trạng thái
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        // Lọc theo tiến độ (0-25, 26-75, 76-100)
        if ($request->filled('progress')) {
            [$min, $max] = $this->getProgressRange($request->string('progress'));
            $query->whereBetween('progress_percent', [$min, $max]);
        }

        // Sắp xếp
        $sortBy = $request->get('sort', 'created_at');
        $direction = $request->get('direction', 'desc');
        $allowed = ['created_at', 'progress', 'title', 'status'];
        if (!in_array($sortBy, $allowed, true)) {
            $sortBy = 'created_at';
        }
        switch ($sortBy) {
            case 'progress':
                $query->orderBy('progress_percent', $direction);
                break;
            case 'title':
                $query->orderBy('obj_title', $direction);
                break;
            case 'status':
                $query->orderBy('status', $direction);
                break;
            default:
                $query->orderBy('created_at', $direction);
        }

        $objectives = $query->get();

        // Thống kê
        $stats = [
            'total' => $objectives->count(),
            'completed' => $objectives->where('status', 'completed')->count(),
            'in_progress' => $objectives->where('status', 'in_progress')->count(),
            'not_started' => $objectives->where('status', 'not_started')->count(),
            'average_progress' => (float) round($objectives->avg('progress_percent') ?? 0, 1),
        ];

        // Thông báo: gần đến hạn, quá hạn, tiến độ chậm
        $notifications = [];
        $now = Carbon::now();
        $cycleEnd = Carbon::parse($currentCycle->end_date);
        foreach ($objectives as $objective) {
            $daysRemaining = $now->diffInDays($cycleEnd, false);
            $progress = (float) ($objective->progress_percent ?? 0);

            if ($daysRemaining > 0 && $daysRemaining <= 7) {
                $notifications[] = [
                    'type' => 'warning',
                    'title' => 'OKR sắp đến hạn',
                    'message' => "Objective '" . ($objective->obj_title ?? 'No title') . "' còn {$daysRemaining} ngày nữa",
                    'deadline' => $cycleEnd->format('d/m/Y'),
                    'progress' => $progress,
                ];
            } elseif ($daysRemaining < 0) {
                $notifications[] = [
                    'type' => 'danger',
                    'title' => 'OKR đã quá hạn',
                    'message' => "Objective '" . ($objective->obj_title ?? 'No title') . "' đã quá hạn " . abs($daysRemaining) . " ngày",
                    'deadline' => $cycleEnd->format('d/m/Y'),
                    'progress' => $progress,
                ];
            }

            if ($progress < 30 && $daysRemaining > 30) {
                $notifications[] = [
                    'type' => 'info',
                    'title' => 'Tiến độ chậm',
                    'message' => "Objective '" . ($objective->obj_title ?? 'No title') . "' có tiến độ thấp ({$progress}%)",
                    'deadline' => $cycleEnd->format('d/m/Y'),
                    'progress' => $progress,
                ];
            }
        }

        return view('app');
    }

public function indexx(Request $request)
{
    // Kiểm tra mode trong session (mặc định là sáng)
    $mode = session('mode', 'light');

    if ($mode === 'dark') {
        return view('app');
    } else {
        return view('app');
    }
}

public function switchMode(Request $request)
{
    $current = session('mode', 'light');
    $newMode = $current === 'light' ? 'dark' : 'light';
    session(['mode' => $newMode]);

    return back();
}

    /**
     * Tạo dữ liệu mẫu cho demo
     */
    // Xóa dữ liệu mẫu, sử dụng DB thực tế

    /**
     * Tạo thông báo nhắc nhở cho OKR
     */
    private function getNotifications($objectives)
    {
        $notifications = [];
        $now = Carbon::now();
        
        foreach ($objectives as $objective) {
            $deadline = ($objective->created_at instanceof Carbon)
                ? $objective->created_at->copy()->addMonths(3)
                : Carbon::parse($objective->created_at)->addMonths(3);
            $daysRemaining = $now->diffInDays($deadline, false);
            // Công thức: O = trung bình cộng của tiến độ KR trực tiếp
            // Chỉ tính từ KeyResults trực tiếp, không archived
            $keyResults = $objective->keyResults->filter(function($kr) {
                return is_null($kr->archived_at);
            });
            
            $avgProgress = 0;
            if ($keyResults->isNotEmpty()) {
                $progressList = [];
                foreach ($keyResults as $kr) {
                    $progress = $kr->progress_percent;
                    if ($progress !== null && is_numeric($progress)) {
                        $progressList[] = (float) $progress;
                    }
                }
                if (!empty($progressList)) {
                    $avgProgress = round(array_sum($progressList) / count($progressList), 0);
                }
            }
            
            // Kiểm tra deadline (3 tháng từ ngày tạo)
            if ($daysRemaining > 0 && $daysRemaining <= 7) {
                $daysLeftInt = (int) $daysRemaining;
                $notifications[] = [
                    'type' => 'warning',
                    'title' => 'OKR sắp đến hạn',
                    'message' => "OKR '{$objective->title}' còn {$daysLeftInt} ngày nữa",
                    'deadline' => $deadline->format('d/m/Y'),
                    'progress' => $avgProgress
                ];
            } elseif ($daysRemaining < 0) {
                $daysOverInt = (int) abs($daysRemaining);
                $notifications[] = [
                    'type' => 'danger',
                    'title' => 'OKR đã quá hạn',
                    'message' => "OKR '{$objective->title}' đã quá hạn {$daysOverInt} ngày",
                    'deadline' => $deadline->format('d/m/Y'),
                    'progress' => $avgProgress
                ];
            } elseif ($daysRemaining === 0) {
                $notifications[] = [
                    'type' => 'warning',
                    'title' => 'OKR đến hạn hôm nay',
                    'message' => "OKR '{$objective->title}' đến hạn hôm nay",
                    'deadline' => $deadline->format('d/m/Y'),
                    'progress' => $avgProgress
                ];
            }
            
            // Kiểm tra tiến độ chậm
            if ($daysRemaining > 30 && $avgProgress < 30) {
        $notifications[] = [
            'type' => 'info',
            'title' => 'Tiến độ chậm',
            'message' => "OKR '{$objective->title}' có tiến độ thấp ({$avgProgress}%)",
            'deadline' => $deadline->format('d/m/Y'),
            'progress' => $avgProgress
        ];
    }
}
        
        return $notifications;
    }
}