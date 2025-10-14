<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OkrLink extends Model
{
    use HasFactory;

    protected $table = 'okr_links';
    protected $primaryKey = 'link_id';
    protected $fillable = [
        'source_objective_id', 'source_kr_id', 'target_objective_id', 'target_kr_id', 'description'
    ];

    public function sourceObjective()
    {
        return $this->belongsTo(Objective::class, 'source_objective_id', 'objective_id');
    }

    public function sourceKeyResult()
    {
        return $this->belongsTo(KeyResult::class, 'source_kr_id', 'kr_id');
    }

    public function targetObjective()
    {
        return $this->belongsTo(Objective::class, 'target_objective_id', 'objective_id');
    }

    public function targetKeyResult()
    {
        return $this->belongsTo(KeyResult::class, 'target_kr_id', 'kr_id');
    }
}