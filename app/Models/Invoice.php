<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id', 'matter_id', 'number', 'issued_on', 'due_on',
        'status', 'subtotal_cents', 'tax_cents', 'paid_cents', 'notes',
    ];

    protected $casts = [
        'issued_on' => 'date',
        'due_on' => 'date',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function matter()
    {
        return $this->belongsTo(Matter::class);
    }

    public function timeEntries()
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function totalCents(): int
    {
        return $this->subtotal_cents + $this->tax_cents;
    }

    public function balanceCents(): int
    {
        return $this->totalCents() - $this->paid_cents;
    }

    /**
     * What the invoice reads as on screen. Overdue is not a stored status —
     * it is an issued invoice past its due date with money still owing.
     */
    public function state(): string
    {
        if ($this->status === 'sent' && $this->due_on?->isPast() && $this->balanceCents() > 0) {
            return 'overdue';
        }

        return $this->status;
    }

    /** @param  Builder  $query */
    public function scopeOverdue($query)
    {
        return $query->where('status', 'sent')
            ->whereDate('due_on', '<', now()->toDateString())
            ->whereRaw('subtotal_cents + tax_cents - paid_cents > 0');
    }

    /** Recompute paid total and status from the payments actually recorded. */
    public function refreshPaidTotal(): void
    {
        $this->paid_cents = (int) $this->payments()->sum('amount_cents');

        if ($this->status !== 'void') {
            $this->status = $this->paid_cents >= $this->totalCents() && $this->totalCents() > 0
                ? 'paid'
                : ($this->status === 'draft' ? 'draft' : 'sent');
        }

        $this->save();
    }

    public static function nextNumber(): string
    {
        $year = now()->year;
        $last = static::where('number', 'like', "INV-$year-%")->max('number');
        $seq = $last ? ((int) substr($last, 9)) + 1 : 1;

        return sprintf('INV-%d-%04d', $year, $seq);
    }
}
