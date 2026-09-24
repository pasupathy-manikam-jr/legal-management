import { confirmAction } from '@/components/confirm-dialog';
import { DataTableFooter } from '@/components/data-table-footer';
import { Dropdown } from '@/components/dropdown';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { CountTabs } from '@/components/page-toolbar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated, User } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Award,
    BookOpen,
    Calendar,
    CircleCheck,
    Clock,
    Download,
    Eye,
    LayoutGrid,
    Plus,
    Search,
    SquarePen,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'CLE Tracking', href: '/compliance/cle-tracking' }];

interface Credit {
    id: number;
    title: string;
    provider: string | null;
    category: string | null;
    credit_hours: number;
    required_hours: number;
    progress: number;
    status: string;
    completed_on: string | null;
    compliance_year: number;
    notes: string | null;
    certificate_url: string | null;
    user_id: number;
    member: string | null;
    email: string | null;
}

const STATUS_LABEL: Record<string, string> = { completed: 'Completed', in_progress: 'In Progress', expired: 'Expired' };

const STATUS_RING: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300',
    in_progress: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-950 dark:text-yellow-300',
    expired: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300',
};

const empty = (year: number) => ({
    user_id: '',
    title: '',
    provider: '',
    category: '',
    credit_hours: '',
    required_hours: '',
    status: 'in_progress',
    completed_on: '',
    compliance_year: String(year),
    notes: '',
    certificate_url: '',
});

const initials = (name: string) =>
    name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

export default function CleTracking({
    records,
    filters,
    perPage,
    counts,
    options,
}: {
    records: Paginated<Credit>;
    filters: Record<string, string>;
    perPage: number;
    counts: Record<string, number>;
    options: { years: number[]; users: User[]; statuses: string[]; categories: string[]; providers: string[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Credit | null>(null);
    const [viewing, setViewing] = useState<Credit | null>(null);
    const form = useForm(empty(options.years[0]));

    const apply = (patch: Record<string, string | number>) =>
        router.get('/compliance/cle-tracking', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });

    function openCreate() {
        form.setData(empty(options.years[0]));
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(r: Credit) {
        form.setData({
            user_id: String(r.user_id),
            title: r.title,
            provider: r.provider ?? '',
            category: r.category ?? '',
            credit_hours: String(r.credit_hours),
            required_hours: String(r.required_hours),
            status: r.status,
            completed_on: r.completed_on ?? '',
            compliance_year: String(r.compliance_year),
            notes: r.notes ?? '',
            certificate_url: r.certificate_url ?? '',
        });
        form.clearErrors();
        setEditing(r);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        if (editing) {
            form.put(`/compliance/cle-tracking/${editing.id}`, done);
        } else {
            form.post('/compliance/cle-tracking', done);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="CLE Tracking" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">CLE Tracking</h1>
                        <p className="text-muted-foreground text-xs">Track continuing legal education credits and course completions.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add CLE Tracking
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
                            value={filters.member ?? ''}
                            onChange={(v) => apply({ member: v })}
                            placeholder="All Users"
                            options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                            className="h-9 w-40"
                            aria-label="User filter"
                        />
                    </div>

                    <CountTabs
                        value={filters.status ?? ''}
                        onSelect={(v) => apply({ status: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                            { value: 'completed', label: 'Completed', icon: CircleCheck, count: counts.completed ?? 0 },
                            { value: 'in_progress', label: 'In Progress', icon: Clock, count: counts.in_progress ?? 0 },
                            { value: 'expired', label: 'Expired', icon: TriangleAlert, count: counts.expired ?? 0 },
                        ]}
                    />
                </div>

                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="text-muted-foreground w-12 px-4 py-2.5 text-left font-semibold">#</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">User</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Course / Provider</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Credits</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Completion Date</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Status</th>
                                    <th className="text-muted-foreground w-24 px-4 py-2.5 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {records.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-muted-foreground py-12 text-center text-sm">
                                            No credits logged.
                                        </td>
                                    </tr>
                                )}
                                {records.data.map((r, i) => (
                                    <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="px-4 py-2.5 font-medium tabular-nums">{(records.from ?? 1) + i}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="size-10">
                                                    <AvatarFallback className="text-xs">{r.member ? initials(r.member) : '—'}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <div className="font-medium">{r.member ?? 'Unassigned'}</div>
                                                    <div className="text-muted-foreground truncate text-sm">{r.email ?? '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex min-w-0 items-start gap-2.5">
                                                <div className="bg-primary/10 mt-0.5 shrink-0 rounded-md p-1.5">
                                                    <BookOpen className="text-primary size-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm leading-tight font-medium">{r.title}</p>
                                                    <p className="text-muted-foreground mt-0.5 text-xs">{r.provider ?? '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="min-w-[100px] space-y-1.5">
                                                <div className="flex items-center justify-between gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <Award className="size-3 shrink-0 text-yellow-500" />
                                                        <span className="text-xs font-bold tabular-nums">
                                                            {r.credit_hours}
                                                            <span className="text-muted-foreground font-normal">/{r.required_hours}</span>
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            'text-[10px] font-semibold tabular-nums',
                                                            r.progress === 100 ? 'text-emerald-600' : 'text-muted-foreground',
                                                        )}
                                                    >
                                                        {r.progress}%
                                                    </span>
                                                </div>
                                                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full transition-all',
                                                            r.progress === 100
                                                                ? 'bg-emerald-500'
                                                                : r.progress >= 50
                                                                  ? 'bg-yellow-500'
                                                                  : 'bg-orange-500',
                                                        )}
                                                        style={{ width: `${r.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="text-muted-foreground flex items-center gap-2 whitespace-nowrap">
                                                <Calendar className="size-4" />
                                                <span>{date(r.completed_on)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                                                    STATUS_RING[r.status] ?? STATUS_RING.in_progress,
                                                )}
                                            >
                                                {STATUS_LABEL[r.status] ?? r.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="View"
                                                    onClick={() => setViewing(r)}
                                                >
                                                    <Eye className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="Edit"
                                                    onClick={() => openEdit(r)}
                                                >
                                                    <SquarePen className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title={r.certificate_url ? 'Open certificate' : 'No certificate on file'}
                                                    disabled={!r.certificate_url}
                                                    asChild={!!r.certificate_url}
                                                >
                                                    {r.certificate_url ? (
                                                        <a href={r.certificate_url} target="_blank" rel="noreferrer">
                                                            <Download className="size-4" />
                                                        </a>
                                                    ) : (
                                                        <Download className="size-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="Delete"
                                                    onClick={() =>
                                                        confirmAction({ title: `Delete ${r.title}?` }).then(
                                                            (ok) => ok && router.delete(`/compliance/cle-tracking/${r.id}`, { preserveScroll: true }),
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
                        from={records.from}
                        to={records.to}
                        total={records.total}
                        links={records.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? 'Edit CLE Tracking' : 'Add CLE Tracking'}
                    onSubmit={submit}
                    processing={form.processing}
                    submitLabel={editing ? 'Save' : 'Add Credit'}
                    wide
                >
                    <TextField
                        label="Course"
                        value={form.data.title}
                        onChange={(v) => form.setData('title', v)}
                        error={form.errors.title}
                        className="sm:col-span-2"
                    />
                    <SelectField
                        label="User"
                        value={form.data.user_id}
                        onChange={(v) => form.setData('user_id', v)}
                        options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                        placeholder="Select user"
                        error={form.errors.user_id}
                    />
                    <TextField
                        label="Provider"
                        value={form.data.provider}
                        onChange={(v) => form.setData('provider', v)}
                        error={form.errors.provider}
                        list="cle-providers"
                    />
                    <datalist id="cle-providers">
                        {options.providers.map((p) => (
                            <option key={p} value={p} />
                        ))}
                    </datalist>
                    <TextField
                        label="Credits earned"
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.data.credit_hours}
                        onChange={(v) => form.setData('credit_hours', v)}
                        error={form.errors.credit_hours}
                    />
                    <TextField
                        label="Credits required"
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.data.required_hours}
                        onChange={(v) => form.setData('required_hours', v)}
                        error={form.errors.required_hours}
                        placeholder="Same as earned"
                    />
                    <SelectField
                        label="Status"
                        value={form.data.status}
                        onChange={(v) => form.setData('status', v)}
                        options={options.statuses.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
                        error={form.errors.status}
                    />
                    <SelectField
                        label="Category"
                        value={form.data.category}
                        onChange={(v) => form.setData('category', v)}
                        options={options.categories.map((c) => ({ value: c, label: c }))}
                        placeholder="—"
                        error={form.errors.category}
                    />
                    <TextField
                        label="Completion date"
                        type="date"
                        value={form.data.completed_on}
                        onChange={(v) => form.setData('completed_on', v)}
                        error={form.errors.completed_on}
                    />
                    <SelectField
                        label="Counts towards"
                        value={form.data.compliance_year}
                        onChange={(v) => form.setData('compliance_year', v)}
                        options={options.years.map((y) => ({ value: y, label: String(y) }))}
                        error={form.errors.compliance_year}
                    />
                    <TextField
                        label="Certificate URL"
                        type="url"
                        value={form.data.certificate_url}
                        onChange={(v) => form.setData('certificate_url', v)}
                        error={form.errors.certificate_url}
                        className="sm:col-span-2"
                    />
                    <TextareaField label="Notes" value={form.data.notes} onChange={(v) => form.setData('notes', v)} className="sm:col-span-2" />
                </FormDialog>

                <Dialog open={!!viewing} onOpenChange={(next) => !next && setViewing(null)}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{viewing?.title}</DialogTitle>
                        </DialogHeader>
                        {viewing && (
                            <div className="space-y-4 text-sm">
                                <span
                                    className={cn(
                                        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                                        STATUS_RING[viewing.status],
                                    )}
                                >
                                    {STATUS_LABEL[viewing.status]}
                                </span>
                                <dl className="grid grid-cols-2 gap-3">
                                    <Detail label="User" value={viewing.member ?? 'Unassigned'} hint={viewing.email} />
                                    <Detail label="Provider" value={viewing.provider ?? '—'} />
                                    <Detail label="Credits" value={`${viewing.credit_hours} / ${viewing.required_hours} (${viewing.progress}%)`} />
                                    <Detail label="Category" value={viewing.category ?? '—'} />
                                    <Detail label="Completed" value={date(viewing.completed_on)} />
                                    <Detail label="Counts towards" value={String(viewing.compliance_year)} />
                                </dl>
                                {viewing.notes && (
                                    <div>
                                        <p className="text-muted-foreground mb-1 text-xs">Notes</p>
                                        <p className="whitespace-pre-line">{viewing.notes}</p>
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
            <dt className="text-muted-foreground mb-1 text-xs">{label}</dt>
            <dd>{value}</dd>
            {hint && <dd className="text-muted-foreground truncate text-xs">{hint}</dd>}
        </div>
    );
}
