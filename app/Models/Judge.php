<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Who sits on the bench, and where. Hearings name their judge as free text,
 * so this register is what that field is offered from.
 */
class Judge extends Model
{
    use HasFactory;

    protected $fillable = ['reference', 'court_id', 'name', 'designation', 'email', 'phone', 'appointed_on', 'notes', 'active'];

    protected function casts(): array
    {
        return ['appointed_on' => 'date', 'active' => 'boolean'];
    }

    protected static function booted(): void
    {
        // Every judge carries a stable JG-number the bench can be searched by.
        static::created(function (self $judge) {
            if (! $judge->reference) {
                $judge->update(['reference' => sprintf('JG%06d', $judge->id)]);
            }
        });
    }

    public function court(): BelongsTo
    {
        return $this->belongsTo(Court::class);
    }

    /** Hearings listed in front of this judge, matched on the name they recorded. */
    public function hearings()
    {
        return Hearing::where('judge', $this->name);
    }
}
