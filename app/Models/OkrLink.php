<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OkrLink extends Model
{
    protected $table = 'okr_links';
    protected $fillable = [
        'source_objective_id',
        'source_kr_id',
        'target_objective_id',
        'target_kr_id',
        'description',
    ];

    // Quan hệ với Objective/KR
    public function sourceObjective()
    {
        return $this->belongsTo(Objective::class, 'source_objective_id');
    }

    public function sourceKr()
    {
        return $this->belongsTo(KeyResult::class, 'source_kr_id');
    }

    public function targetObjective()
    {
        return $this->belongsTo(Objective::class, 'target_objective_id');
    }

    public function targetKr()
    {
        return $this->belongsTo(KeyResult::class, 'target_kr_id');
    }
}