import { DataTableFooter } from '@/components/data-table-footer';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { CountTabs } from '@/components/page-toolbar';
import { RingPill, TonePill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Building2, Calendar, CircleCheck, CircleX, Eye, Grid3x3, Landmark, LayoutGrid, List, Lock, LockOpen, Phone, Plus, Scale, Search, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Courts', href: '/courts' }];

interface Court {
    id: number;
    reference: string | null;
    name: string;
    type: string;
    bench: string | null;
    jurisdiction: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    active: boolean;
    created_at: string;
    matters_count: number;
}

interface CourtType {
    name: string;
    color: string | null;
}

const FALLBACK_COLOR = '#6b7280';

const empty = () => ({
    name: '',
    type: '',
    bench: '',
    jurisdiction: '',
    address: '',
    phone: '',
    email: '',
    active: '1',
});

export default function Courts({
    view,
    courts,
    filters,
    perPage,
    counts,
    types,
}: {
    view: 'grid' | 'list';
    courts: Paginated<Court>;
    filters: Record<string, string>;
    perPage: number;
    counts: { all: number; active: number; inactive: number };
    types: CourtType[];
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Court | null>(null);
    const [viewing, setViewing] = useState<Court | null>(null);
    const form = useForm(empty());

    const apply = (patch: Record<string, string | number>) =>
        router.get('/courts', { ...filters, view, per_page: perPage, ...patch }, { preserveState: true, replace: true });

    const colorOf = (type: string) => types.find((t) => t.name === type)?.color ?? FALLBACK_COLOR;

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(court: Court) {
        form.setData({
            name: court.name,
            type: court.type,
            bench: court.bench ?? '',
            jurisdiction: court.jurisdiction ?? '',
            address: court.address ?? '',
            phone: court.phone ?? '',
            email: court.email ?? '',
            active: court.active ? '1' : '0',
        });
        form.clearErrors();
        setEditing(court);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        editing ? form.put(`/courts/${editing.id}`, done) : form.post('/courts', done);
    }

    const actions = (court: Court) => (
        <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" title="View" onClick={() => setViewing(court)}>
                <Eye className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" title="Edit" onClick={() => openEdit(court)}>
                <SquarePen className="size-3.5" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                title={court.active ? 'Retire' : 'Reactivate'}
                onClick={() => router.patch(`/courts/${court.id}/toggle`, {}, { preserveScroll: true })}
            >
                {court.active ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                title="Delete"
                onClick={() => confirmAction({ title: `Delete ${court.name}?` }).then((ok) => ok && router.delete(`/courts/${court.id}`, { preserveScroll: true }))}
            >
                <Trash2 className="size-3.5 text-rose-600" />
            </Button>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Courts" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Courts</h1>
                        <p className="text-xs text-muted-foreground">Manage courts, jurisdictions, and filing details.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Court
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

                            <Dropdown value={filters.type ?? ''} onChange={(v) => apply({ type: v })} placeholder="All Types" options={types.map((t) => ({ value: t.name, label: t.name }))} className="h-9 w-40" aria-label="Type filter" capitalize />
                        </div>

                        <div className="mr-2 rounded-md border p-0.5">
                            <Button
                                variant={view === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                className="h-7 px-2"
                                title="List View"
                                onClick={() => apply({ view: 'list' })}
                            >
                                <List className="size-4" />
                            </Button>
                            <Button
                                variant={view === 'grid' ? 'default' : 'ghost'}
                                size="sm"
                                className="h-7 px-2"
                                title="Grid View"
                                onClick={() => apply({ view: 'grid' })}
                            >
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

                {courts.data.length === 0 ? (
                    <div className="rounded-lg border bg-card py-16 text-center text-sm text-muted-foreground shadow-sm">No courts match this view.</div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {courts.data.map((court) => (
                            <div key={court.id} className="relative flex flex-col justify-between overflow-hidden rounded-lg border bg-card shadow-sm">
                                <div className="flex items-center justify-between gap-4 px-5 pt-4">
                                    <span className="inline-flex shrink-0 items-center rounded-md bg-muted px-2 py-1 text-xs font-medium ring-1 ring-inset ring-border">
                                        {court.reference ?? '—'}
                                    </span>
                                    <RingPill value={court.active ? 'active' : 'inactive'} label={court.active ? 'Active' : 'Inactive'} />
                                </div>

                                <div className="flex flex-col items-center px-5 pt-4 pb-4 text-center">
                                    <div className="mb-3 rounded-full bg-primary/10 p-3 text-primary ring-2 ring-primary/30">
                                        <Landmark className="size-8" />
                                    </div>
                                    <h3 className="line-clamp-2 max-w-full text-base font-semibold">{court.name}</h3>
                                    <p className="mt-1 max-w-full truncate text-xs font-medium text-muted-foreground">{court.email ?? '—'}</p>
                                </div>

                                <div className="space-y-3 border-t p-5 text-xs">
                                    <Detail icon={Phone} label="Phone">
                                        <span className="truncate font-medium">{court.phone ?? '—'}</span>
                                    </Detail>
                                    <Detail icon={Scale} label="Jurisdiction">
                                        <span className="truncate font-medium">{court.jurisdiction ?? '—'}</span>
                                    </Detail>
                                    <Detail icon={Building2} label="Court Type">
                                        <TonePill color={colorOf(court.type)}>{court.type}</TonePill>
                                    </Detail>
                                </div>

                                <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-5 py-3">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="size-3.5" />
                                        {date(court.created_at)}
                                    </span>
                                    {actions(court)}
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
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Court</th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Type</th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Jurisdiction</th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Phone</th>
                                        <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Cases</th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                                        <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {courts.data.map((court) => (
                                        <tr key={court.id} className="transition-colors hover:bg-muted/40">
                                            <td className="px-4 py-2.5 font-mono text-xs">{court.reference ?? '—'}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="font-medium">{court.name}</div>
                                                <div className="text-xs text-muted-foreground">{court.email ?? '—'}</div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <TonePill color={colorOf(court.type)}>{court.type}</TonePill>
                                            </td>
                                            <td className="px-4 py-2.5 text-muted-foreground">{court.jurisdiction ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-muted-foreground">{court.phone ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums">{court.matters_count}</td>
                                            <td className="px-4 py-2.5">
                                                <RingPill value={court.active ? 'active' : 'inactive'} label={court.active ? 'Active' : 'Inactive'} />
                                            </td>
                                            <td className="px-4 py-2.5 text-right">{actions(court)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className={cn('overflow-hidden rounded-lg border bg-card shadow-sm', view === 'grid' && 'mt-1')}>
                    <DataTableFooter
                        from={courts.from}
                        to={courts.to}
                        total={courts.total}
                        links={courts.links}
                        perPage={perPage}
                        sizes={[8, 16, 32, 64]}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? 'Edit Court' : 'Add Court'}
                    onSubmit={submit}
                    processing={form.processing}
                    submitLabel={editing ? 'Save' : 'Add Court'}
                    wide
                >
                    <TextField label="Court name" value={form.data.name} onChange={(v) => form.setData('name', v)} error={form.errors.name} className="sm:col-span-2" />
                    <SelectField
                        label="Court type"
                        value={form.data.type}
                        onChange={(v) => form.setData('type', v)}
                        options={types.map((t) => ({ value: t.name, label: t.name }))}
                        placeholder="Select type"
                        error={form.errors.type}
                    />
                    <TextField
                        label="Jurisdiction"
                        value={form.data.jurisdiction}
                        onChange={(v) => form.setData('jurisdiction', v)}
                        error={form.errors.jurisdiction}
                        placeholder="Queens County"
                    />
                    <TextField label="Bench" value={form.data.bench} onChange={(v) => form.setData('bench', v)} error={form.errors.bench} />
                    <TextField label="Phone" value={form.data.phone} onChange={(v) => form.setData('phone', v)} error={form.errors.phone} />
                    <TextField label="Email" type="email" value={form.data.email} onChange={(v) => form.setData('email', v)} error={form.errors.email} />
                    <SelectField
                        label="Status"
                        value={form.data.active}
                        onChange={(v) => form.setData('active', v)}
                        options={[
                            { value: '1', label: 'Active' },
                            { value: '0', label: 'Inactive' },
                        ]}
                    />
                    <TextareaField label="Address" value={form.data.address} onChange={(v) => form.setData('address', v)} className="sm:col-span-2" />
                </FormDialog>

                <Dialog open={!!viewing} onOpenChange={(next) => !next && setViewing(null)}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{viewing?.name}</DialogTitle>
                        </DialogHeader>
                        {viewing && (
                            <div className="space-y-4 text-sm">
                                <div className="flex flex-wrap gap-2">
                                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium ring-1 ring-inset ring-border">
                                        {viewing.reference ?? '—'}
                                    </span>
                                    <TonePill color={colorOf(viewing.type)}>{viewing.type}</TonePill>
                                    <RingPill value={viewing.active ? 'active' : 'inactive'} label={viewing.active ? 'Active' : 'Inactive'} />
                                </div>
                                <dl className="grid grid-cols-2 gap-3">
                                    <Field label="Jurisdiction" value={viewing.jurisdiction ?? '—'} />
                                    <Field label="Bench" value={viewing.bench ?? '—'} />
                                    <Field label="Phone" value={viewing.phone ?? '—'} />
                                    <Field label="Email" value={viewing.email ?? '—'} />
                                    <Field label="Cases here" value={String(viewing.matters_count)} />
                                    <Field label="On file since" value={date(viewing.created_at)} />
                                </dl>
                                {viewing.address && (
                                    <div>
                                        <p className="mb-1 text-xs text-muted-foreground">Address</p>
                                        <p className="whitespace-pre-line">{viewing.address}</p>
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

function Detail({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
    return (
        <div className="flex min-w-0 items-center gap-2">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="shrink-0 font-medium text-muted-foreground">{label}:</span>
            {children}
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
            <dd className="capitalize">{value}</dd>
        </div>
    );
}
