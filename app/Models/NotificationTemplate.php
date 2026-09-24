<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationTemplate extends Model
{
    use HasFactory;

    protected $fillable = ['key', 'name', 'channel', 'subject', 'body', 'active'];

    protected $casts = [
        'active' => 'boolean',
    ];

    /** Where a template can be delivered. Only email carries a subject line. */
    public const CHANNELS = ['slack', 'twilio', 'email'];
}
