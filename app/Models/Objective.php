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
    protected $primaryKey = 'obj_id';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'obj_title',
        'level',
        'ibj_desc',
        'status',
        // 'progress_percent',
        'user_id',
        'cycle_id',
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
        return $this->hasMany(KeyResult::class, 'obj_id', 'obj_id');
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
}

