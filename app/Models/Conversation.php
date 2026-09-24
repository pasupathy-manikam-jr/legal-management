<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = ['owner_id', 'contact_type', 'contact_id', 'last_message_at'];

    protected $casts = ['last_message_at' => 'datetime'];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    /** The person on the other side: a colleague or a client. */
    public function contact(): User|Client|null
    {
        return $this->contact_type === 'user'
            ? User::find($this->contact_id)
            : Client::find($this->contact_id);
    }

    public function contactName(): string
    {
        return $this->contact()?->name ?? 'Unknown';
    }

    public function contactLabel(): string
    {
        return $this->contact_type === 'user' ? 'Team Member' : 'Client';
    }

    /** Messages from the other side that the owner has not opened yet. */
    public function unreadCount(): int
    {
        return $this->messages()->where('sender', 'contact')->whereNull('read_at')->count();
    }
}
