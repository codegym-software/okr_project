<?php

namespace App\Http\Controllers;

use App\Models\Cycle;
use App\Models\Objective;
use App\Models\OkrLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class OkrTreeController extends Controller
{
    /**
     * Lấy danh sách company objectives để chọn
     */
    public function getCompanyObjectives(Request $request): JsonResponse
    {
        $cycleId = $request->input('cycle_id');
        if (!$cycleId) {
            $now = Carbon::now('Asia/Ho_Chi_Minh');
            $currentCycle = Cycle::where('start_date', '<=', $now)
                ->where('end_date', '>=', $now)
                ->first();
            
            if ($currentCycle) {
                $cycleId = $currentCycle->cycle_id;
            }
        }

        $companyObjectives = Objective::with(['user', 'department', 'cycle'])
            ->where('level', 'company')
            ->whereNull('archived_at')
            ->when($cycleId, fn($q) => $q->where('cycle_id', $cycleId))
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($obj) {
                return [
                    'objective_id' => $obj->objective_id,
                    'obj_title' => $obj->obj_title,
                    'cycle_name' => $obj->cycle?->cycle_name,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $companyObjectives,
        ]);
    }

    /**
     * Lấy tree view OKR bắt đầu từ OKR công ty
     * 
     * Logic:
     * - Nếu có objective_id: chỉ hiển thị tree của objective đó
     * - Nếu không: hiển thị tất cả company objectives (backward compatible)
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        // Xác định cycle
        $cycleId = $request->input('cycle_id');
        if (!$cycleId) {
            $now = Carbon::now('Asia/Ho_Chi_Minh');
            $currentCycle = Cycle::where('start_date', '<=', $now)
                ->where('end_date', '>=', $now)
                ->first();
            
            if ($currentCycle) {
                $cycleId = $currentCycle->cycle_id;
            }
        }

        // Nếu có objective_id, chỉ lấy tree của objective đó
        $objectiveId = $request->input('objective_id');
        if ($objectiveId) {
            $objective = Objective::with([
                    'keyResults' => fn($q) => $q->whereNull('archived_at')->with('assignedUser'),
                    'user.department',
                    'department',
                    'cycle',
                ])
                ->where('level', 'company')
                ->whereNull('archived_at')
                ->find($objectiveId);

            if (!$objective) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy Objective cấp công ty',
                ], 404);
            }

            $tree = $this->buildTreeNode($objective, $cycleId);

            return response()->json([
                'success' => true,
                'data' => $tree,
                'cycle_id' => $cycleId,
            ]);
        }

        // Backward compatible: Lấy tất cả OKR company trong cycle
        $companyObjectives = Objective::with([
                'keyResults' => fn($q) => $q->whereNull('archived_at')->with('assignedUser'),
                'user.department',
                'department',
                'cycle',
            ])
            ->where('level', 'company')
            ->whereNull('archived_at')
            ->when($cycleId, fn($q) => $q->where('cycle_id', $cycleId))
            ->orderBy('created_at', 'desc')
            ->get();

        // Build tree cho mỗi OKR company
        $tree = [];
        foreach ($companyObjectives as $companyObj) {
            $tree[] = $this->buildTreeNode($companyObj, $cycleId);
        }

        return response()->json([
            'success' => true,
            'data' => $tree,
            'cycle_id' => $cycleId,
        ]);
    }

    /**
     * Build tree node đệ quy
     * Mỗi node chứa: objective info, children (các OKR con), và linked KRs (nếu có)
     */
    private function buildTreeNode(Objective $objective, ?int $cycleId = null, int $depth = 0, int $maxDepth = 10): array
    {
        // Tránh đệ quy vô hạn
        if ($depth >= $maxDepth) {
            return $this->formatObjectiveNode($objective);
        }

        // Tìm các OKR con được liên kết lên OKR này
        // Các OKR con là các OKR có source_objective_id liên kết đến target_objective_id = objective này
        $childLinks = OkrLink::with([
                'sourceObjective' => fn($q) => $q->with([
                    'user.department',
                    'department',
                    'keyResults' => fn($kr) => $kr->whereNull('archived_at')->with('assignedUser'),
                ]),
            ])
            ->where('target_objective_id', $objective->objective_id)
            ->where('target_type', 'objective')
            ->where('source_type', 'objective')
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED)
            ->when($cycleId, function($q) use ($cycleId) {
                $q->whereHas('sourceObjective', fn($obj) => $obj->where('cycle_id', $cycleId));
            })
            ->get();

        // Tìm các KeyResult được liên kết lên OKR này
        $linkedKRs = OkrLink::with([
                'targetKr' => fn($q) => $q->with(['assignedUser', 'objective']),
            ])
            ->where('target_objective_id', $objective->objective_id)
            ->where('target_type', 'kr')
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED)
            ->get();

        // Build children nodes - bao gồm cả Key Results của Objective và các Objective con
        $children = [];
        $addedKrIds = []; // Track các KR đã được thêm để tránh trùng lặp
        $addedObjectiveIds = []; // Track các Objective đã được thêm để tránh trùng lặp
        
        // Thêm Key Results của Objective này như children (nếu có)
        foreach ($objective->keyResults as $kr) {
            if (!$kr->archived_at && !in_array($kr->kr_id, $addedKrIds)) {
                // Tìm các Objective được liên kết lên Key Result này
                $krChildLinks = OkrLink::with([
                        'sourceObjective' => fn($q) => $q->with([
                            'user.department',
                            'department',
                            'keyResults' => fn($kr) => $kr->whereNull('archived_at')->with('assignedUser'),
                        ]),
                    ])
                    ->where('target_kr_id', $kr->kr_id)
                    ->where('target_type', 'kr')
                    ->where('source_type', 'objective')
                    ->where('is_active', true)
                    ->where('status', OkrLink::STATUS_APPROVED)
                    ->when($cycleId, function($q) use ($cycleId) {
                        $q->whereHas('sourceObjective', fn($obj) => $obj->where('cycle_id', $cycleId));
                    })
                    ->get();
                
                $krChildren = [];
                foreach ($krChildLinks as $krLink) {
                    if ($krLink->sourceObjective && !$krLink->sourceObjective->archived_at) {
                        $krChildren[] = $this->buildTreeNode($krLink->sourceObjective, $cycleId, $depth + 1, $maxDepth);
                    }
                }
                
                // Tính progress_percent: từ database hoặc từ current_value/target_value
                $progressPercent = $kr->getAttributes()['progress_percent'] ?? null;
                if (is_null($progressPercent) && $kr->target_value > 0) {
                    $progressPercent = ($kr->current_value / $kr->target_value) * 100;
                    $progressPercent = round(max(0, min(100, $progressPercent)), 2);
                }
                $progressPercent = $progressPercent ?? 0;
                
                $children[] = [
                    'type' => 'key_result',
                    'kr_id' => $kr->kr_id,
                    'kr_title' => $kr->kr_title,
                    'progress_percent' => (float) $progressPercent,
                    'current_value' => $kr->current_value,
                    'target_value' => $kr->target_value,
                    'unit' => $kr->unit,
                    'assigned_user' => $kr->assignedUser ? [
                        'user_id' => $kr->assignedUser->user_id,
                        'full_name' => $kr->assignedUser->full_name,
                    ] : null,
                    'children' => $krChildren,
                ];
                
                $addedKrIds[] = $kr->kr_id; // Đánh dấu đã thêm
            }
        }
        
        // Thêm các Key Results được liên kết từ nơi khác (chỉ nếu chưa được thêm)
        foreach ($linkedKRs as $link) {
            if ($link->targetKr && !$link->targetKr->archived_at && !in_array($link->targetKr->kr_id, $addedKrIds)) {
                // Tìm các Objective được liên kết lên Key Result này
                $krChildLinks = OkrLink::with([
                        'sourceObjective' => fn($q) => $q->with([
                            'user.department',
                            'department',
                            'keyResults' => fn($kr) => $kr->whereNull('archived_at')->with('assignedUser'),
                        ]),
                    ])
                    ->where('target_kr_id', $link->targetKr->kr_id)
                    ->where('target_type', 'kr')
                    ->where('source_type', 'objective')
                    ->where('is_active', true)
                    ->where('status', OkrLink::STATUS_APPROVED)
                    ->when($cycleId, function($q) use ($cycleId) {
                        $q->whereHas('sourceObjective', fn($obj) => $obj->where('cycle_id', $cycleId));
                    })
                    ->get();
                
                $krChildren = [];
                foreach ($krChildLinks as $krLink) {
                    if ($krLink->sourceObjective && !$krLink->sourceObjective->archived_at) {
                        $krChildren[] = $this->buildTreeNode($krLink->sourceObjective, $cycleId, $depth + 1, $maxDepth);
                    }
                }
                
                // Tính progress_percent cho linked KR
                $linkedKr = $link->targetKr;
                $linkedProgressPercent = $linkedKr->getAttributes()['progress_percent'] ?? null;
                if (is_null($linkedProgressPercent) && $linkedKr->target_value > 0) {
                    $linkedProgressPercent = ($linkedKr->current_value / $linkedKr->target_value) * 100;
                    $linkedProgressPercent = round(max(0, min(100, $linkedProgressPercent)), 2);
                }
                $linkedProgressPercent = $linkedProgressPercent ?? 0;
                
                $children[] = [
                    'type' => 'key_result',
                    'kr_id' => $linkedKr->kr_id,
                    'kr_title' => $linkedKr->kr_title,
                    'progress_percent' => (float) $linkedProgressPercent,
                    'current_value' => $linkedKr->current_value,
                    'target_value' => $linkedKr->target_value,
                    'unit' => $linkedKr->unit,
                    'assigned_user' => $link->targetKr->assignedUser ? [
                        'user_id' => $link->targetKr->assignedUser->user_id,
                        'full_name' => $link->targetKr->assignedUser->full_name,
                    ] : null,
                    'link_id' => $link->link_id,
                    'children' => $krChildren,
                ];
                
                $addedKrIds[] = $link->targetKr->kr_id; // Đánh dấu đã thêm
            }
        }
        
        // Thêm các Objective con được liên kết trực tiếp (chỉ nếu chưa được thêm)
        foreach ($childLinks as $link) {
            if ($link->sourceObjective && !$link->sourceObjective->archived_at && !in_array($link->sourceObjective->objective_id, $addedObjectiveIds)) {
                $children[] = $this->buildTreeNode($link->sourceObjective, $cycleId, $depth + 1, $maxDepth);
                $addedObjectiveIds[] = $link->sourceObjective->objective_id; // Đánh dấu đã thêm
            }
        }

        // Format node
        $node = $this->formatObjectiveNode($objective);
        $node['children'] = $children;
        $node['type'] = 'objective';

        return $node;
    }

    /**
     * Format objective thành node structure
     */
    private function formatObjectiveNode(Objective $objective): array
    {
        return [
            'objective_id' => $objective->objective_id,
            'obj_title' => $objective->obj_title,
            'description' => $objective->description,
            'level' => $objective->level,
            'status' => $objective->status,
            'progress_percent' => $objective->progress_percent,
            'cycle_id' => $objective->cycle_id,
            'cycle_name' => $objective->cycle?->cycle_name,
            'user' => $objective->user ? [
                'user_id' => $objective->user->user_id,
                'full_name' => $objective->user->full_name,
                'avatar_url' => $objective->user->avatar_url,
            ] : null,
            'department' => $objective->department ? [
                'department_id' => $objective->department->department_id,
                'department_name' => $objective->department->department_name,
            ] : null,
            'key_results' => $objective->keyResults->map(function($kr) {
                // Tính progress_percent
                $progressPercent = $kr->getAttributes()['progress_percent'] ?? null;
                if (is_null($progressPercent) && $kr->target_value > 0) {
                    $progressPercent = ($kr->current_value / $kr->target_value) * 100;
                    $progressPercent = round(max(0, min(100, $progressPercent)), 2);
                }
                $progressPercent = $progressPercent ?? 0;
                
                return [
                    'kr_id' => $kr->kr_id,
                    'kr_title' => $kr->kr_title,
                    'progress_percent' => (float) $progressPercent,
                    'current_value' => $kr->current_value,
                    'target_value' => $kr->target_value,
                    'unit' => $kr->unit,
                    'assigned_user' => $kr->assignedUser ? [
                        'user_id' => $kr->assignedUser->user_id,
                        'full_name' => $kr->assignedUser->full_name,
                    ] : null,
                ];
            }),
            'children' => [], // Sẽ được populate bởi buildTreeNode
            'linked_key_results' => [], // Các KR được liên kết từ OKR khác
        ];
    }

    /**
     * Lấy tree view từ một OKR cụ thể (không nhất thiết là company)
     */
    public function show(Request $request, int $objectiveId): JsonResponse
    {
            $objective = Objective::with([
                'keyResults' => fn($q) => $q->whereNull('archived_at')->with('assignedUser'),
                'user.department',
                'department',
                'cycle',
            ])
            ->whereNull('archived_at')
            ->findOrFail($objectiveId);

        $cycleId = $request->input('cycle_id', $objective->cycle_id);
        
        $tree = $this->buildTreeNode($objective, $cycleId);

        return response()->json([
            'success' => true,
            'data' => $tree,
        ]);
    }
}

