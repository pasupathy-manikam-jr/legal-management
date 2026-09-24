import { confirmAction } from '@/components/confirm-dialog';
import { FormDialog, SelectField, TextField } from '@/components/form-dialog';
import { PageToolbar } from '@/components/page-toolbar';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { date, hours, money } from '@/lib/format';
import type { BreadcrumbItem, Paginated, TimeEntry, User } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Timesheets', href: '/time-entries' }];

interface MatterOption {
    id: number;
    label: string;
    rate: number;
}

export default function TimeEntriesIndex({
    entries,
    filters,
    totals,
    options,
}: {
    entries: Paginated<TimeEntry>;
    filters: Record<string, string>;
    totals: { minutesThisMonth: number; unbilledCents: number };
    options: { matters: MatterOption[]; users: User[] };
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<TimeEntry | null>(null);
    const form = useForm({
        matter_id: '',
        user_id: '',
        worked_on: new Date().toISOString().slice(0, 10),
        minutes: '60',
        rate: '250',
        billable: true as boolean,
        description: '',
    });

    function openCreate() {
        form.setData({
            matter_id: '',
            user_id: '',
            worked_on: new Date().toISOString().slice(0, 10),
            minutes: '60',
            rate: '250',
            billable: true,
            description: '',
        });
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(e: TimeEntry) {
        form.setData({
            matter_id: String(e.matter_id),
            user_id: String(e.user_id),
            worked_on: e.worked_on.slice(0, 10),
            minutes: String(e.minutes),
            rate: String(e.rate_cents / 100),
            billable: e.billable,
            description: e.description,
        });
        form.clearErrors();
        setEditing(e);
        setOpen(true);
    }

    /** Picking a case pre-fills its agreed rate — typing it again is how wrong bills happen. */
    function pickMatter(id: string) {
        const rate = options.matters.find((m) => String(m.id) === id)?.rate;
        form.setData({ ...form.data, matter_id: id, rate: rate === undefined ? form.data.rate : String(rate) });
    }

    function submit(ev: React.FormEvent) {
        ev.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        if (editing) {
            form.put(`/time-entries/${editing.id}`, done);
        } else {
            form.post('/time-entries', done);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Timesheets" />
            <div className="flex flex-col gap-4 p-4">
                <PageToolbar title="Timesheets" subtitle={`${entries.total} entries`}>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Log time
                    </Button>
                </PageToolbar>

                <div className="grid gap-4 sm:grid-cols-2">
                    <StatCard label="Logged this month" value={hours(totals.minutesThisMonth)} />
                    <StatCard label="Unbilled value" value={money(totals.unbilledCents)} hint="billable, not yet invoiced" />
                </div>

                <div className="flex gap-2">
                    <Button
                        variant={filters.billable === 'unbilled' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                            router.get(
                                '/time-entries',
                                { billable: filters.billable === 'unbilled' ? '' : 'unbilled' },
                                { preserveState: true, replace: true },
                            )
                        }
                    >
                        Unbilled only
                    </Button>
                </div>

                <Card className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Case</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Who</TableHead>
                                <TableHead className="text-right">Time</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Billed</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.data.length === 0 && <TableEmpty colSpan={8}>No time logged.</TableEmpty>}
                            {entries.data.map((e) => (
                                <TableRow key={e.id}>
                                    <TableCell className="whitespace-nowrap">{date(e.worked_on)}</TableCell>
                                    <TableCell>
                                        <Link href={`/matters/${e.matter_id}`} className="font-medium hover:underline">
                                            {e.matter?.reference}
                                        </Link>
                                        <div className="text-muted-foreground text-xs">{e.matter?.client?.name}</div>
                                    </TableCell>
                                    <TableCell className="max-w-sm">{e.description}</TableCell>
                                    <TableCell className="text-muted-foreground">{e.user?.name}</TableCell>
                                    <TableCell className="text-right tabular-nums">{hours(e.minutes)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{e.billable ? money(e.amount_cents) : 'non-billable'}</TableCell>
                                    <TableCell className="text-xs">
                                        {e.invoice_id ? (
                                            <Link href={`/invoices/${e.invoice_id}`} className="text-muted-foreground hover:underline">
                                                {e.invoice?.number ?? 'invoiced'}
                                            </Link>
                                        ) : (
                                            <span className="text-muted-foreground">open</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" disabled={!!e.invoice_id} onClick={() => openEdit(e)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={!!e.invoice_id}
                                            onClick={() =>
                                                confirmAction({ title: 'Delete this entry?' }).then(
                                                    (ok) => ok && router.delete(`/time-entries/${e.id}`, { preserveScroll: true }),
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

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? 'Edit entry' : 'Log time'}
                    onSubmit={submit}
                    processing={form.processing}
                    wide
                >
                    <SelectField
                        label="Case"
                        value={form.data.matter_id}
                        onChange={pickMatter}
                        options={options.matters.map((m) => ({ value: m.id, label: m.label }))}
                        placeholder="Select case…"
                        error={form.errors.matter_id}
                        className="sm:col-span-2"
                    />
                    <SelectField
                        label="Who"
                        value={form.data.user_id}
                        onChange={(v) => form.setData('user_id', v)}
                        options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                        placeholder="Select…"
                        error={form.errors.user_id}
                    />
                    <TextField
                        label="Date"
                        type="date"
                        value={form.data.worked_on}
                        onChange={(v) => form.setData('worked_on', v)}
                        error={form.errors.worked_on}
                    />
                    <TextField
                        label="Minutes"
                        type="number"
                        value={form.data.minutes}
                        onChange={(v) => form.setData('minutes', v)}
                        error={form.errors.minutes}
                    />
                    <TextField
                        label="Rate / hour"
                        type="number"
                        step="0.01"
                        value={form.data.rate}
                        onChange={(v) => form.setData('rate', v)}
                        error={form.errors.rate}
                    />
                    <SelectField
                        label="Billable"
                        value={form.data.billable ? '1' : '0'}
                        onChange={(v) => form.setData('billable', v === '1')}
                        options={[
                            { value: '1', label: 'Billable' },
                            { value: '0', label: 'Non-billable' },
                        ]}
                    />
                    <TextField
                        label="Description"
                        value={form.data.description}
                        onChange={(v) => form.setData('description', v)}
                        error={form.errors.description}
                        className="sm:col-span-2"
                    />
                </FormDialog>
            </div>
        </AppLayout>
    );
}
