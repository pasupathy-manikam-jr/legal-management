import { confirmAction } from '@/components/confirm-dialog';
import { DataTableFooter } from '@/components/data-table-footer';
import { Dropdown } from '@/components/dropdown';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { CountTabs } from '@/components/page-toolbar';
import { RingPill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated, User } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Calendar, CircleCheck, CircleX, Clock, Eye, LayoutGrid, Plus, RefreshCw, Search, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Compliance Audits', href: '/compliance/audits' }];

interface Audit {
    id: number;
    title: string;
    type: string | null;
    risk_level: string;
    status: string;
    scheduled_on: string | null;
    completed_on: string | null;
    findings: string | null;
    auditor_id: number | null;
    auditor: string | null;
    auditor_firm: string | null;
}

const STATUS_LABEL: Record<string, string> = {
    planned: 'Planned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const STATUS_RING: Record<string, string> = {
    planned: 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-800 dark:text-gray-300',
    in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300',
    cancelled: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300',
};

const empty = () => ({
    auditor_id: '',
    auditor_firm: '',
    title: '',
    type: '',
    risk_level: 'medium',
    status: 'planned',
    scheduled_on: '',
    completed_on: '',
    findings: '',
});

export default function ComplianceAudits({
    audits,
    filters,
    perPage,
    counts,
    options,
}: {
    audits: Paginated<Audit>;
    filters: Record<string, string>;
    perPage: number;
    counts: Record<string, number>;
    options: { users: User[]; statuses: string[]; risks: string[]; types: string[]; firms: string[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Audit | null>(null);
    const [viewing, setViewing] = useState<Audit | null>(null);
    const form = useForm(empty());

    const apply = (patch: Record<string, string | number>) =>
        router.get('/compliance/audits', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(a: Audit) {
        form.setData({
            auditor_id: a.auditor_id ? String(a.auditor_id) : '',
            auditor_firm: a.auditor_firm ?? '',
            title: a.title,
            type: a.type ?? '',
            risk_level: a.risk_level,
            status: a.status,
            scheduled_on: a.scheduled_on ?? '',
            completed_on: a.completed_on ?? '',
            findings: a.findings ?? '',
        });
        form.clearErrors();
        setEditing(a);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        if (editing) {
            form.put(`/compliance/audits/${editing.id}`, done);
        } else {
            form.post('/compliance/audits', done);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Compliance Audits" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Compliance Audits</h1>
                        <p className="text-muted-foreground text-xs">Plan and track compliance audits.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Compliance Audit
                    </Button>
                </div>

                <div className="bg-card rounded-lg border shadow-sm">
                    <div className="flex min-w-0 items-center gap-2 p-3">
                        <div className="relative w-64 min-w-40 shrink">
                            <Search className="text-muted-foreground absolute top-2 left-2.5 size-4" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && apply({ search })}
                                placeholder="Search..."
                                className="h-8 w-full px-9"
                            />
                        </div>

                        <Dropdown
                            value={filters.type ?? ''}
                            onChange={(v) => apply({ type: v })}
                            placeholder="All Types"
                            options={options.types.map((t) => ({ value: t, label: t }))}
                            className="h-9 w-40"
                            aria-label="Type filter"
                            capitalize
                        />

                        <Dropdown
                            value={filters.risk_level ?? ''}
                            onChange={(v) => apply({ risk_level: v })}
                            placeholder="All Risk Levels"
                            options={options.risks.map((r) => ({ value: r, label: r }))}
                            className="h-9 w-40"
                            aria-label="Risk level filter"
                            capitalize
                        />
                    </div>

                    <CountTabs
                        value={filters.status ?? ''}
                        onSelect={(v) => apply({ status: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                            { value: 'planned', label: 'Planned', icon: Clock, count: counts.planned ?? 0 },
                            { value: 'in_progress', label: 'In Progress', icon: RefreshCw, count: counts.in_progress ?? 0 },
                            { value: 'completed', label: 'Completed', icon: CircleCheck, count: counts.completed ?? 0 },
                            { value: 'cancelled', label: 'Cancelled', icon: CircleX, count: counts.cancelled ?? 0 },
                        ]}
                    />
                </div>

                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="text-muted-foreground w-12 px-4 py-2.5 text-left font-semibold">#</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Auditor</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Audit Title</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Type</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Status</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Risk Level</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Audit Date</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Completion</th>
                                    <th className="text-muted-foreground w-24 px-4 py-2.5 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {audits.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="text-muted-foreground py-12 text-center text-sm">
                                            No audits match this view.
                                        </td>
                                    </tr>
                                )}
                                {audits.data.map((a, i) => (
                                    <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="px-4 py-2.5 font-medium tabular-nums">{(audits.from ?? 1) + i}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="font-medium">{a.auditor ?? 'Unassigned'}</div>
                                            {a.auditor_firm && <div className="text-muted-foreground text-sm">{a.auditor_firm}</div>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-sm font-medium">{a.title}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-sm font-medium capitalize">{a.type ?? '—'}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                                                    STATUS_RING[a.status] ?? STATUS_RING.planned,
                                                )}
                                            >
                                                {STATUS_LABEL[a.status] ?? a.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <RingPill value={a.risk_level} />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <DateCell value={a.scheduled_on} />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <DateCell value={a.completed_on} />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="View"
                                                    onClick={() => setViewing(a)}
                                                >
                                                    <Eye className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="Edit"
                                                    onClick={() => openEdit(a)}
                                                >
                                                    <SquarePen className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="Delete"
                                                    onClick={() =>
                                                        confirmAction({ title: `Delete ${a.title}?` }).then(
                                                            (ok) => ok && router.delete(`/compliance/audits/${a.id}`, { preserveScroll: true }),
                                                        )
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
                        from={audits.from}
                        to={audits.to}
                        total={audits.total}
                        links={audits.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? 'Edit Compliance Audit' : 'Add Compliance Audit'}
                    onSubmit={submit}
                    processing={form.processing}
                    submitLabel={editing ? 'Save' : 'Add Audit'}
                    wide
                >
                    <TextField
                        label="Audit title"
                        value={form.data.title}
                        onChange={(v) => form.setData('title', v)}
                        error={form.errors.title}
                        className="sm:col-span-2"
                    />
                    <SelectField
                        label="Auditor"
                        value={form.data.auditor_id}
                        onChange={(v) => form.setData('auditor_id', v)}
                        options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                        placeholder="Unassigned"
                    />
                    <TextField
                        label="Acting for"
                        value={form.data.auditor_firm}
                        onChange={(v) => form.setData('auditor_firm', v)}
                        error={form.errors.auditor_firm}
                        list="auditor-firms"
                        placeholder="Internal Audit Team"
                    />
                    <datalist id="auditor-firms">
                        {options.firms.map((f) => (
                            <option key={f} value={f} />
                        ))}
                    </datalist>
                    <SelectField
                        label="Type"
                        value={form.data.type}
                        onChange={(v) => form.setData('type', v)}
                        options={options.types.map((t) => ({ value: t, label: t }))}
                        placeholder="—"
                        error={form.errors.type}
                    />
                    <SelectField
                        label="Risk level"
                        value={form.data.risk_level}
                        onChange={(v) => form.setData('risk_level', v)}
                        options={options.risks.map((r) => ({ value: r, label: r }))}
                    />
                    <SelectField
                        label="Status"
                        value={form.data.status}
                        onChange={(v) => form.setData('status', v)}
                        options={options.statuses.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
                    />
                    <TextField
                        label="Audit date"
                        type="date"
                        value={form.data.scheduled_on}
                        onChange={(v) => form.setData('scheduled_on', v)}
                        error={form.errors.scheduled_on}
                    />
                    <TextField
                        label="Completion"
                        type="date"
                        value={form.data.completed_on}
                        onChange={(v) => form.setData('completed_on', v)}
                        error={form.errors.completed_on}
                    />
                    <TextareaField
                        label="Findings"
                        value={form.data.findings}
                        onChange={(v) => form.setData('findings', v)}
                        rows={4}
                        className="sm:col-span-2"
                    />
                </FormDialog>

                <Dialog open={!!viewing} onOpenChange={(next) => !next && setViewing(null)}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{viewing?.title}</DialogTitle>
                        </DialogHeader>
                        {viewing && (
                            <div className="space-y-4 text-sm">
                                <div className="flex flex-wrap gap-2">
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                                            STATUS_RING[viewing.status],
                                        )}
                                    >
                                        {STATUS_LABEL[viewing.status]}
                                    </span>
                                    <RingPill value={viewing.risk_level} />
                                    {viewing.type && <span className="text-muted-foreground text-xs capitalize">{viewing.type}</span>}
                                </div>
                                <dl className="grid grid-cols-2 gap-3">
                                    <Detail label="Auditor" value={viewing.auditor ?? 'Unassigned'} hint={viewing.auditor_firm} />
                                    <Detail label="Audit date" value={date(viewing.scheduled_on)} />
                                    <Detail label="Completion" value={date(viewing.completed_on)} />
                                </dl>
                                {viewing.findings && (
                                    <div>
                                        <p className="text-muted-foreground mb-1 text-xs">Findings</p>
                                        <p className="whitespace-pre-line">{viewing.findings}</p>
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

function DateCell({ value }: { value: string | null }) {
    if (!value) {
        return <span className="text-muted-foreground text-xs">—</span>;
    }

    return (
        <div className="text-muted-foreground flex items-center gap-2 whitespace-nowrap">
            <Calendar className="size-4" />
            <span>{date(value)}</span>
        </div>
    );
}

function Detail({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
    return (
        <div>
            <dt className="text-muted-foreground mb-1 text-xs">{label}</dt>
            <dd>{value}</dd>
            {hint && <dd className="text-muted-foreground text-xs">{hint}</dd>}
        </div>
    );
}
