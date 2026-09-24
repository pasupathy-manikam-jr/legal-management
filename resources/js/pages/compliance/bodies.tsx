import { DataTableFooter } from '@/components/data-table-footer';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { confirmAction } from '@/components/confirm-dialog';
import { CountTabs } from '@/components/page-toolbar';
import { RingPill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CircleCheck, CircleX, Eye, LayoutGrid, Lock, LockOpen, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Regulatory Bodies', href: '/compliance/regulatory-bodies' }];

interface Body {
    id: number;
    name: string;
    short_name: string | null;
    type: string | null;
    jurisdiction: string | null;
    website: string | null;
    contact_email: string | null;
    phone: string | null;
    notes: string | null;
    active: boolean;
    licenses_count: number;
}

/** Each jurisdiction keeps the same pill colour wherever it appears. */
const JURISDICTION_RING = [
    'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300',
    'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-950 dark:text-yellow-300',
    'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300',
    'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300',
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300',
];

function jurisdictionTone(value: string): string {
    const seed = [...value].reduce((total, character) => total + character.charCodeAt(0), 0);

    return JURISDICTION_RING[seed % JURISDICTION_RING.length];
}

const empty = () => ({
    name: '',
    short_name: '',
    type: '',
    jurisdiction: '',
    website: '',
    contact_email: '',
    phone: '',
    notes: '',
    active: '1',
});

export default function RegulatoryBodies({
    bodies,
    filters,
    perPage,
    counts,
    options,
}: {
    bodies: Paginated<Body>;
    filters: Record<string, string>;
    perPage: number;
    counts: { all: number; active: number; inactive: number };
    options: { types: string[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Body | null>(null);
    const [viewing, setViewing] = useState<Body | null>(null);
    const form = useForm(empty());

    const apply = (patch: Record<string, string | number>) =>
        router.get('/compliance/regulatory-bodies', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(b: Body) {
        form.setData({
            name: b.name,
            short_name: b.short_name ?? '',
            type: b.type ?? '',
            jurisdiction: b.jurisdiction ?? '',
            website: b.website ?? '',
            contact_email: b.contact_email ?? '',
            phone: b.phone ?? '',
            notes: b.notes ?? '',
            active: b.active ? '1' : '0',
        });
        form.clearErrors();
        setEditing(b);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        editing ? form.put(`/compliance/regulatory-bodies/${editing.id}`, done) : form.post('/compliance/regulatory-bodies', done);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Regulatory Bodies" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Regulatory Bodies</h1>
                        <p className="text-xs text-muted-foreground">Manage regulatory authorities and their contact information.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Regulatory Body
                    </Button>
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

                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="w-12 px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Name</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Jurisdiction</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Contact Phone</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Website</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                                    <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {bodies.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                                            No regulatory bodies recorded.
                                        </td>
                                    </tr>
                                )}
                                {bodies.data.map((b, i) => (
                                    <tr key={b.id} className="transition-colors hover:bg-muted/40">
                                        <td className="px-4 py-2.5 font-medium tabular-nums">{(bodies.from ?? 1) + i}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="font-medium">{b.name}</div>
                                            <div className="text-sm text-muted-foreground">{b.contact_email ?? '—'}</div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {b.jurisdiction ? (
                                                <span
                                                    title={b.jurisdiction}
                                                    className={cn(
                                                        'inline-flex h-6 max-w-[200px] items-center rounded-md px-2 text-xs leading-4 font-medium whitespace-nowrap ring-1 ring-inset',
                                                        jurisdictionTone(b.jurisdiction),
                                                    )}
                                                >
                                                    <span className="min-w-0 truncate">{b.jurisdiction}</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">{b.phone ?? '—'}</td>
                                        <td className="px-4 py-2.5">
                                            {b.website ? (
                                                <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                    {b.website}
                                                </a>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <RingPill value={b.active ? 'active' : 'inactive'} label={b.active ? 'Active' : 'Inactive'} />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="View" onClick={() => setViewing(b)}>
                                                    <Eye className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="Edit" onClick={() => openEdit(b)}>
                                                    <SquarePen className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground"
                                                    title={b.active ? 'Retire' : 'Reactivate'}
                                                    onClick={() => router.patch(`/compliance/regulatory-bodies/${b.id}/toggle`, {}, { preserveScroll: true })}
                                                >
                                                    {b.active ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground"
                                                    title="Delete"
                                                    onClick={() => confirmAction({ title: `Delete ${b.name}?` }).then((ok) => ok && router.delete(`/compliance/regulatory-bodies/${b.id}`, { preserveScroll: true }))}
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
                        from={bodies.from}
                        to={bodies.to}
                        total={bodies.total}
                        links={bodies.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? 'Edit Regulatory Body' : 'Add Regulatory Body'}
                    onSubmit={submit}
                    processing={form.processing}
                    submitLabel={editing ? 'Save' : 'Add Body'}
                    wide
                >
                    <TextField label="Name" value={form.data.name} onChange={(v) => form.setData('name', v)} error={form.errors.name} className="sm:col-span-2" />
                    <TextField label="Short name" value={form.data.short_name} onChange={(v) => form.setData('short_name', v)} error={form.errors.short_name} />
                    <SelectField
                        label="Type"
                        value={form.data.type}
                        onChange={(v) => form.setData('type', v)}
                        options={options.types.map((t) => ({ value: t, label: t }))}
                        placeholder="—"
                        error={form.errors.type}
                    />
                    <TextField
                        label="Jurisdiction"
                        value={form.data.jurisdiction}
                        onChange={(v) => form.setData('jurisdiction', v)}
                        error={form.errors.jurisdiction}
                        placeholder="State"
                    />
                    <TextField
                        label="Contact phone"
                        value={form.data.phone}
                        onChange={(v) => form.setData('phone', v)}
                        error={form.errors.phone}
                        placeholder="+1-555-0100"
                    />
                    <TextField
                        label="Contact email"
                        type="email"
                        value={form.data.contact_email}
                        onChange={(v) => form.setData('contact_email', v)}
                        error={form.errors.contact_email}
                    />
                    <TextField label="Website" type="url" value={form.data.website} onChange={(v) => form.setData('website', v)} error={form.errors.website} />
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

                <Dialog open={!!viewing} onOpenChange={(next) => !next && setViewing(null)}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{viewing?.name}</DialogTitle>
                        </DialogHeader>
                        {viewing && (
                            <div className="space-y-4 text-sm">
                                <div className="flex flex-wrap gap-2">
                                    <RingPill value={viewing.active ? 'active' : 'inactive'} label={viewing.active ? 'Active' : 'Inactive'} />
                                    {viewing.jurisdiction && (
                                        <span
                                            className={cn(
                                                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                                                jurisdictionTone(viewing.jurisdiction),
                                            )}
                                        >
                                            {viewing.jurisdiction}
                                        </span>
                                    )}
                                </div>
                                <dl className="grid grid-cols-2 gap-3">
                                    <Detail label="Short name" value={viewing.short_name ?? '—'} />
                                    <Detail label="Type" value={viewing.type ?? '—'} />
                                    <Detail label="Contact email" value={viewing.contact_email ?? '—'} />
                                    <Detail label="Contact phone" value={viewing.phone ?? '—'} />
                                    <Detail label="Licences issued" value={String(viewing.licenses_count)} />
                                    <Detail label="Website" value={viewing.website ?? '—'} />
                                </dl>
                                {viewing.notes && (
                                    <div>
                                        <p className="mb-1 text-xs text-muted-foreground">Notes</p>
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

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
            <dd className="truncate capitalize">{value}</dd>
        </div>
    );
}
