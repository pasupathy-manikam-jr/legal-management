<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'matter_id', 'user_id', 'invoice_id', 'description',
        'category', 'amount_cents', 'billable', 'status', 'incurred_on',
    ];

    protected $casts = ['incurred_on' => 'date', 'billable' => 'boolean'];

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
