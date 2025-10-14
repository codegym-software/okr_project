<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Objective extends Model
{
    use HasFactory;

     /**
     * The primary key associated with the table.
     */
    protected $primaryKey = 'objective_id';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'obj_title',
        'level',
        'description',
        'status',
        'progress_percent',
        'user_id',
        'cycle_id',
        'department_id',
        'parent_key_result_id',
    ];

    /**
     * The attributes that should be cast.
     */
        protected $casts = [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];

    /**
     * Get the key results for the objective.
     */
    public function keyResults(): HasMany
    {
        return $this->hasMany(KeyResult::class, 'objective_id', 'objective_id');
    }

    // /**
    //  * Get the user that owns the objective.
    //  */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    /**
     * Get the cycle that the objective belongs to.
     */
    public function cycle()
    {
        return $this->belongsTo(Cycle::class, 'cycle_id', 'cycle_id');
    }

    /**
     * Get the department that the objective belongs to.
     */
    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }

    /**
     * Get the parent key result that the objective belongs to.
     */
    public function parentKeyResult()
    {
        return $this->belongsTo(KeyResult::class, 'parent_key_result_id', 'kr_id');
    }

    /**
     * Get the progress percentage attribute.
     */
    public function getProgressPercentAttribute()
    {
        // Nếu có progress_percent trong database, sử dụng nó
        if (isset($this->attributes['progress_percent']) && $this->attributes['progress_percent'] !== null) {
            return $this->attributes['progress_percent'];
        }

        // Nếu không có, tính toán dựa trên key results
        if ($this->keyResults && $this->keyResults->count() > 0) {
            $totalWeight = $this->keyResults->sum('weight');
            if ($totalWeight > 0) {
                $weightedProgress = $this->keyResults->sum(function ($kr) {
                    return ($kr->progress_percent ?? 0) * ($kr->weight ?? 0);
                });
                return $totalWeight > 0 ? $weightedProgress / $totalWeight : 0;
            } else {
                // Nếu không có weight, tính trung bình
                return $this->keyResults->avg('progress_percent') ?? 0;
            }
        }

        return 0;
    }
}

