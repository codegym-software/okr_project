<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $primaryKey = 'notification_id';
    protected $fillable = [
        'message',
        'type',
        'is_read',
        'user_id',
        'cycle_id',
    ];
}
