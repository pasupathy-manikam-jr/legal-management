<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = ['invoice_id', 'paid_on', 'amount_cents', 'method', 'reference'];

    protected $casts = ['paid_on' => 'date'];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
