<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Taxonomy extends Model
{
    use HasFactory;

    protected $fillable = ['kind', 'name', 'description', 'color', 'sort', 'active', 'meta'];

    protected $casts = [
        'active' => 'boolean',
        'meta' => 'array',
    ];

    /** Every configurable list, keyed by the screen that owns it. */
    public const KINDS = [
        'case_type' => 'Case Types',
        'client_type' => 'Client Types',
        'case_status' => 'Case Statuses',
        'event_type' => 'Event Types',
        'hearing_type' => 'Hearing Types',
        'court_type' => 'Court Types',
        'document_type' => 'Document Types',
        'practice_area' => 'Practice Areas',
        'research_type' => 'Research Types',
        'research_category' => 'Research Categories',
        'research_source' => 'Research Sources',
        'compliance_category' => 'Compliance Categories',
        'compliance_frequency' => 'Compliance Frequencies',
        'risk_category' => 'Risk Categories',
        'audit_type' => 'Audit Types',
        'expense_category' => 'Expense Categories',
        'task_type' => 'Task Types',
        'task_status' => 'Task Status',
    ];

    /**
     * How Firm Setup draws each list. "form" keeps the editor beside the table,
     * which suits the colour-carrying lists; everything else uses a dialog.
     */
    public const LAYOUTS = [
        'case_type' => 'form',
        'client_type' => 'form',
        'document_type' => 'form',
        'expense_category' => 'form',
        'case_status' => 'form',
        'task_type' => 'form',
        'task_status' => 'form',
        'research_type' => 'form',
        'research_category' => 'form',
        'compliance_category' => 'form',
        'compliance_frequency' => 'form',
        'risk_category' => 'form',
        'audit_type' => 'form',
        'court_type' => 'form',
    ];

    /** Lists whose entries belong to an entry of another list, kept in meta under that kind. */
    public const PARENTS = [
        'research_category' => 'practice_area',
    ];

    /**
     * Lists with a value of their own, kept in meta under `key`, shown as a column.
     * With `tabs` it replaces the Active/Inactive tabs; without, it is a dropdown filter.
     */
    public const FACETS = [
        'practice_area' => ['key' => 'expertise', 'label' => 'Expertise', 'values' => ['beginner', 'intermediate', 'expert'], 'tabs' => true],
        'research_source' => ['key' => 'type', 'label' => 'Type', 'values' => ['database', 'case law', 'statutory', 'secondary'], 'tabs' => false],
    ];

    /** Lists whose entries point at somewhere on the web. */
    public const WITH_URL = ['research_source'];

    /** Lists whose entries carry a colour, which the screens paint pills and tiles with. */
    public const COLOURED = ['case_type', 'case_status', 'task_type', 'task_status', 'research_category', 'document_type', 'risk_category', 'compliance_category', 'audit_type', 'court_type'];

    public function scopeKind($query, string $kind)
    {
        return $query->where('kind', $kind)->where('active', true)->orderBy('sort')->orderBy('name');
    }

    /** "Case Types" reads as "Case Type" on a single-entry form. */
    public static function singular(string $kind): string
    {
        $label = self::KINDS[$kind] ?? 'Entry';

        return match (true) {
            str_ends_with($label, 'ies') => substr($label, 0, -3).'y',
            str_ends_with($label, 'ses') => substr($label, 0, -2),
            str_ends_with($label, 's') => substr($label, 0, -1),
            default => $label,
        };
    }

    /** Names for a kind, for populating a dropdown. */
    public static function names(string $kind): array
    {
        return static::kind($kind)->pluck('name')->all();
    }
}
