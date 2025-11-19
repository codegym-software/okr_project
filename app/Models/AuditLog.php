<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $primaryKey = 'log_id';

    protected $fillable = [
        'action',
        'entity',
        'user_id',
        'entity_id',
    ];
}
