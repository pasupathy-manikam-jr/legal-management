<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComplianceRequirement extends Model
{
    use HasFactory;

    protected $fillable = ['owner_id', 'title', 'category', 'frequency', 'priority', 'status', 'requirement', 'due_on', 'last_reviewed_on'];

    protected $casts = [
        'due_on' => 'date',
        'last_reviewed_on' => 'date',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function isOverdue(): bool
    {
        return $this->due_on && $this->due_on->isPast() && $this->status !== 'compliant';
    }
}
