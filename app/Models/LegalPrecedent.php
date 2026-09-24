<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LegalPrecedent extends Model
{
    use HasFactory;

    protected $fillable = [
        'matter_id', 'case_name', 'citation', 'court', 'jurisdiction',
        'category', 'decided_on', 'holding', 'relevance', 'status',
    ];

    protected $casts = ['decided_on' => 'date'];

    public function matter()
    {
        return $this->belongsTo(Matter::class);
    }
}
