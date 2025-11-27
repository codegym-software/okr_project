<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OkrLinkEvent extends Model
{
    protected $table = 'okr_link_events';
    protected $primaryKey = 'event_id';

    protected $fillable = [
        'link_id',
        'action',
        'actor_id',
        'note',
    ];

    public function link(): BelongsTo
    {
        return $this->belongsTo(OkrLink::class, 'link_id', 'link_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id', 'user_id');
    }
}

