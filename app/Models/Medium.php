<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Medium extends Model
{
    use HasFactory;

    protected $fillable = ['uploaded_by', 'title', 'folder', 'path', 'mime', 'size'];

    protected $table = 'media';

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
