<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Matter extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id', 'lead_lawyer_id', 'court_id', 'reference', 'title', 'practice_area',
        'case_type', 'priority', 'judge', 'opposing_party', 'opposing_counsel', 'status',
        'opened_on', 'expected_completion', 'closed_on', 'hourly_rate_cents', 'description',
    ];

    protected $casts = [
        'opened_on' => 'date',
        'expected_completion' => 'date',
        'closed_on' => 'date',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function leadLawyer()
    {
        return $this->belongsTo(User::class, 'lead_lawyer_id');
    }

    public function court()
    {
        return $this->belongsTo(Court::class);
    }

    /** Assigned team, per the case Team Members tab. */
    public function team()
    {
        return $this->belongsToMany(User::class)->withPivot('role');
    }

    public function events()
    {
        return $this->hasMany(MatterEvent::class);
    }

    public function hearings()
    {
        return $this->hasMany(Hearing::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function timeEntries()
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    /** Next reference in the YYYY-NNN series, e.g. 2026-014. */
    public static function nextReference(): string
    {
        $year = now()->year;
        $last = static::where('reference', 'like', "$year-%")->max('reference');
        $seq = $last ? ((int) substr($last, 5)) + 1 : 1;

        return sprintf('%d-%03d', $year, $seq);
    }
}
