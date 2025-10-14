<?php

namespace App\Events;

use App\Models\Objective;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OkrParentChanged
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $objective;

    public function __construct(Objective $objective)
    {
        $this->objective = $objective;
    }
}