<?php

namespace App\Http\Controllers;
use App\Models\Cycle;
use App\Models\Objective;
use App\Models\KeyResult;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CycleController extends Controller
{
    public function index(Request $request) {
        $cycles = Cycle::orderByDesc('start_date')->get();
        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $cycles]);
        }
        return view('app');
    }

    public function create() {
        return view('app');
    }

    public function store(Request $request) {
        $request->validate([
            'cycle_name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'required|in:active,inactive,draft',
            'description' => 'nullable|string',
        ]);

        // Không cho phép tạo chu kỳ có khoảng thời gian trùng với chu kỳ khác
        $start = Carbon::parse($request->input('start_date'))->startOfDay();
        $end = Carbon::parse($request->input('end_date'))->endOfDay();

        $hasOverlap = Cycle::where(function ($q) use ($start, $end) {
                // start hoặc end nằm trong khoảng của chu kỳ khác
                $q->whereBetween('start_date', [$start, $end])
                  ->orWhereBetween('end_date', [$start, $end])
                  // hoặc chu kỳ mới bao trùm chu kỳ cũ
                  ->orWhere(function ($q2) use ($start, $end) {
                      $q2->where('start_date', '<=', $start)
                         ->where('end_date', '>=', $end);
                  });
            })->exists();

        if ($hasOverlap) {
            $message = 'Khoảng thời gian của chu kỳ bị trùng với một chu kỳ khác. Vui lòng chọn khoảng thời gian không trùng.';
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => $message], 422);
            }
            return back()->withErrors(['date_range' => $message])->withInput();
        }

        $cycle = Cycle::create($request->all());
        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $cycle, 'message' => 'Tạo chu kỳ thành công!']);
        }
        return redirect()->route('cycles.index')->with('success', 'Tạo chu kỳ thành công!');
    }

    public function show(Request $request, Cycle $cycle) {
        // Eager load objectives, user và keyResults với assignedUser để FE không phải gọi thêm
        $cycle->load(['objectives.user', 'objectives.department', 'objectives.keyResults.assignee']);
        $objectives = $cycle->objectives;
        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => compact('cycle','objectives')]);
        }
        return view('app');
    }

    public function edit(Cycle $cycle) {
        return view('app');
    }

    public function update(Request $request, Cycle $cycle) {
        $request->validate([
            'cycle_name' => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'status' => 'nullable|in:active,inactive,draft',
            'description' => 'nullable|string',
        ]);

        // Chỉ update các field được gửi lên
        $data = $request->only(['cycle_name', 'start_date', 'end_date', 'status', 'description']);
        
        // Loại bỏ các field null hoặc rỗng
        $data = array_filter($data, function($value) {
            return $value !== null && $value !== '';
        });

        // Validate logic business nếu có cả start_date và end_date
        if (isset($data['start_date']) && isset($data['end_date'])) {
            if ($data['start_date'] > $data['end_date']) {
                return response()->json(['success' => false, 'message' => 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu'], 422);
            }

            // Kiểm tra trùng khoảng thời gian với các chu kỳ khác (bỏ qua chính nó)
            $start = Carbon::parse($data['start_date'])->startOfDay();
            $end = Carbon::parse($data['end_date'])->endOfDay();

            $hasOverlap = Cycle::where('cycle_id', '!=', $cycle->cycle_id)
                ->where(function ($q) use ($start, $end) {
                    $q->whereBetween('start_date', [$start, $end])
                      ->orWhereBetween('end_date', [$start, $end])
                      ->orWhere(function ($q2) use ($start, $end) {
                          $q2->where('start_date', '<=', $start)
                             ->where('end_date', '>=', $end);
                      });
                })
                ->exists();

            if ($hasOverlap) {
                $message = 'Khoảng thời gian của chu kỳ bị trùng với một chu kỳ khác. Vui lòng chọn khoảng thời gian không trùng.';
                if ($request->expectsJson()) {
                    return response()->json(['success' => false, 'message' => $message], 422);
                }
                return back()->withErrors(['date_range' => $message])->withInput();
            }
        }

        $cycle->update($data);
        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $cycle, 'message' => 'Cập nhật chu kỳ thành công!']);
        }
        return redirect()->route('cycles.index')->with('success', 'Cập nhật chu kỳ thành công!');
    }

    public function destroy(Cycle $cycle) {
        $cycle->delete();
        if (request()->expectsJson()) {
            return response()->json(['success' => true, 'message' => 'Xóa chu kỳ thành công!']);
        }
        return redirect()->route('cycles.index')->with('success', 'Xóa chu kỳ thành công!');
    }

    /**
     * Đóng chu kỳ: yêu cầu admin, chỉ khi đã hết hạn (trừ khi force=1),
     * khóa cập nhật bằng cách set closed_at và (tùy chọn) chuyển status inactive.
     */
    public function close(Request $request, Cycle $cycle)
    {
        // Nếu đã inactive coi như đã đóng
        if ($cycle->status !== 'active') {
            return response()->json(['success' => false, 'message' => 'Chu kỳ đã đóng trước đó.'], 422);
        }

        $now = Carbon::now();
        $force = (bool) $request->boolean('force');
        if (!$force && $cycle->end_date && $now->lt(Carbon::parse($cycle->end_date))) {
            return response()->json(['success' => false, 'message' => 'Chưa đến ngày kết thúc chu kỳ.'], 422);
        }

        DB::beginTransaction();
        try {
            // Tính và lưu tiến độ cuối cùng cho các Objective
            $objectives = Objective::with('keyResults')
                ->where('cycle_id', $cycle->cycle_id)
                ->get();

            foreach ($objectives as $obj) {
                $avg = $obj->keyResults->count() ? $obj->keyResults->avg(function (KeyResult $kr) {
                    $p = $kr->progress_percent; // accessor
                    return is_numeric($p) ? (float) $p : 0.0;
                }) : 0;
                $obj->progress_percent = round($avg ?? 0, 2);
                $obj->save();
            }

            // Đánh dấu chu kỳ đã đóng bằng status inactive; end_date là ngày đóng
            $cycle->status = 'inactive';
            $cycle->save();

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Đã đóng chu kỳ.', 'data' => $cycle->fresh()]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Đóng chu kỳ thất bại: '.$e->getMessage()], 500);
        }
    }
}