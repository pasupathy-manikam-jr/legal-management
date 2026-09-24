<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MatterEvent extends Model
{
    use HasFactory;

    protected $fillable = ['matter_id', 'user_id', 'kind', 'title', 'body', 'occurred_at'];

    protected $casts = ['occurred_at' => 'datetime'];

    public function matter()
    {
        return $this->belongsTo(Matter::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
