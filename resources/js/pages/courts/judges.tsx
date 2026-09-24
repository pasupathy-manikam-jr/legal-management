import { DataTableFooter } from '@/components/data-table-footer';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { CountTabs } from '@/components/page-toolbar';
import { RingPill } from '@/components/tone-pill';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Building2, Calendar, CircleCheck, CircleX, Gavel, Grid3x3, Info, LayoutGrid, List, Lock, LockOpen, Phone, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Judges', href: '/judges' }];

interface Judge {
    id: number;
    reference: string | null;
    name: string;
    designation: string | null;
    email: string | null;
    phone: string | null;
    appointed_on: string | null;
    notes: string | null;
    active: boolean;
    created_at: string | null;
    court_id: number | null;
    court: string | null;
    hearings_count: number;
}

const empty = () => ({
    court_id: '',
    name: '',
    designation: '',
    email: '',
    phone: '',
    appointed_on: '',
    notes: '',
    active: '1',
});

/** Each judge keeps the same avatar colour wherever they appear. */
const AVATAR_TONES = [
    'bg-pink-50 text-pink-700 border-pink-300 dark:bg-pink-950 dark:text-pink-300',
    'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300',
    'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300',
    'bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300',
    'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
    'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
];

function avatarTone(name: string): string {
    const seed = [...name].reduce((total, character) => total + character.charCodeAt(0), 0);

    return AVATAR_TONES[seed % AVATAR_TONES.length];
}

const initials = (name: string) =>
    name
        .replace(/^(Hon\.|Justice|Judge)\s+/i, '')
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

export default function Judges({
    view,
    judges,
    filters,
    perPage,
    counts,
    options,
}: {
    view: 'grid' | 'list';
    judges: Paginated<Judge>;
    filters: Record<string, string>;
    perPage: number;
    counts: { all: number; active: number; inactive: number };
    options: { courts: { id: number; name: string }[]; designations: string[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Judge | null>(null);
    const form = useForm(empty());

    const apply = (patch: Record<string, string | number>) =>
        router.get('/judges', { ...filters, view, per_page: perPage, ...patch }, { preserveState: true, replace: true });

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(judge: Judge) {
        form.setData({
            court_id: judge.court_id ? String(judge.court_id) : '',
            name: judge.name,
            designation: judge.designation ?? '',
            email: judge.email ?? '',
            phone: judge.phone ?? '',
            appointed_on: judge.appointed_on ?? '',
            notes: judge.notes ?? '',
            active: judge.active ? '1' : '0',
        });
        form.clearErrors();
        setEditing(judge);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        editing ? form.put(`/judges/${editing.id}`, done) : form.post('/judges', done);
    }

    const actions = (judge: Judge) => (
        <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" title="Edit" onClick={() => openEdit(judge)}>
                <SquarePen className="size-3.5" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                title={judge.active ? 'Retire' : 'Reactivate'}
                onClick={() => router.patch(`/judges/${judge.id}/toggle`, {}, { preserveScroll: true })}
            >
                {judge.active ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                title="Delete"
                onClick={() => confirmAction({ title: `Remove ${judge.name}?`, confirmLabel: 'Remove' }).then((ok) => ok && router.delete(`/judges/${judge.id}`, { preserveScroll: true }))}
            >
                <Trash2 className="size-3.5 text-rose-600" />
            </Button>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Judges" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Judges</h1>
                        <p className="text-xs text-muted-foreground">Manage judges and their court assignments.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Judge
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

                        <Dropdown value={filters.court ?? ''} onChange={(v) => apply({ court: v })} placeholder="All Courts" options={options.courts.map((court) => ({ value: court.id, label: court.name }))} className="h-9 w-48" aria-label="Court filter" />
                        </div>

                        <div className="mr-2 rounded-md border p-0.5">
                            <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" className="h-7 px-2" title="List View" onClick={() => apply({ view: 'list' })}>
                                <List className="size-4" />
                            </Button>
                            <Button variant={view === 'grid' ? 'default' : 'ghost'} size="sm" className="h-7 px-2" title="Grid View" onClick={() => apply({ view: 'grid' })}>
                                <Grid3x3 className="size-4" />
                            </Button>
                        </div>
                    </div>

                    <CountTabs
                        value={filters.status ?? ''}
                        onSelect={(v) => apply({ status: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all },
                            { value: 'active', label: 'Active', icon: CircleCheck, count: counts.active },
                            { value: 'inactive', label: 'Inactive', icon: CircleX, count: counts.inactive },
                        ]}
                    />
                </div>

                {judges.data.length === 0 ? (
                    <div className="rounded-lg border bg-card py-16 text-center text-sm text-muted-foreground shadow-sm">No judges recorded.</div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {judges.data.map((judge) => (
                            <div key={judge.id} className="relative flex flex-col justify-between overflow-hidden rounded-lg border bg-card shadow-sm">
                                <div className="flex items-center justify-between gap-4 px-5 pt-4">
                                    <span className="inline-flex shrink-0 items-center rounded-md bg-muted px-2 py-1 text-xs font-medium ring-1 ring-inset ring-border">
                                        {judge.reference ?? '—'}
                                    </span>
                                    <RingPill value={judge.active ? 'active' : 'inactive'} label={judge.active ? 'Active' : 'Inactive'} />
                                </div>

                                <div className="flex flex-col items-center px-5 pt-2 pb-4 text-center">
                                    <Avatar className="size-16">
                                        <AvatarFallback className={cn('border text-xl font-semibold', avatarTone(judge.name))}>{initials(judge.name)}</AvatarFallback>
                                    </Avatar>
                                    <h3 className="mt-3 max-w-full truncate text-base font-semibold">{judge.name}</h3>
                                    <p className="mt-1 max-w-full truncate text-xs text-muted-foreground">{judge.email ?? '—'}</p>
                                </div>

                                <div className="space-y-3 border-t p-5 text-xs">
                                    <Line icon={Building2} label="Court" value={judge.court ?? 'Unassigned'} />
                                    <Line icon={Info} label="Title" value={judge.designation ?? '—'} />
                                    <Line icon={Phone} label="Phone" value={judge.phone ?? '—'} />
                                </div>

                                <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-5 py-3">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="size-3.5" />
                                        {date(judge.created_at)}
                                    </span>
                                    {actions(judge)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Reference</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Judge</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Court</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Contact</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Appointed</th>
                                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Hearings</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                                    <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {judges.data.map((judge) => (
                                    <tr key={judge.id} className="transition-colors hover:bg-muted/40">
                                        <td className="px-4 py-2.5 font-mono text-xs">{judge.reference ?? '—'}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="size-9">
                                                    <AvatarFallback className="text-xs">{initials(judge.name)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <div className="font-medium">{judge.name}</div>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Gavel className="size-3 shrink-0" />
                                                        {judge.designation ?? '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground">{judge.court ?? 'Unassigned'}</td>
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            <div>{judge.email ?? '—'}</div>
                                            {judge.phone && <div className="text-xs">{judge.phone}</div>}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{date(judge.appointed_on)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{judge.hearings_count}</td>
                                        <td className="px-4 py-2.5">
                                            <RingPill value={judge.active ? 'active' : 'inactive'} label={judge.active ? 'Active' : 'Inactive'} />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">{actions(judge)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}

                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <DataTableFooter
                        from={judges.from}
                        to={judges.to}
                        total={judges.total}
                        links={judges.links}
                        perPage={perPage}
                        sizes={[12, 24, 48, 96]}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? 'Edit Judge' : 'Add Judge'}
                    onSubmit={submit}
                    processing={form.processing}
                    submitLabel={editing ? 'Save' : 'Add Judge'}
                    wide
                >
                    <TextField
                        label="Name"
                        value={form.data.name}
                        onChange={(v) => form.setData('name', v)}
                        error={form.errors.name}
                        placeholder="Hon. Miriam Adeyemi"
                        className="sm:col-span-2"
                    />
                    <TextField
                        label="Designation"
                        value={form.data.designation}
                        onChange={(v) => form.setData('designation', v)}
                        error={form.errors.designation}
                        list="judge-designations"
                        placeholder="District Judge"
                    />
                    <datalist id="judge-designations">
                        {options.designations.map((d) => (
                            <option key={d} value={d} />
                        ))}
                    </datalist>
                    <SelectField
                        label="Court"
                        value={form.data.court_id}
                        onChange={(v) => form.setData('court_id', v)}
                        options={options.courts.map((court) => ({ value: court.id, label: court.name }))}
                        placeholder="Unassigned"
                        error={form.errors.court_id}
                    />
                    <TextField label="Email" type="email" value={form.data.email} onChange={(v) => form.setData('email', v)} error={form.errors.email} />
                    <TextField label="Phone" value={form.data.phone} onChange={(v) => form.setData('phone', v)} error={form.errors.phone} />
                    <TextField
                        label="Appointed"
                        type="date"
                        value={form.data.appointed_on}
                        onChange={(v) => form.setData('appointed_on', v)}
                        error={form.errors.appointed_on}
                    />
                    <SelectField
                        label="Status"
                        value={form.data.active}
                        onChange={(v) => form.setData('active', v)}
                        options={[
                            { value: '1', label: 'Active' },
                            { value: '0', label: 'Inactive' },
                        ]}
                    />
                    <TextareaField label="Notes" value={form.data.notes} onChange={(v) => form.setData('notes', v)} className="sm:col-span-2" />
                </FormDialog>
            </div>
        </AppLayout>
    );
}

function Line({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
    return (
        <div className="flex min-w-0 items-center gap-2">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="shrink-0 font-medium text-muted-foreground">{label}:</span>
            <span className="truncate font-medium">{value}</span>
        </div>
    );
}
