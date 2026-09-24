import { AvatarStack, InitialsAvatar } from '@/components/avatar-stack';
import { confirmAction } from '@/components/confirm-dialog';
import { DataTableFooter } from '@/components/data-table-footer';
import { Dropdown } from '@/components/dropdown';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { SortableHead } from '@/components/sortable-head';
import { SummaryCard } from '@/components/summary-card';
import { RingPill, TonePill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Client, Court, Matter, Paginated, User } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Calendar,
    Eye,
    Filter,
    Gauge,
    LayoutGrid,
    Lock,
    LockOpen,
    Plus,
    RefreshCcw,
    Scale,
    Search,
    SquarePen,
    Tag,
    Trash2,
    TrendingDown,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Cases', href: '/matters' }];

interface Options {
    clients: Client[];
    courts: Court[];
    users: User[];
    caseTypes: string[];
    practiceAreas: string[];
    statuses: string[];
    priorities: string[];
}

interface Props {
    matters: Paginated<Matter>;
    filters: Record<string, string>;
    sort: { column: string; direction: string; perPage: number };
    counts: { all: number; active: number; low: number; medium: number; high: number };
    typeColors: Record<string, string | null>;
    options: Options;
}

const STATUS_COLOR: Record<string, string> = { open: '#6b7280', pending: '#f59e0b', closed: '#f97316' };
const FALLBACK_TYPE_COLOR = '#06b6d4';

const PRIORITY_TABS = [
    { value: '', label: 'All', icon: LayoutGrid },
    { value: 'low', label: 'Low', icon: TrendingDown },
    { value: 'medium', label: 'Medium', icon: Gauge },
    { value: 'high', label: 'High', icon: TriangleAlert },
];

const empty = () => ({
    client_id: '',
    lead_lawyer_id: '',
    court_id: '',
    title: '',
    practice_area: '',
    case_type: 'civil',
    priority: 'medium',
    judge: '',
    opposing_party: '',
    opposing_counsel: '',
    status: 'open',
    opened_on: new Date().toISOString().slice(0, 10),
    expected_completion: '',
    hourly_rate: '250',
    description: '',
});

export default function MattersIndex({ matters, filters, sort, counts, typeColors, options }: Props) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const form = useForm(empty());

    const hasFilters = Boolean(filters.search || filters.status || filters.priority || filters.case_type || filters.court_id);

    function apply(patch: Record<string, string | number>) {
        router.get('/matters', { ...filters, ...sortParams(), ...patch }, { preserveState: true, replace: true });
    }

    function sortParams() {
        return { sort: sort.column, direction: sort.direction, per_page: sort.perPage };
    }

    function toggleSort(column: string) {
        const direction = sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc';
        router.get('/matters', { ...filters, sort: column, direction, per_page: sort.perPage }, { preserveState: true, replace: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cases" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Cases</h1>
                        <p className="text-muted-foreground text-xs">Manage all your legal cases and track their progress.</p>
                    </div>
                    <Button
                        onClick={() => {
                            form.setData(empty());
                            form.clearErrors();
                            setOpen(true);
                        }}
                    >
                        <Plus className="size-4" /> Add Case
                    </Button>
                </div>

                <div className="mb-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <SummaryCard label="Total Cases" value={counts.all} icon={Scale} tone="gray" />
                    <SummaryCard label="Low Priority" value={counts.low} icon={TrendingDown} tone="blue" />
                    <SummaryCard label="Medium Priority" value={counts.medium} icon={Gauge} tone="amber" />
                    <SummaryCard label="High Priority" value={counts.high} icon={TriangleAlert} tone="red" />
                </div>

                <div className="bg-card rounded-lg border shadow-sm">
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

                                <Select
                                    value={filters.case_type ?? ''}
                                    onChange={(v) => apply({ case_type: v })}
                                    placeholder="All Types"
                                    options={options.caseTypes}
                                />
                                <Select
                                    value={filters.status ?? ''}
                                    onChange={(v) => apply({ status: v })}
                                    placeholder="All Status"
                                    options={options.statuses}
                                />
                                <Select
                                    value={filters.court_id ?? ''}
                                    onChange={(v) => apply({ court_id: v })}
                                    placeholder="All Courts"
                                    options={options.courts.map((c) => ({ value: String(c.id), label: c.name }))}
                                />
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {hasFilters && (
                                    <Button variant="ghost" size="sm" className="text-muted-foreground h-9" onClick={() => router.get('/matters')}>
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
                            {PRIORITY_TABS.map((tab) => {
                                const active = (filters.priority ?? '') === tab.value;
                                const count = tab.value === '' ? counts.all : counts[tab.value as 'low' | 'medium' | 'high'];

                                return (
                                    <button
                                        key={tab.label}
                                        type="button"
                                        onClick={() => apply({ priority: tab.value })}
                                        className={cn(
                                            'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
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
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="text-muted-foreground w-12 px-4 py-2.5 text-left font-semibold">#</th>
                                    <SortableHead label="Title" column="title" sort={sort} onSort={toggleSort} />
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Client</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Team</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Status</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Priority</th>
                                    <SortableHead label="Filing Date" column="opened_on" sort={sort} onSort={toggleSort} />
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Active Status</th>
                                    <th className="text-muted-foreground w-24 px-4 py-2.5 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matters.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="text-muted-foreground py-12 text-center text-sm">
                                            No cases match these filters.
                                        </td>
                                    </tr>
                                )}
                                {matters.data.map((m, i) => {
                                    const active = m.status !== 'closed';

                                    return (
                                        <tr key={m.id} className="hover:bg-muted/40 border-b transition-colors last:border-0">
                                            <td className="px-4 py-2.5 font-medium tabular-nums">{(matters.from ?? 1) + i}</td>
                                            <td className="px-4 py-2.5">
                                                <Link href={`/matters/${m.id}`} className="font-medium hover:underline">
                                                    {m.title}
                                                </Link>
                                                {m.case_type && (
                                                    <div className="mt-1">
                                                        <TonePill color={typeColors[m.case_type] ?? FALLBACK_TYPE_COLOR}>
                                                            <Tag className="size-3" />
                                                            <span className="capitalize">{m.case_type}</span>
                                                        </TonePill>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                {m.client ? (
                                                    <div className="flex items-center gap-2">
                                                        <InitialsAvatar name={m.client.name} />
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm font-medium">{m.client.name}</div>
                                                            <div className="text-muted-foreground truncate text-xs">
                                                                {m.client.email ?? m.client.company ?? '—'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <AvatarStack
                                                    names={[m.lead_lawyer?.name, ...(m.team ?? []).map((u) => u.name)].filter(Boolean) as string[]}
                                                />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <TonePill color={STATUS_COLOR[m.status] ?? '#6b7280'}>
                                                    <span className="capitalize">{m.status}</span>
                                                </TonePill>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <RingPill value={m.priority} />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="text-muted-foreground flex items-center gap-2 whitespace-nowrap">
                                                    <Calendar className="size-4" />
                                                    <span>{m.opened_on?.slice(0, 10)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <RingPill value={active ? 'active' : 'inactive'} label={active ? 'Active' : 'Inactive'} />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground size-8" asChild title="View">
                                                        <Link href={`/matters/${m.id}`}>
                                                            <Eye className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground size-8"
                                                        title="Edit"
                                                        onClick={() => router.visit(`/matters/${m.id}`)}
                                                    >
                                                        <SquarePen className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground size-8"
                                                        title={active ? 'Close case' : 'Reopen case'}
                                                        onClick={() => router.patch(`/matters/${m.id}/toggle-status`, {}, { preserveScroll: true })}
                                                    >
                                                        {active ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground size-8"
                                                        title="Delete"
                                                        onClick={() =>
                                                            confirmAction({ title: `Delete ${m.reference} and everything on it?` }).then(
                                                                (ok) => ok && router.delete(`/matters/${m.id}`, { preserveScroll: true }),
                                                            )
                                                        }
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
                        from={matters.from}
                        to={matters.to}
                        total={matters.total}
                        links={matters.links}
                        perPage={sort.perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>
            </div>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title="Add Case"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post('/matters', { onSuccess: () => setOpen(false) });
                }}
                processing={form.processing}
                submitLabel="Open case"
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
                    label="Client"
                    value={form.data.client_id}
                    onChange={(v) => form.setData('client_id', v)}
                    options={options.clients.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Select client…"
                    error={form.errors.client_id}
                />
                <SelectField
                    label="Lead lawyer"
                    value={form.data.lead_lawyer_id}
                    onChange={(v) => form.setData('lead_lawyer_id', v)}
                    options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                    placeholder="Unassigned"
                />
                <SelectField
                    label="Case type"
                    value={form.data.case_type}
                    onChange={(v) => form.setData('case_type', v)}
                    options={options.caseTypes.map((t) => ({ value: t, label: t }))}
                />
                <SelectField
                    label="Priority"
                    value={form.data.priority}
                    onChange={(v) => form.setData('priority', v)}
                    options={options.priorities.map((p) => ({ value: p, label: p }))}
                />
                <SelectField
                    label="Court"
                    value={form.data.court_id}
                    onChange={(v) => form.setData('court_id', v)}
                    options={options.courts.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Not filed yet"
                />
                <TextField label="Judge" value={form.data.judge} onChange={(v) => form.setData('judge', v)} />
                <TextField label="Opposing party" value={form.data.opposing_party} onChange={(v) => form.setData('opposing_party', v)} />
                <TextField label="Opposing counsel" value={form.data.opposing_counsel} onChange={(v) => form.setData('opposing_counsel', v)} />
                <TextField
                    label="Filing date"
                    type="date"
                    value={form.data.opened_on}
                    onChange={(v) => form.setData('opened_on', v)}
                    error={form.errors.opened_on}
                />
                <TextField
                    label="Expected completion"
                    type="date"
                    value={form.data.expected_completion}
                    onChange={(v) => form.setData('expected_completion', v)}
                    error={form.errors.expected_completion}
                />
                <TextField
                    label="Hourly rate"
                    type="number"
                    step="0.01"
                    value={form.data.hourly_rate}
                    onChange={(v) => form.setData('hourly_rate', v)}
                    error={form.errors.hourly_rate}
                />
                <SelectField
                    label="Status"
                    value={form.data.status}
                    onChange={(v) => form.setData('status', v)}
                    options={options.statuses.map((s) => ({ value: s, label: s }))}
                />
                <TextareaField
                    label="Description"
                    value={form.data.description}
                    onChange={(v) => form.setData('description', v)}
                    className="sm:col-span-2"
                />
            </FormDialog>
        </AppLayout>
    );
}

/** A filter-bar dropdown; plain strings in the list are both value and label. */
function Select({
    value,
    onChange,
    placeholder,
    options,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    options: (string | { value: string; label: string })[];
}) {
    return (
        <Dropdown
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            options={options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option))}
            className="h-9 w-40"
            capitalize
        />
    );
}
