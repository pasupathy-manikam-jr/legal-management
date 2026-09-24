<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    /**
     * `role`, `title` and `active` are set only by the team screen, which validates
     * the role against ROLES and guards the last admin. Registration and profile
     * updates pass their own explicit fields, so neither can reach these.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'title',
        'active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public const ROLES = ['admin', 'lawyer', 'paralegal', 'billing'];

    /** Only admins may change firm configuration, staff and billing setup. */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
}
