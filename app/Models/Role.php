<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $table = 'roles';
    protected $primaryKey = 'role_id';
    public $timestamps = true;

    protected $fillable = [
        'role_name',
        'description',
    ];

    /**
     * Mối quan hệ với User
     */
    public function users()
    {
        return $this->hasMany(User::class, 'role_id', 'role_id');
    }

    /**
     * Kiểm tra xem role có phải Admin không
     */
    public function isAdmin()
    {
        return $this->role_name === 'Admin';
    }

    /**
     * Kiểm tra xem role có phải Manager không
     */
    public function isManager()
    {
        return $this->role_name === 'Manager';
    }

    /**
     * Kiểm tra xem role có phải Member không
     */
    public function isMember()
    {
        return $this->role_name === 'Member';
    }

    /**
     * Kiểm tra xem role có quyền tạo OKR cấp công ty/phòng ban không
     */
    public function canCreateCompanyOKR()
    {
        return $this->isAdmin() || $this->isManager();
    }
}
