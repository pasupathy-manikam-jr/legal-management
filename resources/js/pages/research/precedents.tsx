import { DataTableFooter } from '@/components/data-table-footer';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { CountTabs } from '@/components/page-toolbar';
import { SummaryCard } from '@/components/summary-card';
import { RingPill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Archive,
    Book,
    Calendar,
    CircleCheck,
    CircleX,
    Eye,
    Filter,
    LayoutGrid,
    Plus,
    RefreshCcw,
    RefreshCw,
    Search,
    SquarePen,
    Trash2,
    TrendingUp,
    TriangleAlert,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Legal Precedents', href: '/precedents' }];

interface Precedent {
    id: number;
    matter_id: number | null;
    matter?: { id: number; reference: string } | null;
    case_name: string;
    citation: string;
    court: string | null;
    jurisdiction: string | null;
    category: string | null;
    decided_on: string | null;
    holding: string | null;
    relevance: number;
    status: string;
}

const STATUS: Record<string, { label: string; icon: ComponentType<{ className?: string }>; tone: string }> = {
    active: { label: 'Active', icon: CircleCheck, tone: 'active' },
    overruled: { label: 'Overruled', icon: CircleX, tone: 'inactive' },
    questioned: { label: 'Questioned', icon: TriangleAlert, tone: 'medium' },
    archived: { label: 'Archived', icon: Archive, tone: 'low' },
};

const SCORE_LABEL: Record<string, string> = { high: '9 – 10', medium: '7 – 8', low: 'Below 7' };

/** The bar matches the score: strong scores read emerald, weak ones amber. */
function scoreTone(relevance: number): { bar: string; text: string } {
    if (relevance >= 100) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
    if (relevance >= 70) return { bar: 'bg-blue-500', text: 'text-blue-600' };

    return { bar: 'bg-amber-500', text: 'text-amber-600' };
}

const empty = () => ({
    matter_id: '',
    case_name: '',
    citation: '',
    court: '',
    jurisdiction: '',
    category: '',
    decided_on: '',
    holding: '',
    relevance: 80,
    status: 'active',
});

export default function LegalPrecedents({
    precedents,
    filters,
    perPage,
    counts,
    totals,
    options,
}: {
    precedents: Paginated<Precedent>;
    filters: Record<string, string>;
    perPage: number;
    counts: Record<string, number>;
    totals: { avgRelevance: number; unsettled: number };
    options: { matters: { id: number; label: string }[]; categories: string[]; statuses: string[]; scores: string[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Precedent | null>(null);
    const form = useForm(empty());

    const hasFilters = Boolean(filters.search || filters.category || filters.score || filters.status);

    function apply(patch: Record<string, string | number>) {
        router.get('/precedents', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });
    }

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(p: Precedent) {
        form.setData({
            matter_id: p.matter_id ? String(p.matter_id) : '',
            case_name: p.case_name,
            citation: p.citation,
            court: p.court ?? '',
            jurisdiction: p.jurisdiction ?? '',
            category: p.category ?? '',
            decided_on: p.decided_on?.slice(0, 10) ?? '',
            holding: p.holding ?? '',
            relevance: p.relevance,
            status: p.status,
        });
        form.clearErrors();
        setEditing(p);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        editing ? form.put(`/precedents/${editing.id}`, done) : form.post('/precedents', done);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Legal Precedents" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Legal Precedents</h1>
                        <p className="text-xs text-muted-foreground">Manage and analyse precedent cases with search and filtering.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Legal Precedent
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard label="Total Precedents" value={counts.all ?? 0} icon={Book} tone="gray" mono={false} />
                    <SummaryCard label="Active" value={counts.active ?? 0} icon={CircleCheck} tone="red" mono={false} />
                    <SummaryCard label="Overruled / Questioned" value={totals.unsettled} icon={TriangleAlert} tone="amber" mono={false} />
                    <SummaryCard label="Avg. Relevance" value={totals.avgRelevance} icon={TrendingUp} tone="amber" mono={false} />
                </div>

                <div className="rounded-lg border bg-card shadow-sm">
                    <div className="p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <div className="relative w-64 min-w-40 shrink">
                                    <Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && apply({ search })}
                                        className="h-8 w-full px-9"
                                    />
                                </div>

                                <Dropdown value={filters.category ?? ''} onChange={(v) => apply({ category: v })} placeholder="All Categories" options={options.categories.map((c) => ({ value: c, label: c }))} className="h-9 w-40" capitalize />

                                <Dropdown value={filters.score ?? ''} onChange={(v) => apply({ score: v })} placeholder="All Scores" options={options.scores.map((s) => ({ value: s, label: SCORE_LABEL[s] }))} className="h-9 w-40" />
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {hasFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 text-muted-foreground"
                                        onClick={() => {
                                            setSearch('');
                                            router.get('/precedents');
                                        }}
                                    >
                                        <RefreshCcw className="size-4" /> Clear Filters
                                    </Button>
                                )}
                                <span className="flex h-8 items-center gap-1.5 rounded-md border px-2 text-sm text-muted-foreground">
                                    <Filter className="size-4" /> Filters
                                </span>
                            </div>
                        </div>
                    </div>

                    <CountTabs
                        value={filters.status ?? ''}
                        onSelect={(v) => apply({ status: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                            ...options.statuses.map((s) => ({ value: s, label: STATUS[s].label, icon: STATUS[s].icon, count: counts[s] ?? 0 })),
                        ]}
                    />
                </div>

                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="w-12 px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Case Name</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Jurisdiction</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Category</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Relevance</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Decision Date</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                                    <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {precedents.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                                            No precedents match these filters.
                                        </td>
                                    </tr>
                                )}
                                {precedents.data.map((p, i) => {
                                    const tone = scoreTone(p.relevance);

                                    return (
                                        <tr key={p.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                                            <td className="px-4 py-2.5 font-medium tabular-nums">{(precedents.from ?? 1) + i}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="font-medium">{p.case_name}</div>
                                                <div className="text-sm text-muted-foreground">{p.citation}</div>
                                            </td>
                                            <td className="px-4 py-2.5 text-sm">{p.jurisdiction ?? p.court ?? '—'}</td>
                                            <td className="px-4 py-2.5 capitalize">{p.category ?? '—'}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="min-w-[100px] space-y-1.5">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="text-xs font-bold tabular-nums">
                                                            {Math.round(p.relevance / 10)}
                                                            <span className="font-normal text-muted-foreground">/10</span>
                                                        </span>
                                                        <span className={cn('text-[10px] font-semibold tabular-nums', tone.text)}>{p.relevance}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                        <div className={cn('h-full rounded-full transition-all', tone.bar)} style={{ width: `${p.relevance}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                                                    <Calendar className="size-4" />
                                                    <span>{p.decided_on ? date(p.decided_on) : '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <RingPill value={STATUS[p.status].tone} label={STATUS[p.status].label} />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    {p.matter_id && (
                                                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" asChild title="View case">
                                                            <Link href={`/matters/${p.matter_id}`}>
                                                                <Eye className="size-4" />
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="Edit" onClick={() => openEdit(p)}>
                                                        <SquarePen className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-muted-foreground"
                                                        title="Move to the next status"
                                                        onClick={() => router.patch(`/precedents/${p.id}/status`, {}, { preserveScroll: true })}
                                                    >
                                                        <RefreshCw className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-muted-foreground"
                                                        title="Delete"
                                                        onClick={() => confirmAction({ title: `Delete ${p.case_name}?` }).then((ok) => ok && router.delete(`/precedents/${p.id}`, { preserveScroll: true }))}
                                                    >
                                                        <Trash2 className="size-4 text-rose-600" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <DataTableFooter
                        from={precedents.from}
                        to={precedents.to}
                        total={precedents.total}
                        links={precedents.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>
            </div>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? `Edit ${editing.case_name}` : 'Add Legal Precedent'}
                onSubmit={submit}
                processing={form.processing}
                wide
            >
                <TextField
                    label="Case name"
                    value={form.data.case_name}
                    onChange={(v) => form.setData('case_name', v)}
                    error={form.errors.case_name}
                    className="sm:col-span-2"
                />
                <TextField label="Citation" value={form.data.citation} onChange={(v) => form.setData('citation', v)} error={form.errors.citation} />
                <TextField
                    label="Jurisdiction"
                    value={form.data.jurisdiction}
                    onChange={(v) => form.setData('jurisdiction', v)}
                    error={form.errors.jurisdiction}
                    placeholder="United States"
                />
                <TextField label="Court" value={form.data.court} onChange={(v) => form.setData('court', v)} error={form.errors.court} />
                <SelectField
                    label="Category"
                    value={form.data.category}
                    onChange={(v) => form.setData('category', v)}
                    options={options.categories.map((c) => ({ value: c, label: c }))}
                    placeholder="—"
                />
                <TextField
                    label="Decision date"
                    type="date"
                    value={form.data.decided_on}
                    onChange={(v) => form.setData('decided_on', v)}
                    error={form.errors.decided_on}
                />
                <SelectField
                    label="Case"
                    value={form.data.matter_id}
                    onChange={(v) => form.setData('matter_id', v)}
                    options={options.matters.map((m) => ({ value: m.id, label: m.label }))}
                    placeholder="No case"
                />
                <TextField
                    label="Relevance (0–100)"
                    type="number"
                    min={0}
                    max={100}
                    value={form.data.relevance}
                    onChange={(v) => form.setData('relevance', Number(v))}
                    error={form.errors.relevance}
                />
                <SelectField
                    label="Status"
                    value={form.data.status}
                    onChange={(v) => form.setData('status', v)}
                    options={options.statuses.map((s) => ({ value: s, label: STATUS[s].label }))}
                />
                <TextareaField
                    label="Holding"
                    value={form.data.holding}
                    onChange={(v) => form.setData('holding', v)}
                    error={form.errors.holding}
                    rows={4}
                    className="sm:col-span-2"
                />
            </FormDialog>
        </AppLayout>
    );
}
