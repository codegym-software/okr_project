<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OkrAssignment extends Model
{
    protected $table = 'okr_role_assignments';
    protected $primaryKey = 'assignment_id';
    protected $fillable = ['user_id', 'role_id', 'objective_id', 'kr_id', 'department_id'];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }

    public function objective()
    {
        return $this->belongsTo(Objective::class, 'objective_id', 'objective_id');
    }

    public function keyResult()
    {
        return $this->belongsTo(KeyResult::class, 'kr_id', 'kr_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }
}