<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cycle extends Model
{
    protected $fillable = ['cycle_name', 'start_date', 'end_date', 'status', 'description'];

    // Nếu khóa chính không phải là `id`
    protected $primaryKey = 'cycle_id'; // Thay 'cycle_id' bằng tên cột khóa chính thực tế

    public function objectives()
    {
        return $this->hasMany(Objective::class, 'cycle_id', 'cycle_id');
    }
}