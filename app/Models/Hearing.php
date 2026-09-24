<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Hearing extends Model
{
    use HasFactory;

    protected $fillable = [
        'matter_id', 'court_id', 'scheduled_at', 'duration_minutes',
        'type', 'status', 'judge', 'title', 'outcome',
    ];

    protected $casts = ['scheduled_at' => 'datetime'];

    public function court()
    {
        return $this->belongsTo(Court::class);
    }

    public function matter()
    {
        return $this->belongsTo(Matter::class);
    }
}
