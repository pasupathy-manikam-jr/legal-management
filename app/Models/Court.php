<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Court extends Model
{
    use HasFactory;

    protected $fillable = ['reference', 'name', 'type', 'bench', 'jurisdiction', 'address', 'phone', 'email', 'active'];

    protected $casts = ['active' => 'boolean'];

    protected static function booted(): void
    {
        // Every court carries a stable CT-number the registry can be searched by.
        static::created(function (self $court) {
            if (! $court->reference) {
                $court->update(['reference' => sprintf('CT%06d', $court->id)]);
            }
        });
    }

    public function matters()
    {
        return $this->hasMany(Matter::class);
    }
}
