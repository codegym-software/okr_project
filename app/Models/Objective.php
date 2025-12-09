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
    protected $primaryKey = 'objective_id';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'obj_title',
        'level',
        'description',
        'status',
        'progress_percent',
        'user_id',
        'cycle_id',
        'department_id',
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
        return $this->hasMany(KeyResult::class, 'objective_id', 'objective_id');
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

    /**
     * Get the department that the objective belongs to.
     */
    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }

    public function assignments()
    {
        return $this->hasMany(OkrAssignment::class, 'objective_id', 'objective_id');
    }

    /**
     * Get the comments for the objective.
     * Only retrieve top-level comments (not replies).
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'objective_id', 'objective_id')->whereNull('parent_id');
    }

    /**
     * Get OKR links where this objective is the source
     */
    public function sourceLinks()
    {
        return $this->hasMany(OkrLink::class, 'source_objective_id', 'objective_id')
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED);
    }

    /**
     * Get OKR links where this objective is the target
     */
    public function targetLinks()
    {
        return $this->hasMany(OkrLink::class, 'target_objective_id', 'objective_id')
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED);
    }

    /**
     * Get child OKRs linked to this objective (OKRs that link to this as target)
     * Trong tree view, đây là các OKR con được liên kết lên OKR này
     */
    public function childObjectives()
    {
        return $this->hasMany(OkrLink::class, 'target_objective_id', 'objective_id')
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED)
            ->where('source_type', 'objective')
            ->with('sourceObjective');
    }

    /**
     * Get child KeyResults linked to this objective
     */
    public function childKeyResults()
    {
        return $this->hasMany(OkrLink::class, 'target_objective_id', 'objective_id')
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED)
            ->where('target_type', 'kr')
            ->with('targetKr');
    }

    /**
     * Static property để track các Objective đang được tính (tránh vòng lặp vô hạn)
     */
    protected static $calculatingProgress = [];

    /**
     * Tính toán progress_percent tự động từ KeyResults trực tiếp
     * Ưu tiên: giá trị trong DB > tính từ KeyResults trực tiếp
     * 
     * Logic tính progress:
     * - Chỉ tính từ KeyResults trực tiếp của Objective
     * - Không tính từ child Objectives liên kết
     */
    public function getProgressPercentAttribute($value)
    {
        // Nếu đã có giá trị trong database và không null, trả về giá trị đó
        if (!is_null($value)) {
            return (float) $value;
        }

        // Tránh vòng lặp vô hạn: nếu Objective này đang được tính, trả về 0
        if (in_array($this->objective_id, self::$calculatingProgress)) {
            return 0.0;
        }

        // Đánh dấu Objective này đang được tính
        self::$calculatingProgress[] = $this->objective_id;

        try {
            // Tính từ KeyResults trực tiếp (không tính từ child Objectives liên kết)
            $progressList = [];

            // Tính từ KeyResults trực tiếp
            $keyResults = $this->keyResults()->whereNull('archived_at')->get();
            foreach ($keyResults as $kr) {
                $progress = $kr->progress_percent; // Progress từ check-in (người sở hữu KR)
                if ($progress !== null) {
                    $progressList[] = $progress;
                }
            }

            // Tính trung bình
            if (empty($progressList)) {
                return 0.0;
            }

            $avgProgress = array_sum($progressList) / count($progressList);
            return (float) round($avgProgress, 2);
        } finally {
            // Xóa Objective này khỏi danh sách đang tính
            $key = array_search($this->objective_id, self::$calculatingProgress);
            if ($key !== false) {
                unset(self::$calculatingProgress[$key]);
            }
        }
    }

    /**
     * Tự động cập nhật progress_percent khi KeyResults thay đổi
     * Tính từ KeyResults trực tiếp (không tính từ child Objectives liên kết)
     * 
     * @param array $visited Để tránh vòng lặp vô hạn (track các Objective đã được tính)
     * @return bool
     */
    public function updateProgressFromKeyResults(array &$visited = []): bool
    {
        // Tránh vòng lặp vô hạn: nếu Objective này đã được tính trong chuỗi đệ quy, bỏ qua
        if (in_array($this->objective_id, $visited)) {
            // Trả về progress hiện tại trong DB (không tính lại)
            return true;
        }

        // Đánh dấu Objective này đã được tính
        $visited[] = $this->objective_id;

        // Tính progress từ KeyResults trực tiếp
        $keyResults = $this->keyResults()->whereNull('archived_at')->get();
        $progressList = [];
        
        foreach ($keyResults as $kr) {
            $progress = $kr->progress_percent; // Progress từ check-in (người sở hữu KR)
            if ($progress !== null) {
                $progressList[] = $progress;
            }
        }

        // Tính trung bình
        $newProgress = 0;
        if (!empty($progressList)) {
            $avgProgress = array_sum($progressList) / count($progressList);
            $newProgress = round($avgProgress, 2);
        }
        
        // Chỉ cập nhật progress_percent, không cập nhật updated_at
        // Sử dụng DB::table để update trực tiếp mà không trigger timestamps
        \DB::table('objectives')
            ->where('objective_id', $this->objective_id)
            ->update(['progress_percent' => $newProgress]);
        
        // Cập nhật attribute trong model để đồng bộ
        $this->attributes['progress_percent'] = $newProgress;
        
        return true;
    }


    /**
     * Append key_results to array/JSON
     */
    protected $appends = [];

    /**
     * Override toArray to ensure key_results is always present
     */
    public function toArray()
    {
        $array = parent::toArray();
        
        // Ensure key_results exists
        if (!array_key_exists('key_results', $array)) {
            if ($this->relationLoaded('keyResults')) {
                $array['key_results'] = $this->keyResults->toArray();
            } else {
                $array['key_results'] = [];
            }
        }

        // Ensure comments exists
        if (!array_key_exists('comments', $array)) {
            if ($this->relationLoaded('comments')) {
                $array['comments'] = $this->comments->toArray();
            } else {
                $array['comments'] = [];
            }
        }
        
        return $array;
    }
}