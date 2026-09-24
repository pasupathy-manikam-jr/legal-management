import { DataTableFooter } from '@/components/data-table-footer';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { CountTabs } from '@/components/page-toolbar';
import { SummaryCard } from '@/components/summary-card';
import { RingPill, TonePill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import type { BreadcrumbItem, Paginated, User } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Calendar,
    CircleCheck,
    Clock,
    Eye,
    LayoutGrid,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    ShieldX,
    SquarePen,
    Trash2,
    TriangleAlert,
    User as UserIcon,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Compliance Requirements', href: '/compliance/requirements' }];

interface Requirement {
    id: number;
    title: string;
    category: string | null;
    frequency: string | null;
    priority: string;
    status: string;
    state: string;
    days_overdue: number | null;
    requirement: string | null;
    due_on: string | null;
    last_reviewed_on: string | null;
    owner_id: number | null;
    owner: string | null;
    owner_title: string | null;
}

interface Category {
    name: string;
    color: string | null;
}

const STATE_LABEL: Record<string, string> = {
    compliant: 'Compliant',
    in_progress: 'In Progress',
    non_compliant: 'Non Compliant',
    pending: 'Pending',
    overdue: 'Overdue',
};

/** The ring colour each state wears, in the table and on its row icon. */
const STATE_RING: Record<string, string> = {
    compliant: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300',
    in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300',
    non_compliant: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300',
    pending: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300',
    overdue: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300',
};

const STATE_ICON: Record<string, typeof CircleCheck> = {
    compliant: CircleCheck,
    in_progress: RefreshCw,
    non_compliant: ShieldX,
    pending: Clock,
    overdue: TriangleAlert,
};

const FALLBACK_COLOR = '#6b7280';

const empty = () => ({
    owner_id: '',
    title: '',
    category: '',
    frequency: '',
    priority: 'medium',
    status: 'pending',
    requirement: '',
    due_on: '',
    last_reviewed_on: '',
});

export default function ComplianceRequirements({
    requirements,
    filters,
    perPage,
    counts,
    options,
}: {
    requirements: Paginated<Requirement>;
    filters: Record<string, string>;
    perPage: number;
    counts: Record<string, number>;
    options: { users: User[]; statuses: string[]; priorities: string[]; categories: Category[]; frequencies: string[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Requirement | null>(null);
    const [viewing, setViewing] = useState<Requirement | null>(null);
    const form = useForm(empty());

    const apply = (patch: Record<string, string | number>) =>
        router.get('/compliance/requirements', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });

    const colorOf = (name: string | null) => options.categories.find((c) => c.name === name)?.color ?? FALLBACK_COLOR;

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(r: Requirement) {
        form.setData({
            owner_id: r.owner_id ? String(r.owner_id) : '',
            title: r.title,
            category: r.category ?? '',
            frequency: r.frequency ?? '',
            priority: r.priority,
            status: r.status,
            requirement: r.requirement ?? '',
            due_on: r.due_on ?? '',
            last_reviewed_on: r.last_reviewed_on ?? '',
        });
        form.clearErrors();
        setEditing(r);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        editing ? form.put(`/compliance/requirements/${editing.id}`, done) : form.post('/compliance/requirements', done);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Compliance Requirements" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Compliance Requirements</h1>
                        <p className="text-xs text-muted-foreground">Track and manage compliance requirements.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Compliance Requirement
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard label="Total" value={counts.all ?? 0} icon={ShieldCheck} tone="gray" mono={false} />
                    <SummaryCard label="Compliant" value={counts.compliant ?? 0} icon={CircleCheck} tone="emerald" mono={false} />
                    <SummaryCard label="Non Compliant" value={counts.non_compliant ?? 0} icon={ShieldX} tone="red" mono={false} />
                    <SummaryCard label="Overdue" value={counts.overdue ?? 0} icon={TriangleAlert} tone="amber" mono={false} />
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

                        <Dropdown value={filters.priority ?? ''} onChange={(v) => apply({ priority: v })} placeholder="All Priorities" options={options.priorities.map((p) => ({ value: p, label: p }))} className="h-9 w-40" aria-label="Priority filter" capitalize />
                    </div>

                    <CountTabs
                        value={filters.state ?? ''}
                        onSelect={(v) => apply({ state: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                            { value: 'compliant', label: 'Compliant', icon: CircleCheck, count: counts.compliant ?? 0 },
                            { value: 'in_progress', label: 'In Progress', icon: RefreshCw, count: counts.in_progress ?? 0 },
                            { value: 'non_compliant', label: 'Non Compliant', icon: ShieldX, count: counts.non_compliant ?? 0 },
                            { value: 'overdue', label: 'Overdue', icon: TriangleAlert, count: counts.overdue ?? 0 },
                            { value: 'pending', label: 'Pending', icon: Clock, count: counts.pending ?? 0 },
                        ]}
                    />
                </div>

                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="w-12 px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Requirement</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Category</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Deadline</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Priority</th>
                                    <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {requirements.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                                            Nothing recorded.
                                        </td>
                                    </tr>
                                )}
                                {requirements.data.map((r, i) => {
                                    const Icon = STATE_ICON[r.state] ?? Clock;

                                    return (
                                        <tr key={r.id} className="transition-colors hover:bg-muted/40">
                                            <td className="px-4 py-2.5 font-medium tabular-nums">{(requirements.from ?? 1) + i}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex max-w-xs items-center gap-3">
                                                    <div className={`mt-0.5 shrink-0 rounded-md p-1.5 ring-1 ring-inset ${STATE_RING[r.state] ?? STATE_RING.pending}`}>
                                                        <Icon className="size-3.5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm leading-snug font-medium">{r.title}</p>
                                                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                                            <UserIcon className="size-3 shrink-0" />
                                                            {r.owner ?? 'Unassigned'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                {r.category ? (
                                                    <TonePill color={colorOf(r.category)}>{r.category}</TonePill>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                {r.due_on ? (
                                                    <div className={`flex flex-col gap-1 ${r.days_overdue === null ? 'text-muted-foreground' : 'text-red-500'}`}>
                                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                                            <Calendar className="size-4" />
                                                            <span>{date(r.due_on)}</span>
                                                        </div>
                                                        {r.days_overdue !== null && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <Clock className="size-4" />
                                                                <span>{r.days_overdue} days overdue</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${STATE_RING[r.state] ?? STATE_RING.pending}`}
                                                >
                                                    {STATE_LABEL[r.state] ?? r.state}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <RingPill value={r.priority} />
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
                                                        title="Move to next status"
                                                        onClick={() => router.patch(`/compliance/requirements/${r.id}/status`, {}, { preserveScroll: true })}
                                                    >
                                                        <RefreshCw className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-muted-foreground"
                                                        title="Delete"
                                                        onClick={() =>
                                                            confirmAction({ title: `Delete ${r.title}?` }).then((ok) => ok && router.delete(`/compliance/requirements/${r.id}`, { preserveScroll: true }))
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
                        from={requirements.from}
                        to={requirements.to}
                        total={requirements.total}
                        links={requirements.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? 'Edit Compliance Requirement' : 'Add Compliance Requirement'}
                    onSubmit={submit}
                    processing={form.processing}
                    submitLabel={editing ? 'Save' : 'Add Requirement'}
                    wide
                >
                    <TextField label="Title" value={form.data.title} onChange={(v) => form.setData('title', v)} error={form.errors.title} className="sm:col-span-2" />
                    <SelectField
                        label="Category"
                        value={form.data.category}
                        onChange={(v) => form.setData('category', v)}
                        options={options.categories.map((c) => ({ value: c.name, label: c.name }))}
                        placeholder="—"
                        error={form.errors.category}
                    />
                    <SelectField
                        label="Frequency"
                        value={form.data.frequency}
                        onChange={(v) => form.setData('frequency', v)}
                        options={options.frequencies.map((f) => ({ value: f, label: f }))}
                        placeholder="—"
                        error={form.errors.frequency}
                    />
                    <SelectField
                        label="Owner"
                        value={form.data.owner_id}
                        onChange={(v) => form.setData('owner_id', v)}
                        options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                        placeholder="Unassigned"
                    />
                    <SelectField
                        label="Priority"
                        value={form.data.priority}
                        onChange={(v) => form.setData('priority', v)}
                        options={options.priorities.map((p) => ({ value: p, label: p }))}
                    />
                    <SelectField
                        label="Status"
                        value={form.data.status}
                        onChange={(v) => form.setData('status', v)}
                        options={options.statuses.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
                    />
                    <TextField label="Deadline" type="date" value={form.data.due_on} onChange={(v) => form.setData('due_on', v)} error={form.errors.due_on} />
                    <TextField
                        label="Last reviewed"
                        type="date"
                        value={form.data.last_reviewed_on}
                        onChange={(v) => form.setData('last_reviewed_on', v)}
                        error={form.errors.last_reviewed_on}
                    />
                    <TextareaField label="What is required" value={form.data.requirement} onChange={(v) => form.setData('requirement', v)} className="sm:col-span-2" />
                </FormDialog>

                <Dialog open={!!viewing} onOpenChange={(next) => !next && setViewing(null)}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{viewing?.title}</DialogTitle>
                        </DialogHeader>
                        {viewing && (
                            <div className="space-y-4 text-sm">
                                <div className="flex flex-wrap gap-2">
                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${STATE_RING[viewing.state]}`}>
                                        {STATE_LABEL[viewing.state]}
                                    </span>
                                    <RingPill value={viewing.priority} />
                                    {viewing.category && <TonePill color={colorOf(viewing.category)}>{viewing.category}</TonePill>}
                                </div>
                                <dl className="grid grid-cols-2 gap-3">
                                    <Detail label="Owner" value={viewing.owner ?? 'Unassigned'} hint={viewing.owner_title} />
                                    <Detail label="Frequency" value={viewing.frequency ?? '—'} />
                                    <Detail label="Deadline" value={date(viewing.due_on)} hint={viewing.days_overdue ? `${viewing.days_overdue} days overdue` : null} />
                                    <Detail label="Last reviewed" value={date(viewing.last_reviewed_on)} />
                                </dl>
                                {viewing.requirement && (
                                    <div>
                                        <p className="mb-1 text-xs text-muted-foreground">What is required</p>
                                        <p className="whitespace-pre-line">{viewing.requirement}</p>
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

function Detail({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
    return (
        <div>
            <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
            <dd className="capitalize">{value}</dd>
            {hint && <dd className="text-xs text-rose-600">{hint}</dd>}
        </div>
    );
}
