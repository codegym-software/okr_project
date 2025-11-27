<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'department_id',
        'cycle_id',
        'department_id',
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

    public function assignments()
    {
        return $this->hasMany(OkrAssignment::class, 'objective_id', 'objective_id');
    }

    /**
     * Get OKR links where this objective is the source
     */
    public function sourceLinks()
    {
        return $this->hasMany(OkrLink::class, 'source_objective_id', 'objective_id')
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED);
    }

    /**
     * Get OKR links where this objective is the target
     */
    public function targetLinks()
    {
        return $this->hasMany(OkrLink::class, 'target_objective_id', 'objective_id')
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED);
    }

    /**
     * Append key_results to array/JSON
     */
    protected $appends = [];

    /**
     * Override toArray to ensure key_results is always present
     */
    public function toArray()
    {
        $array = parent::toArray();
        
        // Ensure key_results exists (Laravel camelCase -> snake_case conversion)
        if (isset($array['key_results'])) {
            // Already has key_results, good
        } elseif ($this->relationLoaded('keyResults')) {
            // Has keyResults relationship loaded, convert to key_results
            $array['key_results'] = $this->keyResults->toArray();
        } else {
            // No relationship loaded, set empty array
            $array['key_results'] = [];
        }
        
        return $array;
    }
}

