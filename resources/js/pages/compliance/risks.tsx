import { DataTableFooter } from '@/components/data-table-footer';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { CountTabs } from '@/components/page-toolbar';
import { SummaryCard } from '@/components/summary-card';
import { TonePill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated, User } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Calendar, ChartColumn, CircleCheck, CircleX, Eye, LayoutGrid, Plus, Search, ShieldAlert, SquarePen, Tag, Trash2, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Risk Assessments', href: '/compliance/risk-assessments' }];

interface Risk {
    id: number;
    title: string;
    category: string | null;
    likelihood: number;
    impact: number;
    score: number;
    band: string;
    status: string;
    mitigation: string | null;
    identified_on: string | null;
    review_on: string | null;
    owner_id: number | null;
    owner: string | null;
    matter_id: number | null;
    matter: string | null;
}

interface Category {
    name: string;
    color: string | null;
}

const BAND_RING: Record<string, string> = {
    low: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300',
    medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-950 dark:text-yellow-300',
    high: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300',
    critical: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300',
};

/** The matrix cells use the same four bands, at full tile strength. */
const BAND_CELL: Record<string, string> = {
    low: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200',
    medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-200',
    critical: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200',
};

const STATUS_RING: Record<string, string> = {
    identified: 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-800 dark:text-gray-300',
    assessed: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300',
    monitored: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-950 dark:text-yellow-300',
    mitigated: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300',
    closed: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-950 dark:text-purple-300',
};

const IMPACT_LABELS = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
const FALLBACK_COLOR = '#6b7280';

/** Same thresholds as the model, so a cell and its rows always agree. */
function bandOf(score: number): string {
    return score >= 20 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low';
}

const empty = () => ({
    owner_id: '',
    matter_id: '',
    title: '',
    category: '',
    likelihood: '3',
    impact: '3',
    identified_on: '',
    status: 'identified',
    mitigation: '',
    review_on: '',
});

export default function RiskAssessments({
    risks,
    filters,
    perPage,
    counts,
    totals,
    matrix,
    options,
}: {
    risks: Paginated<Risk>;
    filters: Record<string, string>;
    perPage: number;
    counts: Record<string, number>;
    totals: { all: number; severe: number; open: number; closed: number };
    matrix: Record<string, number>;
    options: { users: User[]; matters: { id: number; label: string }[]; statuses: string[]; bands: string[]; categories: Category[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Risk | null>(null);
    const [viewing, setViewing] = useState<Risk | null>(null);
    const form = useForm(empty());

    const apply = (patch: Record<string, string | number>) =>
        router.get('/compliance/risk-assessments', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });

    const colorOf = (name: string | null) => options.categories.find((c) => c.name === name)?.color ?? FALLBACK_COLOR;

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(r: Risk) {
        form.setData({
            owner_id: r.owner_id ? String(r.owner_id) : '',
            matter_id: r.matter_id ? String(r.matter_id) : '',
            title: r.title,
            category: r.category ?? '',
            likelihood: String(r.likelihood),
            impact: String(r.impact),
            identified_on: r.identified_on ?? '',
            status: r.status,
            mitigation: r.mitigation ?? '',
            review_on: r.review_on ?? '',
        });
        form.clearErrors();
        setEditing(r);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        editing ? form.put(`/compliance/risk-assessments/${editing.id}`, done) : form.post('/compliance/risk-assessments', done);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Risk Assessments" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Risk Assessments</h1>
                        <p className="text-xs text-muted-foreground">Identify, assess, and mitigate organizational compliance risks.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Risk Assessment
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <SummaryCard label="Total" value={totals.all} icon={ChartColumn} tone="gray" mono={false} />
                    <SummaryCard label="Critical / High" value={totals.severe} icon={ShieldAlert} tone="red" mono={false} />
                    <SummaryCard label="Open" value={totals.open} icon={TrendingUp} tone="amber" mono={false} />
                    <SummaryCard label="Closed" value={totals.closed} icon={CircleCheck} tone="emerald" mono={false} />
                </div>

                <div className="rounded-lg border bg-card shadow-sm">
                    <div className="flex min-w-0 items-center gap-2 p-3">
                        <div className="relative w-64 min-w-40 shrink">
                            <Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && apply({ search })}
                                placeholder="Search..."
                                className="h-8 w-full px-9"
                            />
                        </div>

                        <Dropdown value={filters.category ?? ''} onChange={(v) => apply({ category: v })} placeholder="All Categories" options={options.categories.map((c) => ({ value: c.name, label: c.name }))} className="h-9 w-40" aria-label="Category filter" capitalize />

                        <Dropdown value={filters.band ?? ''} onChange={(v) => apply({ band: v })} placeholder="All Risk Levels" options={options.bands.map((b) => ({ value: b, label: b }))} className="h-9 w-40" aria-label="Risk level filter" capitalize />
                    </div>

                    <CountTabs
                        value={filters.status ?? ''}
                        onSelect={(v) => apply({ status: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                            ...options.statuses.map((s) => ({
                                value: s,
                                label: s.charAt(0).toUpperCase() + s.slice(1),
                                icon: s === 'mitigated' ? CircleCheck : s === 'closed' ? CircleX : undefined,
                                count: counts[s] ?? 0,
                            })),
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_1fr]">
                    <div className="lg:sticky lg:top-4">
                        <div className="rounded-xl border bg-card p-4 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <ChartColumn className="size-4 text-primary" />
                                <h3 className="text-sm font-semibold">Risk Matrix</h3>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex w-5 shrink-0 items-center justify-center">
                                    <span
                                        className="text-[10px] font-semibold tracking-widest text-muted-foreground"
                                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                    >
                                        Probability
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <div className="grid grid-cols-5 gap-1">
                                        {[5, 4, 3, 2, 1].map((likelihood) =>
                                            [1, 2, 3, 4, 5].map((impact) => {
                                                const score = likelihood * impact;
                                                const total = matrix[`${likelihood}x${impact}`] ?? 0;

                                                return (
                                                    <button
                                                        key={`${likelihood}x${impact}`}
                                                        type="button"
                                                        onClick={() => apply({ band: bandOf(score) })}
                                                        title={`Probability ${likelihood} × Impact ${impact} — ${total} risk${total === 1 ? '' : 's'}`}
                                                        className={cn(
                                                            'relative flex h-12 cursor-pointer flex-col items-center justify-center rounded-md text-xs font-bold transition-all duration-150',
                                                            BAND_CELL[bandOf(score)],
                                                        )}
                                                    >
                                                        <span className="text-base leading-none">{total || '·'}</span>
                                                        <span className="mt-0.5 text-[9px] leading-none opacity-60">{score}</span>
                                                    </button>
                                                );
                                            }),
                                        )}
                                    </div>
                                    <div className="mt-1 grid grid-cols-5 gap-1">
                                        {IMPACT_LABELS.map((label) => (
                                            <span key={label} className="truncate px-0.5 text-center text-[9px] font-medium text-muted-foreground">
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="mt-1 text-center text-[10px] font-semibold tracking-widest text-muted-foreground">Impact</p>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                                {options.bands
                                    .slice()
                                    .reverse()
                                    .map((band) => (
                                        <button
                                            key={band}
                                            type="button"
                                            onClick={() => apply({ band: filters.band === band ? '' : band })}
                                            className={cn(
                                                'inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-xs font-bold capitalize ring-1 ring-inset',
                                                BAND_RING[band],
                                                filters.band === band && 'ring-2',
                                            )}
                                        >
                                            {band}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0">
                        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                            <div className="w-full overflow-x-auto">
                                <table className="w-full caption-bottom text-sm">
                                    <thead>
                                        <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                            <th className="w-12 px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Risk Title</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Responsible</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Risk Level</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Date</th>
                                            <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {risks.data.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                                                    No risks match this view.
                                                </td>
                                            </tr>
                                        )}
                                        {risks.data.map((r, i) => (
                                            <tr key={r.id} className="transition-colors hover:bg-muted/40">
                                                <td className="px-4 py-2.5 font-medium tabular-nums">{(risks.from ?? 1) + i}</td>
                                                <td className="px-4 py-2.5">
                                                    <div className="font-semibold">{r.title}</div>
                                                    {r.category && (
                                                        <div className="mt-1">
                                                            <TonePill color={colorOf(r.category)}>
                                                                <Tag className="size-3" />
                                                                <span className="capitalize">{r.category}</span>
                                                            </TonePill>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-sm font-medium">{r.owner ?? 'Unassigned'}</span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center rounded-md px-2 py-1 text-xs font-bold capitalize ring-1 ring-inset',
                                                            BAND_RING[r.band],
                                                        )}
                                                    >
                                                        {r.band} · {r.score}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset',
                                                            STATUS_RING[r.status] ?? STATUS_RING.identified,
                                                        )}
                                                    >
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {r.identified_on ? (
                                                        <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                                                            <Calendar className="size-4" />
                                                            <span>{date(r.identified_on)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="View" onClick={() => setViewing(r)}>
                                                            <Eye className="size-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="Edit" onClick={() => openEdit(r)}>
                                                            <SquarePen className="size-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-muted-foreground"
                                                            title="Delete"
                                                            onClick={() =>
                                                                confirmAction({ title: `Delete ${r.title}?` }).then((ok) => ok && router.delete(`/compliance/risk-assessments/${r.id}`, { preserveScroll: true }))
                                                            }
                                                        >
                                                            <Trash2 className="size-4 text-rose-600" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <DataTableFooter
                                from={risks.from}
                                to={risks.to}
                                total={risks.total}
                                links={risks.links}
                                perPage={perPage}
                                onPerPage={(value) => apply({ per_page: value })}
                            />
                        </div>
                    </div>
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? 'Edit Risk Assessment' : 'Add Risk Assessment'}
                    onSubmit={submit}
                    processing={form.processing}
                    submitLabel={editing ? 'Save' : 'Add Risk'}
                    wide
                >
                    <TextField label="Risk title" value={form.data.title} onChange={(v) => form.setData('title', v)} error={form.errors.title} className="sm:col-span-2" />
                    <SelectField
                        label="Category"
                        value={form.data.category}
                        onChange={(v) => form.setData('category', v)}
                        options={options.categories.map((c) => ({ value: c.name, label: c.name }))}
                        placeholder="—"
                        error={form.errors.category}
                    />
                    <SelectField
                        label="Responsible"
                        value={form.data.owner_id}
                        onChange={(v) => form.setData('owner_id', v)}
                        options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                        placeholder="Unassigned"
                    />
                    <SelectField
                        label="Probability"
                        value={form.data.likelihood}
                        onChange={(v) => form.setData('likelihood', v)}
                        options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} — ${IMPACT_LABELS[n - 1]}` }))}
                        error={form.errors.likelihood}
                    />
                    <SelectField
                        label="Impact"
                        value={form.data.impact}
                        onChange={(v) => form.setData('impact', v)}
                        options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} — ${IMPACT_LABELS[n - 1]}` }))}
                        error={form.errors.impact}
                    />
                    <SelectField
                        label="Status"
                        value={form.data.status}
                        onChange={(v) => form.setData('status', v)}
                        options={options.statuses.map((s) => ({ value: s, label: s }))}
                    />
                    <SelectField
                        label="Case"
                        value={form.data.matter_id}
                        onChange={(v) => form.setData('matter_id', v)}
                        options={options.matters.map((m) => ({ value: m.id, label: m.label }))}
                        placeholder="Firm-wide"
                    />
                    <TextField
                        label="Identified"
                        type="date"
                        value={form.data.identified_on}
                        onChange={(v) => form.setData('identified_on', v)}
                        error={form.errors.identified_on}
                    />
                    <TextField label="Next review" type="date" value={form.data.review_on} onChange={(v) => form.setData('review_on', v)} error={form.errors.review_on} />
                    <TextareaField label="Mitigation" value={form.data.mitigation} onChange={(v) => form.setData('mitigation', v)} className="sm:col-span-2" />
                </FormDialog>

                <Dialog open={!!viewing} onOpenChange={(next) => !next && setViewing(null)}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{viewing?.title}</DialogTitle>
                        </DialogHeader>
                        {viewing && (
                            <div className="space-y-4 text-sm">
                                <div className="flex flex-wrap gap-2">
                                    <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs font-bold capitalize ring-1 ring-inset', BAND_RING[viewing.band])}>
                                        {viewing.band} · {viewing.score}
                                    </span>
                                    <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset', STATUS_RING[viewing.status])}>
                                        {viewing.status}
                                    </span>
                                    {viewing.category && (
                                        <TonePill color={colorOf(viewing.category)}>
                                            <Tag className="size-3" />
                                            <span className="capitalize">{viewing.category}</span>
                                        </TonePill>
                                    )}
                                </div>
                                <dl className="grid grid-cols-2 gap-3">
                                    <Detail label="Responsible" value={viewing.owner ?? 'Unassigned'} />
                                    <Detail label="Case" value={viewing.matter ?? 'Firm-wide'} />
                                    <Detail label="Probability × Impact" value={`${viewing.likelihood} × ${viewing.impact}`} />
                                    <Detail label="Identified" value={date(viewing.identified_on)} />
                                    <Detail label="Next review" value={date(viewing.review_on)} />
                                </dl>
                                {viewing.mitigation && (
                                    <div>
                                        <p className="mb-1 text-xs text-muted-foreground">Mitigation</p>
                                        <p className="whitespace-pre-line">{viewing.mitigation}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}
