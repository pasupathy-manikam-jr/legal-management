<?php

namespace App\Http\Controllers;

use App\Models\Hearing;
use App\Models\MatterEvent;
use App\Models\Setting;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CalendarController extends Controller
{
    /** How long a window each view shows, and how far the arrows step. */
    private const VIEWS = ['month', 'week', 'day'];

    public function __invoke(Request $request)
    {
        $request->validate([
            'view' => ['nullable', Rule::in(self::VIEWS)],
            'date' => ['nullable', 'date'],
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $view = $request->input('view', 'month');

        $cursor = match (true) {
            $request->filled('date') => Carbon::parse($request->string('date')->toString()),
            $request->filled('month') => Carbon::createFromFormat('Y-m', $request->string('month')->toString())->startOfMonth(),
            default => now(),
        };

        // The firm chooses which day its week starts on, in System Settings.
        $weekStart = Setting::get('calendar_start_day') === 'sunday' ? Carbon::SUNDAY : Carbon::MONDAY;

        [$from, $to, $label, $step] = match ($view) {
            'day' => [$cursor->copy()->startOfDay(), $cursor->copy()->endOfDay(), $cursor->format('l, j F Y'), 'day'],
            'week' => [
                $cursor->copy()->startOfWeek($weekStart),
                $cursor->copy()->startOfWeek($weekStart)->addDays(6)->endOfDay(),
                $cursor->copy()->startOfWeek($weekStart)->format('j M').' – '.$cursor->copy()->startOfWeek($weekStart)->addDays(6)->format('j M Y'),
                'week',
            ],
            // A month grid shows whole weeks, so it spills into the neighbouring months.
            default => [
                $cursor->copy()->startOfMonth()->startOfWeek($weekStart),
                $cursor->copy()->endOfMonth()->endOfWeek($weekStart),
                $cursor->format('F Y'),
                'month',
            ],
        };

        $hearings = Hearing::with('matter', 'court')
            ->whereBetween('scheduled_at', [$from, $to])
            ->get()
            ->map(fn (Hearing $h) => [
                'id' => "hearing-{$h->id}",
                'kind' => 'hearing',
                'date' => $h->scheduled_at->toDateString(),
                'time' => $h->scheduled_at->format('H:i'),
                'title' => $h->title ?? $h->type ?? 'Hearing',
                'detail' => $h->matter?->reference ?? $h->court?->name,
                'status' => $h->status,
                'url' => $h->matter ? "/matters/{$h->matter_id}" : '/hearings',
            ]);

        $tasks = Task::with('matter')
            ->whereNotNull('due_on')
            ->whereBetween('due_on', [$from->copy()->startOfDay(), $to])
            ->get()
            ->map(fn (Task $t) => [
                'id' => "task-{$t->id}",
                'kind' => 'task',
                'date' => $t->due_on->toDateString(),
                'time' => null,
                'title' => $t->title,
                'detail' => $t->matter?->reference,
                'status' => $t->completed_at ? 'completed' : $t->priority,
                'url' => '/tasks',
            ]);

        $events = MatterEvent::with('matter')
            ->whereBetween('occurred_at', [$from, $to])
            ->get()
            ->map(fn (MatterEvent $e) => [
                'id' => "event-{$e->id}",
                'kind' => 'event',
                'date' => $e->occurred_at->toDateString(),
                'time' => $e->occurred_at->format('H:i'),
                'title' => $e->title,
                'detail' => $e->matter?->reference,
                'status' => $e->kind,
                'url' => "/matters/{$e->matter_id}",
            ]);

        $today = now()->toDateString();
        $days = collect();
        for ($day = $from->copy()->startOfDay(); $day->lte($to); $day->addDay()) {
            $days->push([
                'date' => $day->toDateString(),
                'day' => $day->day,
                'weekday' => $day->format('D'),
                'inMonth' => $view !== 'month' || $day->month === $cursor->month,
                'isToday' => $day->toDateString() === $today,
            ]);
        }

        return Inertia::render('calendar/index', [
            'view' => $view,
            'label' => $label,
            'days' => $days,
            'today' => $today,
            'weekdays' => collect(range(0, 6))->map(fn (int $i) => $from->copy()->startOfDay()->addDays($i)->format('D')),
            'nav' => [
                'previous' => $cursor->copy()->sub($step, 1)->toDateString(),
                'next' => $cursor->copy()->add($step, 1)->toDateString(),
                'today' => $today,
            ],
            'events' => $hearings->concat($tasks)->concat($events)->sortBy(['date', 'time'])->values(),
            'summary' => [
                'hearings' => Hearing::whereBetween('scheduled_at', [$cursor->copy()->startOfMonth(), $cursor->copy()->endOfMonth()])->count(),
                'tasks' => Task::whereBetween('due_on', [$cursor->copy()->startOfMonth(), $cursor->copy()->endOfMonth()])->count(),
                'events' => MatterEvent::whereBetween('occurred_at', [$cursor->copy()->startOfMonth(), $cursor->copy()->endOfMonth()])->count(),
            ],
            'upcoming' => Hearing::with('matter.client', 'court')
                ->where('scheduled_at', '>=', now())
                ->whereIn('status', ['scheduled', 'in_progress'])
                ->orderBy('scheduled_at')
                ->limit(5)
                ->get(),
        ]);
    }

    /**
     * Hearings as an iCalendar feed, for Google Calendar's "add by URL" subscription.
     * The secret token in the URL is the credential, which is how calendar feeds work;
     * regenerating it in System Settings revokes every existing subscription.
     */
    public function feed(string $token): Response
    {
        $expected = Setting::get('calendar_feed_token');

        abort_if(blank($expected) || ! hash_equals($expected, $token), 404);
        abort_unless(Setting::get('google_calendar_enabled') === '1', 404);

        $lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Advocate//Hearings//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];

        foreach (Hearing::with('matter', 'court')->orderBy('scheduled_at')->get() as $hearing) {
            $start = $hearing->scheduled_at->utc();
            $summary = trim(($hearing->matter?->reference ? $hearing->matter->reference.' — ' : '').($hearing->title ?? $hearing->type ?? 'Hearing'));

            $lines = array_merge($lines, [
                'BEGIN:VEVENT',
                'UID:hearing-'.$hearing->id.'@advocate',
                'DTSTAMP:'.now()->utc()->format('Ymd\THis\Z'),
                'DTSTART:'.$start->format('Ymd\THis\Z'),
                'DTEND:'.$start->copy()->addMinutes($hearing->duration_minutes ?: 60)->format('Ymd\THis\Z'),
                'SUMMARY:'.$this->escapeIcs($summary),
                'DESCRIPTION:'.$this->escapeIcs(trim(($hearing->matter?->title ?? '').($hearing->judge ? ' | Judge: '.$hearing->judge : ''))),
                'LOCATION:'.$this->escapeIcs($hearing->court?->name ?? ''),
                'STATUS:'.($hearing->status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'),
                'END:VEVENT',
            ]);
        }

        $lines[] = 'END:VCALENDAR';

        return response(implode("\r\n", $lines)."\r\n", 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'inline; filename="hearings.ics"',
        ]);
    }

    /** RFC 5545 text escaping: backslash, semicolon, comma and newlines. */
    private function escapeIcs(string $value): string
    {
        return str_replace(['\\', ';', ',', "\r\n", "\n"], ['\\\\', '\\;', '\\,', '\\n', '\\n'], $value);
    }
}
