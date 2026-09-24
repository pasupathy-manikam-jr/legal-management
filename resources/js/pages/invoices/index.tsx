import { DataTableFooter } from '@/components/data-table-footer';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { CountTabs, FilterActions } from '@/components/page-toolbar';
import { SortableHead } from '@/components/sortable-head';
import { RingPill } from '@/components/tone-pill';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date, money } from '@/lib/format';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Calendar, CircleCheck, CircleX, Clock, Eye, LayoutGrid, Link2, Plus, Search, Send, SquarePen, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Invoices', href: '/invoices' }];

interface Row {
    id: number;
    number: string;
    state: string;
    total_cents: number;
    balance_cents: number;
    issued_on: string | null;
    due_on: string | null;
    client_id: number | null;
    client: string | null;
    client_email: string | null;
    matter: string | null;
}

interface MatterOption {
    id: number;
    label: string;
    client_id: number;
    unbilled: number;
}

/** Cancelled is stored as "void" — the accounting term the queries use. */
const LABELS: Record<string, string> = { draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue', void: 'Cancelled' };

const initials = (name: string) =>
    name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

export default function InvoicesIndex({
    invoices,
    filters,
    perPage,
    sort,
    counts,
    options,
}: {
    invoices: Paginated<Row>;
    filters: Record<string, string>;
    perPage: number;
    sort: { column: string; direction: string };
    counts: { all: number; draft: number; sent: number; paid: number; overdue: number; void: number };
    options: { matters: MatterOption[]; clients: { id: number; name: string }[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Row | null>(null);

    const create = useForm({
        matter_id: '',
        issued_on: new Date().toISOString().slice(0, 10),
        due_on: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
        tax_percent: '0',
        notes: '',
    });
    const edit = useForm({ status: 'draft', due_on: '', notes: '' });

    const apply = (patch: Record<string, string | number>) =>
        router.get('/invoices', { ...filters, ...sortParams(), ...patch }, { preserveState: true, replace: true });

    const sortParams = () => ({ sort: sort.column, direction: sort.direction, per_page: perPage });

    const toggleSort = (column: string) =>
        apply({ sort: column, direction: sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc' });

    const filtered = filters.search || filters.client;
    const billable = options.matters.filter((m) => m.unbilled > 0);

    function openEdit(invoice: Row) {
        edit.setData({ status: invoice.state === 'overdue' ? 'sent' : invoice.state, due_on: invoice.due_on ?? '', notes: '' });
        edit.clearErrors();
        setEditing(invoice);
    }

    /** No public pay page yet, so this shares the internal invoice link. */
    function copyLink(invoice: Row) {
        navigator.clipboard?.writeText(`${window.location.origin}/invoices/${invoice.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Invoices" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Invoices</h1>
                        <p className="text-xs text-muted-foreground">Create, manage and track client invoices and their payment status.</p>
                    </div>
                    <Button
                        onClick={() => {
                            create.clearErrors();
                            setOpen(true);
                        }}
                    >
                        <Plus className="size-4" /> Add Invoice
                    </Button>
                </div>

                <div className="rounded-lg border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-2 p-3">
                        <div className="flex min-w-0 items-center gap-2">
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

                            <Dropdown value={filters.client ?? ''} onChange={(v) => apply({ client: v })} placeholder="All Clients" options={options.clients.map((client) => ({ value: client.id, label: client.name }))} className="h-9 w-40" aria-label="Client filter" />
                        </div>

                        <FilterActions
                            active={Boolean(filtered)}
                            onClear={() => {
                                setSearch('');
                                router.get('/invoices', { status: filters.status ?? '' }, { preserveState: true, replace: true });
                            }}
                        />
                    </div>

                    <CountTabs
                        value={filters.status ?? ''}
                        onSelect={(v) => apply({ status: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all },
                            { value: 'draft', label: 'Draft', icon: Clock, count: counts.draft },
                            { value: 'sent', label: 'Sent', icon: Send, count: counts.sent },
                            { value: 'paid', label: 'Paid', icon: CircleCheck, count: counts.paid },
                            { value: 'overdue', label: 'Overdue', icon: TriangleAlert, count: counts.overdue },
                            { value: 'void', label: 'Cancelled', icon: CircleX, count: counts.void },
                        ]}
                    />
                </div>

                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="w-12 px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Client</th>
                                    <SortableHead label="Invoice Number" column="number" sort={sort} onSort={toggleSort} />
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Total</th>
                                    <SortableHead label="Invoice Date" column="issued_on" sort={sort} onSort={toggleSort} />
                                    <SortableHead label="Due Date" column="due_on" sort={sort} onSort={toggleSort} />
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                                    <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {invoices.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                                            No invoices match this view.
                                        </td>
                                    </tr>
                                )}
                                {invoices.data.map((invoice, index) => (
                                    <tr key={invoice.id} className="transition-colors hover:bg-muted/40">
                                        <td className="px-4 py-2.5 font-medium">{(invoices.from ?? 1) + index}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="size-8">
                                                    <AvatarFallback className="text-xs">{initials(invoice.client ?? '—')}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium">{invoice.client ?? '—'}</div>
                                                    <div className="truncate text-xs text-muted-foreground">{invoice.client_email ?? '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="text-sm font-medium">{invoice.number}</div>
                                            {invoice.matter && <div className="text-xs text-muted-foreground">{invoice.matter}</div>}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono">{money(invoice.total_cents)}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                                                <Calendar className="size-4" />
                                                {date(invoice.issued_on)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                                                <Calendar className="size-4" />
                                                {date(invoice.due_on)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <RingPill value={invoice.state} label={LABELS[invoice.state] ?? invoice.state} />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="View" asChild>
                                                    <a href={`/invoices/${invoice.id}`}>
                                                        <Eye className="size-4" />
                                                    </a>
                                                </Button>
                                                {invoice.state === 'draft' && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-muted-foreground"
                                                            title="Edit"
                                                            onClick={() => openEdit(invoice)}
                                                        >
                                                            <SquarePen className="size-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-muted-foreground"
                                                            title="Mark as sent"
                                                            onClick={() => router.patch(`/invoices/${invoice.id}/send`, {}, { preserveScroll: true })}
                                                        >
                                                            <Send className="size-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {invoice.balance_cents > 0 && invoice.state !== 'void' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-muted-foreground"
                                                        title="Copy link"
                                                        onClick={() => copyLink(invoice)}
                                                    >
                                                        <Link2 className="size-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground"
                                                    title="Delete"
                                                    onClick={() =>
                                                        confirmAction({ title: `Delete ${invoice.number}?`, description: `Its time becomes unbilled again.` }).then((ok) => ok && router.delete(`/invoices/${invoice.id}`, { preserveScroll: true }))
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
                        from={invoices.from}
                        to={invoices.to}
                        total={invoices.total}
                        links={invoices.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title="Add Invoice"
                    processing={create.processing}
                    submitLabel="Generate"
                    onSubmit={(e) => {
                        e.preventDefault();
                        create.post('/invoices', { onSuccess: () => setOpen(false) });
                    }}
                    wide
                >
                    <SelectField
                        label="Case"
                        value={create.data.matter_id}
                        onChange={(v) => create.setData('matter_id', v)}
                        options={billable.map((m) => ({ value: m.id, label: `${m.label} (${m.unbilled} unbilled)` }))}
                        placeholder={billable.length ? 'Select a case' : 'No case has unbilled time'}
                        error={create.errors.matter_id}
                        className="sm:col-span-2"
                    />
                    <TextField
                        label="Invoice date"
                        type="date"
                        value={create.data.issued_on}
                        onChange={(v) => create.setData('issued_on', v)}
                        error={create.errors.issued_on}
                    />
                    <TextField
                        label="Due date"
                        type="date"
                        value={create.data.due_on}
                        onChange={(v) => create.setData('due_on', v)}
                        error={create.errors.due_on}
                    />
                    <TextField
                        label="Tax %"
                        type="number"
                        value={create.data.tax_percent}
                        onChange={(v) => create.setData('tax_percent', v)}
                        error={create.errors.tax_percent}
                    />
                    <TextareaField label="Notes" value={create.data.notes} onChange={(v) => create.setData('notes', v)} className="sm:col-span-2" />
                </FormDialog>

                <FormDialog
                    open={editing !== null}
                    onOpenChange={(next) => !next && setEditing(null)}
                    title={`Edit ${editing?.number ?? ''}`}
                    processing={edit.processing}
                    onSubmit={(e) => {
                        e.preventDefault();
                        edit.put(`/invoices/${editing?.id}`, { onSuccess: () => setEditing(null), preserveScroll: true });
                    }}
                >
                    <SelectField
                        label="Status"
                        value={edit.data.status}
                        onChange={(v) => edit.setData('status', v)}
                        options={[
                            { value: 'draft', label: 'Draft' },
                            { value: 'sent', label: 'Sent' },
                            { value: 'paid', label: 'Paid' },
                            { value: 'void', label: 'Cancelled (releases its time)' },
                        ]}
                        error={edit.errors.status}
                    />
                    <TextField label="Due date" type="date" value={edit.data.due_on} onChange={(v) => edit.setData('due_on', v)} error={edit.errors.due_on} />
                    <TextareaField label="Notes" value={edit.data.notes} onChange={(v) => edit.setData('notes', v)} />
                </FormDialog>
            </div>
        </AppLayout>
    );
}
