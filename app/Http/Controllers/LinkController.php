<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\KeyResult;
use App\Models\Notification;
use App\Models\Objective;
use App\Models\OkrAssignment;
use App\Models\OkrLink;
use App\Models\OkrLinkEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class LinkController extends Controller
{
    private const LEVEL_ORDER = [
        'person' => 1,
        'team' => 2,
        'unit' => 3,
        'company' => 4,
    ];

    /**
     * Lấy thông tin các liên kết liên quan tới user hiện tại.
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();

        $outgoing = OkrLink::with($this->defaultRelations())
            ->ownedBy($user->user_id)
            ->orderByDesc('created_at')
            ->get()
            ->filter(function ($link) {
                // Loại bỏ link có target đã bị archived
                if ($link->targetObjective && $link->targetObjective->archived_at) {
                    return false;
                }
                if ($link->targetKr && $link->targetKr->archived_at) {
                    return false;
                }
                return true;
            })
            ->values();

        $incoming = OkrLink::with($this->defaultRelations())
            ->targetedTo($user->user_id)
            ->whereIn('status', [OkrLink::STATUS_PENDING, OkrLink::STATUS_NEEDS_CHANGES])
            ->orderBy('status')
            ->orderByDesc('created_at')
            ->get()
            ->filter(function ($link) {
                // Loại bỏ link có target đã bị archived
                if ($link->targetObjective && $link->targetObjective->archived_at) {
                    return false;
                }
                if ($link->targetKr && $link->targetKr->archived_at) {
                    return false;
                }
                return true;
            })
            ->values();

        $children = OkrLink::with($this->defaultRelations())
            ->targetedTo($user->user_id)
            ->status(OkrLink::STATUS_APPROVED)
            ->orderByDesc('ownership_transferred_at')
            ->get()
            ->filter(function ($link) {
                // Loại bỏ link có target đã bị archived
                if ($link->targetObjective && $link->targetObjective->archived_at) {
                    return false;
                }
                if ($link->targetKr && $link->targetKr->archived_at) {
                    return false;
                }
                return true;
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'outgoing' => $outgoing,
                'incoming' => $incoming,
                'children' => $children,
            ],
        ]);
    }

    /**
     * Danh sách OKR cấp cao có thể liên kết.
     */
    public function getAvailableTargets(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_type' => ['required', Rule::in(['objective'])], // Source luôn là Objective
            'source_id' => ['required'],
            'source_level' => ['required', Rule::in(array_keys(self::LEVEL_ORDER))],
            'level' => ['nullable', Rule::in(array_keys(self::LEVEL_ORDER))],
            'status' => ['nullable', 'string'],
            'keyword' => ['nullable', 'string'],
        ]);

        $user = Auth::user();
        $sourceLevelRank = self::LEVEL_ORDER[$validated['source_level']];
        $levelFilter = $validated['level'] ?? null;
        $perPage = (int) $request->integer('per_page', 10);

        $higherLevels = array_keys(array_filter(self::LEVEL_ORDER, function ($rank, $level) use ($sourceLevelRank, $levelFilter) {
            if ($levelFilter) {
                return $level === $levelFilter && self::LEVEL_ORDER[$level] > $sourceLevelRank;
            }
            return $rank > $sourceLevelRank;
        }, ARRAY_FILTER_USE_BOTH));

        if (empty($higherLevels)) {
            return response()->json([
                'success' => true,
                'data' => [
                    'items' => [],
                    'meta' => ['total' => 0],
                ],
            ]);
        }

        $query = Objective::with([
                'keyResults' => fn($q) => $q->active(),
                'user'
            ])
            ->whereNull('archived_at')
            ->whereIn('level', $higherLevels)
            ->where(function ($q) use ($user) {
                $q->whereNull('department_id')
                    ->orWhere('department_id', $user->department_id)
                    ->orWhere('user_id', $user->user_id);
            });

        if ($validated['status'] ?? null) {
            $query->where('status', $validated['status']);
        }

        if ($validated['keyword'] ?? null) {
            $keyword = '%' . trim($validated['keyword']) . '%';
            $query->where(function ($q) use ($keyword) {
                $q->where('obj_title', 'like', $keyword)
                    ->orWhereHas('keyResults', function ($krQuery) use ($keyword) {
                        $krQuery->where('kr_title', 'like', $keyword);
                    });
            });
        }

        $objectives = $query->orderBy('level')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $objectives->items(),
                'meta' => [
                    'current_page' => $objectives->currentPage(),
                    'per_page' => $objectives->perPage(),
                    'last_page' => $objectives->lastPage(),
                    'total' => $objectives->total(),
                ],
            ],
        ]);
    }

    /**
     * Gửi yêu cầu liên kết.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $validated = $request->validate([
            'source_type' => ['required', Rule::in(['objective'])], // Source luôn là Objective
            'source_id' => ['required'],
            'target_type' => ['required', Rule::in(['objective', 'kr'])],
            'target_id' => ['required'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        // Source luôn là Objective
        $sourceEntity = Objective::with('keyResults')->findOrFail($validated['source_id']);
        $targetEntity = $this->findEntity($validated['target_type'], $validated['target_id']);

        $this->ensureSourceOwnership($sourceEntity, $user->user_id);
        $this->ensureLinkingLevel($sourceEntity, $targetEntity);
        $this->ensureTargetIsActive($targetEntity);
        $this->preventDuplicate($sourceEntity, $targetEntity);

        $link = DB::transaction(function () use ($validated, $user, $sourceEntity, $targetEntity) {
            $payload = $this->buildLinkPayload($validated, $user->user_id, $sourceEntity, $targetEntity);
            $link = OkrLink::create($payload);

            $this->recordEvent($link, 'requested', $user->user_id, $validated['note'] ?? null);
            $this->logAudit($user->user_id, 'request_link', $link->link_id);

            return $link->load($this->defaultRelations());
        });

        $actorName = $this->getUserDisplayName($user);
        $this->notifyTargetOwner(
            $link,
            'đề nghị liên kết OKR',
            $validated['note'] ?? null,
            $actorName,
            $validated['note'] ? 'Thông điệp' : null
        );

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu liên kết. Chờ phê duyệt.',
            'data' => $link,
        ], 201);
    }

    /**
     * Chủ OKR cấp cao chấp thuận yêu cầu.
     */
    public function approve(Request $request, OkrLink $link): JsonResponse
    {
        $user = Auth::user();
        $this->ensureTargetOwner($link, $user->user_id);

        if (!$link->isPending()) {
            return response()->json(['success' => false, 'message' => 'Chỉ xử lý yêu cầu đang chờ.'], 422);
        }

        // Kiểm tra xem source Objective đã có link approved khác chưa (đảm bảo quy tắc 1:1)
        $existingApprovedLink = OkrLink::query()
            ->where('source_type', 'objective')
            ->where('source_objective_id', $link->source_objective_id)
            ->where('status', OkrLink::STATUS_APPROVED)
            ->where('link_id', '!=', $link->link_id)
            ->first();

        if ($existingApprovedLink) {
            $targetType = $existingApprovedLink->target_type === 'objective' ? 'Objective' : 'Key Result';
            $targetId = $existingApprovedLink->target_type === 'objective' 
                ? $existingApprovedLink->target_objective_id 
                : $existingApprovedLink->target_kr_id;
            
            return response()->json([
                'success' => false, 
                'message' => "Không thể chấp thuận liên kết này. Objective này đã có liên kết được chấp thuận đến một {$targetType} khác (ID: {$targetId}). Mỗi Objective chỉ có thể liên kết đến một đích duy nhất."
            ], 422);
        }

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $link = DB::transaction(function () use ($link, $user, $validated) {
            $link->update([
                'status' => OkrLink::STATUS_APPROVED,
                'approved_by' => $user->user_id,
                'decision_note' => $validated['note'] ?? null,
                'ownership_transferred_at' => now(),
                'is_active' => true,
            ]);

            $this->assignOwnership($link);
            $this->recordEvent($link, 'approved', $user->user_id, $validated['note'] ?? null);
            $this->logAudit($user->user_id, 'approved_link', $link->link_id);

            return $link->load($this->defaultRelations());
        });

        $this->notifyRequester(
            $link,
            'đã chấp thuận liên kết',
            $validated['note'] ?? null,
            $this->getUserDisplayName($user),
            $validated['note'] ? 'Ghi chú từ người duyệt' : null
        );

        return response()->json(['success' => true, 'message' => 'Đã chấp thuận yêu cầu.', 'data' => $link]);
    }

    /**
     * Chủ OKR cấp cao từ chối.
     */
    public function reject(Request $request, OkrLink $link): JsonResponse
    {
        $user = Auth::user();
        $this->ensureTargetOwner($link, $user->user_id);

        if (!$link->isPending()) {
            return response()->json(['success' => false, 'message' => 'Chỉ xử lý yêu cầu đang chờ.'], 422);
        }

        $validated = $request->validate([
            'note' => ['required', 'string', 'max:255'],
        ]);

        $link = DB::transaction(function () use ($link, $user, $validated) {
            $link->update([
                'status' => OkrLink::STATUS_REJECTED,
                'decision_note' => $validated['note'],
                'approved_by' => $user->user_id,
                'is_active' => false,
            ]);

            $this->recordEvent($link, 'rejected', $user->user_id, $validated['note']);
            $this->logAudit($user->user_id, 'rejected_link', $link->link_id);

            return $link->load($this->defaultRelations());
        });

        $this->notifyRequester(
            $link,
            'đã từ chối liên kết',
            $validated['note'],
            $this->getUserDisplayName($user),
            'Lý do'
        );

        return response()->json(['success' => true, 'message' => 'Đã từ chối yêu cầu.', 'data' => $link]);
    }

    /**
     * Chủ OKR cấp cao yêu cầu chỉnh sửa trước khi duyệt.
     */
    public function requestChanges(Request $request, OkrLink $link): JsonResponse
    {
        $user = Auth::user();
        $this->ensureTargetOwner($link, $user->user_id);

        if (!$link->isPending()) {
            return response()->json(['success' => false, 'message' => 'Chỉ xử lý yêu cầu đang chờ.'], 422);
        }

        $validated = $request->validate([
            'note' => ['required', 'string', 'max:255'],
        ]);

        $link = DB::transaction(function () use ($link, $user, $validated) {
            $link->update([
                'status' => OkrLink::STATUS_NEEDS_CHANGES,
                'decision_note' => $validated['note'],
                'approved_by' => $user->user_id,
                'is_active' => false,
            ]);

            $this->recordEvent($link, 'needs_changes', $user->user_id, $validated['note']);
            $this->logAudit($user->user_id, 'requested_link_changes', $link->link_id);

            return $link->load($this->defaultRelations());
        });

        $this->notifyRequester(
            $link,
            'yêu cầu chỉnh sửa trước khi liên kết',
            $validated['note'],
            $this->getUserDisplayName($user),
            'Yêu cầu'
        );

        return response()->json(['success' => true, 'message' => 'Đã yêu cầu chỉnh sửa.', 'data' => $link]);
    }

    /**
     * Hủy yêu cầu hoặc hủy liên kết (sau khi đã duyệt).
     */
    public function cancel(Request $request, OkrLink $link): JsonResponse
    {
        $user = Auth::user();
        $keepOwnership = $request->boolean('keep_ownership', true);

        if ($link->isPending()) {
            $this->ensureSourceOwnershipEntity($link, $user->user_id);
            $message = 'Đã hủy yêu cầu liên kết.';
        } elseif ($link->isApproved()) {
            $this->ensureCanModifyApproved($link, $user->user_id);
            $message = 'Đã hủy liên kết.';
        } else {
            return response()->json(['success' => false, 'message' => 'Không thể hủy ở trạng thái hiện tại.'], 422);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $eventAction = null;
        $link = DB::transaction(function () use ($link, $user, $validated, $keepOwnership, &$eventAction) {
            $link->update([
                'status' => OkrLink::STATUS_CANCELLED,
                'decision_note' => $validated['reason'] ?? null,
                'revoked_at' => now(),
                'is_active' => false,
            ]);

            if ($link->isApproved()) {
                $this->revokeOwnership($link, $keepOwnership === true);
            }

            $eventAction = $link->isApproved() ? 'unlinked' : 'cancelled';
            $this->recordEvent($link, $eventAction, $user->user_id, $validated['reason'] ?? null);
            $this->logAudit($user->user_id, $eventAction, $link->link_id);

            return $link->load($this->defaultRelations());
        });

        if ($eventAction) {
            $this->notifyCounterPart(
                $link,
                $eventAction,
                $validated['reason'] ?? null,
                $this->getUserDisplayName($user),
                $validated['reason'] ? 'Lý do' : null,
                $user->user_id
            );
        }

        return response()->json(['success' => true, 'message' => $message, 'data' => $link]);
    }

    /**
     * Helper: danh sách quan hệ mặc định.
     */
    private function defaultRelations(): array
    {
        return [
            'sourceObjective.user.department',
            'sourceObjective.keyResults' => fn($q) => $q->with('assignedUser')->whereNull('archived_at'),
            // sourceKr không cần vì source luôn là Objective
            'targetObjective.user.department',
            'targetKr.assignedUser.department',
            'requester.department',
            'targetOwner.department',
            'approver.department',
            'events.actor',
        ];
    }

    /**
     * Tìm entity cho target (có thể là Objective hoặc KeyResult)
     * Lưu ý: Source luôn là Objective, không dùng function này cho source
     */
    private function findEntity(string $type, $id)
    {
        return $type === 'objective'
            ? Objective::with('keyResults')->findOrFail($id)
            : KeyResult::with('objective')->findOrFail($id);
    }

    /**
     * Kiểm tra quyền sở hữu source
     * Lưu ý: Source luôn là Objective
     */
    private function ensureSourceOwnership($entity, int $userId): void
    {
        if (!($entity instanceof Objective)) {
            abort(response()->json(['success' => false, 'message' => 'Source phải là Objective.'], 422));
        }

        if ($entity->user_id !== $userId) {
            abort(response()->json(['success' => false, 'message' => 'Bạn không có quyền thực hiện thao tác này.'], 403));
        }
    }

    /**
     * Kiểm tra cấp độ liên kết
     * Lưu ý: Source luôn là Objective
     */
    private function ensureLinkingLevel($source, $target): void
    {
        if (!($source instanceof Objective)) {
            abort(response()->json(['success' => false, 'message' => 'Source phải là Objective.'], 422));
        }

        $sourceLevel = $source->level;
        $targetLevel = $target instanceof Objective ? $target->level : ($target->objective->level ?? null);

        if (!$sourceLevel || !$targetLevel) {
            abort(response()->json(['success' => false, 'message' => 'Không xác định được cấp độ OKR.'], 422));
        }

        if ((self::LEVEL_ORDER[$targetLevel] ?? 0) <= (self::LEVEL_ORDER[$sourceLevel] ?? 0)) {
            abort(response()->json(['success' => false, 'message' => 'OKR đích phải có cấp độ cao hơn.'], 422));
        }
    }

    private function ensureTargetIsActive($target): void
    {
        if ($target instanceof Objective) {
            if ($target->archived_at) {
                abort(response()->json(['success' => false, 'message' => 'Objective đích đã bị lưu trữ.'], 422));
            }
        } elseif ($target instanceof KeyResult) {
            if ($target->archived_at) {
                abort(response()->json(['success' => false, 'message' => 'Key Result đích đã bị lưu trữ.'], 422));
            }
        }
    }

    /**
<<<<<<< HEAD
     * Ngăn tạo liên kết trùng lặp
=======
     * Ngăn tạo liên kết trùng lặp và đảm bảo quy tắc 1:1
     * Quy tắc: 1 Objective chỉ có thể liên kết đến 1 đích (1 O hoặc 1 KR) - 1:1
     *          1 đích (O hoặc KR) có thể có nhiều O con liên kết tới - 1:n
>>>>>>> 64505305094b5391020c4ac7bc73fa2a4ae71a77
     * Lưu ý: Source luôn là Objective
     */
    private function preventDuplicate($source, $target): void
    {
        if (!($source instanceof Objective)) {
            abort(response()->json(['success' => false, 'message' => 'Source phải là Objective.'], 422));
        }

<<<<<<< HEAD
        $query = OkrLink::query()
            ->where('source_type', 'objective') // Source luôn là Objective
=======
        // Bước 1: Kiểm tra xem source Objective đã có liên kết đến bất kỳ target nào chưa (1:1)
        // Chỉ kiểm tra các liên kết đã approved hoặc đang pending (bỏ qua cancelled, rejected, needs_changes)
        $existingLink = OkrLink::query()
            ->where('source_type', 'objective')
            ->where('source_objective_id', $source->objective_id)
            ->whereNotIn('status', [
                OkrLink::STATUS_CANCELLED,
                OkrLink::STATUS_REJECTED,
                OkrLink::STATUS_NEEDS_CHANGES,
            ])
            ->first();

        if ($existingLink) {
            // Source Objective đã có liên kết đến một target khác
            $targetType = $existingLink->target_type === 'objective' ? 'Objective' : 'Key Result';
            $targetId = $existingLink->target_type === 'objective' 
                ? $existingLink->target_objective_id 
                : $existingLink->target_kr_id;
            
            abort(response()->json([
                'success' => false, 
                'message' => "Objective này đã có liên kết đến một {$targetType} khác (ID: {$targetId}). Mỗi Objective chỉ có thể liên kết đến một đích duy nhất."
            ], 422));
        }

        // Bước 2: Kiểm tra xem liên kết đến target này đã tồn tại chưa (tránh duplicate)
        $duplicateQuery = OkrLink::query()
            ->where('source_type', 'objective')
>>>>>>> 64505305094b5391020c4ac7bc73fa2a4ae71a77
            ->where('target_type', $target instanceof Objective ? 'objective' : 'kr')
            ->where('source_objective_id', $source->objective_id)
            ->whereNotIn('status', [
                OkrLink::STATUS_CANCELLED,
                OkrLink::STATUS_REJECTED,
                OkrLink::STATUS_NEEDS_CHANGES,
            ]);

        if ($target instanceof Objective) {
            $duplicateQuery->where('target_objective_id', $target->objective_id);
        } else {
            $duplicateQuery->where('target_kr_id', $target->kr_id);
        }

        if ($duplicateQuery->exists()) {
            abort(response()->json(['success' => false, 'message' => 'Liên kết này đã tồn tại.'], 422));
        }
    }

    /**
     * Xây dựng payload cho liên kết
     * Lưu ý: Source luôn là Objective, source_kr_id luôn null
     */
    private function buildLinkPayload(array $validated, int $userId, $source, $target): array
    {
        if (!($source instanceof Objective)) {
            abort(response()->json(['success' => false, 'message' => 'Source phải là Objective.'], 422));
        }

        $targetObjective = $target instanceof Objective ? $target : $target->objective;

        return [
            'source_type' => 'objective', // Source luôn là Objective
            'target_type' => $validated['target_type'],
            'source_objective_id' => $source->objective_id,
            'source_kr_id' => null, // Source luôn là Objective nên source_kr_id luôn null
            'target_objective_id' => $targetObjective?->objective_id,
            'target_kr_id' => $target instanceof KeyResult ? $target->kr_id : null,
            'status' => OkrLink::STATUS_PENDING,
            'requested_by' => $userId,
            'target_owner_id' => $targetObjective?->user_id,
            'request_note' => $validated['note'] ?? null,
        ];
    }

    private function recordEvent(OkrLink $link, string $action, int $actorId, ?string $note = null): void
    {
        OkrLinkEvent::create([
            'link_id' => $link->link_id,
            'action' => $action,
            'actor_id' => $actorId,
            'note' => $note,
        ]);
    }

    private function logAudit(int $userId, string $action, int $entityId): void
    {
        AuditLog::create([
            'action' => $action,
            'entity' => 'okr_link',
            'entity_id' => $entityId,
            'user_id' => $userId,
        ]);
    }

    private function notifyTargetOwner(
        OkrLink $link,
        string $message,
        ?string $note = null,
        ?string $actorName = null,
        ?string $noteLabel = null
    ): void
    {
        if (!$link->target_owner_id) {
            return;
        }

        try {
            Notification::create([
                'message' => $this->buildNotificationMessage(
                    $message,
                    $note,
                    $actorName,
                    $this->getLinkSummary($link),
                    $noteLabel
                ),
                'type' => 'okr_link',
                'user_id' => $link->target_owner_id,
                'cycle_id' => $link->targetObjective?->cycle_id ?? $link->targetKr?->objective?->cycle_id,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Không thể tạo notification', ['error' => $e->getMessage()]);
        }
    }

    private function notifyRequester(
        OkrLink $link,
        string $message,
        ?string $note = null,
        ?string $actorName = null,
        ?string $noteLabel = null
    ): void
    {
        if (!$link->requested_by) {
            return;
        }

        try {
            Notification::create([
                'message' => $this->buildNotificationMessage(
                    $message,
                    $note,
                    $actorName,
                    $this->getLinkSummary($link),
                    $noteLabel
                ),
                'type' => 'okr_link',
                'user_id' => $link->requested_by,
                'cycle_id' => $link->sourceObjective?->cycle_id, // Source luôn là Objective
            ]);
        } catch (\Throwable $e) {
            Log::warning('Không thể tạo notification', ['error' => $e->getMessage()]);
        }
    }

    private function notifyCounterPart(
        OkrLink $link,
        string $action,
        ?string $note = null,
        ?string $actorName = null,
        ?string $noteLabel = null,
        ?int $actorId = null
    ): void
    {
        $message = match ($action) {
            'unlinked' => 'đã hủy liên kết OKR',
            'cancelled' => 'đã hủy yêu cầu liên kết',
            default => 'cập nhật yêu cầu liên kết',
        };

        if (!$actorId || $link->target_owner_id !== $actorId) {
            $this->notifyTargetOwner($link, $message, $note, $actorName, $noteLabel);
        }

        if (!$actorId || $link->requested_by !== $actorId) {
            $this->notifyRequester($link, $message, $note, $actorName, $noteLabel);
        }
    }

    private function buildNotificationMessage(
        string $message,
        ?string $note = null,
        ?string $actorName = null,
        ?string $summary = null,
        ?string $noteLabel = null
    ): string
    {
        $lines = [];
        $headerParts = array_filter([$actorName, $message], fn ($value) => $value !== null && $value !== '');
        $lines[] = implode(' • ', $headerParts);

        if ($summary) {
            $lines[] = $summary;
        }

        if ($note) {
            $label = $noteLabel ?? 'Ghi chú';
            $lines[] = ($label ? $label . ': ' : '') . $note;
        }

        return implode("\n", array_filter($lines, fn ($value) => $value !== null && $value !== ''));
    }

    private function getUserDisplayName(?object $user): ?string
    {
        if (!$user) {
            return null;
        }

        return $user->full_name
            ?? $user->name
            ?? $user->email
            ?? null;
    }

    private function getLinkSummary(OkrLink $link): string
    {
        $link->loadMissing([
            'sourceObjective',
            // sourceKr không cần vì source luôn là Objective
            'targetObjective',
            'targetKr.objective',
        ]);

        // Source luôn là Objective
        $sourceLabel = $link->sourceObjective?->obj_title ?? 'Objective';
        $targetLabel = $this->formatEndpointLabel($link->targetObjective, $link->targetKr);

        return sprintf('%s → %s', $sourceLabel, $targetLabel);
    }

    private function formatEndpointLabel(?Objective $objective = null, ?KeyResult $kr = null): string
    {
        $objectiveTitle = $objective?->obj_title ?? $kr?->objective?->obj_title ?? null;
        $krTitle = $kr?->kr_title ?? null;

        if ($objectiveTitle && $krTitle) {
            return $objectiveTitle . ' › ' . $krTitle;
        }

        return $objectiveTitle ?? $krTitle ?? 'OKR';
    }

    /**
     * Chuyển quyền sở hữu khi liên kết được phê duyệt
     * Lưu ý: source_kr_id luôn null vì source luôn là Objective
     */
    private function assignOwnership(OkrLink $link): void
    {
        $targetUserId = $link->target_owner_id;
        if (!$targetUserId) {
            return;
        }

        $roleId = $link->targetOwner?->role_id;

        OkrAssignment::firstOrCreate(
            [
                'user_id' => $targetUserId,
                'objective_id' => $link->source_objective_id,
                'kr_id' => null, // source_kr_id luôn null vì source luôn là Objective
            ],
            [
                'role_id' => $roleId,
            ]
        );
    }

    /**
     * Thu hồi quyền sở hữu khi hủy liên kết
     * Lưu ý: source_kr_id luôn null vì source luôn là Objective
     */
    private function revokeOwnership(OkrLink $link, bool $keepOwnership): void
    {
        if ($keepOwnership) {
            return;
        }

        OkrAssignment::where('user_id', $link->target_owner_id)
            ->where('objective_id', $link->source_objective_id)
            ->whereNull('kr_id') // source_kr_id luôn null vì source luôn là Objective
            ->delete();
    }

    private function ensureTargetOwner(OkrLink $link, int $userId): void
    {
        if ($link->target_owner_id !== $userId) {
            abort(response()->json(['success' => false, 'message' => 'Bạn không có quyền phê duyệt yêu cầu này.'], 403));
        }
    }

    /**
     * Kiểm tra quyền sở hữu source entity
     * Lưu ý: Source luôn là Objective
     */
    private function ensureSourceOwnershipEntity(OkrLink $link, int $userId): void
    {
        $link->loadMissing('sourceObjective');
        $ownerId = $link->sourceObjective?->user_id;
        
        if (!$ownerId || $ownerId !== $userId) {
            abort(response()->json(['success' => false, 'message' => 'Bạn không phải chủ của OKR nguồn.'], 403));
        }
    }

    /**
     * Kiểm tra quyền hủy liên kết đã được phê duyệt
     * Lưu ý: Source luôn là Objective
     */
    private function ensureCanModifyApproved(OkrLink $link, int $userId): void
    {
        $link->loadMissing('sourceObjective');
        $owners = [
            $link->target_owner_id,
            $link->sourceObjective?->user_id,
        ];

        if (!in_array($userId, array_filter($owners), true)) {
            abort(response()->json(['success' => false, 'message' => 'Bạn không có quyền hủy liên kết này.'], 403));
        }
    }

    private function getTargetTitle($target): string
    {
        if ($target instanceof Objective) {
            return $target->obj_title ?? 'Objective';
        }

        $objectiveTitle = $target->objective->obj_title ?? '';
        return trim(($objectiveTitle ? $objectiveTitle . ' > ' : '') . ($target->kr_title ?? 'Key Result'));
    }
}