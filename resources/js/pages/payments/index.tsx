import { InitialsAvatar } from '@/components/avatar-stack';
import { confirmAction } from '@/components/confirm-dialog';
import { DataTableFooter } from '@/components/data-table-footer';
import { Dropdown } from '@/components/dropdown';
import { FormDialog, SelectField, TextField } from '@/components/form-dialog';
import { CountTabs } from '@/components/page-toolbar';
import { RingPill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date, money } from '@/lib/format';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    Calendar,
    CreditCard,
    Eye,
    FileCheck,
    Filter,
    Globe,
    LayoutGrid,
    Plus,
    RefreshCcw,
    Search,
    SquarePen,
    Trash2,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Payments', href: '/payments' }];

interface Payment {
    id: number;
    invoice_id: number;
    invoice_number: string | null;
    client_name: string;
    client_email: string | null;
    amount_cents: number;
    method: string;
    paid_on: string;
    reference: string | null;
}

interface InvoiceOption {
    id: number;
    number: string;
    client: string | null;
    balance_cents: number;
}

const METHOD: Record<string, { label: string; icon: ComponentType<{ className?: string }> }> = {
    cash: { label: 'Cash', icon: Banknote },
    cheque: { label: 'Check', icon: FileCheck },
    card: { label: 'Credit Card', icon: CreditCard },
    bank: { label: 'Bank', icon: Building2 },
    online: { label: 'Online Payment', icon: Globe },
};

const empty = () => ({
    invoice_id: '',
    paid_on: new Date().toISOString().slice(0, 10),
    amount: '',
    method: 'bank',
    reference: '',
});

export default function PaymentsIndex({
    payments,
    counts,
    totals,
    filters,
    perPage,
    options,
}: {
    payments: Paginated<Payment>;
    counts: Record<string, number>;
    totals: { receivedCents: number };
    filters: Record<string, string>;
    perPage: number;
    options: { methods: string[]; invoices: InvoiceOption[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Payment | null>(null);
    const form = useForm(empty());

    const hasFilters = Boolean(filters.search || filters.invoice || filters.method);

    function apply(patch: Record<string, string | number>) {
        router.get('/payments', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });
    }

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(p: Payment) {
        form.setData({
            invoice_id: String(p.invoice_id),
            paid_on: p.paid_on,
            amount: String(p.amount_cents / 100),
            method: p.method,
            reference: p.reference ?? '',
        });
        form.clearErrors();
        setEditing(p);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };

        if (editing) {
            form.put(`/invoices/${editing.invoice_id}/payments/${editing.id}`, done);
        } else {
            form.post(`/invoices/${form.data.invoice_id}/payments`, done);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payments" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Payments</h1>
                        <p className="text-muted-foreground text-xs">
                            View and manage payments received against client invoices. {money(totals.receivedCents)} received.
                        </p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Payment
                    </Button>
                </div>

                <div className="bg-card rounded-lg border shadow-sm">
                    <div className="p-3">
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

                                <Dropdown
                                    value={filters.invoice ?? ''}
                                    onChange={(v) => apply({ invoice: v })}
                                    placeholder="All Invoices"
                                    options={options.invoices.map((i) => ({ value: i.id, label: i.number }))}
                                    className="h-9 w-40"
                                />
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {hasFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground h-9"
                                        onClick={() => {
                                            setSearch('');
                                            router.get('/payments');
                                        }}
                                    >
                                        <RefreshCcw className="size-4" /> Clear Filters
                                    </Button>
                                )}
                                <span className="text-muted-foreground flex h-8 items-center gap-1.5 rounded-md border px-2 text-sm">
                                    <Filter className="size-4" /> Filters
                                </span>
                            </div>
                        </div>
                    </div>

                    <CountTabs
                        value={filters.method ?? ''}
                        onSelect={(v) => apply({ method: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                            ...options.methods.map((m) => ({ value: m, label: METHOD[m].label, icon: METHOD[m].icon, count: counts[m] ?? 0 })),
                        ]}
                    />
                </div>

                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="text-muted-foreground w-12 px-4 py-2.5 text-left font-semibold">#</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Client</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Invoice Number</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Amount</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Method</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Date</th>
                                    <th className="text-muted-foreground w-24 px-4 py-2.5 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-muted-foreground py-12 text-center text-sm">
                                            No payments match these filters.
                                        </td>
                                    </tr>
                                )}
                                {payments.data.map((p, i) => (
                                    <tr key={p.id} className="hover:bg-muted/40 border-b transition-colors last:border-0">
                                        <td className="px-4 py-2.5 font-medium tabular-nums">{(payments.from ?? 1) + i}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-3">
                                                <InitialsAvatar name={p.client_name} />
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium">{p.client_name}</div>
                                                    <div className="text-muted-foreground truncate text-xs">
                                                        {p.client_email ?? p.reference ?? '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <Link href={`/invoices/${p.invoice_id}`} className="hover:underline">
                                                {p.invoice_number ?? '—'}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2.5 font-mono tabular-nums">{money(p.amount_cents)}</td>
                                        <td className="px-4 py-2.5">
                                            <RingPill value={p.method} label={METHOD[p.method]?.label ?? p.method} />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="text-muted-foreground flex items-center gap-2 whitespace-nowrap">
                                                <Calendar className="size-4" />
                                                <span>{date(p.paid_on)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    asChild
                                                    title="View invoice"
                                                >
                                                    <Link href={`/invoices/${p.invoice_id}`}>
                                                        <Eye className="size-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="Edit"
                                                    onClick={() => openEdit(p)}
                                                >
                                                    <SquarePen className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="Delete"
                                                    onClick={() =>
                                                        confirmAction({
                                                            title: `Remove the ${money(p.amount_cents)} payment on ${p.invoice_number}?`,
                                                            confirmLabel: 'Remove',
                                                        }).then(
                                                            (ok) =>
                                                                ok &&
                                                                router.delete(`/invoices/${p.invoice_id}/payments/${p.id}`, { preserveScroll: true }),
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
                        from={payments.from}
                        to={payments.to}
                        total={payments.total}
                        links={payments.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>
            </div>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? `Edit payment on ${editing.invoice_number}` : 'Add Payment'}
                onSubmit={submit}
                processing={form.processing}
                wide
            >
                <SelectField
                    label="Invoice"
                    value={form.data.invoice_id}
                    onChange={(v) => {
                        const invoice = options.invoices.find((i) => String(i.id) === v);
                        form.setData({ ...form.data, invoice_id: v, amount: invoice ? String(invoice.balance_cents / 100) : form.data.amount });
                    }}
                    options={options.invoices.map((i) => ({
                        value: i.id,
                        label: `${i.number} — ${i.client ?? '—'} (${money(i.balance_cents)} due)`,
                    }))}
                    placeholder="Select an invoice"
                    error={form.errors.invoice_id}
                    className="sm:col-span-2"
                />
                <TextField
                    label="Amount"
                    type="number"
                    step="0.01"
                    value={form.data.amount}
                    onChange={(v) => form.setData('amount', v)}
                    error={form.errors.amount}
                />
                <TextField
                    label="Date"
                    type="date"
                    value={form.data.paid_on}
                    onChange={(v) => form.setData('paid_on', v)}
                    error={form.errors.paid_on}
                />
                <SelectField
                    label="Method"
                    value={form.data.method}
                    onChange={(v) => form.setData('method', v)}
                    options={options.methods.map((m) => ({ value: m, label: METHOD[m].label }))}
                    error={form.errors.method}
                />
                <TextField
                    label="Reference"
                    value={form.data.reference}
                    onChange={(v) => form.setData('reference', v)}
                    error={form.errors.reference}
                />
            </FormDialog>
        </AppLayout>
    );
}
