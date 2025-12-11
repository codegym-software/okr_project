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
        'archived_at',
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
        // Tuy nhiên, nếu muốn tính toán dynamic real-time, có thể bỏ dòng này hoặc dùng logic cache
        if (!is_null($value)) {
            return (float) $value;
        }

        // Tránh vòng lặp vô hạn
        if (in_array($this->objective_id, self::$calculatingProgress)) {
            return 0.0;
        }

        self::$calculatingProgress[] = $this->objective_id;

        try {
            $progressList = [];

            // 1. Tính từ KeyResults trực tiếp
            // Kiểm tra relation loaded để tránh N+1 nếu có thể, hoặc query nếu cần
            $keyResults = $this->relationLoaded('keyResults') 
                ? $this->keyResults 
                : $this->keyResults()->whereNull('archived_at')->get();

            foreach ($keyResults as $kr) {
                $progress = $kr->progress_percent;
                if ($progress !== null) {
                    $progressList[] = $progress;
                }
            }

            // 2. Tính từ Child Objectives (Mục tiêu con liên kết lên)
            // Ví dụ: Objective NV liên kết lên Objective Phòng ban
            $childLinks = $this->relationLoaded('childObjectives')
                ? $this->childObjectives
                : $this->childObjectives()->get();

            foreach ($childLinks as $link) {
                // Chỉ tính các link active/approved
                if ($link->is_active && $link->status === OkrLink::STATUS_APPROVED) {
                    $childObj = $link->sourceObjective;
                    if ($childObj && $childObj->archived_at === null) {
                        // Gọi đệ quy để lấy progress của child (nếu child chưa có value DB)
                        // Hoặc lấy trực tiếp attribute nếu child đã được load
                        $childProgress = $childObj->progress_percent;
                        if ($childProgress !== null) {
                            $progressList[] = $childProgress;
                        }
                    }
                }
            }

            // Tính trung bình
            if (empty($progressList)) {
                return 0.0;
            }

            $avgProgress = array_sum($progressList) / count($progressList);
            return (float) round($avgProgress, 2);
        } finally {
            $key = array_search($this->objective_id, self::$calculatingProgress);
            if ($key !== false) {
                unset(self::$calculatingProgress[$key]);
            }
        }
    }

    /**
     * Tự động tính toán và lưu progress vào DB, đồng thời kích hoạt cập nhật lên cha.
     * Đây là hàm quan trọng để duy trì tính nhất quán dữ liệu.
     */
    public function updateProgress(array &$visited = []): bool
    {
        // 1. Tránh vòng lặp vô hạn
        if (in_array($this->objective_id, $visited)) {
            return true;
        }
        $visited[] = $this->objective_id;

        // 2. Tính toán progress mới
        // Logic tương tự như getCalculatedProgressAttribute nhưng query trực tiếp để đảm bảo dữ liệu mới nhất
        $progressList = [];

        // 2.1. Từ KeyResults trực tiếp
        $keyResults = $this->keyResults()->whereNull('archived_at')->get();
        foreach ($keyResults as $kr) {
            // Đối với KR, chúng ta cũng có thể gọi updateProgress() của nó nếu cần, 
            // nhưng ở đây giả sử KR đã được update trước đó.
            $progress = $kr->progress_percent;
            if ($progress !== null) {
                $progressList[] = $progress;
            }
        }

        // 2.2. Từ Child Objectives (Objective con liên kết trực tiếp)
        // Lưu ý: Chỉ tính link trỏ vào Objective (Objective -> Objective)
        $childLinks = $this->childObjectives()
            ->where('is_active', true)
            ->where('status', OkrLink::STATUS_APPROVED)
            ->where('target_type', 'objective') // Quan trọng: Chỉ tính link Obj->Obj
            ->get();

        foreach ($childLinks as $link) {
            $childObj = $link->sourceObjective;
            if ($childObj && $childObj->archived_at === null) {
                $childProgress = $childObj->progress_percent;
                if ($childProgress !== null) {
                    $progressList[] = $childProgress;
                }
            }
        }

        // 3. Tính trung bình
        $newProgress = 0;
        if (!empty($progressList)) {
            $avgProgress = array_sum($progressList) / count($progressList);
            $newProgress = round($avgProgress, 2);
        }

        // 3.5. Tự động tính status dựa trên progress và chu kỳ
        // Đảm bảo cycle được load
        if (!$this->relationLoaded('cycle')) {
            $this->load('cycle');
        }
        $newStatus = $this->calculateStatusFromProgress($newProgress);

        // 4. Lưu vào Database
        // Sử dụng DB::table để update nhanh và tránh trigger events nếu không cần thiết
        \DB::table('objectives')
            ->where('objective_id', $this->objective_id)
            ->update([
                'progress_percent' => $newProgress,
                'status' => $newStatus
            ]);
        
        // Cập nhật attribute của instance hiện tại
        $this->attributes['progress_percent'] = $newProgress;
        $this->attributes['status'] = $newStatus;

        // 5. Lan truyền lên trên (Propagate Upwards)
        // Tìm các link mà Objective này là SOURCE (tức là nó đang đóng góp cho ai?)
        $parentLinks = $this->sourceLinks; 
        
        foreach ($parentLinks as $link) {
            if ($link->is_active && $link->status === OkrLink::STATUS_APPROVED) {
                if ($link->target_type === 'objective' && $link->targetObjective) {
                    // Nếu cha là Objective -> Gọi updateProgress của Objective cha
                    $link->targetObjective->updateProgress($visited);
                } elseif ($link->target_type === 'kr' && $link->targetKr) {
                    // Nếu cha là Key Result -> Gọi updateProgress của KR cha
                    $link->targetKr->updateProgress($visited);
                }
            }
        }

        return true;
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
        
        // Tự động tính status dựa trên progress và chu kỳ
        // Đảm bảo cycle được load
        if (!$this->relationLoaded('cycle')) {
            $this->load('cycle');
        }
        $newStatus = $this->calculateStatusFromProgress($newProgress);
        
        // Chỉ cập nhật progress_percent và status, không cập nhật updated_at
        // Sử dụng DB::table để update trực tiếp mà không trigger timestamps
        \DB::table('objectives')
            ->where('objective_id', $this->objective_id)
            ->update([
                'progress_percent' => $newProgress,
                'status' => $newStatus
            ]);
        
        // Cập nhật attribute trong model để đồng bộ
        $this->attributes['progress_percent'] = $newProgress;
        $this->attributes['status'] = $newStatus;
        
        return true;
    }

    /**
     * Tính trạng thái Objective dựa trên tiến độ và thời gian trong chu kỳ
     * 
     * @param float $progress Tiến độ (0-100)
     * @return string Trạng thái: on_track, at_risk, behind, completed
     */
    private function calculateStatusFromProgress(float $progress): string
    {
        // Nếu đã hoàn thành 100%
        if ($progress >= 100) {
            return 'completed';
        }
        
        // Lấy thông tin chu kỳ
        $cycle = $this->relationLoaded('cycle') ? $this->cycle : $this->cycle()->first();
        
        if (!$cycle || !$cycle->start_date || !$cycle->end_date) {
            // Nếu không có chu kỳ, dùng logic cũ dựa trên progress
            if ($progress >= 80) {
                return 'on_track';
            }
            if ($progress >= 50) {
                return 'at_risk';
            }
            return 'behind';
        }
        
        $now = Carbon::now('Asia/Ho_Chi_Minh');
        $startDate = Carbon::parse($cycle->start_date);
        $endDate = Carbon::parse($cycle->end_date);
        
        // Tính % thời gian đã trôi qua trong chu kỳ
        $totalDays = $startDate->diffInDays($endDate);
        if ($totalDays <= 0) {
            // Chu kỳ đã kết thúc hoặc không hợp lệ
            if ($progress >= 100) {
                return 'completed';
            }
            return 'behind';
        }
        
        $elapsedDays = $startDate->diffInDays($now);
        $expectedProgress = min(100, max(0, ($elapsedDays / $totalDays) * 100));
        
        // Nếu thời gian đã trôi qua < 10% và progress = 0%, coi như đúng tiến độ (mới tạo)
        if ($expectedProgress < 10 && $progress == 0) {
            return 'on_track';
        }
        
        // Nếu thời gian đã trôi qua < 5%, luôn là đúng tiến độ (quá sớm để đánh giá)
        if ($expectedProgress < 5) {
            return 'on_track';
        }
        
        // So sánh progress thực tế với progress mong đợi
        $difference = $progress - $expectedProgress;
        
        // Đúng tiến độ: progress >= expected - 5% (có buffer nhỏ)
        if ($difference >= -5) {
            return 'on_track';
        }
        
        // Có nguy cơ: progress < expected - 5% nhưng >= expected - 20%
        if ($difference >= -20) {
            return 'at_risk';
        }
        
        // Chậm tiến độ: progress < expected - 20%
        return 'behind';
    }


    /**
     * Append key_results to array/JSON
     */
    protected $appends = ['calculated_progress'];

    /**
     * Accessor for calculated_progress
     * Forces recalculation regardless of DB value
     */
    public function getCalculatedProgressAttribute()
    {
        // Reuse the logic from getProgressPercentAttribute but skip the DB value check
        // We can refactor the logic into a shared private method later
        
        // Tránh vòng lặp vô hạn
        if (in_array($this->objective_id, self::$calculatingProgress)) {
            return 0.0;
        }

        self::$calculatingProgress[] = $this->objective_id;

        try {
            $progressList = [];

            // 1. KeyResults
            $keyResults = $this->relationLoaded('keyResults') 
                ? $this->keyResults 
                : $this->keyResults()->whereNull('archived_at')->get();

            foreach ($keyResults as $kr) {
                // Use calculated_progress to include child objective contributions to this KR
                $progress = $kr->calculated_progress;
                if ($progress !== null) {
                    $progressList[] = $progress;
                }
            }

            // 2. Child Objectives
            $childLinks = $this->relationLoaded('childObjectives')
                ? $this->childObjectives
                : $this->childObjectives()->get();

            foreach ($childLinks as $link) {
                // CHỈ tính các link trỏ trực tiếp vào Objective (Objective -> Objective)
                // BỎ QUA các link trỏ vào KR (Objective -> KR), vì KR tự quản lý tiến độ của nó
                if ($link->is_active && $link->status === OkrLink::STATUS_APPROVED && $link->target_type === 'objective') {
                    $childObj = $link->sourceObjective;
                    if ($childObj && $childObj->archived_at === null) {
                        $childProgress = $childObj->progress_percent; 
                        if ($childProgress !== null) {
                            $progressList[] = $childProgress;
                        }
                    }
                }
            }

            if (empty($progressList)) {
                return 0.0;
            }

            $avgProgress = array_sum($progressList) / count($progressList);
            return (float) round($avgProgress, 2);
        } finally {
            $key = array_search($this->objective_id, self::$calculatingProgress);
            if ($key !== false) {
                unset(self::$calculatingProgress[$key]);
            }
        }
    }

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