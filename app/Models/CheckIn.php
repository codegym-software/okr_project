<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CheckIn extends Model
{
    protected $table = 'check_in';
    protected $primaryKey = 'checkin_id';

    protected $fillable = [
        'objective_id',
        'user_id',
        'completion_rate',
        'note',
    ];

    protected $casts = [
        'completion_rate' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Mối quan hệ với Objective
     */
    public function objective(): BelongsTo
    {
        return $this->belongsTo(Objective::class, 'objective_id', 'objective_id');
    }

    /**
     * Mối quan hệ với User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}
