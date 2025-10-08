<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KeyResult extends Model
{
    protected $primaryKey = 'kr_id';
    protected $fillable = [
        'obj_id',
        'kr_title',
        'kr_desc',
        'metric_type',
        'target_value',
        'current_value',
        'unit',
        'status',
        'progress_percent',
    ];

    public function objective()
    {
        return $this->belongsTo(Objective::class, 'obj_id', 'obj_id');
    }
}