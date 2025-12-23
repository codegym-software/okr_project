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
        'confidence_score',
        'check_in_type',
        'is_completed',
    ];

    protected $casts = [
        'progress_value' => 'decimal:2',
        'progress_percent' => 'decimal:2',
        'is_completed' => 'boolean',
        'confidence_score' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Quan hệ với KeyResult
     */
    public function keyResult(): BelongsTo
    {
        return $this->belongsTo(KeyResult::class, 'kr_id', 'kr_id');
    }

    /**
     * Quan hệ với User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}
