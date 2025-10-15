<?php

namespace App\Http\Controllers;

use App\Models\OkrLink;
use App\Models\Objective;
use App\Models\KeyResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class LinkController extends Controller
{
    /**
     * Lấy danh sách liên kết của user.
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $links = OkrLink::with(['sourceObjective', 'sourceKr', 'targetObjective', 'targetKr'])
            ->whereHas('sourceObjective', function ($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->orWhereHas('sourceKr.objective', function ($query) use ($user) {
                $query->where('user_id', $user->user_id);
            })
            ->get();

        return response()->json(['success' => true, 'data' => $links]);
    }

    /**
     * Lấy danh sách Key Results có thể làm target (cấp cao hơn, bao gồm từ các user khác).
     */
    public function getAvailableTargets(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_level' => 'required|in:person,team,unit,company',
        ]);

        $levels = ['person' => 1, 'team' => 2, 'unit' => 3, 'company' => 4];
        $sourceLevel = $levels[$validated['source_level']];

        $higherLevels = array_filter($levels, fn($val) => $val > $sourceLevel);
        $objectives = Objective::with('keyResults')
            ->whereIn('level', array_keys($higherLevels))
            ->get();

        $available = $objectives->flatMap(function ($obj) {
            $krItems = $obj->keyResults->map(function ($kr) use ($obj) {
                return [
                    'id' => $kr->kr_id,
                    'type' => 'kr',
                    'title' => $kr->kr_title,
                    'level' => $obj->level,
                    'objective_title' => $obj->obj_title,
                    'objective_id' => $obj->objective_id
                ];
            });
            return [...$krItems];
        });

        return response()->json(['success' => true, 'data' => $available]);
    }

    /**
     * Tạo liên kết mới (Objective cấp thấp liên kết với Key Result cấp cao hơn).
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $validated = $request->validate([
            'source_objective_id' => 'required|exists:objectives,objective_id',
            'target_kr_id' => 'required|exists:key_results,kr_id',
            'description' => 'nullable|string|max:255',
        ]);

        // Kiểm tra quyền cho source (luôn là objective)
        $source = Objective::findOrFail($validated['source_objective_id']);
        if ($source->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền liên kết source này.'], 403);
        }
        $sourceLevel = $source->level;

        // Kiểm tra target (luôn là KR) có level cao hơn
        $target = KeyResult::findOrFail($validated['target_kr_id']);
        $targetLevel = $target->objective->level;

        $levels = ['person' => 1, 'team' => 2, 'unit' => 3, 'company' => 4];
        if ($levels[$targetLevel] <= $levels[$sourceLevel]) {
            return response()->json(['success' => false, 'message' => 'Key Result đích phải có cấp độ cao hơn Objective nguồn.'], 422);
        }

        $link = OkrLink::create($validated);

        return response()->json(['success' => true, 'message' => 'Liên kết thành công', 'data' => $link]);
    }
}