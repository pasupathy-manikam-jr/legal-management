import { AreaChart } from '@/components/area-chart';
import { BarChart, LineChart, type Series } from '@/components/series-charts';
import { Dropdown } from '@/components/dropdown';
import { SummaryCard } from '@/components/summary-card';
import { RingPill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { money } from '@/lib/format';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Activity, ChartColumn, CircleCheck, Clock, FileText, Scale, Target, TriangleAlert } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Analytics & Reports', href: '/analytics' }];

const CASE_SERIES: Series[] = [
    { key: 'high', label: 'High', color: '#f59e0b' },
    { key: 'medium', label: 'Medium', color: '#10b77f' },
    { key: 'low', label: 'Low', color: '#6b7280' },
];

const TASK_SERIES: Series[] = [
    { key: 'critical', label: 'Critical', color: '#ef4444' },
    { key: 'high', label: 'High', color: '#f59e0b' },
    { key: 'medium', label: 'Medium', color: '#10b77f' },
    { key: 'low', label: 'Low', color: '#6b7280' },
];

interface Row {
    label: string;
    [key: string]: string | number;
}

export default function Analytics({
    year,
    years,
    metrics,
    revenueByMonth,
    casesByMonth,
    tasksByMonth,
    recentCases,
    overdueInvoices,
}: {
    year: number;
    years: number[];
    metrics: {
        closureRate: number;
        avgResolutionDays: number | null;
        collectionRate: number;
        billableHours: number;
        outstandingCents: number;
    };
    revenueByMonth: { label: string; value: number }[];
    casesByMonth: Row[];
    tasksByMonth: Row[];
    recentCases: { id: number; title: string; client: string | null; status: string }[];
    overdueInvoices: { id: number; number: string; client: string | null; balance_cents: number }[];
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Analytics & Reports" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div>
                    <h1 className="text-xl font-semibold">Analytics &amp; Reports</h1>
                    <p className="text-xs text-muted-foreground">Comprehensive analytics and reporting for your legal practice.</p>
                </div>

                <div className="rounded-xl border p-6">
                    <div className="space-y-6">
                        <p className="text-sm text-muted-foreground">Comprehensive insights into your legal practice</p>

                        <div className="grid grid-cols-1 gap-3 min-[350px]:grid-cols-2 sm:grid-cols-4">
                            <SummaryCard label="Closure Rate" value={`${metrics.closureRate}%`} icon={CircleCheck} tone="green" mono={false} />
                            <SummaryCard
                                label="Avg Resolution"
                                value={metrics.avgResolutionDays === null ? '—' : `${metrics.avgResolutionDays} days`}
                                icon={Clock}
                                tone="blue"
                                mono={false}
                            />
                            <SummaryCard label="Collection Rate" value={`${metrics.collectionRate}%`} icon={Target} tone="purple" mono={false} />
                            <SummaryCard label="Billable Hours" value={`${metrics.billableHours}h`} icon={Activity} tone="indigo" mono={false} />
                        </div>

                        <ChartCard title="Yearly Revenue Trend" icon={ChartColumn} iconTone="text-blue-600" year={year} years={years}>
                            <AreaChart series={revenueByMonth} format={money} height={350} color="#3b82f6" />
                        </ChartCard>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Panel title="Recent Cases" icon={Scale} iconTone="text-blue-600" viewAll="/matters">
                                {recentCases.length === 0 && <p className="text-sm text-muted-foreground">No cases yet.</p>}
                                {recentCases.map((c) => (
                                    <Link
                                        key={c.id}
                                        href={`/matters/${c.id}`}
                                        className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">{c.title}</p>
                                            <p className="text-xs text-muted-foreground">{c.client ?? '—'}</p>
                                        </div>
                                        <RingPill value={c.status === 'closed' ? 'inactive' : c.status === 'pending' ? 'medium' : 'active'} label={c.status} />
                                    </Link>
                                ))}
                            </Panel>

                            <Panel title="Overdue Invoices" icon={FileText} iconTone="text-red-600" viewAll="/invoices">
                                {overdueInvoices.length === 0 && <p className="text-sm text-muted-foreground">Nothing overdue. </p>}
                                {overdueInvoices.map((i) => (
                                    <Link
                                        key={i.id}
                                        href={`/invoices/${i.id}`}
                                        className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">{i.number}</p>
                                            <p className="text-xs text-muted-foreground">{i.client ?? '—'}</p>
                                        </div>
                                        <span className="font-mono text-rose-600">{money(i.balance_cents)}</span>
                                    </Link>
                                ))}
                            </Panel>
                        </div>

                        <ChartCard title="Cases by Year" icon={ChartColumn} iconTone="text-blue-600" year={year} years={years}>
                            <LineChart rows={casesByMonth} series={CASE_SERIES} height={300} />
                        </ChartCard>

                        <ChartCard title="Tasks by Priority" icon={Target} iconTone="text-purple-600" year={year} years={years}>
                            <BarChart rows={tasksByMonth} series={TASK_SERIES} height={250} />
                        </ChartCard>

                        <div className="rounded-lg border border-orange-200 bg-orange-50 p-6 shadow-sm dark:border-orange-900 dark:bg-orange-950">
                            <div className="flex items-center gap-4">
                                <TriangleAlert className="size-10 text-orange-600" />
                                <div>
                                    <h3 className="font-medium text-orange-900 dark:text-orange-100">Amount Alert</h3>
                                    <p className="font-mono text-sm text-orange-700 dark:text-orange-200">{money(metrics.outstandingCents)} in unpaid invoices</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function ChartCard({
    title,
    icon: Icon,
    iconTone,
    year,
    years,
    children,
}: {
    title: string;
    icon: ComponentType<{ className?: string }>;
    iconTone: string;
    year: number;
    years: number[];
    children: ReactNode;
}) {
    return (
        <div className="rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-lg">
            <div className="flex flex-row items-center justify-between gap-2 p-6 pb-4 max-[400px]:flex-col max-[400px]:items-start">
                <h3 className="flex items-center gap-2 text-lg leading-none font-semibold tracking-tight">
                    <Icon className={`size-5 ${iconTone}`} />
                    {title}
                </h3>
                <Dropdown value={year} onChange={(v) => router.get('/analytics', { year: v }, { preserveState: true, replace: true })} options={years.map((y) => ({ value: y, label: y }))} className="h-10 w-32" aria-label={`${title} year`} />
            </div>
            <div className="p-6 pt-0">{children}</div>
        </div>
    );
}

function Panel({
    title,
    icon: Icon,
    iconTone,
    viewAll,
    children,
}: {
    title: string;
    icon: ComponentType<{ className?: string }>;
    iconTone: string;
    viewAll: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-lg">
            <div className="flex flex-row items-center justify-between gap-2 p-6 pb-4 max-[400px]:flex-col max-[400px]:items-start">
                <h3 className="flex items-center gap-2 text-lg leading-none font-semibold tracking-tight">
                    <Icon className={`size-5 ${iconTone}`} />
                    {title}
                </h3>
                <Button variant="outline" size="sm" className="h-8" asChild>
                    <Link href={viewAll}>View All</Link>
                </Button>
            </div>
            <div className="space-y-4 p-6 pt-0">{children}</div>
        </div>
    );
}
