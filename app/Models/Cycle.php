<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Cycle extends Model
{
    protected $fillable = ['cycle_name', 'start_date', 'end_date', 'status', 'description'];

    // Nếu khóa chính không phải là `id`
    protected $primaryKey = 'cycle_id'; // Thay 'cycle_id' bằng tên cột khóa chính thực tế

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    public function objectives()
    {
        return $this->hasMany(Objective::class, 'cycle_id', 'cycle_id');
    }
}