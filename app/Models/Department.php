<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    protected $fillable = ['d_name', 'd_description', 'type', 'parent_department_id'];
    protected $primaryKey = 'department_id';

    public function users() {
        return $this->hasMany(User::class, 'department_id', 'department_id');
    }
}
