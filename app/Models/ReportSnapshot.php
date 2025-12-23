<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportSnapshot extends Model
{
    protected $table = 'report_snapshots';
    protected $fillable = ['cycle_id', 'cycle_name', 'created_by', 'title', 'data_snapshot', 'snapshotted_at'];
    protected $casts = [
        'data_snapshot' => 'array',
        'snapshotted_at' => 'datetime',
    ];

    public function cycle()
    {
        return $this->belongsTo(Cycle::class, 'cycle_id', 'cycle_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }
}
