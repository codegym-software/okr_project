<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    protected $primaryKey = 'kr_id';

    public function objective(): BelongsTo
    {
        return $this->belongsTo(Objective::class, 'objective_id', 'objective_id');
    }

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(Cycle::class, 'cycle_id', 'cycle_id');
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

        // Nếu có check-ins, sử dụng check-in gần đây nhất
        if ($this->relationLoaded('checkIns') && $this->checkIns->isNotEmpty()) {
            $latestCheckIn = $this->checkIns->sortByDesc('created_at')->first();
            return $latestCheckIn->progress_percent;
        }

        // Tính toán dựa trên current_value và target_value
        if ($this->target_value > 0) {
            return min(100, max(0, ($this->current_value / $this->target_value) * 100));
        }

        return 0;
    }

    /**
     * Mối quan hệ với CheckIns
     */
    public function checkIns(): HasMany
    {
        return $this->hasMany(CheckIn::class, 'kr_id', 'kr_id');
    }

    /**
     * Lấy check-in gần đây nhất
     */
    public function latestCheckIn()
    {
        return $this->hasOne(CheckIn::class, 'kr_id', 'kr_id')->latest();
    }

    /**
     * Kiểm tra xem Key Result có check-ins không
     */
    public function hasCheckIns(): bool
    {
        return $this->checkIns()->exists();
    }

    /**
     * Lấy số lượng check-ins
     */
    public function getCheckInsCountAttribute(): int
    {
        return $this->checkIns()->count();
    }
}
