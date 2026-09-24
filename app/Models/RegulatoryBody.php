<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RegulatoryBody extends Model
{
    use HasFactory;

    protected $table = 'regulatory_bodies';

    protected $fillable = [
        'name', 'short_name', 'type', 'jurisdiction',
        'website', 'contact_email', 'phone', 'notes', 'active',
    ];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    public function licenses(): HasMany
    {
        return $this->hasMany(ProfessionalLicense::class);
    }
}
