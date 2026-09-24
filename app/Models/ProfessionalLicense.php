<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfessionalLicense extends Model
{
    use HasFactory;

    /** How long before expiry a licence starts asking to be renewed. */
    public const RENEWAL_WINDOW_DAYS = 60;

    public const STATUSES = ['active', 'suspended', 'revoked'];

    /** Every state a card can wear, including the one the calendar decides. */
    public const STATES = ['active', 'expired', 'suspended', 'revoked'];

    protected $fillable = [
        'user_id', 'regulatory_body_id', 'type', 'number', 'jurisdiction',
        'issued_on', 'expires_on', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return ['issued_on' => 'date', 'expires_on' => 'date'];
    }

    public function holder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function body(): BelongsTo
    {
        return $this->belongsTo(RegulatoryBody::class, 'regulatory_body_id');
    }

    /** Whole days until expiry — negative once it has passed, null when open-ended. */
    public function daysToExpiry(): ?int
    {
        return $this->expires_on ? (int) now()->startOfDay()->diffInDays($this->expires_on, false) : null;
    }

    /**
     * What the card should say. A suspended or revoked licence keeps its own
     * status; only a live one is judged against its expiry date.
     */
    public function state(): string
    {
        if ($this->status !== 'active') {
            return $this->status;
        }

        $days = $this->daysToExpiry();

        return $days !== null && $days < 0 ? 'expired' : 'active';
    }
}
