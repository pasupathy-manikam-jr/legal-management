<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'company', 'type', 'email', 'phone', 'address', 'notes', 'active'];

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
