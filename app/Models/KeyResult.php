<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Carbon\Carbon;

class KeyResult extends Model
{
    use HasFactory;

    public $timestamps = true;
    protected $primaryKey = 'kr_id';
    public $incrementing = true;
    protected $keyType = 'int';

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
        'department_id',
        'objective_id',
        'cycle_id',
        'progress_percent',
        'user_id',
        'archived_at',
        'assigned_to',
    ];

    /**
     * The attributes that should be guarded (not mass assignable).
     */
    protected $guarded = ['kr_id'];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'archived_at' => 'datetime',
        'target_value' => 'float',
        'current_value' => 'float',
        'weight' => 'float',
        'progress_percent' => 'float',
    ];

    /**
     * Chỉ lấy Key Result chưa lưu trữ
     */
    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }

    /**
     * Chỉ lấy Key Result đã lưu trữ
     */
    public function scopeArchived($query)
    {
        return $query->whereNotNull('archived_at');
    }

    // === RELATIONSHIPS ===
    public function objective(): BelongsTo
    {
        return $this->belongsTo(Objective::class, 'objective_id', 'objective_id');
    }

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(Cycle::class, 'cycle_id', 'cycle_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function checkIns(): HasMany
    {
        return $this->hasMany(CheckIn::class, 'kr_id', 'kr_id');
    }

    public function latestCheckIn()
    {
        return $this->hasOne(CheckIn::class, 'kr_id', 'kr_id')
            ->orderBy('check_in_id', 'desc')
            ->limit(1);
    }

    /**
     * Tính toán progress_percent một cách thông minh
     */
    public function getProgressPercentAttribute($value)
    {
        if (!is_null($value)) {
            return (float) $value;
        }

        if ($this->relationLoaded('latestCheckIn') && $this->latestCheckIn) {
            return (float) $this->latestCheckIn->progress_percent;
        }

        if ($this->relationLoaded('checkIns') && $this->checkIns->isNotEmpty()) {
            return (float) $this->checkIns->sortByDesc('created_at')->first()->progress_percent;
        }

        // 3. Tính từ current_value / target_value
        if ($this->target_value > 0) {
            $progress = ($this->current_value / $this->target_value) * 100;
            return (float) round(max(0, min(100, $progress)), 2);
        }

        return 0.0;
    }

    /**
     * Tự động cập nhật progress_percent khi current_value thay đổi
     */
    public function setCurrentValueAttribute($value)
    {
        $this->attributes['current_value'] = $value;

        // Chỉ tự động cập nhật nếu chưa có progress_percent thủ công
        if (is_null($this->attributes['progress_percent'] ?? null)) {
            if ($this->target_value > 0) {
                $progress = ($value / $this->target_value) * 100;
                $this->attributes['progress_percent'] = round(max(0, min(100, $progress)), 2);
            } else {
                $this->attributes['progress_percent'] = 0;
            }
        }
    }

    public function getCheckInsCountAttribute(): int
    {
        return $this->checkIns()->count();
    }

    public function hasCheckIns(): bool
    {
        return $this->checkIns()->exists();
    }

    public function archive(): bool
    {
        if ($this->archived_at) {
            return false; 
        }

        $this->archived_at = Carbon::now();
        return $this->save();
    }

    public function unarchive(): bool
    {
        if (!$this->archived_at) {
            return false; 
        }

        $this->archived_at = null;
        return $this->save();
    }

    public function isArchived(): bool
    {
        return !is_null($this->archived_at);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

        public function assignedUser()

        {

            return $this->belongsTo(User::class, 'assigned_to', 'user_id');

        }

    

        /**

         * Get the comments for the key result.

         */

        public function comments(): HasMany

        {

            return $this->hasMany(Comment::class, 'kr_id', 'kr_id')->whereNull('parent_id');

        }

    }

    