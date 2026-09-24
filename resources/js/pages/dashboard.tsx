import { AreaChart } from '@/components/area-chart';
import { DonutChart } from '@/components/donut-chart';
import { Dropdown } from '@/components/dropdown';
import { HeroBanner, TintedStat } from '@/components/hero-banner';
import { EmptyRow, ListCard, ListRow } from '@/components/list-card';
import AppLayout from '@/layouts/app-layout';
import { hours, money } from '@/lib/format';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Banknote, Briefcase, CalendarDays, Clock, RefreshCw, Target, Users, Wallet } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

interface Entry {
    id: number;
    title: string;
    meta: string;
    minutes?: number;
    billable?: boolean;
    amount_cents: number | null;
    status?: string;
}

interface Props {
    firm: { name: string | null; greeting: string };
    stats: {
        activeCases: number;
        totalCases: number;
        activeClients: number;
        clientGrowth: number;
        revenueCents: number;
        pendingTasks: number;
        hearingsDue: number;
    };
    today: { timesheets: Entry[]; timesheetMinutes: number; expenses: Entry[]; expenseCents: number };
    revenue: { year: number; years: number[]; series: { label: string; value: number }[]; totalCents: number };
    upcomingHearings: { id: number; matter_id: number; title: string; court: string; type: string; scheduled_at: string }[];
    recentTasks: { id: number; title: string; meta: string; priority: string; state: string }[];
    tasksByPriority: { key: string; label: string; total: number; percent: number }[];
    collections: {
        invoicedCents: number;
        collectedCents: number;
        outstandingCents: number;
        overdueCents: number;
        rate: number;
        unbilledTimeCents: number;
        unbilledExpenseCents: number;
    };
}

// The palette from the design: high red, medium amber, low emerald.
const PRIORITY_COLOR: Record<string, string> = { high: '#ef4444', normal: '#f59e0b', low: '#10b77f' };

const STATUS_PILL: Record<string, string> = {
    approved: 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
    pending: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300',
    rejected: 'border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300',
    completed: 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
    overdue: 'border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300',
    open: 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300',
};

const PRIORITY_PILL: Record<string, string> = {
    high: 'border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300',
    normal: 'border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300',
    low: 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
};

export default function Dashboard({ firm, stats, today, revenue, upcomingHearings, recentTasks, tasksByPriority, collections }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground text-sm">Welcome to your firm dashboard.</p>
                    </div>
                    <button
                        onClick={() => router.reload()}
                        className="bg-card hover:bg-accent flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                    >
                        <RefreshCw className="size-4" /> Refresh
                    </button>
                </div>

                <div className="bg-card flex flex-col gap-5 rounded-2xl border p-5">
                    <HeroBanner
                        greeting={firm.greeting}
                        firmName={firm.name ?? 'Your firm'}
                        activeCases={stats.activeCases}
                        totalCases={stats.totalCases}
                        growth={stats.clientGrowth}
                    />

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <TintedStat
                            label="Active Cases"
                            value={stats.activeCases}
                            hint={`${stats.totalCases} total cases`}
                            icon={Briefcase}
                            tone="blue"
                            href="/matters"
                        />
                        <TintedStat
                            label="Active Clients"
                            value={stats.activeClients}
                            hint={`${stats.clientGrowth >= 0 ? '+' : ''}${stats.clientGrowth}% this month`}
                            icon={Users}
                            tone="green"
                            href="/clients"
                        />
                        <TintedStat
                            label="Total Revenue"
                            value={money(stats.revenueCents)}
                            hint="from payments"
                            icon={Banknote}
                            tone="emerald"
                            href="/payments"
                        />
                        <TintedStat
                            label="Pending Tasks"
                            value={stats.pendingTasks}
                            hint={`${stats.hearingsDue} hearings due`}
                            icon={Clock}
                            tone="amber"
                            badge="Due"
                            href="/tasks"
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <ListCard
                            title="Today's Timesheets"
                            subtitle={`${hours(today.timesheetMinutes)} logged today`}
                            viewAll="/billing/time-entries"
                        >
                            {today.timesheets.length === 0 && <EmptyRow>No time logged today.</EmptyRow>}
                            {today.timesheets.map((e) => (
                                <ListRow
                                    key={e.id}
                                    icon={Clock}
                                    tone="emerald"
                                    title={e.title}
                                    meta={e.meta}
                                    value={e.minutes ? `${(e.minutes / 60).toFixed(2)} hrs` : undefined}
                                    pill={e.billable ? (e.amount_cents ? money(e.amount_cents) : undefined) : 'Non-billable'}
                                    pillTone={
                                        e.billable ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300' : undefined
                                    }
                                />
                            ))}
                        </ListCard>

                        <ListCard title="Today's Expenses" subtitle={`${money(today.expenseCents)} total today`} viewAll="/expenses">
                            {today.expenses.length === 0 && <EmptyRow>Nothing recorded today.</EmptyRow>}
                            {today.expenses.map((x) => (
                                <ListRow
                                    key={x.id}
                                    icon={Wallet}
                                    tone="rose"
                                    title={x.title}
                                    meta={x.meta}
                                    value={money(x.amount_cents)}
                                    pill={x.status}
                                    pillTone={STATUS_PILL[x.status ?? '']}
                                />
                            ))}
                        </ListCard>
                    </div>

                    <section className="bg-card overflow-hidden rounded-2xl border">
                        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                            <div>
                                <h2 className="font-semibold">Monthly Revenue</h2>
                                <p className="text-muted-foreground mt-0.5 text-sm">Payments received per month — {revenue.year}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-mono text-sm font-semibold text-emerald-700 tabular-nums dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    {money(revenue.totalCents)}
                                </span>
                                <Dropdown
                                    value={revenue.year}
                                    onChange={(v) => router.get('/dashboard', { year: v }, { preserveScroll: true })}
                                    options={(revenue.years.length ? revenue.years : [revenue.year]).map((y) => ({ value: y, label: y }))}
                                    className="h-9 w-auto"
                                />
                            </div>
                        </header>
                        <div className="px-3 py-4">
                            <AreaChart series={revenue.series} format={(v) => money(v)} />
                        </div>
                    </section>

                    <div className="grid gap-4 lg:grid-cols-5">
                        <ListCard title="Upcoming Hearings" subtitle="Scheduled court hearings" viewAll="/hearings" className="lg:col-span-3">
                            {upcomingHearings.length === 0 && <EmptyRow>Nothing scheduled.</EmptyRow>}
                            {upcomingHearings.map((h) => (
                                <ListRow
                                    key={h.id}
                                    icon={CalendarDays}
                                    tone="emerald"
                                    title={h.title}
                                    meta={h.court}
                                    href={`/matters/${h.matter_id}`}
                                    value={new Date(h.scheduled_at).toLocaleString(undefined, {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                    pill={h.type}
                                    pillTone="border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300"
                                />
                            ))}
                        </ListCard>

                        <section className="bg-card overflow-hidden rounded-2xl border lg:col-span-2">
                            <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
                                <div>
                                    <h2 className="font-semibold">Collections</h2>
                                    <p className="text-muted-foreground mt-0.5 text-sm">Billed against received</p>
                                </div>
                                <span className="rounded-lg border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                                    {collections.rate}%
                                </span>
                            </header>
                            <div className="flex flex-col gap-3 p-5">
                                {[
                                    { label: 'Invoiced', value: collections.invoicedCents, color: 'bg-sky-500' },
                                    { label: 'Collected', value: collections.collectedCents, color: 'bg-emerald-500' },
                                    { label: 'Outstanding', value: collections.outstandingCents, color: 'bg-amber-500' },
                                    { label: 'Overdue', value: collections.overdueCents, color: 'bg-rose-500' },
                                ].map((row) => (
                                    <div key={row.label}>
                                        <div className="mb-1 flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{row.label}</span>
                                            <span className="font-mono font-medium tabular-nums">{money(row.value)}</span>
                                        </div>
                                        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                                            <div
                                                className={`h-full ${row.color}`}
                                                style={{ width: `${Math.min((row.value / Math.max(collections.invoicedCents, 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <div className="mt-2 flex items-center justify-between border-t pt-3 text-sm">
                                    <span className="text-muted-foreground">Ready to bill</span>
                                    <Link
                                        href="/time-entries?billable=unbilled"
                                        className="text-primary font-mono font-semibold tabular-nums hover:underline"
                                    >
                                        {money(collections.unbilledTimeCents + collections.unbilledExpenseCents)}
                                    </Link>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-5">
                        <ListCard title="Recent Tasks" subtitle={`${recentTasks.length} tasks listed`} viewAll="/tasks" className="lg:col-span-3">
                            {recentTasks.length === 0 && <EmptyRow>No tasks.</EmptyRow>}
                            {recentTasks.map((t) => (
                                <ListRow
                                    key={t.id}
                                    icon={Target}
                                    tone="emerald"
                                    title={t.title}
                                    meta={t.meta}
                                    pill={t.state === 'open' ? t.priority : t.state}
                                    pillTone={t.state === 'open' ? PRIORITY_PILL[t.priority] : STATUS_PILL[t.state]}
                                />
                            ))}
                        </ListCard>

                        <section className="bg-card overflow-hidden rounded-2xl border lg:col-span-2">
                            <header className="border-b px-5 py-4">
                                <h2 className="font-semibold">Tasks by Priority</h2>
                                <p className="text-muted-foreground mt-0.5 text-sm">Task breakdown</p>
                            </header>
                            <div className="flex flex-col items-center gap-5 p-5">
                                <DonutChart slices={tasksByPriority.map((p) => ({ label: p.label, value: p.total, color: PRIORITY_COLOR[p.key] }))} />
                                <div className="w-full">
                                    {tasksByPriority.map((p) => (
                                        <div key={p.key} className="mb-3 last:mb-0">
                                            <div className="mb-1 flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2">
                                                    <span className="size-2.5 rounded-full" style={{ background: PRIORITY_COLOR[p.key] }} />
                                                    {p.label}
                                                </span>
                                                <span className="flex items-center gap-3">
                                                    <span className="font-mono font-semibold tabular-nums">{p.total}</span>
                                                    <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">{p.percent}%</span>
                                                </span>
                                            </div>
                                            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                                                <div className="h-full" style={{ width: `${p.percent}%`, background: PRIORITY_COLOR[p.key] }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
