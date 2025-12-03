<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    use HasFactory;

    protected $table = 'advanced_reports';
    protected $primaryKey = 'report_id';

    protected $fillable = [
        'report_type',
        'report_name',
        'snapshot_data',
        'user_id',
        'cycle_id',
        'department_id',
        'notes',
    ];

    protected $casts = [
        'snapshot_data' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Người tạo báo cáo
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    /**
     * Chu kỳ của báo cáo
     */
    public function cycle(): BelongsTo
    {
        return $this->belongsTo(Cycle::class, 'cycle_id', 'cycle_id');
    }

    /**
     * Phòng ban (nếu có)
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }

    /**
     * Scope: Lọc theo loại báo cáo
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('report_type', $type);
    }

    /**
     * Scope: Lọc theo người tạo
     */
    public function scopeByCreator($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope: Lọc theo chu kỳ
     */
    public function scopeByCycle($query, int $cycleId)
    {
        return $query->where('cycle_id', $cycleId);
    }
}

