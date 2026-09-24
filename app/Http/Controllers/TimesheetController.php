<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;

/**
 * A week of logged time, one row per team member and one column per day.
 * The detailed entries behind each cell live on the Time Entries screen.
 */
class TimesheetController extends Controller
{
    public function __invoke(Request $request)
    {
        $request->validate([
            'week' => ['nullable', 'date'],
            'member' => ['nullable', 'exists:users,id'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $perPage = (int) ($request->input('per_page') ?: 10);
        $member = $request->input('member');

        // The firm decides whether its week starts on Sunday, in System Settings.
        $anchor = $request->filled('week') ? Carbon::parse($request->input('week')) : now();
        $start = $anchor->copy()->startOfWeek(Setting::get('calendar_start_day') === 'sunday' ? Carbon::SUNDAY : Carbon::MONDAY);
        $days = collect(range(0, 6))->map(fn (int $i) => $start->copy()->addDays($i));
        $end = $days->last();

        $members = User::query()
            ->when($member, fn ($q, $v) => $q->whereKey($v))
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        $entries = TimeEntry::whereBetween('worked_on', [$start->toDateString(), $end->toDateString()])
            ->whereIn('user_id', $members->getCollection()->modelKeys())
            ->get(['user_id', 'worked_on', 'minutes', 'invoice_id']);

        $rows = $members->getCollection()->map(function (User $user) use ($entries, $days) {
            $mine = $entries->where('user_id', $user->id);

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'minutes' => (int) $mine->sum('minutes'),
                'cells' => $this->cellsFor($mine, $days),
            ];
        });

        $week = TimeEntry::whereBetween('worked_on', [$start->toDateString(), $end->toDateString()])
            ->when($member, fn ($q, $v) => $q->where('user_id', $v))
            ->selectRaw('count(*) as entries, coalesce(sum(minutes), 0) as minutes')
            ->first();

        return Inertia::render('timesheet/index', [
            'rows' => $rows,
            'paginator' => $members->toArray(),
            'days' => $days->map(fn (Carbon $d) => [
                'date' => $d->toDateString(),
                'weekday' => $d->format('D'),
                'day' => $d->day,
                'isToday' => $d->isToday(),
            ]),
            'period' => [
                'label' => $start->isSameMonth($end) ? $start->format('F Y') : $start->format('M').' – '.$end->format('M Y'),
                'previous' => $start->copy()->subWeek()->toDateString(),
                'next' => $start->copy()->addWeek()->toDateString(),
                'current' => $start->toDateString(),
            ],
            'totals' => [
                'minutes' => (int) $week->minutes,
                'entries' => (int) $week->entries,
                'members' => $members->total(),
            ],
            'filters' => ['member' => $member, 'week' => $start->toDateString()],
            'perPage' => $perPage,
            'options' => ['users' => User::orderBy('name')->get(['id', 'name'])],
        ]);
    }

    /**
     * One cell per day. "Billed" means every entry that day is already on an
     * invoice, "mixed" that only some are — the firm has no separate approval step.
     *
     * @param  Collection<int, TimeEntry>  $entries
     * @param  Collection<int, Carbon>  $days
     * @return Collection<int, array{date: string, minutes: int, entries: int, state: string}>
     */
    private function cellsFor(Collection $entries, Collection $days): Collection
    {
        $today = now()->toDateString();

        return $days->map(function (Carbon $day) use ($entries, $today) {
            $ofDay = $entries->filter(fn (TimeEntry $e) => $e->worked_on->toDateString() === $day->toDateString());
            $billed = $ofDay->whereNotNull('invoice_id')->count();

            return [
                'date' => $day->toDateString(),
                'minutes' => (int) $ofDay->sum('minutes'),
                'entries' => $ofDay->count(),
                'state' => match (true) {
                    $ofDay->isEmpty() && $day->toDateString() > $today => 'future',
                    $ofDay->isEmpty() => 'empty',
                    $billed === $ofDay->count() => 'billed',
                    $billed === 0 => 'unbilled',
                    default => 'mixed',
                },
            ];
        })->values();
    }
}
