<?php

namespace App\Http\Controllers;

use App\Models\ProfessionalLicense;
use App\Models\RegulatoryBody;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Who in the firm is licensed to practise, where, and until when.
 */
class ProfessionalLicenseController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'state' => ['nullable', Rule::in(ProfessionalLicense::STATES)],
            'holder' => ['nullable', 'exists:users,id'],
            'per_page' => ['nullable', 'integer', 'in:12,24,48,96'],
        ]);

        $filters = $request->only('search', 'state', 'holder');
        $perPage = (int) ($request->input('per_page') ?: 12);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => ProfessionalLicense::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('type', 'like', "%$v%")
                ->orWhere('number', 'like', "%$v%")
                ->orWhere('jurisdiction', 'like', "%$v%")))
            ->when($filters['holder'] ?? null, fn ($q, $v) => $q->where('user_id', $v));

        // Expiry is a date, not a status, so each state is its own condition.
        $states = [
            'active' => fn ($q) => $q->where('status', 'active')
                ->where(fn ($w) => $w->whereNull('expires_on')->orWhereDate('expires_on', '>=', today())),
            'expired' => fn ($q) => $q->where('status', 'active')->whereDate('expires_on', '<', today()),
            'suspended' => fn ($q) => $q->where('status', 'suspended'),
            'revoked' => fn ($q) => $q->where('status', 'revoked'),
        ];

        $counts = ['all' => $matching()->count()];

        foreach ($states as $state => $condition) {
            $counts[$state] = $matching()->where($condition)->count();
        }

        return Inertia::render('compliance/licenses', [
            'licenses' => $matching()
                ->when($filters['state'] ?? null, fn ($q, $v) => $q->where($states[$v]))
                ->with('holder:id,name', 'body:id,name,short_name')
                ->orderByRaw('expires_on is null, expires_on')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (ProfessionalLicense $l) => [
                    'id' => $l->id,
                    'type' => $l->type,
                    'number' => $l->number,
                    'jurisdiction' => $l->jurisdiction,
                    'issued_on' => $l->issued_on?->toDateString(),
                    'expires_on' => $l->expires_on?->toDateString(),
                    'days_to_expiry' => $l->daysToExpiry(),
                    'status' => $l->status,
                    'state' => $l->state(),
                    'notes' => $l->notes,
                    'user_id' => $l->user_id,
                    'holder' => $l->holder?->name,
                    'regulatory_body_id' => $l->regulatory_body_id,
                    'body' => $l->body?->name,
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => $counts,
            'renewalWindow' => ProfessionalLicense::RENEWAL_WINDOW_DAYS,
            'options' => [
                'users' => User::where('active', true)->orderBy('name')->get(['id', 'name']),
                'bodies' => RegulatoryBody::where('active', true)->orderBy('name')->get(['id', 'name']),
                'statuses' => ProfessionalLicense::STATUSES,
                'types' => ProfessionalLicense::query()->distinct()->orderBy('type')->pluck('type'),
            ],
        ]);
    }

    /**
     * The refresh button on a card: roll the licence forward by the term it
     * was granted for, from whichever is later — today or the old expiry.
     */
    public function renew(ProfessionalLicense $license)
    {
        if (! $license->issued_on || ! $license->expires_on) {
            return back()->with('error', 'Record an issue and expiry date before renewing.');
        }

        $months = max(1, (int) $license->issued_on->diffInMonths($license->expires_on));
        $from = $license->expires_on->isPast() ? today() : $license->expires_on;

        $license->update([
            'issued_on' => $from,
            'expires_on' => $from->copy()->addMonths($months),
            'status' => 'active',
        ]);

        return back()->with('success', "{$license->type} renewed for another {$months} months.");
    }

    public function store(Request $request)
    {
        ProfessionalLicense::create($this->validated($request));

        return back()->with('success', 'Licence recorded.');
    }

    public function update(Request $request, ProfessionalLicense $license)
    {
        $license->update($this->validated($request));

        return back()->with('success', 'Licence updated.');
    }

    public function destroy(ProfessionalLicense $license)
    {
        $license->delete();

        return back()->with('success', 'Licence removed.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'user_id' => ['nullable', 'exists:users,id'],
            'regulatory_body_id' => ['nullable', 'exists:regulatory_bodies,id'],
            'type' => ['required', 'string', 'max:120'],
            'number' => ['nullable', 'string', 'max:60'],
            'jurisdiction' => ['nullable', 'string', 'max:120'],
            'issued_on' => ['nullable', 'date'],
            'expires_on' => ['nullable', 'date', 'after_or_equal:issued_on'],
            'status' => ['required', Rule::in(ProfessionalLicense::STATUSES)],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);
    }
}
