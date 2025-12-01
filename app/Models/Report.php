<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'cycle_name', 'cycle_id', 'scope', 'department_id',
        'created_by', 'created_by_name', 'data_snapshot', 'note',
    ];

    protected $casts = [
        'data_snapshot' => 'array',  // Auto parse JSON
        'snapshotted_at' => 'datetime',
    ];

    // Relations (nếu cần)
    public function creator() {
        return $this->belongsTo(User::class, 'created_by');
    }
}