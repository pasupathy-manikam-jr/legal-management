<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Expense;
use App\Models\Hearing;
use App\Models\Invoice;
use App\Models\Matter;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Task;
use App\Models\TimeEntry;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $request->validate(['year' => ['nullable', 'integer', 'min:2000', 'max:2100']]);
        $year = (int) ($request->input('year') ?: now()->year);

        $today = now()->startOfDay();
        $activeCases = Matter::where('status', '!=', 'closed')->count();

        $invoicedCents = (int) Invoice::where('status', '!=', 'void')->get()->sum(fn ($i) => $i->totalCents());
        $collectedCents = (int) Invoice::where('status', '!=', 'void')->sum('paid_cents');

        return Inertia::render('dashboard', [
            'firm' => [
                'name' => Setting::get('firm_name'),
                'greeting' => $this->greeting(),
            ],
            'stats' => [
                'activeCases' => $activeCases,
                'totalCases' => Matter::count(),
                'activeClients' => Client::whereHas('matters', fn ($q) => $q->where('status', '!=', 'closed'))->count(),
                'clientGrowth' => $this->clientGrowth(),
                'revenueCents' => (int) Payment::sum('amount_cents'),
                'pendingTasks' => Task::whereNull('completed_at')->count(),
                'hearingsDue' => Hearing::where('scheduled_at', '>=', $today)->whereIn('status', ['scheduled', 'in_progress'])->count(),
            ],
            'today' => [
                'timesheets' => TimeEntry::with('matter', 'user')
                    ->whereDate('worked_on', $today)
                    ->orderByDesc('id')
                    ->limit(8)
                    ->get()
                    ->map(fn ($e) => [
                        'id' => $e->id,
                        'title' => $e->description,
                        'meta' => trim(($e->matter?->title ?? 'No case').' • '.($e->user?->name ?? '—')),
                        'minutes' => $e->minutes,
                        'billable' => $e->billable,
                        'amount_cents' => $e->billable ? $e->amountCents() : null,
                    ]),
                'timesheetMinutes' => (int) TimeEntry::whereDate('worked_on', $today)->sum('minutes'),
                'expenses' => Expense::with('matter')
                    ->whereDate('incurred_on', $today)
                    ->orderByDesc('id')
                    ->limit(8)
                    ->get()
                    ->map(fn ($x) => [
                        'id' => $x->id,
                        'title' => $x->description,
                        'meta' => trim(ucfirst($x->category ?? 'Uncategorised').' • '.($x->matter?->title ?? 'No case')),
                        'amount_cents' => $x->amount_cents,
                        'status' => $x->status,
                    ]),
                'expenseCents' => (int) Expense::whereDate('incurred_on', $today)->sum('amount_cents'),
            ],
            'revenue' => [
                'year' => $year,
                // Derived in PHP: YEAR() is MySQL-only and the test suite runs on SQLite.
                'years' => Payment::pluck('paid_on')
                    ->map(fn ($d) => (int) $d->format('Y'))
                    ->push(now()->year)
                    ->unique()
                    ->sortDesc()
                    ->values(),
                'series' => $this->revenueSeries($year),
                'totalCents' => (int) Payment::whereYear('paid_on', $year)->sum('amount_cents'),
            ],
            'upcomingHearings' => Hearing::with('matter.client', 'court')
                ->where('scheduled_at', '>=', $today)
                ->whereIn('status', ['scheduled', 'in_progress'])
                ->orderBy('scheduled_at')
                ->limit(6)
                ->get()
                ->map(fn ($h) => [
                    'id' => $h->id,
                    'matter_id' => $h->matter_id,
                    'title' => $h->matter?->title ?? 'Hearing',
                    'court' => $h->court?->name ?? '—',
                    'type' => $h->type ?? 'Hearing',
                    'scheduled_at' => $h->scheduled_at->toIso8601String(),
                ]),
            'recentTasks' => Task::with('matter', 'assignee')
                ->orderByRaw('completed_at is not null, due_on is null, due_on')
                ->limit(5)
                ->get()
                ->map(fn ($t) => [
                    'id' => $t->id,
                    'title' => $t->title,
                    'meta' => trim(($t->matter?->title ?? 'No case').' • '.($t->assignee?->name ?? 'Unassigned').' • '.($t->due_on?->toDateString() ?? 'no due date')),
                    'priority' => $t->priority,
                    'state' => $t->completed_at ? 'completed' : (($t->due_on && $t->due_on->isPast()) ? 'overdue' : 'open'),
                ]),
            'tasksByPriority' => $this->tasksByPriority(),
            'collections' => [
                'invoicedCents' => $invoicedCents,
                'collectedCents' => $collectedCents,
                'outstandingCents' => $invoicedCents - $collectedCents,
                'overdueCents' => (int) Invoice::whereIn('status', ['sent', 'draft'])
                    ->whereDate('due_on', '<', $today)
                    ->get()
                    ->sum(fn ($i) => $i->balanceCents()),
                'rate' => $invoicedCents ? (int) round($collectedCents / $invoicedCents * 100) : 0,
                'unbilledTimeCents' => (int) TimeEntry::where('billable', true)->whereNull('invoice_id')
                    ->get()->sum(fn ($e) => $e->amountCents()),
                'unbilledExpenseCents' => (int) Expense::where('billable', true)->whereNull('invoice_id')
                    ->where('status', 'approved')->sum('amount_cents'),
            ],
        ]);
    }

    private function greeting(): string
    {
        $hour = (int) now()->format('G');

        return match (true) {
            $hour < 12 => 'Good Morning',
            $hour < 17 => 'Good Afternoon',
            default => 'Good Evening',
        };
    }

    /** Percentage change in clients gaining their first matter, this month against last. */
    private function clientGrowth(): int
    {
        $thisMonth = Client::whereHas('matters', fn ($q) => $q->whereMonth('opened_on', now()->month)->whereYear('opened_on', now()->year))->count();
        $lastMonth = Client::whereHas('matters', fn ($q) => $q->whereMonth('opened_on', now()->subMonth()->month)->whereYear('opened_on', now()->subMonth()->year))->count();

        if ($lastMonth === 0) {
            return $thisMonth > 0 ? 100 : 0;
        }

        return (int) round(($thisMonth - $lastMonth) / $lastMonth * 100);
    }

    /** @return array<int, array{label: string, value: int}> Twelve zero-filled months. */
    private function revenueSeries(int $year): array
    {
        $byMonth = Payment::whereYear('paid_on', $year)
            ->get()
            ->groupBy(fn ($p) => (int) $p->paid_on->format('n'))
            ->map(fn ($group) => (int) $group->sum('amount_cents'));

        return collect(range(1, 12))
            ->map(fn ($month) => [
                'label' => date('M', mktime(0, 0, 0, $month, 1)),
                'value' => $byMonth[$month] ?? 0,
            ])
            ->all();
    }

    /** @return array<int, array{key: string, label: string, total: int, percent: int}> */
    private function tasksByPriority(): array
    {
        $counts = Task::selectRaw('priority, count(*) as total')->groupBy('priority')->pluck('total', 'priority');
        $all = max((int) $counts->sum(), 1);

        return collect(['critical' => 'Critical', 'high' => 'High Priority', 'medium' => 'Medium Priority', 'low' => 'Low Priority'])
            ->map(fn ($label, $key) => [
                'key' => $key,
                'label' => $label,
                'total' => (int) ($counts[$key] ?? 0),
                'percent' => (int) round(($counts[$key] ?? 0) / $all * 100),
            ])
            ->values()
            ->all();
    }
}
