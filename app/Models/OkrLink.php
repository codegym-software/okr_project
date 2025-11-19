<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OkrLink extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_NEEDS_CHANGES = 'needs_changes';
    public const STATUS_CANCELLED = 'cancelled';

    protected $table = 'okr_links';
    protected $primaryKey = 'link_id';

    protected $fillable = [
        'source_objective_id',
        'source_kr_id',
        'target_objective_id',
        'target_kr_id',
        'description',
        'source_type',
        'target_type',
        'status',
        'requested_by',
        'target_owner_id',
        'approved_by',
        'request_note',
        'decision_note',
        'ownership_transferred_at',
        'revoked_at',
        'is_active',
    ];

    protected $casts = [
        'ownership_transferred_at' => 'datetime',
        'revoked_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    // Quan hệ với Objective/KR
    public function sourceObjective(): BelongsTo
    {
        return $this->belongsTo(Objective::class, 'source_objective_id');
    }

    public function sourceKr(): BelongsTo
    {
        return $this->belongsTo(KeyResult::class, 'source_kr_id');
    }

    public function targetObjective(): BelongsTo
    {
        return $this->belongsTo(Objective::class, 'target_objective_id');
    }

    public function targetKr(): BelongsTo
    {
        return $this->belongsTo(KeyResult::class, 'target_kr_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by', 'user_id');
    }

    public function targetOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_owner_id', 'user_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by', 'user_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(OkrLinkEvent::class, 'link_id', 'link_id')->latest();
    }

    public function scopeOwnedBy($query, int $userId)
    {
        return $query->where('requested_by', $userId);
    }

    public function scopeTargetedTo($query, int $userId)
    {
        return $query->where('target_owner_id', $userId);
    }

    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING || $this->status === self::STATUS_NEEDS_CHANGES;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }
}