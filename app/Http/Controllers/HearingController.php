<?php

namespace App\Http\Controllers;

use App\Models\Court;
use App\Models\Hearing;
use App\Models\Matter;
use App\Models\Taxonomy;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class HearingController extends Controller
{
    private const STATUSES = ['scheduled', 'in_progress', 'completed', 'postponed', 'cancelled'];

    public function index(Request $request)
    {
        $request->validate([
            'date' => ['nullable', 'date'],
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $date = $request->filled('date') ? Carbon::parse($request->string('date')->toString()) : now();
        $date = $date->startOfDay();

        $month = $request->filled('month')
            ? Carbon::createFromFormat('Y-m', $request->string('month')->toString())->startOfMonth()
            : $date->copy()->startOfMonth();

        $filters = $request->only('search', 'court_id', 'status');

        // The day's diary, narrowed by the filter bar.
        $forDay = Hearing::with('matter.client', 'matter.leadLawyer', 'court')
            ->whereDate('scheduled_at', $date)
            ->when($filters['court_id'] ?? null, fn ($q, $v) => $q->where('court_id', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%$s%")
                ->orWhere('type', 'like', "%$s%")
                ->orWhere('judge', 'like', "%$s%")
                ->orWhereHas('matter', fn ($m) => $m->where('title', 'like', "%$s%")->orWhere('reference', 'like', "%$s%"))))
            ->orderBy('scheduled_at')
            ->get();

        // Tab counts ignore the status filter, so the tabs always show the full day.
        $dayCounts = Hearing::whereDate('scheduled_at', $date)
            ->when($filters['court_id'] ?? null, fn ($q, $v) => $q->where('court_id', $v))
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return Inertia::render('hearings/index', [
            'date' => $date->toDateString(),
            'isToday' => $date->isToday(),
            'month' => $month->format('Y-m'),
            'monthLabel' => $month->format('F Y'),
            'gridStart' => $month->copy()->startOfMonth()->startOfWeek(Carbon::SUNDAY)->toDateString(),
            'prevMonth' => $month->copy()->subMonth()->format('Y-m'),
            'nextMonth' => $month->copy()->addMonth()->format('Y-m'),
            'today' => now()->toDateString(),
            // Days in this month that have at least one hearing, for the calendar dots.
            'markedDays' => Hearing::whereBetween('scheduled_at', [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()])
                ->get()
                ->map(fn ($h) => $h->scheduled_at->toDateString())
                ->unique()
                ->values(),
            'hearings' => $forDay->map(fn ($h) => [
                'id' => $h->id,
                'title' => $h->title ?? 'Hearing',
                'type' => $h->type,
                'status' => $h->status,
                'time' => $h->scheduled_at->format('H:i'),
                'duration' => $h->duration_minutes,
                'judge' => $h->judge,
                'court' => $h->court?->name,
                'matter_id' => $h->matter_id,
                'matter' => $h->matter ? "{$h->matter->reference} - {$h->matter->title}" : null,
                'lead' => $h->matter?->leadLawyer?->name,
            ]),
            'filters' => $filters,
            'counts' => [
                'all' => (int) $dayCounts->sum(),
                ...collect(self::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) ($dayCounts[$s] ?? 0)])->all(),
            ],
            'options' => [
                'matters' => Matter::with('client')->where('status', '!=', 'closed')->orderBy('reference')->get()
                    ->map(fn ($m) => ['id' => $m->id, 'label' => "{$m->reference} — {$m->title}"]),
                'courts' => Court::where('active', true)->orderBy('name')->get(['id', 'name']),
                'statuses' => self::STATUSES,
                'types' => Taxonomy::names('hearing_type') ?: ['first hearing', 'arguments', 'judgement'],
            ],
        ]);
    }

    public function store(Request $request)
    {
        Hearing::create($this->validated($request));

        return back()->with('success', 'Hearing scheduled.');
    }

    public function update(Request $request, Hearing $hearing)
    {
        $hearing->update($this->validated($request));

        return back()->with('success', 'Hearing updated.');
    }

    public function destroy(Hearing $hearing)
    {
        $hearing->delete();

        return back()->with('success', 'Hearing deleted.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'matter_id' => ['required', 'exists:matters,id'],
            'court_id' => ['nullable', 'exists:courts,id'],
            'title' => ['required', 'string', 'max:255'],
            'scheduled_at' => ['required', 'date'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:1440'],
            'type' => ['nullable', 'string', 'max:100'],
            'status' => ['required', 'in:'.implode(',', self::STATUSES)],
            'judge' => ['nullable', 'string', 'max:255'],
            'outcome' => ['nullable', 'string', 'max:5000'],
        ]);
    }
}
