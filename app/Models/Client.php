<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'company', 'tin', 'id_type', 'id_number', 'type', 'email', 'phone',
        'address', 'city', 'postcode', 'state', 'country', 'notes', 'active',
    ];

    protected $casts = ['active' => 'boolean'];

    public function matters()
    {
        return $this->hasMany(Matter::class);
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }
}
