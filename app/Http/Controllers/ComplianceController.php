<?php

namespace App\Http\Controllers;

use App\Models\ComplianceAudit;
use App\Models\ComplianceRequirement;
use App\Models\Matter;
use App\Models\RiskAssessment;
use App\Models\Taxonomy;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ComplianceController extends Controller
{
    /** What a requirement can be, once its deadline has had its say. */
    public const REQUIREMENT_STATES = ['compliant', 'in_progress', 'non_compliant', 'pending', 'overdue'];

    public const PRIORITIES = ['low', 'medium', 'high', 'critical'];

    public function requirements(Request $request)
    {
        $request->validate([
            'state' => ['nullable', Rule::in(self::REQUIREMENT_STATES)],
            'priority' => ['nullable', Rule::in(self::PRIORITIES)],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'category', 'priority', 'state');
        $perPage = (int) ($request->input('per_page') ?: 10);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => ComplianceRequirement::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%$v%")
                ->orWhere('requirement', 'like', "%$v%")))
            ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v))
            ->when($filters['priority'] ?? null, fn ($q, $v) => $q->where('priority', $v));

        // A missed deadline outranks whatever the row claims, so "overdue" is a
        // state of its own and the status tabs only count what is still on time.
        $overdue = fn ($q) => $q->whereDate('due_on', '<', today())->where('status', '!=', 'compliant');
        $onTime = fn ($q) => $q->where(fn ($w) => $w
            ->whereNull('due_on')
            ->orWhereDate('due_on', '>=', today())
            ->orWhere('status', 'compliant'));

        $counts = ['all' => $matching()->count(), 'overdue' => $matching()->where($overdue)->count()];

        foreach (['compliant', 'in_progress', 'non_compliant', 'pending'] as $status) {
            $counts[$status] = $matching()->where($onTime)->where('status', $status)->count();
        }

        $state = $filters['state'] ?? null;

        return Inertia::render('compliance/requirements', [
            'requirements' => $matching()
                ->when($state === 'overdue', fn ($q) => $q->where($overdue))
                ->when($state && $state !== 'overdue', fn ($q) => $q->where($onTime)->where('status', $state))
                ->with('owner:id,name,title')
                ->orderByRaw('due_on is null, due_on')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (ComplianceRequirement $r) => [
                    'id' => $r->id,
                    'title' => $r->title,
                    'category' => $r->category,
                    'frequency' => $r->frequency,
                    'priority' => $r->priority,
                    'status' => $r->status,
                    'state' => $r->isOverdue() ? 'overdue' : $r->status,
                    'days_overdue' => $r->isOverdue() ? (int) $r->due_on->diffInDays(today()) : null,
                    'requirement' => $r->requirement,
                    'due_on' => $r->due_on?->toDateString(),
                    'last_reviewed_on' => $r->last_reviewed_on?->toDateString(),
                    'owner_id' => $r->owner_id,
                    'owner' => $r->owner?->name,
                    'owner_title' => $r->owner?->title,
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => $counts,
            'options' => [
                'users' => User::where('active', true)->orderBy('name')->get(['id', 'name']),
                'statuses' => ['compliant', 'in_progress', 'non_compliant', 'pending'],
                'priorities' => self::PRIORITIES,
                'categories' => Taxonomy::kind('compliance_category')->get(['name', 'color']),
                'frequencies' => Taxonomy::names('compliance_frequency'),
            ],
        ]);
    }

    /** The refresh button in a row: step the requirement on to the next status. */
    public function cycleRequirement(ComplianceRequirement $requirement)
    {
        $statuses = ['pending', 'in_progress', 'compliant', 'non_compliant'];
        $next = $statuses[(array_search($requirement->status, $statuses, true) + 1) % count($statuses)];

        $requirement->update([
            'status' => $next,
            'last_reviewed_on' => $next === 'compliant' ? today() : $requirement->last_reviewed_on,
        ]);

        return back()->with('success', "Marked {$requirement->title} as {$next}.");
    }

    public function storeRequirement(Request $request)
    {
        ComplianceRequirement::create($this->requirementRules($request));

        return back()->with('success', 'Requirement added.');
    }

    public function updateRequirement(Request $request, ComplianceRequirement $requirement)
    {
        $requirement->update($this->requirementRules($request));

        return back()->with('success', 'Requirement updated.');
    }

    public function destroyRequirement(ComplianceRequirement $requirement)
    {
        $requirement->delete();

        return back()->with('success', 'Requirement removed.');
    }

    /** How urgent an audit's findings are, shared with the risk register. */
    public const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

    public const AUDIT_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'];

    public function audits(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(self::AUDIT_STATUSES)],
            'risk_level' => ['nullable', Rule::in(self::RISK_LEVELS)],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'type', 'risk_level', 'status');
        $perPage = (int) ($request->input('per_page') ?: 10);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => ComplianceAudit::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%$v%")
                ->orWhere('auditor_firm', 'like', "%$v%")
                ->orWhere('findings', 'like', "%$v%")))
            ->when($filters['type'] ?? null, fn ($q, $v) => $q->where('type', $v))
            ->when($filters['risk_level'] ?? null, fn ($q, $v) => $q->where('risk_level', $v));

        $counts = ['all' => $matching()->count()] + $matching()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        return Inertia::render('compliance/audits', [
            'audits' => $matching()
                ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
                ->with('auditor:id,name')
                ->orderByDesc('scheduled_on')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (ComplianceAudit $a) => [
                    'id' => $a->id,
                    'title' => $a->title,
                    'type' => $a->type,
                    'risk_level' => $a->risk_level,
                    'status' => $a->status,
                    'scheduled_on' => $a->scheduled_on?->toDateString(),
                    'completed_on' => $a->completed_on?->toDateString(),
                    'findings' => $a->findings,
                    'auditor_id' => $a->auditor_id,
                    'auditor' => $a->auditor?->name,
                    'auditor_firm' => $a->auditor_firm,
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => $counts,
            'options' => [
                'users' => User::where('active', true)->orderBy('name')->get(['id', 'name']),
                'statuses' => self::AUDIT_STATUSES,
                'risks' => self::RISK_LEVELS,
                'types' => Taxonomy::names('audit_type'),
                'firms' => ComplianceAudit::whereNotNull('auditor_firm')->distinct()->orderBy('auditor_firm')->pluck('auditor_firm'),
            ],
        ]);
    }

    public function storeAudit(Request $request)
    {
        ComplianceAudit::create($this->auditRules($request));

        return back()->with('success', 'Audit scheduled.');
    }

    public function updateAudit(Request $request, ComplianceAudit $audit)
    {
        $audit->update($this->auditRules($request));

        return back()->with('success', 'Audit updated.');
    }

    public function destroyAudit(ComplianceAudit $audit)
    {
        $audit->delete();

        return back()->with('success', 'Audit removed.');
    }

    public function risks(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(RiskAssessment::STATUSES)],
            'band' => ['nullable', Rule::in(array_keys(RiskAssessment::BANDS))],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'category', 'band', 'status');
        $perPage = (int) ($request->input('per_page') ?: 10);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = function () use ($filters) {
            $query = RiskAssessment::query()
                ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                    ->where('title', 'like', "%$v%")
                    ->orWhere('mitigation', 'like', "%$v%")))
                ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v));

            if ($band = $filters['band'] ?? null) {
                [$floor, $ceiling] = RiskAssessment::range($band);
                $query->whereRaw('likelihood * impact between ? and ?', [$floor, $ceiling]);
            }

            return $query;
        };

        $counts = ['all' => $matching()->count()] + $matching()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        [$criticalFloor] = RiskAssessment::range('high');

        return Inertia::render('compliance/risks', [
            'risks' => $matching()
                ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
                ->with('owner:id,name', 'matter:id,reference')
                ->orderByRaw('likelihood * impact desc')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (RiskAssessment $r) => [
                    'id' => $r->id,
                    'title' => $r->title,
                    'category' => $r->category,
                    'likelihood' => $r->likelihood,
                    'impact' => $r->impact,
                    'score' => $r->score(),
                    'band' => $r->band(),
                    'status' => $r->status,
                    'mitigation' => $r->mitigation,
                    'identified_on' => $r->identified_on?->toDateString(),
                    'review_on' => $r->review_on?->toDateString(),
                    'owner_id' => $r->owner_id,
                    'owner' => $r->owner?->name,
                    'matter_id' => $r->matter_id,
                    'matter' => $r->matter?->reference,
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => $counts,
            'totals' => [
                'all' => $counts['all'],
                'severe' => $matching()->whereRaw('likelihood * impact >= ?', [$criticalFloor])->count(),
                'open' => $matching()->where('status', '!=', 'closed')->count(),
                'closed' => $counts['closed'] ?? 0,
            ],
            // One cell per likelihood/impact pair, so the matrix can show where the register sits.
            'matrix' => $matching()
                ->selectRaw('likelihood, impact, count(*) as total')
                ->groupBy('likelihood', 'impact')
                ->get()
                ->mapWithKeys(fn ($row) => ["{$row->likelihood}x{$row->impact}" => $row->total]),
            'options' => [
                'users' => User::where('active', true)->orderBy('name')->get(['id', 'name']),
                'matters' => Matter::orderBy('reference')->get()->map(fn ($m) => ['id' => $m->id, 'label' => "{$m->reference} — {$m->title}"]),
                'statuses' => RiskAssessment::STATUSES,
                'bands' => array_keys(RiskAssessment::BANDS),
                'categories' => Taxonomy::kind('risk_category')->get(['name', 'color']),
            ],
        ]);
    }

    public function storeRisk(Request $request)
    {
        RiskAssessment::create($this->riskRules($request));

        return back()->with('success', 'Risk recorded.');
    }

    public function updateRisk(Request $request, RiskAssessment $risk)
    {
        $risk->update($this->riskRules($request));

        return back()->with('success', 'Risk updated.');
    }

    public function destroyRisk(RiskAssessment $risk)
    {
        $risk->delete();

        return back()->with('success', 'Risk removed.');
    }

    private function requirementRules(Request $request): array
    {
        return $request->validate([
            'owner_id' => ['nullable', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'frequency' => ['nullable', 'string', 'max:60'],
            'priority' => ['required', Rule::in(self::PRIORITIES)],
            'status' => ['required', 'in:compliant,in_progress,non_compliant,pending'],
            'requirement' => ['nullable', 'string', 'max:5000'],
            'due_on' => ['nullable', 'date'],
            'last_reviewed_on' => ['nullable', 'date'],
        ]);
    }

    private function auditRules(Request $request): array
    {
        return $request->validate([
            'auditor_id' => ['nullable', 'exists:users,id'],
            'auditor_firm' => ['nullable', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'risk_level' => ['required', Rule::in(self::RISK_LEVELS)],
            'status' => ['required', Rule::in(self::AUDIT_STATUSES)],
            'scheduled_on' => ['required', 'date'],
            'completed_on' => ['nullable', 'date', 'after_or_equal:scheduled_on'],
            'findings' => ['nullable', 'string', 'max:20000'],
        ]);
    }

    private function riskRules(Request $request): array
    {
        return $request->validate([
            'owner_id' => ['nullable', 'exists:users,id'],
            'matter_id' => ['nullable', 'exists:matters,id'],
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'likelihood' => ['required', 'integer', 'min:1', 'max:5'],
            'impact' => ['required', 'integer', 'min:1', 'max:5'],
            'identified_on' => ['nullable', 'date'],
            'status' => ['required', Rule::in(RiskAssessment::STATUSES)],
            'mitigation' => ['nullable', 'string', 'max:5000'],
            'review_on' => ['nullable', 'date'],
        ]);
    }
}
