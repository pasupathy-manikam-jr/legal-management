<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResearchProject extends Model
{
    use HasFactory;

    protected $fillable = [
        'matter_id', 'lead_id', 'title', 'type', 'category', 'priority',
        'status', 'question', 'findings', 'started_on', 'due_on',
    ];

    protected $casts = ['started_on' => 'date', 'due_on' => 'date'];

    public function matter()
    {
        return $this->belongsTo(Matter::class);
    }

    public function lead()
    {
        return $this->belongsTo(User::class, 'lead_id');
    }
}
