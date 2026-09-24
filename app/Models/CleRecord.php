<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One piece of continuing legal education, credited to the member who sat it.
 */
class CleRecord extends Model
{
    use HasFactory;

    /** Where a course stands: sat, still running, or too old to count. */
    public const STATUSES = ['completed', 'in_progress', 'expired'];

    protected $fillable = [
        'user_id', 'title', 'provider', 'category', 'credit_hours', 'required_hours',
        'status', 'completed_on', 'compliance_year', 'notes', 'certificate_url',
    ];

    protected function casts(): array
    {
        return [
            'completed_on' => 'date',
            'credit_hours' => 'float',
            'required_hours' => 'float',
            'compliance_year' => 'integer',
        ];
    }

    /** How far the earned credits have got towards what the course is worth. */
    public function progress(): int
    {
        if ($this->required_hours <= 0) {
            return $this->credit_hours > 0 ? 100 : 0;
        }

        return (int) min(100, round($this->credit_hours / $this->required_hours * 100));
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
