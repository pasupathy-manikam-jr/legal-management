import { InitialsAvatar } from '@/components/avatar-stack';
import { DataTableFooter } from '@/components/data-table-footer';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { FormDialog, SelectField, TextField } from '@/components/form-dialog';
import { SummaryCard } from '@/components/summary-card';
import { RingPill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated, User } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Calendar, CircleCheckBig, CircleDollarSign, CircleX, Clock, Eye, FileText, Filter, Plus, RefreshCcw, Search, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Expenses', href: '/expenses' }];

interface Expense {
    id: number;
    matter_id: number | null;
    matter?: { id: number; reference: string; title: string } | null;
    user?: { id: number; name: string; email: string } | null;
    description: string;
    category: string | null;
    amount_cents: number;
    billable: boolean;
    status: string;
    incurred_on: string;
    invoice_id: number | null;
}

interface CaseRow {
    id: number;
    label: string;
    total_cents: number;
    count: number;
    pending: number;
}

const STATUS_BADGE: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

const empty = () => ({
    matter_id: '',
    user_id: '',
    description: '',
    category: '',
    amount: '',
    billable: true as boolean,
    status: 'pending',
    incurred_on: new Date().toISOString().slice(0, 10),
});

export default function ExpensesIndex({
    expenses,
    cases,
    selected,
    status,
    caseSummary,
    totals,
    filters,
    perPage,
    options,
}: {
    expenses: Paginated<Expense>;
    cases: CaseRow[];
    selected: number;
    status: string;
    caseSummary: { billableCents: number; nonBillableCents: number; counts: Record<string, number> };
    totals: { allCents: number; pendingCents: number; approvedCents: number };
    filters: Record<string, string>;
    perPage: number;
    options: { matters: { id: number; label: string }[]; users: User[]; categories: string[]; statuses: string[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Expense | null>(null);
    const form = useForm(empty());

    const hasFilters = Boolean(filters.search || filters.category || filters.billable);
    const current = cases.find((c) => c.id === selected);
    const caseTotal = caseSummary.billableCents + caseSummary.nonBillableCents;

    function apply(patch: Record<string, string | number>) {
        router.get('/expenses', { ...filters, matter: selected, status, per_page: perPage, ...patch }, { preserveState: true, replace: true });
    }

    function openCreate() {
        form.setData({ ...empty(), matter_id: selected ? String(selected) : '' });
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(x: Expense) {
        form.setData({
            matter_id: x.matter_id ? String(x.matter_id) : '',
            user_id: x.user?.id ? String(x.user.id) : '',
            description: x.description,
            category: x.category ?? '',
            amount: String(x.amount_cents / 100),
            billable: x.billable,
            status: x.status,
            incurred_on: x.incurred_on.slice(0, 10),
        });
        form.clearErrors();
        setEditing(x);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        editing ? form.put(`/expenses/${editing.id}`, done) : form.post('/expenses', done);
    }

    function setStatus(expense: Expense, next: string) {
        router.patch(`/expenses/${expense.id}/status`, { status: next }, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Expenses" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Expenses</h1>
                        <p className="text-xs text-muted-foreground">Track and approve employee expenses grouped by case.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Expense
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <SummaryCard label="Total" value={money(totals.allCents)} icon={CircleDollarSign} tone="green" />
                    <SummaryCard label="Pending" value={money(totals.pendingCents)} icon={Clock} tone="amber" />
                    <SummaryCard label="Approved" value={money(totals.approvedCents)} icon={FileText} tone="emerald" />
                </div>

                <div className="rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <div className="relative w-64 min-w-40 shrink">
                                <Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search expenses..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && apply({ search })}
                                    className="h-8 w-full px-9"
                                />
                            </div>

                            <Dropdown value={filters.category ?? ''} onChange={(v) => apply({ category: v })} placeholder="All Categories" options={options.categories.map((c) => ({ value: c, label: c }))} className="h-9 w-40" capitalize />

                            <Dropdown value={filters.billable ?? ''} onChange={(v) => apply({ billable: v })} placeholder="All Bill Types" options={[{ value: 'yes', label: 'Billable' }, { value: 'no', label: 'Non-Billable' }]} className="h-9 w-40" />
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            {hasFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 text-muted-foreground"
                                    onClick={() => {
                                        setSearch('');
                                        router.get('/expenses');
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

                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[350px_1fr]">
                    <div className="hidden overflow-hidden rounded-lg border bg-card shadow-sm lg:sticky lg:top-4 lg:block">
                        <div className="border-b px-4 py-3">
                            <p className="text-xs font-semibold text-muted-foreground">Cases</p>
                        </div>
                        <div className="max-h-[550px] divide-y overflow-auto">
                            {cases.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">No expenses match these filters.</p>}
                            {cases.map((c) => {
                                const active = c.id === selected;

                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => apply({ matter: c.id })}
                                        className={cn(
                                            'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                                            active ? 'border-r-2 border-r-primary bg-primary/5' : 'hover:bg-muted/50',
                                        )}
                                    >
                                        <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary/10' : 'bg-muted')}>
                                            <FileText className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={cn('truncate text-sm leading-tight font-semibold', active && 'text-primary')}>{c.label}</p>
                                            <div className="mt-0.5 flex items-center gap-2">
                                                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{money(c.total_cents)}</span>
                                                {c.pending > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                        <Clock className="size-2.5" />
                                                        {c.pending}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span
                                            className={cn(
                                                'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                                                active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {c.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="min-w-0">
                        <div className="mb-4 rounded-lg border bg-card p-4 shadow-sm">
                            <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        <FileText className="size-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm leading-tight font-semibold">{current?.label ?? 'No case selected'}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            Total : <span className="font-mono">{money(caseTotal)}</span> ·{' '}
                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                Billable : <span className="font-mono">{money(caseSummary.billableCents)}</span>
                                            </span>{' '}
                                            · Non-Billable : <span className="font-mono">{money(caseSummary.nonBillableCents)}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-md bg-muted p-1">
                                    {options.statuses.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => apply({ status: s })}
                                            className={cn(
                                                'inline-flex h-7 items-center gap-1.5 rounded-sm px-3 text-xs font-medium capitalize transition-all',
                                                status === s ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            {s}
                                            <span className={cn('inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold', STATUS_BADGE[s])}>
                                                {caseSummary.counts[s] ?? 0}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                            <div className="w-full overflow-x-auto">
                                <table className="w-full caption-bottom text-sm">
                                    <thead>
                                        <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                            <th className="w-12 px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Submitted By</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Category</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Date</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Billable</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Amount</th>
                                            <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenses.data.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                                                    Nothing {status} on this case.
                                                </td>
                                            </tr>
                                        )}
                                        {expenses.data.map((x, i) => (
                                            <tr key={x.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                                                <td className="px-4 py-2.5 font-medium tabular-nums">{(expenses.from ?? 1) + i}</td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <InitialsAvatar name={x.user?.name ?? x.description} />
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-medium">{x.user?.name ?? '—'}</div>
                                                            <div className="truncate text-xs text-muted-foreground">{x.user?.email ?? x.description}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {x.category ? <RingPill value="low" label={x.category} className="capitalize" /> : '—'}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                                                        <Calendar className="size-4" />
                                                        <span>{date(x.incurred_on)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <RingPill value={x.billable ? 'active' : 'inactive'} label={x.billable ? 'Yes' : 'No'} />
                                                </td>
                                                <td className="px-4 py-2.5 font-mono tabular-nums">{money(x.amount_cents)}</td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-muted-foreground"
                                                            title="Approve"
                                                            disabled={x.status === 'approved' || !!x.invoice_id}
                                                            onClick={() => setStatus(x, 'approved')}
                                                        >
                                                            <CircleCheckBig className="size-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-muted-foreground"
                                                            title="Reject"
                                                            disabled={x.status === 'rejected' || !!x.invoice_id}
                                                            onClick={() => setStatus(x, 'rejected')}
                                                        >
                                                            <CircleX className="size-4" />
                                                        </Button>
                                                        {x.matter_id && (
                                                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" asChild title="View case">
                                                                <Link href={`/matters/${x.matter_id}`}>
                                                                    <Eye className="size-4" />
                                                                </Link>
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-muted-foreground"
                                                            title="Edit"
                                                            disabled={!!x.invoice_id}
                                                            onClick={() => openEdit(x)}
                                                        >
                                                            <SquarePen className="size-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-muted-foreground"
                                                            title="Delete"
                                                            disabled={!!x.invoice_id}
                                                            onClick={() => confirmAction({ title: 'Remove this expense?', confirmLabel: 'Remove' }).then((ok) => ok && router.delete(`/expenses/${x.id}`, { preserveScroll: true }))}
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
                                from={expenses.from}
                                to={expenses.to}
                                total={expenses.total}
                                links={expenses.links}
                                perPage={perPage}
                                onPerPage={(value) => apply({ per_page: value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? 'Edit expense' : 'Add Expense'}
                onSubmit={submit}
                processing={form.processing}
                wide
            >
                <TextField
                    label="Description"
                    value={form.data.description}
                    onChange={(v) => form.setData('description', v)}
                    error={form.errors.description}
                    className="sm:col-span-2"
                />
                <SelectField
                    label="Case"
                    value={form.data.matter_id}
                    onChange={(v) => form.setData('matter_id', v)}
                    options={options.matters.map((m) => ({ value: m.id, label: m.label }))}
                    placeholder="Firm overhead"
                />
                <SelectField
                    label="Submitted by"
                    value={form.data.user_id}
                    onChange={(v) => form.setData('user_id', v)}
                    options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                    placeholder="—"
                />
                <SelectField
                    label="Category"
                    value={form.data.category}
                    onChange={(v) => form.setData('category', v)}
                    options={options.categories.map((c) => ({ value: c, label: c }))}
                    placeholder="—"
                />
                <TextField label="Amount" type="number" step="0.01" value={form.data.amount} onChange={(v) => form.setData('amount', v)} error={form.errors.amount} />
                <TextField label="Date" type="date" value={form.data.incurred_on} onChange={(v) => form.setData('incurred_on', v)} error={form.errors.incurred_on} />
                <SelectField
                    label="Status"
                    value={form.data.status}
                    onChange={(v) => form.setData('status', v)}
                    options={options.statuses.map((s) => ({ value: s, label: s }))}
                />
                <SelectField
                    label="Billable"
                    value={form.data.billable ? '1' : '0'}
                    onChange={(v) => form.setData('billable', v === '1')}
                    options={[
                        { value: '1', label: 'Billable to client' },
                        { value: '0', label: 'Non-billable' },
                    ]}
                />
            </FormDialog>
        </AppLayout>
    );
}
