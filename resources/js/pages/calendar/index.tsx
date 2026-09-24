import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Hearing } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, ChevronLeft, ChevronRight, Clock, FileText } from 'lucide-react';
import type { ComponentType } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Calendar', href: '/calendar' }];

type Kind = 'hearing' | 'task' | 'event';

interface CalendarEvent {
    id: string;
    kind: Kind;
    date: string;
    time: string | null;
    title: string;
    detail: string | null;
    status: string;
    url: string;
}

interface Day {
    date: string;
    day: number;
    weekday: string;
    inMonth: boolean;
    isToday: boolean;
}

/** Each kind keeps one colour and icon everywhere it appears on the page. */
const KIND: Record<Kind, { color: string; icon: ComponentType<{ className?: string }> }> = {
    hearing: { color: '#ef4444', icon: Calendar },
    task: { color: '#f59e0b', icon: Clock },
    event: { color: '#8b5cf6', icon: FileText },
};

function tint(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.125)`,
        color: `rgb(${r}, ${g}, ${b})`,
        boxShadow: `inset 0 0 0 1px rgba(${r}, ${g}, ${b}, 0.2)`,
    };
}

export default function CalendarPage({
    view,
    label,
    days,
    weekdays,
    nav,
    events,
    summary,
    upcoming,
}: {
    view: 'month' | 'week' | 'day';
    label: string;
    days: Day[];
    weekdays: string[];
    nav: { previous: string; next: string; today: string };
    events: CalendarEvent[];
    summary: { hearings: number; tasks: number; events: number };
    upcoming: Hearing[];
}) {
    const go = (date: string, next = view) => router.get('/calendar', { view: next, date }, { preserveState: true, replace: true });
    const eventsOn = (date: string) => events.filter((e) => e.date === date);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Calendar" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div>
                    <h1 className="text-xl font-semibold">Calendar</h1>
                    <p className="text-muted-foreground text-xs">Manage your calendar and events.</p>
                </div>

                <div className="bg-card rounded-lg border p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-8" onClick={() => go(nav.previous)} aria-label="Previous">
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <Button variant="outline" size="sm" className="h-8" onClick={() => go(nav.next)} aria-label="Next">
                                    <ChevronRight className="size-4" />
                                </Button>
                                <Button variant="outline" size="sm" className="h-8" onClick={() => go(nav.today)}>
                                    Today
                                </Button>
                            </div>
                            <h2 className="text-xl font-semibold">{label}</h2>
                        </div>

                        <div className="flex items-center gap-2">
                            {(['month', 'week', 'day'] as const).map((v) => (
                                <Button
                                    key={v}
                                    variant={view === v ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-8 capitalize"
                                    onClick={() => go(days.find((d) => d.isToday)?.date ?? days[0].date, v)}
                                >
                                    {v}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 min-[1500px]:grid-cols-4">
                    <div className="min-[1500px]:col-span-3">
                        <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                            {view !== 'day' && (
                                <div className="grid grid-cols-7 border-b">
                                    {weekdays.map((w) => (
                                        <div key={w} className="bg-muted/50 text-muted-foreground p-3 text-center font-medium">
                                            {w}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className={cn(view === 'day' ? 'grid grid-cols-1' : 'grid grid-cols-7')}>
                                {days.map((d) => {
                                    const items = eventsOn(d.date);

                                    return (
                                        <div
                                            key={d.date}
                                            className={cn(
                                                'border-r border-b p-2 last:border-r-0',
                                                view === 'month' ? 'min-h-[140px]' : 'min-h-[320px]',
                                                d.inMonth ? 'bg-card' : 'bg-muted/40',
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'mb-1 text-sm font-medium',
                                                    d.isToday && 'flex size-6 items-center justify-center rounded-full bg-blue-500 text-white',
                                                    !d.inMonth && 'text-muted-foreground/60',
                                                )}
                                            >
                                                {view === 'day' ? `${d.weekday} ${d.day}` : d.day}
                                            </div>

                                            <div className="space-y-1">
                                                {items.map((e) => {
                                                    const { color, icon: Icon } = KIND[e.kind];

                                                    return (
                                                        <Link
                                                            key={e.id}
                                                            href={e.url}
                                                            className="block rounded p-1 text-xs transition-opacity hover:opacity-80"
                                                            style={tint(color)}
                                                        >
                                                            <div className="flex items-start gap-1">
                                                                <Icon className="mt-0.5 size-3 shrink-0" />
                                                                <span className="block truncate leading-tight">
                                                                    {e.time && <span className="mr-1 font-medium tabular-nums">{e.time}</span>}
                                                                    {e.title}
                                                                </span>
                                                            </div>
                                                            {e.detail && (
                                                                <div className="mt-0.5 block truncate text-xs leading-tight opacity-75">
                                                                    {e.detail}
                                                                </div>
                                                            )}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-card rounded-lg border shadow-sm">
                            <div className="p-6">
                                <h3 className="text-lg leading-none font-semibold tracking-tight">Upcoming Events</h3>
                            </div>
                            <div className="space-y-3 p-6 pt-0">
                                {upcoming.length === 0 && <p className="text-muted-foreground text-sm">No upcoming events</p>}
                                {upcoming.map((h) => (
                                    <Link key={h.id} href={h.matter ? `/matters/${h.matter_id}` : '/hearings'} className="block hover:underline">
                                        <p className="text-sm font-medium">{h.title ?? h.type ?? 'Hearing'}</p>
                                        <p className="text-muted-foreground text-xs">
                                            {dateTime(h.scheduled_at)}
                                            {h.court ? ` · ${h.court.name}` : ''}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="bg-card rounded-lg border shadow-sm">
                            <div className="p-6">
                                <h3 className="text-lg leading-none font-semibold tracking-tight">This Month</h3>
                            </div>
                            <div className="space-y-2 p-6 pt-0 text-sm">
                                <div className="flex justify-between">
                                    <span>Total Events</span>
                                    <span className="font-medium">{summary.hearings + summary.tasks + summary.events}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Hearings</span>
                                    <span className="font-medium">{summary.hearings}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tasks Due</span>
                                    <span className="font-medium">{summary.tasks}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Timeline Events</span>
                                    <span className="font-medium">{summary.events}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
