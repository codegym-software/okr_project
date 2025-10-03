<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KeyResult extends Model
{
    use HasFactory;

    public $timestamps = false;
    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'kr_title',
        'target_value',
        'current_value',
        'unit',
        'status',
        'weight',
        'objective_id',
        'cycle_id',
        'progress_percent'
    ];

    /**
     * The attributes that should be cast.
     */


    /**
     * Get the objective that owns the key result.
     */
    public function objective(): BelongsTo
    {
        return $this->belongsTo(Objective::class);
    }
}
