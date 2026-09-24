import { InitialsAvatar } from '@/components/avatar-stack';
import { DataTableFooter } from '@/components/data-table-footer';
import { Dropdown } from '@/components/dropdown';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated, User } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Blend, ChevronLeft, ChevronRight, CircleCheckBig, CircleDashed, Clock, FileText, Minus, Timer, Users } from 'lucide-react';
import type { ComponentType } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Time Sheet', href: '/billing/time-entries' }];

interface Cell {
    date: string;
    minutes: number;
    entries: number;
    state: 'billed' | 'unbilled' | 'mixed' | 'empty' | 'future';
}

interface Row {
    id: number;
    name: string;
    email: string;
    minutes: number;
    cells: Cell[];
}

interface Day {
    date: string;
    weekday: string;
    day: number;
    isToday: boolean;
}

/** What each day cell can say. Billed means every entry that day is on an invoice. */
const STATE: Record<Cell['state'], { label: string; icon: ComponentType<{ className?: string }>; tone: string }> = {
    unbilled: { label: 'Logged, not yet billed', icon: Timer, tone: 'text-blue-500' },
    billed: { label: 'Billed on an invoice', icon: CircleCheckBig, tone: 'text-emerald-500' },
    mixed: { label: 'Partly billed', icon: Blend, tone: 'text-amber-500' },
    empty: { label: 'No time logged', icon: CircleDashed, tone: 'text-muted-foreground' },
    future: { label: 'Future', icon: Minus, tone: 'text-muted-foreground' },
};

/** Whole-hour friendly: 90 minutes reads as 1.5h, 120 as 2h. */
function shortHours(minutes: number): string {
    return `${Number((minutes / 60).toFixed(2)).toString()}h`;
}

export default function Timesheet({
    rows,
    paginator,
    days,
    period,
    totals,
    filters,
    perPage,
    options,
}: {
    rows: Row[];
    paginator: Paginated<unknown>;
    days: Day[];
    period: { label: string; previous: string; next: string; current: string };
    totals: { minutes: number; entries: number; members: number };
    filters: { member: string | null; week: string };
    perPage: number;
    options: { users: User[] };
}) {
    function apply(patch: Record<string, string | number>) {
        router.get('/billing/time-entries', { week: filters.week, member: filters.member ?? '', per_page: perPage, ...patch }, { preserveState: true, replace: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Time Sheet" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Time Sheet</h1>
                        <p className="text-xs text-muted-foreground">Track weekly time entries per team member across cases.</p>
                    </div>
                    <Button asChild>
                        <Link href="/time-entries">Add Time Sheet</Link>
                    </Button>
                </div>

                <div className="flex flex-col flex-wrap justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm min-[896px]:flex-row min-[896px]:items-center">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => apply({ week: period.previous })}
                            className="rounded-md border p-1.5 transition-colors hover:bg-accent"
                            aria-label="Previous week"
                        >
                            <ChevronLeft className="size-4 text-muted-foreground" />
                        </button>
                        <h2 className="min-w-[140px] text-center text-base font-semibold">{period.label}</h2>
                        <button
                            type="button"
                            onClick={() => apply({ week: period.next })}
                            className="rounded-md border p-1.5 transition-colors hover:bg-accent"
                            aria-label="Next week"
                        >
                            <ChevronRight className="size-4 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-muted-foreground" htmlFor="member">
                            Team Member
                        </label>
                        <Dropdown value={filters.member ?? ''} onChange={(v) => apply({ member: v })} placeholder="All Members" options={options.users.map((u) => ({ value: u.id, label: u.name }))} className="h-10 w-full" />
                    </div>
                </div>

                <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {(Object.keys(STATE) as Cell['state'][]).map((key) => {
                                const { label, icon: Icon, tone } = STATE[key];

                                return (
                                    <span key={key} className="flex items-center gap-1.5">
                                        <Icon className={cn('size-4', tone)} />
                                        {label}
                                    </span>
                                );
                            })}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Stat icon={Clock} tone="bg-primary" label="Week Hours" value={shortHours(totals.minutes)} />
                            <Stat icon={FileText} tone="bg-blue-500" label="Week Entries" value={String(totals.entries)} />
                            <Stat icon={Users} tone="bg-emerald-500" label="Members" value={String(totals.members)} />
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    {/* Stacked cards on phones, where a seven-column grid cannot breathe. */}
                    <div className="divide-y md:hidden">
                        {rows.map((row) => (
                            <div key={row.id} className="space-y-3 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <InitialsAvatar name={row.name} />
                                        <div className="min-w-0">
                                            <p className="text-sm leading-tight font-semibold">{row.name}</p>
                                            <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">{row.email}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold tabular-nums text-primary">{shortHours(row.minutes)}</span>
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {row.cells.map((cell, i) => (
                                        <div key={cell.date} className="flex flex-col items-center gap-0.5">
                                            <span className={cn('text-[9px] font-semibold uppercase', days[i].isToday ? 'text-primary' : 'text-muted-foreground')}>
                                                {days[i].weekday.charAt(0)}
                                            </span>
                                            <span
                                                className={cn(
                                                    'flex size-5 items-center justify-center rounded-full text-[10px] leading-none font-bold',
                                                    days[i].isToday && 'bg-primary text-primary-foreground',
                                                )}
                                            >
                                                {days[i].day}
                                            </span>
                                            <DayCell cell={cell} member={row.id} today={days[i].isToday} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="sticky left-0 z-20 border-r bg-card px-4 py-3.5 text-left text-xs font-semibold tracking-wider text-muted-foreground">
                                        Team Member
                                    </th>
                                    {days.map((day) => (
                                        <th key={day.date} className="min-w-[100px] border-x px-2 py-3 text-center">
                                            <div className="mb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground">{day.weekday}</div>
                                            <div
                                                className={cn(
                                                    'mx-auto flex size-8 items-center justify-center rounded-full text-sm leading-none font-bold',
                                                    day.isToday && 'bg-primary text-primary-foreground shadow-sm',
                                                )}
                                            >
                                                {day.day}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="sticky right-0 z-20 w-[80px] min-w-[80px] border-l bg-card px-4 py-3.5 text-center text-xs font-semibold tracking-wider text-muted-foreground">
                                        Week
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                                            No team members to show.
                                        </td>
                                    </tr>
                                )}
                                {rows.map((row) => (
                                    <tr key={row.id} className="group transition-colors hover:bg-muted/40">
                                        <td className="sticky left-0 z-10 border-r bg-card px-4 py-3 transition-colors group-hover:bg-muted/40">
                                            <div className="flex items-center gap-3">
                                                <InitialsAvatar name={row.name} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm leading-tight font-semibold">{row.name}</p>
                                                    <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">{row.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {row.cells.map((cell, i) => (
                                            <td key={cell.date} className="border-x px-1 py-1 text-center">
                                                <DayCell cell={cell} member={row.id} today={days[i].isToday} />
                                            </td>
                                        ))}
                                        <td className="sticky right-0 z-10 w-[80px] min-w-[80px] border-l bg-card px-4 py-3 text-center transition-colors group-hover:bg-muted/40">
                                            <p className="text-sm font-bold tabular-nums text-primary">{shortHours(row.minutes)}</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <DataTableFooter
                        from={paginator.from}
                        to={paginator.to}
                        total={paginator.total}
                        links={paginator.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>
            </div>
        </AppLayout>
    );
}

function DayCell({ cell, member, today }: { cell: Cell; member: number; today: boolean }) {
    const { label, icon: Icon, tone } = STATE[cell.state];
    const shell = cn(
        'flex min-h-[64px] w-full flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 ring-1 ring-primary/30 transition-all duration-150',
        today && 'bg-primary/5',
    );

    if (cell.entries === 0) {
        return (
            <div className={shell} title={label}>
                <Icon className={cn('size-4 opacity-40', tone)} />
            </div>
        );
    }

    return (
        <Link
            href={`/time-entries?user=${member}&date=${cell.date}`}
            title={`${label} — ${cell.entries} ${cell.entries === 1 ? 'entry' : 'entries'}`}
            className={cn(shell, 'hover:bg-primary/5 active:scale-95')}
        >
            <Icon className={cn('size-4', tone)} />
            <span className="text-[11px] leading-none font-semibold tabular-nums">{shortHours(cell.minutes)}</span>
            {cell.entries > 1 && <span className="text-[9px] leading-none text-muted-foreground">{cell.entries} entries</span>}
        </Link>
    );
}

function Stat({ icon: Icon, tone, label, value }: { icon: ComponentType<{ className?: string }>; tone: string; label: string; value: string }) {
    return (
        <div className="flex min-w-[130px] items-center gap-3 rounded-lg border px-4 py-3">
            <div className={cn('rounded-lg p-2', tone)}>
                <Icon className="size-4 text-white" />
            </div>
            <div>
                <p className="mb-0.5 text-xs leading-none text-muted-foreground">{label}</p>
                <p className="text-sm leading-none font-bold">{value}</p>
            </div>
        </div>
    );
}
