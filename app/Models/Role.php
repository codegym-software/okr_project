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
        'level',
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
        return strtolower($this->role_name) === 'admin';
    }

    /**
     * Kiểm tra xem role có phải Unit Manager không
     */
    public function isDeptManager()
    {
        return (strtolower($this->role_name) === 'manager' && strtolower($this->level) === 'unit');
    }

    /**
     * Kiểm tra xem role có phải Team Manager không
     */
    public function isTeamManager()
    {
        return (strtolower($this->role_name) === 'manager' && strtolower($this->level) === 'team');
    }

    /**
     * Kiểm tra xem role có phải Member không
     */
    public function isMember()
    {
        return strtolower($this->role_name) === 'member';
    }

    /**
     * Kiểm tra xem role có quyền tạo OKR cấp công ty/phòng ban không
     */
    public function canCreateCompanyOKR()
    {
        return $this->isAdmin() || $this->isManager();
    }

    /**
     * Kiểm tra xem role có quyền tạo OKR cá nhân không
     * Tất cả role đều có quyền tạo OKR cá nhân
     */
    public function canCreatePersonalOKR()
    {
        return true; // Ai cũng có quyền tạo OKR cá nhân
    }
}
