<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CheckIn extends Model
{
    protected $table = 'check_ins';
    protected $primaryKey = 'check_in_id';

    protected $fillable = [
        'kr_id',
        'user_id',
        'progress_value',
        'progress_percent',
        'notes',
        'check_in_type',
        'is_completed',
    ];

    protected $casts = [
        'progress_value' => 'decimal:2',
        'progress_percent' => 'decimal:2',
        'is_completed' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Mối quan hệ với KeyResult
     */
    public function keyResult(): BelongsTo
    {
        return $this->belongsTo(KeyResult::class, 'kr_id', 'kr_id');
    }

    /**
     * Mối quan hệ với User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    /**
     * Scope để lấy check-ins theo Key Result
     */
    public function scopeForKeyResult($query, $krId)
    {
        return $query->where('kr_id', $krId);
    }

    /**
     * Scope để lấy check-ins theo User
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope để lấy check-ins gần đây nhất
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Kiểm tra xem check-in này có phải là check-in hoàn thành không
     */
    public function isCompletionCheckIn(): bool
    {
        return $this->is_completed || $this->progress_percent >= 100;
    }

    /**
     * Lấy formatted progress value
     */
    public function getFormattedProgressValueAttribute(): string
    {
        if ($this->check_in_type === 'percentage') {
            return $this->progress_percent . '%';
        }
        
        return $this->progress_value;
    }
}
