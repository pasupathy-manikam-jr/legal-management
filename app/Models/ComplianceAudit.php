<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComplianceAudit extends Model
{
    use HasFactory;

    protected $fillable = ['auditor_id', 'auditor_firm', 'title', 'type', 'risk_level', 'status', 'scheduled_on', 'completed_on', 'findings'];

    protected $casts = [
        'scheduled_on' => 'date',
        'completed_on' => 'date',
    ];

    public function auditor()
    {
        return $this->belongsTo(User::class, 'auditor_id');
    }
}
