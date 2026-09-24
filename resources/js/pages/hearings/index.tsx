import { InitialsAvatar } from '@/components/avatar-stack';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { MiniCalendar } from '@/components/mini-calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Court } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    CircleCheck,
    Clock,
    Eye,
    FileText,
    Filter,
    LayoutGrid,
    MapPin,
    Plus,
    RefreshCcw,
    Search,
    SquarePen,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Hearings', href: '/hearings' }];

interface Row {
    id: number;
    title: string;
    type: string | null;
    status: string;
    time: string;
    duration: number;
    judge: string | null;
    court: string | null;
    matter_id: number;
    matter: string | null;
    lead: string | null;
}

interface Props {
    date: string;
    isToday: boolean;
    month: string;
    monthLabel: string;
    gridStart: string;
    prevMonth: string;
    nextMonth: string;
    today: string;
    markedDays: string[];
    hearings: Row[];
    filters: Record<string, string>;
    counts: Record<string, number>;
    options: { matters: { id: number; label: string }[]; courts: Court[]; statuses: string[]; types: string[] };
}

const STATUS_PILL: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-400/20',
    in_progress: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-950 dark:text-yellow-300 dark:ring-yellow-400/20',
    completed: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950 dark:text-green-300 dark:ring-green-400/20',
    postponed: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-400/20',
    cancelled: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-400/20',
};

const SUMMARY_DOT: Record<string, string> = {
    scheduled: 'bg-blue-500',
    in_progress: 'bg-amber-500',
    completed: 'bg-green-500',
    postponed: 'bg-orange-500',
    cancelled: 'bg-red-500',
};

const TABS = [
    { value: '', label: 'All', icon: LayoutGrid, key: 'all' },
    { value: 'scheduled', label: 'Scheduled', icon: CalendarDays, key: 'scheduled' },
    { value: 'in_progress', label: 'In Progress', icon: Clock, key: 'in_progress' },
    { value: 'completed', label: 'Completed', icon: CircleCheck, key: 'completed' },
    { value: 'postponed', label: 'Postponed', icon: TriangleAlert, key: 'postponed' },
    { value: 'cancelled', label: 'Cancelled', icon: Trash2, key: 'cancelled' },
];

const label = (value: string) => value.replace('_', ' ');

export default function HearingsIndex({
    date,
    isToday,
    month,
    monthLabel,
    gridStart,
    prevMonth,
    nextMonth,
    today,
    markedDays,
    hearings,
    filters,
    counts,
    options,
}: Props) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Row | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');

    const form = useForm({
        matter_id: '',
        court_id: '',
        title: '',
        scheduled_at: `${date}T09:00`,
        duration_minutes: '60',
        type: options.types[0] ?? '',
        status: 'scheduled',
        judge: '',
        outcome: '',
    });

    const hasFilters = Boolean(filters.search || filters.court_id || filters.status);

    function apply(patch: Record<string, string>) {
        router.get('/hearings', { ...filters, date, month, ...patch }, { preserveState: true, replace: true });
    }

    function shift(days: number) {
        const target = new Date(date + 'T00:00:00');
        target.setDate(target.getDate() + days);
        const next = target.toISOString().slice(0, 10);
        router.get('/hearings', { ...filters, date: next, month: next.slice(0, 7) }, { preserveState: true, replace: true });
    }

    function openCreate() {
        form.setData({
            matter_id: '',
            court_id: '',
            title: '',
            scheduled_at: `${date}T09:00`,
            duration_minutes: '60',
            type: options.types[0] ?? '',
            status: 'scheduled',
            judge: '',
            outcome: '',
        });
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(row: Row) {
        form.setData({
            matter_id: String(row.matter_id),
            court_id: '',
            title: row.title,
            scheduled_at: `${date}T${row.time}`,
            duration_minutes: String(row.duration),
            type: row.type ?? '',
            status: row.status,
            judge: row.judge ?? '',
            outcome: '',
        });
        form.clearErrors();
        setEditing(row);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        if (editing) {
            form.put(`/hearings/${editing.id}`, done);
        } else {
            form.post('/hearings', done);
        }
    }

    const quickFilters = [
        { label: 'Yesterday', delta: -1 },
        { label: 'Today', delta: 0 },
        { label: 'Tomorrow', delta: 1 },
    ];

    const sidebar = (
        <>
            <MiniCalendar
                month={month}
                monthLabel={monthLabel}
                gridStart={gridStart}
                selected={date}
                today={today}
                marked={markedDays}
                onSelect={(next) => apply({ date: next })}
                onMonth={(next) => apply({ month: next })}
                prevMonth={prevMonth}
                nextMonth={nextMonth}
            />

            <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                    <p className="text-sm font-semibold">Hearing Summary</p>
                    <span className="text-muted-foreground text-xs">({date})</span>
                </div>
                <div className="space-y-2.5 p-4">
                    {options.statuses.map((status) => (
                        <div key={status} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={cn('size-2.5 rounded-full', SUMMARY_DOT[status])} />
                                <span className="text-muted-foreground text-sm capitalize">{label(status)}</span>
                            </div>
                            <span className="font-mono text-sm font-semibold tabular-nums">{counts[status] ?? 0}</span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between border-t px-4 py-3">
                    <span className="text-sm font-semibold">Total Hearings</span>
                    <span className="font-mono text-sm font-bold tabular-nums">{counts.all ?? 0}</span>
                </div>
            </div>

            <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                <div className="border-b px-4 py-3">
                    <p className="text-sm font-semibold">Quick Filters</p>
                </div>
                <div className="space-y-1 p-4">
                    {quickFilters.map((quick) => {
                        const target = new Date(today + 'T00:00:00');
                        target.setDate(target.getDate() + quick.delta);
                        const iso = target.toISOString().slice(0, 10);
                        const active = iso === date;

                        return (
                            <button
                                key={quick.label}
                                onClick={() => apply({ date: iso, month: iso.slice(0, 7) })}
                                className={cn(
                                    'flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors',
                                    active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-primary',
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    <CalendarDays className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                                    {quick.label}
                                </span>
                                <span className="text-muted-foreground">›</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Hearings" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Hearings</h1>
                        <p className="text-muted-foreground text-xs">Manage case hearing schedules.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Hearing
                    </Button>
                </div>

                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="w-full p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <div className="relative w-64 min-w-40 shrink">
                                    <Search className="text-muted-foreground absolute top-2 left-2.5 size-4" />
                                    <Input
                                        placeholder="Search..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && apply({ search })}
                                        className="h-8 w-full px-9"
                                    />
                                </div>
                                <Dropdown
                                    value={filters.court_id ?? ''}
                                    onChange={(v) => apply({ court_id: v })}
                                    placeholder="All Courts"
                                    options={options.courts.map((c) => ({ value: c.id, label: c.name }))}
                                    className="h-9 w-40"
                                />
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {hasFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground h-9"
                                        onClick={() => router.get('/hearings', { date })}
                                    >
                                        <RefreshCcw className="size-4" /> Clear Filters
                                    </Button>
                                )}
                                <span className="text-muted-foreground flex h-8 items-center gap-1.5 rounded-md border px-2 text-sm">
                                    <Filter className="size-4" /> Filters
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t px-3">
                        <div className="flex gap-0 overflow-x-auto">
                            {TABS.map((tab) => {
                                const active = (filters.status ?? '') === tab.value;

                                return (
                                    <button
                                        key={tab.label}
                                        onClick={() => apply({ status: tab.value })}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                                            active
                                                ? 'border-primary text-primary'
                                                : 'text-muted-foreground hover:border-muted-foreground hover:text-foreground border-transparent',
                                        )}
                                    >
                                        <tab.icon className="size-4" />
                                        {tab.label}
                                        <span
                                            className={cn(
                                                'ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                                                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {counts[tab.key] ?? 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 lg:flex-row">
                    <div className="flex w-full shrink-0 flex-col gap-4 lg:hidden">{sidebar}</div>

                    <div className="min-w-0 flex-1">
                        <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                            <div className="bg-muted/40 flex flex-wrap items-center gap-3 border-b px-5 py-4">
                                <CalendarDays className="text-muted-foreground size-4" />
                                <span className="font-semibold">
                                    {date}
                                    {isToday && <span className="ms-1 font-bold">(Today)</span>}
                                </span>
                                <div className="ms-auto flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="h-7" onClick={() => shift(-1)}>
                                        ‹
                                    </Button>
                                    <span className="bg-primary/10 text-primary ring-primary/20 inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset">
                                        {hearings.length} {hearings.length === 1 ? 'Hearing' : 'Hearings'}
                                    </span>
                                    <Button variant="outline" size="sm" className="h-7" onClick={() => shift(1)}>
                                        ›
                                    </Button>
                                </div>
                            </div>

                            <div className="divide-y overflow-y-auto lg:max-h-[calc(100vh-260px)]">
                                {hearings.length === 0 && (
                                    <p className="text-muted-foreground px-5 py-16 text-center text-sm">Nothing listed for this day.</p>
                                )}
                                {hearings.map((h) => (
                                    <div key={h.id} className="hover:bg-muted/40 flex items-stretch transition-colors">
                                        <div className="relative me-4 flex w-16 shrink-0 flex-col items-end justify-start py-4 pe-4 sm:w-20">
                                            <div className="bg-border absolute end-0 top-3 bottom-3 w-px" />
                                            <span className="font-mono text-xs leading-tight font-bold tabular-nums">{h.time}</span>
                                            <span className="text-muted-foreground mt-1 font-mono text-[10px] font-semibold">{h.duration}m</span>
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-2 py-3 pe-3 sm:py-4 sm:pe-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                    <h3 className="text-sm leading-tight font-bold sm:text-base">{h.title}</h3>
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset',
                                                            STATUS_PILL[h.status],
                                                        )}
                                                    >
                                                        {label(h.status)}
                                                    </span>
                                                    {h.type && (
                                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 capitalize ring-1 ring-blue-600/20 ring-inset dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-400/20">
                                                            {h.type}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex shrink-0 items-center gap-0.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground size-8"
                                                        asChild
                                                        title="View case"
                                                    >
                                                        <Link href={`/matters/${h.matter_id}`}>
                                                            <Eye className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground size-8"
                                                        title="Edit"
                                                        onClick={() => openEdit(h)}
                                                    >
                                                        <SquarePen className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground size-8"
                                                        title="Delete"
                                                        onClick={() =>
                                                            confirmAction({ title: 'Delete this hearing?' }).then(
                                                                (ok) => ok && router.delete(`/hearings/${h.id}`, { preserveScroll: true }),
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="size-4 text-rose-600" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="text-muted-foreground flex items-center gap-1.5 pt-1 text-xs">
                                                <FileText className="size-3.5" />
                                                <span className="font-medium">Case:</span>
                                                <Link
                                                    href={`/matters/${h.matter_id}`}
                                                    className="text-primary truncate font-semibold hover:underline"
                                                >
                                                    {h.matter ?? '—'}
                                                </Link>
                                            </div>

                                            <div className="text-muted-foreground flex w-full items-center justify-between gap-4 pt-0.5 text-xs">
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                    <MapPin className="size-3.5" />
                                                    <span className="font-medium">Court:</span>
                                                    <span className="text-foreground/80 truncate font-semibold">{h.court ?? '—'}</span>
                                                </div>
                                                {h.lead && <InitialsAvatar name={h.lead} className="ring-border size-6 text-[10px] ring-1" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="hidden w-72 shrink-0 grid-cols-1 gap-4 lg:grid">{sidebar}</div>
                </div>
            </div>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? 'Edit hearing' : 'Add Hearing'}
                onSubmit={submit}
                processing={form.processing}
                wide
            >
                <TextField
                    label="Title"
                    value={form.data.title}
                    onChange={(v) => form.setData('title', v)}
                    error={form.errors.title}
                    className="sm:col-span-2"
                />
                <SelectField
                    label="Case"
                    value={form.data.matter_id}
                    onChange={(v) => form.setData('matter_id', v)}
                    options={options.matters.map((m) => ({ value: m.id, label: m.label }))}
                    placeholder="Select case…"
                    error={form.errors.matter_id}
                    className="sm:col-span-2"
                />
                <SelectField
                    label="Court"
                    value={form.data.court_id}
                    onChange={(v) => form.setData('court_id', v)}
                    options={options.courts.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="—"
                />
                <TextField label="Judge" value={form.data.judge} onChange={(v) => form.setData('judge', v)} />
                <SelectField
                    label="Type"
                    value={form.data.type}
                    onChange={(v) => form.setData('type', v)}
                    options={options.types.map((t) => ({ value: t, label: t }))}
                    placeholder="—"
                />
                <SelectField
                    label="Status"
                    value={form.data.status}
                    onChange={(v) => form.setData('status', v)}
                    options={options.statuses.map((s) => ({ value: s, label: label(s) }))}
                />
                <TextField
                    label="Date & time"
                    type="datetime-local"
                    value={form.data.scheduled_at}
                    onChange={(v) => form.setData('scheduled_at', v)}
                    error={form.errors.scheduled_at}
                />
                <TextField
                    label="Duration (minutes)"
                    type="number"
                    value={form.data.duration_minutes}
                    onChange={(v) => form.setData('duration_minutes', v)}
                    error={form.errors.duration_minutes}
                />
                <TextareaField label="Outcome" value={form.data.outcome} onChange={(v) => form.setData('outcome', v)} className="sm:col-span-2" />
            </FormDialog>
        </AppLayout>
    );
}
