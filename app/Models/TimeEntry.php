<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TimeEntry extends Model
{
    use HasFactory;

    protected $fillable = ['matter_id', 'user_id', 'worked_on', 'minutes', 'rate_cents', 'billable', 'invoice_id', 'description'];

    protected $casts = [
        'worked_on' => 'date',
        'billable' => 'boolean',
    ];

    /** Rounded to the cent, so a row total never carries a fraction into an invoice. */
    public function amountCents(): int
    {
        return (int) round($this->minutes * $this->rate_cents / 60);
    }

    public function matter()
    {
        return $this->belongsTo(Matter::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
