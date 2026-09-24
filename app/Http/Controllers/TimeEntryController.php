<?php

namespace App\Http\Controllers;

use App\Models\Matter;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TimeEntryController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->only('matter_id', 'billable', 'user', 'date');

        $query = TimeEntry::with('matter.client', 'user', 'invoice')
            ->when($filters['matter_id'] ?? null, fn ($q, $v) => $q->where('matter_id', $v))
            ->when(($filters['billable'] ?? null) === 'unbilled', fn ($q) => $q->where('billable', true)->whereNull('invoice_id'))
            ->when($filters['user'] ?? null, fn ($q, $v) => $q->where('user_id', $v))
            ->when($filters['date'] ?? null, fn ($q, $v) => $q->whereDate('worked_on', $v))
            ->latest('worked_on');

        $entries = $query->paginate(20)->withQueryString();
        $entries->getCollection()->transform(fn ($e) => tap($e)->setAttribute('amount_cents', $e->amountCents()));

        return Inertia::render('time-entries/index', [
            'entries' => $entries,
            'filters' => $filters,
            'totals' => [
                'minutesThisMonth' => (int) TimeEntry::whereMonth('worked_on', now()->month)
                    ->whereYear('worked_on', now()->year)->sum('minutes'),
                'unbilledCents' => (int) TimeEntry::where('billable', true)->whereNull('invoice_id')
                    ->get()->sum(fn ($e) => $e->amountCents()),
            ],
            'options' => [
                'matters' => Matter::with('client')->orderBy('reference')->get()
                    ->map(fn ($m) => [
                        'id' => $m->id,
                        'label' => "{$m->reference} — {$m->title}",
                        'rate' => $m->hourly_rate_cents / 100,
                    ]),
                'users' => User::orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }

    public function store(Request $request)
    {
        TimeEntry::create($this->validated($request));

        return back()->with('success', 'Time logged.');
    }

    public function update(Request $request, TimeEntry $timeEntry)
    {
        // An entry already on an invoice is frozen — editing it would silently change a billed total.
        if ($timeEntry->invoice_id) {
            return back()->withErrors(['minutes' => 'This entry is already invoiced. Void the invoice first.']);
        }

        $timeEntry->update($this->validated($request));

        return back()->with('success', 'Entry updated.');
    }

    public function destroy(TimeEntry $timeEntry)
    {
        if ($timeEntry->invoice_id) {
            return back()->withErrors(['minutes' => 'This entry is already invoiced. Void the invoice first.']);
        }

        $timeEntry->delete();

        return back()->with('success', 'Entry deleted.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'matter_id' => ['required', 'exists:matters,id'],
            'user_id' => ['required', 'exists:users,id'],
            'worked_on' => ['required', 'date'],
            'minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'rate' => ['required', 'numeric', 'min:0', 'max:100000'],
            'billable' => ['required', 'boolean'],
            'description' => ['required', 'string', 'max:500'],
        ]);

        $data['rate_cents'] = (int) round($data['rate'] * 100);
        unset($data['rate']);

        return $data;
    }
}
