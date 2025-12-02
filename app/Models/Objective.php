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
        'department_id',
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
     * Tính toán progress_percent tự động từ KeyResults và child Objectives (đệ quy)
     * Ưu tiên: giá trị trong DB > tính đệ quy từ KeyResults + child Objectives
     * 
     * Logic tính progress (Option B):
     * - Tính từ KeyResults trực tiếp: Giữ nguyên progress từ check-in (người sở hữu KR cập nhật)
     * - Tính từ child Objectives: Progress của các Objective liên kết lên Objective này (O -> O)
     * - KHÔNG tính progress của Objective liên kết lên KR: 
     *   Khi có O liên kết lên KR, giữ nguyên progress của KR (từ check-in), 
     *   bỏ qua progress của O liên kết để tránh trùng lặp
     * 
     * Ví dụ: Objective A có KR-A1 (50% từ check-in), Objective B (75%) liên kết lên KR-A1
     * -> Progress A = (50 + ...) / n (chỉ tính KR-A1, không tính progress của B)
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
            // Tính đệ quy từ KeyResults trực tiếp + child Objectives
            $progressList = [];

            // Bước 1: Tính từ KeyResults trực tiếp
            // Lưu ý: Giữ nguyên progress của KR từ check-in, không tính progress của O liên kết lên KR
            // (Nếu có O liên kết lên KR, progress của O đó không được tính vào progress của O chứa KR)
            $keyResults = $this->keyResults()->whereNull('archived_at')->get();
            foreach ($keyResults as $kr) {
                $progress = $kr->progress_percent; // Progress từ check-in (người sở hữu KR)
                if ($progress !== null) {
                    $progressList[] = $progress;
                }
            }

            // Bước 2: Tính từ child Objectives được liên kết (đệ quy)
            // Chỉ tính các Objective liên kết trực tiếp lên Objective này (O -> O)
            // KHÔNG tính progress của Objective liên kết lên KR (O -> KR)
            $childObjectives = $this->childObjectives()->get();
            foreach ($childObjectives as $link) {
                $childObjective = $link->sourceObjective;
                if ($childObjective) {
                    // Đệ quy: lấy progress của child Objective (sử dụng accessor của nó)
                    $childProgress = $childObjective->progress_percent;
                    if ($childProgress !== null && $childProgress > 0) {
                        $progressList[] = $childProgress;
                    }
                }
            }

            // Bước 3: Tính trung bình
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
     * Tính đệ quy: Progress = trung bình của (KeyResults trực tiếp + Progress của child Objectives)
     * 
     * Logic tính progress (Option B):
     * - Tính từ KeyResults trực tiếp: Giữ nguyên progress từ check-in (người sở hữu KR cập nhật)
     * - Tính từ child Objectives: Progress của các Objective liên kết lên Objective này (O -> O)
     * - KHÔNG tính progress của Objective liên kết lên KR: 
     *   Khi có O liên kết lên KR, giữ nguyên progress của KR (từ check-in), 
     *   bỏ qua progress của O liên kết để tránh trùng lặp
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

        // Bước 1: Tính progress từ KeyResults trực tiếp
        // Lưu ý: Giữ nguyên progress của KR từ check-in, không tính progress của O liên kết lên KR
        // (Nếu có O liên kết lên KR, progress của O đó không được tính vào progress của O chứa KR)
        $keyResults = $this->keyResults()->whereNull('archived_at')->get();
        $progressList = [];
        
        foreach ($keyResults as $kr) {
            $progress = $kr->progress_percent; // Progress từ check-in (người sở hữu KR)
            if ($progress !== null) {
                $progressList[] = $progress;
            }
        }

        // Bước 2: Tính progress từ child Objectives được liên kết (đệ quy)
        // Chỉ tính các Objective liên kết trực tiếp lên Objective này (O -> O)
        // KHÔNG tính progress của Objective liên kết lên KR (O -> KR)
        $childObjectives = $this->childObjectives()->get();
        
        foreach ($childObjectives as $link) {
            $childObjective = $link->sourceObjective;
            if ($childObjective) {
                // Đệ quy: cập nhật progress của child Objective trước
                $childObjective->updateProgressFromKeyResults($visited);
                
                // Lấy progress của child Objective (đã được cập nhật)
                $childProgress = $childObjective->progress_percent;
                if ($childProgress !== null) {
                    $progressList[] = $childProgress;
                }
            }
        }

        // Bước 3: Tính trung bình
        if (empty($progressList)) {
            $this->attributes['progress_percent'] = 0;
        } else {
            $avgProgress = array_sum($progressList) / count($progressList);
            $this->attributes['progress_percent'] = round($avgProgress, 2);
        }
        
        $saved = $this->save();
        
        // Bước 4: Cập nhật progress của tất cả parent Objectives (các Objective có link đến Objective này)
        if ($saved) {
            $this->updateParentObjectives($visited);
        }
        
        return $saved;
    }

    /**
     * Cập nhật progress của tất cả parent Objectives (các Objective có link đến Objective này)
     * 
     * @param array $visited Để tránh vòng lặp vô hạn
     * @return void
     */
    protected function updateParentObjectives(array &$visited = []): void
    {
        // Tìm tất cả các link mà Objective này là target (tức là có Objective khác link đến nó)
        $parentLinks = OkrLink::where('target_objective_id', $this->objective_id)
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED)
            ->where('source_type', 'objective')
            ->with('sourceObjective')
            ->get();

        foreach ($parentLinks as $link) {
            $parentObjective = $link->sourceObjective;
            if ($parentObjective) {
                // Đệ quy cập nhật progress của parent Objective
                $parentObjective->updateProgressFromKeyResults($visited);
            }
        }
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
        
        // Ensure key_results exists (Laravel camelCase -> snake_case conversion)
        if (isset($array['key_results'])) {
            // Already has key_results, good
        } elseif ($this->relationLoaded('keyResults')) {
            // Has keyResults relationship loaded, convert to key_results
            $array['key_results'] = $this->keyResults->toArray();
        } else {
            // No relationship loaded, set empty array
            $array['key_results'] = [];
        }
        
        return $array;
    }
}

