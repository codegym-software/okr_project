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
        'type',
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
     * Append calculated properties
     */
    protected $appends = ['calculated_progress'];

    /**
     * Get child Objectives linked to this KR (Objectives that link to this KR as target)
     */
    public function childObjectives(): HasMany
    {
        return $this->hasMany(OkrLink::class, 'target_kr_id', 'kr_id')
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED)
            ->where('source_type', 'objective');
    }

    /**
     * Calculate progress dynamically.
     * If this KR has child objectives linked to it, progress is the average of those objectives.
     * Otherwise, it uses the standard progress_percent (manual check-in).
     */
    public function getCalculatedProgressAttribute()
    {
        // 1. Check for child Objectives linked to this KR
        // We use loaded relation if available to avoid N+1, otherwise query
        $childLinks = $this->relationLoaded('childObjectives')
            ? $this->childObjectives
            : $this->childObjectives()->with('sourceObjective')->get();

        if ($childLinks->isNotEmpty()) {
            $progressList = [];
            foreach ($childLinks as $link) {
                $childObj = $link->sourceObjective;
                // Only count active (non-archived) objectives
                if ($childObj && $childObj->archived_at === null) {
                    // Use calculated_progress of the child objective (recursive)
                    // If child model doesn't have the attribute appended yet, access accessor directly or fallback
                    $val = $childObj->calculated_progress ?? $childObj->progress_percent ?? 0;
                    $progressList[] = $val;
                }
            }

            if (!empty($progressList)) {
                $avg = array_sum($progressList) / count($progressList);
                return (float) round($avg, 2);
            }
        }

        // 2. Fallback to standard progress (Manual Check-in)
        return $this->progress_percent;
    }

    /**
     * Tự động tính toán và lưu progress vào DB, sau đó cập nhật Objective cha.
     */
    public function updateProgress(array &$visited = []): bool
    {
        // 1. Tính toán progress mới
        $newProgress = 0;
        
        // Kiểm tra xem có Objective con liên kết tới KR này không
        $childLinks = $this->childObjectives()
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED)
            ->get();

        if ($childLinks->isNotEmpty()) {
            // Trường hợp 1: KR là container chứa các Objective con -> Lấy trung bình
            $progressList = [];
            foreach ($childLinks as $link) {
                $childObj = $link->sourceObjective;
                // Only count active (non-archived) objectives
                if ($childObj && $childObj->archived_at === null) {
                    $childProgress = $childObj->progress_percent;
                    if ($childProgress !== null) {
                        $progressList[] = $childProgress;
                    }
                }
            }
            if (!empty($progressList)) {
                $avg = array_sum($progressList) / count($progressList);
                $newProgress = round($avg, 2);
            }
        } else {
            // Trường hợp 2: KR thường -> Tính theo công thức current/target hoặc lấy từ check-in gần nhất
            // Ưu tiên lấy từ check-in gần nhất trong DB nếu có
            $latestCheckIn = $this->checkIns()->orderBy('created_at', 'desc')->first();
            if ($latestCheckIn) {
                $newProgress = $latestCheckIn->progress_percent;
            } elseif ($this->target_value > 0) {
                $rawProgress = ($this->current_value / $this->target_value) * 100;
                $newProgress = round(max(0, min(100, $rawProgress)), 2);
            }
        }

        // 2. Lưu vào Database
        \DB::table('key_results')
            ->where('kr_id', $this->kr_id)
            ->update(['progress_percent' => $newProgress]);
            
        $this->attributes['progress_percent'] = $newProgress;

        // 3. Lan truyền lên Objective cha (Parent Objective)
        if ($this->objective) {
            $this->objective->updateProgress($visited);
        }

        return true;
    }

    /**
     * Tính toán trạng thái KR dựa trên tiến độ và thời gian trong chu kỳ.
     *
     * @param float $progress Tiến độ (0-100)
     * @return string Trạng thái: not_start, on_track, at_risk, in_trouble, completed
     */
    public function calculateStatusFromProgress(float $progress): string
    {
        if ($progress >= 100) {
            return 'completed';
        }
        if ($progress == 0) {
            return 'not_start';
        }

        // Lấy thông tin chu kỳ từ chính KR hoặc từ Objective cha
        $cycle = $this->cycle ?? $this->objective->cycle;

        if (!$cycle || !$cycle->start_date || !$cycle->end_date) {
            // Nếu không có chu kỳ, dùng logic đơn giản dựa trên progress
            if ($progress >= 70) return 'on_track';
            if ($progress >= 30) return 'at_risk';
            return 'in_trouble';
        }

        $now = Carbon::now('Asia/Ho_Chi_Minh');
        $startDate = Carbon::parse($cycle->start_date);
        $endDate = Carbon::parse($cycle->end_date);

        // Tính % thời gian đã trôi qua
        $totalDays = $startDate->diffInDays($endDate);
        if ($totalDays <= 0) {
            return $progress >= 100 ? 'completed' : 'in_trouble';
        }

        $elapsedDays = $startDate->diffInDays($now);
        $expectedProgress = min(100, max(0, ($elapsedDays / $totalDays) * 100));

        // So sánh progress thực tế với progress mong đợi
        $difference = $progress - $expectedProgress;

        if ($difference >= -10) { // Có một khoảng đệm 10%
            return 'on_track';
        }
        if ($difference >= -25) { // Chậm hơn từ 10% đến 25%
            return 'at_risk';
        }
        
        // Chậm hơn 25%
        return 'in_trouble';
    }

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

    