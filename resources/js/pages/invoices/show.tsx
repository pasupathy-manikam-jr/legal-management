import { confirmAction } from '@/components/confirm-dialog';
import { FormDialog, SelectField, TextField } from '@/components/form-dialog';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { date, hours, money } from '@/lib/format';
import type { BreadcrumbItem, Invoice } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Plus, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Line {
    id: number;
    worked_on: string;
    description: string;
    user: string;
    minutes: number;
    rate_cents: number;
    amount_cents: number;
}

export default function InvoiceShow({
    invoice,
    lines,
    totals,
    payTo,
    invoiceFooter,
}: {
    invoice: Invoice;
    lines: Line[];
    totals: { total_cents: number; balance_cents: number };
    payTo: string | null;
    invoiceFooter: string | null;
}) {
    const [payOpen, setPayOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Invoices', href: '/invoices' },
        { title: invoice.number, href: `/invoices/${invoice.id}` },
    ];

    const pay = useForm({
        paid_on: new Date().toISOString().slice(0, 10),
        amount: String(totals.balance_cents / 100),
        method: 'bank',
        reference: '',
    });

    const edit = useForm({ status: invoice.status as string, due_on: invoice.due_on.slice(0, 10), notes: invoice.notes ?? '' });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={invoice.number} />
            <div className="flex flex-col gap-4 p-4 print:p-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-mono text-xl font-semibold">{invoice.number}</h1>
                            <StatusBadge value={invoice.status} />
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {invoice.client?.name}
                            {invoice.matter && (
                                <>
                                    {' · '}
                                    <Link href={`/matters/${invoice.matter.id}`} className="hover:underline">
                                        {invoice.matter.reference}
                                    </Link>
                                </>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2 print:hidden">
                        <Button variant="outline" onClick={() => window.print()}>
                            <Printer className="size-4" /> Print
                        </Button>
                        <Button variant="outline" onClick={() => setEditOpen(true)}>
                            Edit
                        </Button>
                        <Button disabled={totals.balance_cents <= 0 || invoice.status === 'void'} onClick={() => setPayOpen(true)}>
                            <Plus className="size-4" /> Record payment
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Issued" value={date(invoice.issued_on)} />
                    <StatCard label="Due" value={date(invoice.due_on)} />
                    <StatCard
                        label="Total"
                        value={money(totals.total_cents)}
                        hint={`${money(invoice.subtotal_cents)} + ${money(invoice.tax_cents)} tax`}
                    />
                    <StatCard label="Balance" value={money(totals.balance_cents)} hint={`${money(invoice.paid_cents)} paid`} />
                </div>

                <Card className="gap-0 p-4">
                    <h2 className="mb-3 text-sm font-semibold">Billed time</h2>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Who</TableHead>
                                <TableHead className="text-right">Time</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lines.length === 0 && <TableEmpty colSpan={6}>No lines — the invoice was voided.</TableEmpty>}
                            {lines.map((l) => (
                                <TableRow key={l.id}>
                                    <TableCell className="whitespace-nowrap">{date(l.worked_on)}</TableCell>
                                    <TableCell>{l.description}</TableCell>
                                    <TableCell className="text-muted-foreground">{l.user}</TableCell>
                                    <TableCell className="text-right tabular-nums">{hours(l.minutes)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{money(l.rate_cents)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{money(l.amount_cents)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="mt-4 ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="tabular-nums">{money(invoice.subtotal_cents)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax</span>
                            <span className="tabular-nums">{money(invoice.tax_cents)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-semibold">
                            <span>Total</span>
                            <span className="tabular-nums">{money(totals.total_cents)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Paid</span>
                            <span className="tabular-nums">−{money(invoice.paid_cents)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-semibold">
                            <span>Balance</span>
                            <span className="tabular-nums">{money(totals.balance_cents)}</span>
                        </div>
                    </div>

                    {(payTo || invoiceFooter) && (
                        <div className="text-muted-foreground mt-4 border-t pt-3 text-xs">
                            {payTo && (
                                <>
                                    <p className="text-foreground font-medium">Payment details</p>
                                    <p className="mt-1 whitespace-pre-line">{payTo}</p>
                                </>
                            )}
                            {invoiceFooter && <p className={payTo ? 'mt-2' : ''}>{invoiceFooter}</p>}
                        </div>
                    )}
                </Card>

                <Card className="gap-0 p-4 print:hidden">
                    <h2 className="mb-3 text-sm font-semibold">Payments</h2>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(invoice.payments?.length ?? 0) === 0 && <TableEmpty colSpan={5}>Nothing received yet.</TableEmpty>}
                            {invoice.payments?.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>{date(p.paid_on)}</TableCell>
                                    <TableCell className="text-muted-foreground capitalize">{p.method}</TableCell>
                                    <TableCell className="text-muted-foreground">{p.reference ?? '—'}</TableCell>
                                    <TableCell className="text-right tabular-nums">{money(p.amount_cents)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                confirmAction({ title: 'Remove this payment?', confirmLabel: 'Remove' }).then(
                                                    (ok) => ok && router.delete(`/invoices/${invoice.id}/payments/${p.id}`, { preserveScroll: true }),
                                                )
                                            }
                                        >
                                            <Trash2 className="size-4 text-rose-600" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            <FormDialog
                open={payOpen}
                onOpenChange={setPayOpen}
                title="Record payment"
                processing={pay.processing}
                onSubmit={(e) => {
                    e.preventDefault();
                    pay.post(`/invoices/${invoice.id}/payments`, { onSuccess: () => setPayOpen(false), preserveScroll: true });
                }}
            >
                <TextField
                    label="Paid on"
                    type="date"
                    value={pay.data.paid_on}
                    onChange={(v) => pay.setData('paid_on', v)}
                    error={pay.errors.paid_on}
                />
                <TextField
                    label="Amount"
                    type="number"
                    step="0.01"
                    value={pay.data.amount}
                    onChange={(v) => pay.setData('amount', v)}
                    error={pay.errors.amount}
                />
                <SelectField
                    label="Method"
                    value={pay.data.method}
                    onChange={(v) => pay.setData('method', v)}
                    options={[
                        { value: 'bank', label: 'Bank transfer' },
                        { value: 'card', label: 'Card' },
                        { value: 'cash', label: 'Cash' },
                        { value: 'cheque', label: 'Cheque' },
                    ]}
                />
                <TextField label="Reference" value={pay.data.reference} onChange={(v) => pay.setData('reference', v)} />
            </FormDialog>

            <FormDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                title={`Edit ${invoice.number}`}
                processing={edit.processing}
                onSubmit={(e) => {
                    e.preventDefault();
                    edit.put(`/invoices/${invoice.id}`, { onSuccess: () => setEditOpen(false), preserveScroll: true });
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
                />
                <TextField
                    label="Due on"
                    type="date"
                    value={edit.data.due_on}
                    onChange={(v) => edit.setData('due_on', v)}
                    error={edit.errors.due_on}
                />
            </FormDialog>
        </AppLayout>
    );
}
