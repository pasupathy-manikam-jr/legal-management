import { InitialsAvatar } from '@/components/avatar-stack';
import { confirmAction } from '@/components/confirm-dialog';
import { DataTableFooter } from '@/components/data-table-footer';
import { Dropdown } from '@/components/dropdown';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { RingPill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Client, Paginated } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Eye, Filter, Lock, LockOpen, Plus, RefreshCcw, Search, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Clients', href: '/clients' }];

const empty = () => ({ name: '', company: '', type: '', email: '', phone: '', address: '', notes: '', active: true as boolean });

export default function ClientsIndex({
    clients,
    filters,
    perPage,
    options,
}: {
    clients: Paginated<Client>;
    filters: Record<string, string>;
    perPage: number;
    options: { types: string[]; statuses: string[] };
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Client | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const form = useForm(empty());

    const hasFilters = Boolean(filters.search || filters.type || filters.status);

    function apply(patch: Record<string, string | number>) {
        router.get('/clients', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });
    }

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(client: Client) {
        form.setData({
            name: client.name,
            company: client.company ?? '',
            type: client.type ?? '',
            email: client.email ?? '',
            phone: client.phone ?? '',
            address: client.address ?? '',
            notes: client.notes ?? '',
            active: client.active ?? true,
        });
        form.clearErrors();
        setEditing(client);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        if (editing) {
            form.put(`/clients/${editing.id}`, done);
        } else {
            form.post('/clients', done);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clients" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Clients</h1>
                        <p className="text-muted-foreground text-xs">Manage client profiles and contact details.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Client
                    </Button>
                </div>

                <div className="bg-card rounded-lg border p-3 shadow-sm">
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
                                value={filters.type ?? ''}
                                onChange={(v) => apply({ type: v })}
                                placeholder="All Types"
                                options={options.types.map((t) => ({ value: t, label: t }))}
                                className="h-9 w-40"
                            />

                            <Dropdown
                                value={filters.status ?? ''}
                                onChange={(v) => apply({ status: v })}
                                placeholder="All Status"
                                options={options.statuses.map((s) => ({ value: s, label: s }))}
                                className="h-9 w-40"
                                capitalize
                            />
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            {hasFilters && (
                                <Button variant="ghost" size="sm" className="text-muted-foreground h-9" onClick={() => router.get('/clients')}>
                                    <RefreshCcw className="size-4" /> Clear Filters
                                </Button>
                            )}
                            <span className="text-muted-foreground flex h-8 items-center gap-1.5 rounded-md border px-2 text-sm">
                                <Filter className="size-4" /> Filters
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="text-muted-foreground w-12 px-4 py-2.5 text-left font-semibold">#</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Client</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Phone</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Type</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Cases</th>
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Status</th>
                                    <th className="text-muted-foreground w-24 px-4 py-2.5 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-muted-foreground py-12 text-center text-sm">
                                            No clients match these filters.
                                        </td>
                                    </tr>
                                )}
                                {clients.data.map((c, i) => {
                                    const active = c.active ?? true;

                                    return (
                                        <tr key={c.id} className="hover:bg-muted/40 border-b transition-colors last:border-0">
                                            <td className="px-4 py-2.5 font-medium tabular-nums">{(clients.from ?? 1) + i}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <InitialsAvatar name={c.name} className="size-10" />
                                                    <div className="min-w-0">
                                                        <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                                                            {c.name}
                                                        </Link>
                                                        <div className="text-muted-foreground truncate text-sm">{c.email ?? c.company ?? '—'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-muted-foreground px-4 py-2.5">{c.phone ?? '—'}</td>
                                            <td className="text-muted-foreground px-4 py-2.5">{c.type ?? '—'}</td>
                                            <td className="text-muted-foreground px-4 py-2.5 tabular-nums">{c.matters_count ?? 0}</td>
                                            <td className="px-4 py-2.5">
                                                <RingPill value={active ? 'active' : 'inactive'} label={active ? 'Active' : 'Inactive'} />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground size-8" asChild title="View">
                                                        <Link href={`/clients/${c.id}`}>
                                                            <Eye className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground size-8"
                                                        title="Edit"
                                                        onClick={() => openEdit(c)}
                                                    >
                                                        <SquarePen className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground size-8"
                                                        title={active ? 'Archive client' : 'Reactivate client'}
                                                        onClick={() => router.patch(`/clients/${c.id}/toggle-status`, {}, { preserveScroll: true })}
                                                    >
                                                        {active ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground size-8"
                                                        title="Delete"
                                                        onClick={() =>
                                                            confirmAction({ title: `Delete ${c.name}?`, description: `Their cases go too.` }).then(
                                                                (ok) => ok && router.delete(`/clients/${c.id}`, { preserveScroll: true }),
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="size-4 text-rose-600" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <DataTableFooter
                        from={clients.from}
                        to={clients.to}
                        total={clients.total}
                        links={clients.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>
            </div>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? `Edit ${editing.name}` : 'Add Client'}
                onSubmit={submit}
                processing={form.processing}
                wide
            >
                <TextField label="Name" value={form.data.name} onChange={(v) => form.setData('name', v)} error={form.errors.name} />
                <TextField label="Company" value={form.data.company} onChange={(v) => form.setData('company', v)} error={form.errors.company} />
                <SelectField
                    label="Type"
                    value={form.data.type}
                    onChange={(v) => form.setData('type', v)}
                    options={options.types.map((t) => ({ value: t, label: t }))}
                    placeholder="—"
                />
                <SelectField
                    label="Status"
                    value={form.data.active ? '1' : '0'}
                    onChange={(v) => form.setData('active', v === '1')}
                    options={[
                        { value: '1', label: 'Active' },
                        { value: '0', label: 'Inactive' },
                    ]}
                />
                <TextField label="Email" type="email" value={form.data.email} onChange={(v) => form.setData('email', v)} error={form.errors.email} />
                <TextField label="Phone" value={form.data.phone} onChange={(v) => form.setData('phone', v)} error={form.errors.phone} />
                <TextareaField label="Address" value={form.data.address} onChange={(v) => form.setData('address', v)} className="sm:col-span-2" />
                <TextareaField label="Notes" value={form.data.notes} onChange={(v) => form.setData('notes', v)} className="sm:col-span-2" />
            </FormDialog>
        </AppLayout>
    );
}
