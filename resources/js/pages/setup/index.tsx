import { DataTableFooter } from '@/components/data-table-footer';
import { FormDialog } from '@/components/form-dialog';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { CountTabs } from '@/components/page-toolbar';
import { SortableHead } from '@/components/sortable-head';
import { RingPill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    BookOpen,
    Calendar,
    CircleCheck,
    CircleX,
    ClipboardCheck,
    Clock,
    FileText,
    LayoutGrid,
    Lock,
    LockOpen,
    Plus,
    Receipt,
    Scale,
    Search,
    ShieldCheck,
    SquarePen,
    Tag,
    Trash2,
    TriangleAlert,
    Users,
    X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useState, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Firm Setup', href: '/setup' }];

type Meta = {
    is_default?: boolean;
    is_closed?: boolean;
    duration_minutes?: number | string;
    days?: number | string;
    expertise?: string;
    primary?: boolean;
    practice_area?: string;
    type?: string;
    url?: string;
    note?: string;
};

interface Entry {
    id: number;
    kind: string;
    name: string;
    description: string | null;
    color: string | null;
    sort: number;
    active: boolean;
    created_at: string;
    meta: Meta | null;
}

interface Facet {
    key: string;
    label: string;
    values: string[];
    /** True when the facet owns the tab strip; false when it is just a filter. */
    tabs: boolean;
}

/** Facet values live in meta under a key the list chooses. */
const metaValue = (entry: Entry, key: string) => (entry.meta as Record<string, string> | null)?.[key] ?? '';

interface Parent {
    kind: string;
    label: string;
    options: string[];
}

const FALLBACK_COLOR = '#3B82F6';

/** Lists whose sentence needs saying differently from "Manage X for your Y." */
const SUBTITLES: Record<string, string> = {
    client_type: 'Define and manage client type classifications.',
    document_type: 'Define and manage document type classifications.',
    expense_category: 'Define and manage categories used to classify employee expenses.',
    compliance_frequency: 'Define recurring schedules for compliance tasks.',
    risk_category: 'Classify and group risks for your compliance program.',
    audit_type: 'Define and manage audit type classifications.',
    court_type: 'Define and manage court type classifications.',
};

/** Day counts a firm recognises by name; anything else is shown as an interval. */
/** Lists whose field and column read shorter than the list's full name. */
const SHORT_NAMES: Record<string, string> = { expense_category: 'Category' };

const CADENCES: Record<number, true> = { 1: true, 7: true, 30: true, 90: true, 180: true, 365: true };

function cadence(entry: Entry): string {
    const days = Number(entry.meta?.days ?? 0);

    return !days || CADENCES[days] ? entry.name : `${days} days`;
}

/** The tile each list draws beside an entry's name; the rest fall back by family. */
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
    client_type: Users,
    document_type: FileText,
    expense_category: Receipt,
    risk_category: TriangleAlert,
    audit_type: ClipboardCheck,
    court_type: Scale,
};

/** A sample entry per list, so the name field hints at what belongs in it. */
const EXAMPLES: Record<string, string> = {
    case_type: 'Criminal Law',
    case_status: 'Awaiting judgement',
    hearing_type: 'Motion Hearing',
    court_type: 'High Court, District Court',
    event_type: 'Filing',
    document_type: 'Contract, Affidavit',
    practice_area: 'Litigation',
    research_type: 'Case Law, Statutory',
    research_category: 'Procedure',
    research_source: 'Law reports',
    compliance_category: 'Data Privacy, Financial',
    compliance_frequency: 'Daily, Monthly, Quarterly',
    risk_category: 'High, Medium, Low',
    audit_type: 'Internal, External',
    expense_category: 'Travel, Office Supplies',
    task_type: 'Drafting',
    task_status: 'In Progress, On Hold',
    client_type: 'Corporate',
};

const blank = (kind: string, sort: number) => ({
    kind,
    name: '',
    description: '',
    color: FALLBACK_COLOR,
    sort,
    active: true as boolean,
    meta: {} as Meta,
});

export default function SetupIndex({
    kind,
    kinds,
    label,
    singular,
    layout,
    hasColor,
    hasUrl,
    facet,
    parent,
    entries,
    filters,
    perPage,
    sort,
    counts,
    kindCounts,
    names,
}: {
    kind: string;
    kinds: Record<string, string>;
    label: string;
    singular: string;
    layout: 'form' | 'table';
    hasColor: boolean;
    hasUrl: boolean;
    facet: Facet | null;
    parent: Parent | null;
    entries: Paginated<Entry>;
    filters: Record<string, string>;
    perPage: number;
    sort: { column: string; direction: string };
    counts: Record<string, number>;
    kindCounts: Record<string, number>;
    names: string[];
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [editing, setEditing] = useState<Entry | null>(null);
    const [open, setOpen] = useState(false);
    const form = useForm<{ kind: string; name: string; description: string; color: string; sort: number; active: boolean; meta: Meta }>(
        blank(kind, entries.total),
    );

    const lower = label.toLowerCase();
    const isStatus = kind === 'case_status';
    const hasDuration = kind === 'hearing_type';
    const hasDays = kind === 'compliance_frequency';
    const created = (value: string) => new Date(value).toISOString().slice(0, 10);
    const compliance = kind.startsWith('compliance') || kind === 'risk_category' || kind === 'audit_type';
    const shortName = SHORT_NAMES[kind] ?? singular;
    const icon = ICONS[kind] ?? (kind.startsWith('research') ? BookOpen : hasDays ? Clock : compliance ? ShieldCheck : Tag);
    // "Manage hearing types for your hearings." — the sentence names what the list feeds.
    const noun = kind === 'hearing_type' ? 'hearings' : kind === 'document_type' ? 'documents' : kind.startsWith('task_') ? 'tasks' : kind.startsWith('research') ? 'legal research' : compliance ? 'organization' : 'cases';

    function openCreate() {
        reset();
        setOpen(true);
    }

    function apply(patch: Record<string, string | number>) {
        const params = { kind, ...filters, per_page: perPage, sort: sort.column, direction: sort.direction, ...patch };

        router.get('/setup', params, { preserveState: true, replace: true });
    }

    function toggleSort(column: string) {
        apply({ sort: column, direction: sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc' });
    }

    function reset() {
        form.setData(blank(kind, entries.total));
        form.clearErrors();
        setEditing(null);
        setOpen(false);
    }

    function edit(entry: Entry) {
        form.setData({
            kind,
            name: entry.name,
            description: entry.description ?? '',
            color: entry.color ?? FALLBACK_COLOR,
            sort: entry.sort,
            active: entry.active,
            meta: entry.meta ?? {},
        });
        form.clearErrors();
        setEditing(entry);
        setOpen(layout === 'table');
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => reset(), preserveScroll: true };
        editing ? form.put(`/setup/${editing.id}`, done) : form.post('/setup', done);
    }

    const fields = (
        <>
            <div className="space-y-2">
                <Label htmlFor="name">
                    {shortName} Name <span className="text-sm text-red-500">*</span>
                </Label>
                <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder={`eg. ${EXAMPLES[kind] ?? 'New entry'}`} required />
                {form.errors.name && <p className="text-xs text-rose-600">{form.errors.name}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                    id="description"
                    rows={3}
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    placeholder={`Enter ${singular.toLowerCase()} description...`}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {form.errors.description && <p className="text-xs text-rose-600">{form.errors.description}</p>}
            </div>

            {hasDays && (
                <div className="space-y-2">
                    <Label htmlFor="days">Days</Label>
                    <Input
                        id="days"
                        type="number"
                        min={1}
                        value={form.data.meta.days ?? ''}
                        onChange={(e) => form.setData('meta', { ...form.data.meta, days: e.target.value })}
                        placeholder="eg. 30"
                    />
                    {(form.errors as Record<string, string>)['meta.days'] && (
                        <p className="text-xs text-rose-600">{(form.errors as Record<string, string>)['meta.days']}</p>
                    )}
                </div>
            )}

            {hasDuration && (
                <div className="space-y-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input
                        id="duration"
                        type="number"
                        min={5}
                        max={1440}
                        value={form.data.meta.duration_minutes ?? ''}
                        onChange={(e) => form.setData('meta', { ...form.data.meta, duration_minutes: e.target.value })}
                        placeholder="45"
                    />
                    {(form.errors as Record<string, string>)['meta.duration_minutes'] && (
                        <p className="text-xs text-rose-600">{(form.errors as Record<string, string>)['meta.duration_minutes']}</p>
                    )}
                </div>
            )}

            {hasColor && (
                <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="color"
                            type="color"
                            value={form.data.color}
                            onChange={(e) => form.setData('color', e.target.value)}
                            className="h-10 w-14 cursor-pointer p-1"
                        />
                        <Input
                            value={form.data.color}
                            onChange={(e) => form.setData('color', e.target.value)}
                            pattern="^#[0-9A-Fa-f]{6}$"
                            placeholder="#000000"
                            className="font-mono text-sm uppercase"
                        />
                    </div>
                    {form.errors.color && <p className="text-xs text-rose-600">{form.errors.color}</p>}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Dropdown value={form.data.active ? 'active' : 'inactive'} onChange={(v) => form.setData('active', v === 'active')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} className="h-10 w-full" />
            </div>

            {parent && (
                <div className="space-y-2">
                    <Label htmlFor="parent">
                        {parent.label} <span className="text-sm text-red-500">*</span>
                    </Label>
                    <Dropdown value={form.data.meta.practice_area ?? ''} onChange={(v) => form.setData('meta', { ...form.data.meta, practice_area: v })} placeholder={`Select ${parent.label.toLowerCase()}`} options={parent.options.map((o) => ({ value: o, label: o }))} className="h-10 w-full" capitalize />
                    {(form.errors as Record<string, string>)['meta.practice_area'] && (
                        <p className="text-xs text-rose-600">{(form.errors as Record<string, string>)['meta.practice_area']}</p>
                    )}
                </div>
            )}

            {facet && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="facet" className="capitalize">
                            {facet.label}
                        </Label>
                        <Dropdown value={(form.data.meta as Record<string, string>)[facet.key] ?? ''} onChange={(v) => form.setData('meta', { ...form.data.meta, [facet.key]: v })} placeholder="—" options={facet.values.map((v) => ({ value: v, label: v }))} className="h-10 w-full" capitalize />
                    </div>

                    <div className={cn('space-y-2', !facet.tabs && 'hidden')}>
                        <Label htmlFor="primary">Primary</Label>
                        <Dropdown value={form.data.meta.primary ? '1' : '0'} onChange={(v) => form.setData('meta', { ...form.data.meta, primary: v === '1' })} options={[{ value: '0', label: 'Secondary' }, { value: '1', label: 'Primary' }]} className="h-10 w-full" />
                    </div>
                </>
            )}

            {hasUrl && (
                <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                        id="url"
                        type="url"
                        value={form.data.meta.url ?? ''}
                        onChange={(e) => form.setData('meta', { ...form.data.meta, url: e.target.value })}
                        placeholder="https://westlaw.com"
                    />
                    {(form.errors as Record<string, string>)['meta.url'] && (
                        <p className="text-xs text-rose-600">{(form.errors as Record<string, string>)['meta.url']}</p>
                    )}
                </div>
            )}

            {isStatus && (
                <div className="space-y-2 rounded-md border p-3">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={!!form.data.meta.is_default}
                            onChange={(e) => form.setData('meta', { ...form.data.meta, is_default: e.target.checked })}
                        />
                        Default for new cases
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={!!form.data.meta.is_closed}
                            onChange={(e) => form.setData('meta', { ...form.data.meta, is_closed: e.target.checked })}
                        />
                        Counts as closed
                    </label>
                </div>
            )}
        </>
    );

    const formCard = (
        <div className="sticky top-4 rounded-lg border bg-card shadow-sm">
            <div className="border-b p-6">
                <h2 className="text-lg font-semibold">{editing ? `Edit ${singular}` : `Add New ${singular}`}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {editing ? `Update ${editing.name}` : `Fill in the details to create a new ${singular.toLowerCase()}`}
                </p>
            </div>
            <form onSubmit={submit} className="space-y-4 p-6">
                {fields}
                <div className="flex items-center gap-3 border-t pt-4">
                    <Button type="submit" className="flex-1" disabled={form.processing}>
                        {editing ? `Save ${singular}` : `Add ${singular}`}
                    </Button>
                    {editing && (
                        <Button type="button" variant="outline" onClick={reset}>
                            <X className="size-4" /> Cancel
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );

    const header = (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-xl font-semibold">{label}</h1>
                <p className="text-xs text-muted-foreground">{SUBTITLES[kind] ?? `Manage ${lower} for your ${noun}.`}</p>
            </div>
            <div className="flex items-center gap-2">
                <Dropdown value={kind} onChange={(v) => router.get('/setup', { kind: v })} options={Object.entries(kinds).map(([value, name]) => ({ value: value, label: `${name} (${kindCounts[value] ?? 0})` }))} className="h-9 w-56" aria-label="List to manage" />
                {layout === 'table' && (
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add {singular}
                    </Button>
                )}
            </div>
        </div>
    );

    const rows = (
        <table className="w-full caption-bottom text-sm">
            <thead>
                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                    {layout === 'table' && <th className="w-12 px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>}
                    <SortableHead label={shortName} column="name" sort={sort} onSort={toggleSort} />
                    {layout === 'table' && hasDuration && <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Duration (min)</th>}
                    {hasDays && <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Days</th>}
                    {facet && <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground capitalize">{facet.label}</th>}
                    {facet?.tabs && <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Primary</th>}
                    {hasUrl && <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">URL</th>}
                    {parent && <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">{parent.label}</th>}
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                    {facet?.tabs && <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Created At</th>}
                    <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {entries.data.length === 0 && (
                    <tr>
                        <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                            No {lower} match this view.
                        </td>
                    </tr>
                )}
                {entries.data.map((entry, i) => (
                    <tr key={entry.id} className="transition-colors hover:bg-muted/40">
                        {layout === 'table' && <td className="px-4 py-2.5 font-medium tabular-nums">{(entries.from ?? 1) + i}</td>}
                        <td className="px-4 py-4">
                            {layout === 'table' ? (
                                <span className="text-sm font-medium">{entry.name}</span>
                            ) : (
                                <EntryHeading entry={entry} icon={icon} hasColor={hasColor} />
                            )}
                        </td>
                        {layout === 'table' && hasDuration && (
                            <td className="px-4 py-2.5 text-muted-foreground">
                                {entry.meta?.duration_minutes ? `${entry.meta.duration_minutes} min` : '—'}
                            </td>
                        )}
                        {hasDays && (
                            <td className="px-3 py-4">
                                <RingPill value="cadence" label={cadence(entry)} />
                            </td>
                        )}
                        {facet && <td className="px-4 py-2.5 capitalize">{metaValue(entry, facet.key) || '—'}</td>}
                        {facet?.tabs && (
                            <td className="px-4 py-2.5">
                                <RingPill value={entry.meta?.primary ? 'low' : 'inactive'} label={entry.meta?.primary ? 'Primary' : 'Secondary'} />
                            </td>
                        )}
                        {hasUrl && (
                            <td className="max-w-[18rem] truncate px-4 py-2.5">
                                {entry.meta?.url ? (
                                    <a href={entry.meta.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                        {entry.meta.url}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </td>
                        )}
                        {parent && <td className="px-3 py-4 text-sm capitalize">{entry.meta?.practice_area ?? '—'}</td>}
                        <td className="px-3 py-4">
                            <RingPill value={entry.active ? 'active' : 'inactive'} label={entry.active ? 'Active' : 'Inactive'} />
                        </td>
                        {facet?.tabs && (
                            <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                                    <Calendar className="size-4" />
                                    <span>{created(entry.created_at)}</span>
                                </div>
                            </td>
                        )}
                        <td className="px-4 py-4 text-right">
                            <Actions entry={entry} onEdit={() => edit(entry)} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={label} />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                {header}

                {layout === 'form' ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-1">{formCard}</div>

                        <div className="space-y-4 lg:col-span-2">
                            <div className="rounded-lg border bg-card p-4 shadow-sm">
                                {/* One line: the search, its button, then the list's own filters. */}
                                <div className="flex min-w-0 items-center gap-2">
                                    <div className="relative min-w-32 flex-1">
                                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && apply({ search })}
                                            placeholder={`Search ${lower}...`}
                                            className="pl-10"
                                        />
                                    </div>
                                    <Button type="button" className="shrink-0" onClick={() => apply({ search })}>
                                        Search
                                    </Button>
                                    {parent && (
                                        <Dropdown value={filters.parent ?? ''} onChange={(v) => apply({ parent: v })} placeholder={`All ${parent.label}s`} options={parent.options.map((o) => ({ value: o, label: o }))} className="h-9 w-40 min-w-24 shrink" aria-label={`${parent.label} filter`} capitalize />
                                    )}
                                    <Dropdown value={filters.status ?? ''} onChange={(v) => apply({ status: v })} placeholder="All Statuses" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} className="h-9 w-36 min-w-24 shrink" aria-label="Status filter" />
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                                <div className="hidden overflow-x-auto lg:block">{rows}</div>

                                <div className="space-y-4 p-4 lg:hidden">
                                    {entries.data.map((entry) => (
                                        <div key={entry.id} className="rounded-lg border p-4 shadow-sm">
                                            <div className="mb-3 flex items-start justify-between">
                                                <EntryHeading entry={entry} icon={icon} hasColor={hasColor} />
                                                <Actions entry={entry} onEdit={() => edit(entry)} />
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-4 border-t pt-3">
                                                {hasDays && (
                                                    <div>
                                                        <p className="mb-1 text-xs text-muted-foreground">Days</p>
                                                        <RingPill value="cadence" label={cadence(entry)} />
                                                    </div>
                                                )}
                                                {parent && (
                                                    <div>
                                                        <p className="mb-1 text-xs text-muted-foreground">{parent.label}</p>
                                                        <span className="text-sm capitalize">{entry.meta?.practice_area ?? '—'}</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="mb-1 text-xs text-muted-foreground">Status</p>
                                                    <RingPill value={entry.active ? 'active' : 'inactive'} label={entry.active ? 'Active' : 'Inactive'} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
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

                                {facet && !facet.tabs && (
                                    <Dropdown value={filters.level ?? ''} onChange={(v) => apply({ level: v })} placeholder={`All ${facet.label}s`} options={facet.values.map((v) => ({ value: v, label: v }))} className="h-9 w-40" aria-label={`${facet.label} filter`} capitalize />
                                )}

                                {facet?.tabs && (
                                    <Dropdown value={filters.name ?? ''} onChange={(v) => apply({ name: v })} placeholder={`All ${label.replace(/^Practice /, '')}`} options={names.map((n) => ({ value: n, label: n }))} className="h-9 w-40" aria-label={`All ${label}`} capitalize />
                                )}

                                <Dropdown value={filters.status ?? ''} onChange={(v) => apply({ status: v })} placeholder="All Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} className="h-9 w-40" aria-label="Status filter" />
                            </div>

                            {facet?.tabs ? (
                                <CountTabs
                                    value={filters.level ?? ''}
                                    onSelect={(v) => apply({ level: v })}
                                    options={[
                                        { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                                        ...facet.values.map((v) => ({ value: v, label: v, count: counts[v] ?? 0 })),
                                    ]}
                                />
                            ) : (
                                <CountTabs
                                    value={filters.status ?? ''}
                                    onSelect={(v) => apply({ status: v })}
                                    options={[
                                        { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                                        { value: 'active', label: 'Active', icon: CircleCheck, count: counts.active ?? 0 },
                                        { value: 'inactive', label: 'Inactive', icon: CircleX, count: counts.inactive ?? 0 },
                                    ]}
                                />
                            )}
                        </div>

                        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                            <div className="w-full overflow-x-auto">{rows}</div>

                            <DataTableFooter
                                from={entries.from}
                                to={entries.to}
                                total={entries.total}
                                links={entries.links}
                                perPage={perPage}
                                onPerPage={(value) => apply({ per_page: value })}
                            />
                        </div>

                        <FormDialog
                            open={open}
                            onOpenChange={(next) => (next ? setOpen(true) : reset())}
                            title={editing ? `Edit ${singular}` : `Add ${singular}`}
                            onSubmit={submit}
                            processing={form.processing}
                            submitLabel={editing ? 'Save' : `Add ${singular}`}
                            wide
                        >
                            <div className="space-y-4 sm:col-span-2">{fields}</div>
                        </FormDialog>
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function EntryHeading({ entry, icon: Icon, hasColor }: { entry: Entry; icon: ComponentType<{ className?: string }>; hasColor: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    hasColor ? 'text-white' : 'bg-muted text-muted-foreground',
                )}
                style={hasColor ? { backgroundColor: entry.color ?? '#6b7280' } : undefined}
            >
                <Icon className="size-5" />
            </div>
            <div className="min-w-0">
                <div className="text-sm font-medium">{entry.name}</div>
                {entry.description && <div className="mt-0.5 line-clamp-2 max-w-xs text-sm text-muted-foreground">{entry.description}</div>}
                {entry.meta?.is_default && <span className="text-xs text-muted-foreground">Default</span>}
            </div>
        </div>
    );
}

function Actions({ entry, onEdit }: { entry: Entry; onEdit: () => void }) {
    return (
        <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="icon" className={cn('size-8 text-muted-foreground')} title="Edit" onClick={onEdit}>
                <SquarePen className="size-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                title={entry.active ? 'Retire' : 'Reactivate'}
                onClick={() => router.patch(`/setup/${entry.id}/toggle`, {}, { preserveScroll: true })}
            >
                {entry.active ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                title="Delete"
                onClick={() => confirmAction({ title: `Delete ${entry.name}?` }).then((ok) => ok && router.delete(`/setup/${entry.id}`, { preserveScroll: true }))}
            >
                <Trash2 className="size-4 text-rose-600" />
            </Button>
        </div>
    );
}
