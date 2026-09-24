<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Matter;
use App\Models\Payment;
use App\Models\Task;
use App\Models\TimeEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    public function __invoke(Request $request)
    {
        $request->validate(['year' => ['nullable', 'integer', 'min:2000', 'max:2100']]);

        $year = (int) ($request->input('year') ?: now()->year);

        $matters = Matter::all();
        $closed = $matters->where('status', 'closed');

        // Average days from opening to closing, over cases that actually closed.
        $resolutionDays = $closed
            ->filter(fn (Matter $m) => $m->closed_on && $m->opened_on)
            ->map(fn (Matter $m) => $m->opened_on->diffInDays($m->closed_on));

        $live = Invoice::where('status', '!=', 'void')->get();
        $invoiced = (int) $live->sum(fn (Invoice $i) => $i->totalCents());
        $collected = (int) $live->sum('paid_cents');

        return Inertia::render('analytics/index', [
            'year' => $year,
            'years' => $this->years(),
            'metrics' => [
                'closureRate' => $matters->count() ? round($closed->count() / $matters->count() * 100, 1) : 0,
                'avgResolutionDays' => $resolutionDays->count() ? (int) round($resolutionDays->avg()) : null,
                'collectionRate' => $invoiced ? round($collected / $invoiced * 100, 1) : 0,
                'billableHours' => round((int) TimeEntry::where('billable', true)->sum('minutes') / 60),
                'outstandingCents' => $invoiced - $collected,
            ],
            'revenueByMonth' => $this->byMonth(
                Payment::whereYear('paid_on', $year)->get(),
                fn (Payment $p) => $p->paid_on->month,
                fn (Collection $rows) => (int) $rows->sum('amount_cents'),
            ),
            'casesByMonth' => $this->seriesByMonth(
                Matter::whereYear('opened_on', $year)->get(),
                fn (Matter $m) => $m->opened_on->month,
                ['high', 'medium', 'low'],
                fn (Matter $m) => $m->priority,
            ),
            'tasksByMonth' => $this->seriesByMonth(
                Task::whereYear('created_at', $year)->get(),
                fn (Task $t) => $t->created_at->month,
                Task::PRIORITIES,
                fn (Task $t) => $t->priority,
            ),
            'recentCases' => Matter::with('client')->latest('opened_on')->limit(5)->get()
                ->map(fn (Matter $m) => [
                    'id' => $m->id,
                    'title' => $m->title,
                    'client' => $m->client?->name,
                    'status' => $m->status,
                ]),
            'overdueInvoices' => $live
                ->filter(fn (Invoice $i) => $i->balanceCents() > 0 && $i->due_on->isPast())
                ->sortBy('due_on')
                ->take(5)
                ->map(fn (Invoice $i) => [
                    'id' => $i->id,
                    'number' => $i->number,
                    'client' => $i->client?->name,
                    'balance_cents' => $i->balanceCents(),
                ])
                ->values(),
        ]);
    }

    /** Years that actually hold data, newest first, always including this one. */
    private function years(): array
    {
        return collect([now()->year])
            ->merge(Payment::pluck('paid_on')->map(fn ($d) => (int) $d->format('Y')))
            ->merge(Matter::pluck('opened_on')->map(fn ($d) => (int) $d->format('Y')))
            ->unique()
            ->sortDesc()
            ->values()
            ->all();
    }

    /**
     * One value per calendar month, zero-filled so the chart never skips a month.
     *
     * @return array<int, array{label: string, value: int}>
     */
    private function byMonth(Collection $records, callable $monthOf, callable $reduce): array
    {
        $grouped = $records->groupBy($monthOf);

        return collect(range(1, 12))
            ->map(fn (int $month) => [
                'label' => date('M', mktime(0, 0, 0, $month, 1)),
                'value' => $reduce($grouped[$month] ?? collect()),
            ])
            ->all();
    }

    /**
     * A month-by-month count for each key, shaped for the grouped charts.
     *
     * @param  list<string>  $keys
     * @return array<int, array<string, mixed>>
     */
    private function seriesByMonth(Collection $records, callable $monthOf, array $keys, callable $keyOf): array
    {
        $grouped = $records->groupBy($monthOf);

        return collect(range(1, 12))
            ->map(function (int $month) use ($grouped, $keys, $keyOf) {
                $rows = $grouped[$month] ?? collect();

                return ['label' => date('M', mktime(0, 0, 0, $month, 1))]
                    + collect($keys)->mapWithKeys(fn (string $k) => [$k => $rows->filter(fn ($r) => $keyOf($r) === $k)->count()])->all();
            })
            ->all();
    }
}
