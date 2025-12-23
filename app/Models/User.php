<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'sub', 'email', 'full_name', 'avatar_url', 'google_id', 'department_id', 'role_id', 'status', 'is_invited', 'invited_at'
    ];

    protected $primaryKey = 'user_id';

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Mối quan hệ với Role
     */
    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }

    /**
     * Mối quan hệ với Department
     */
    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }

    /**
     * Kiểm tra xem user có phải Admin không
     */
    public function isAdmin()
    {
        return $this->role && $this->role->isAdmin();
    }

    /**
     * Kiểm tra xem user có phải CEO không
     */
    public function isCeo()
    {
        return $this->role && $this->role->isCeo();
    }


    /**
     * Kiểm tra xem user có phải Manager không
     */
    public function isManager()
    {
        return $this->role && $this->role->isManager();
    }

    /**
     * Kiểm tra xem user có phải Member không
     */
    public function isMember()
    {
        return $this->role && $this->role->isMember();
    }

    /**
     * Kiểm tra xem user có quyền tạo OKR cấp công ty/phòng ban không
     */
    public function canCreateCompanyOKR()
    {
        return $this->role && $this->role->canCreateCompanyOKR();
    }

    /**
     * Kiểm tra xem user có quyền tạo OKR cá nhân không
     * Tất cả user đều có quyền tạo OKR cá nhân
     */
    public function canCreatePersonalOKR()
    {
        return true; // Ai cũng có quyền tạo OKR cá nhân
    }

    /**
     * Kiểm tra xem user có quyền quản lý người dùng không
     */
    public function canManageUsers()
    {
        return $this->isAdmin();
    }

}
