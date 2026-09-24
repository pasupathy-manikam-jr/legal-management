import { InitialsAvatar } from '@/components/avatar-stack';
import { DataTableFooter } from '@/components/data-table-footer';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { FormDialog, SelectField, TextField } from '@/components/form-dialog';
import { FilterActions } from '@/components/page-toolbar';
import { SortableHead } from '@/components/sortable-head';
import { RingPill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date, hours } from '@/lib/format';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Calendar, Eye, Grid3x3, History, KeyRound, List, Lock, LockOpen, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Users Management', href: '/users' }];

interface Member {
    id: number;
    name: string;
    email: string;
    role: string;
    title: string | null;
    active: boolean;
    joined_on: string | null;
    leadCases: number;
    minutesThisMonth: number;
}

/** The role reads as a title rather than a system key. */
const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrator',
    lawyer: 'Lawyer',
    paralegal: 'Paralegal',
    billing: 'Billing',
};

export default function UsersManagement({
    view,
    members,
    filters,
    perPage,
    sort,
    roles,
}: {
    view: 'list' | 'grid';
    members: Paginated<Member>;
    filters: Record<string, string>;
    perPage: number;
    sort: { column: string; direction: string };
    roles: string[];
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Member | null>(null);
    const [viewing, setViewing] = useState<Member | null>(null);
    const [resetting, setResetting] = useState<Member | null>(null);

    const form = useForm({ name: '', email: '', role: 'lawyer', title: '', password: '', active: true as boolean });
    const secret = useForm({ password: '', password_confirmation: '' });

    const apply = (patch: Record<string, string | number>) =>
        router.get('/users', { ...filters, view, per_page: perPage, sort: sort.column, direction: sort.direction, ...patch }, { preserveState: true, replace: true });

    const toggleSort = (column: string) =>
        apply({ sort: column, direction: sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc' });

    function openCreate() {
        form.setData({ name: '', email: '', role: 'lawyer', title: '', password: '', active: true });
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(member: Member) {
        form.setData({ name: member.name, email: member.email, role: member.role, title: member.title ?? '', password: '', active: member.active });
        form.clearErrors();
        setEditing(member);
        setOpen(true);
    }

    function openReset(member: Member) {
        secret.setData({ password: '', password_confirmation: '' });
        secret.clearErrors();
        setResetting(member);
    }

    const actions = (member: Member) => (
        <div className="flex items-center justify-end gap-0.5">
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="View" onClick={() => setViewing(member)}>
                <Eye className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="Edit" onClick={() => openEdit(member)}>
                <SquarePen className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="Reset password" onClick={() => openReset(member)}>
                <KeyRound className="size-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                title={member.active ? 'Suspend' : 'Reactivate'}
                onClick={() => router.patch(`/users/${member.id}/toggle`, {}, { preserveScroll: true })}
            >
                {member.active ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                title="Delete"
                onClick={() => confirmAction({ title: `Remove ${member.name}?`, confirmLabel: 'Remove' }).then((ok) => ok && router.delete(`/users/${member.id}`, { preserveScroll: true }))}
            >
                <Trash2 className="size-4 text-rose-600" />
            </Button>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users Management" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Users Management</h1>
                        <p className="text-xs text-muted-foreground">Manage users with their roles.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* The firm has no activity log yet, so this reads the role matrix instead. */}
                        <Button variant="outline" size="icon" className="size-8" title="Roles" asChild>
                            <Link href="/roles">
                                <History className="size-4" />
                            </Link>
                        </Button>
                        <Button onClick={openCreate}>
                            <Plus className="size-4" /> Add User
                        </Button>
                    </div>
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

                            <Dropdown value={filters.role ?? ''} onChange={(v) => apply({ role: v })} placeholder="All Roles" options={roles.map((role) => ({ value: role, label: ROLE_LABELS[role] ?? role }))} className="h-9 w-40" aria-label="Role filter" />
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <FilterActions
                                active={Boolean(filters.search || filters.role)}
                                onClear={() => {
                                    setSearch('');
                                    router.get('/users', { view }, { preserveState: true, replace: true });
                                }}
                            />

                            <div className="mr-2 rounded-md border p-0.5">
                                <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" className="h-7 px-2" title="List View" onClick={() => apply({ view: 'list' })}>
                                    <List className="size-4" />
                                </Button>
                                <Button variant={view === 'grid' ? 'default' : 'ghost'} size="sm" className="h-7 px-2" title="Grid View" onClick={() => apply({ view: 'grid' })}>
                                    <Grid3x3 className="size-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {members.data.length === 0 ? (
                    <div className="rounded-lg border bg-card py-16 text-center text-sm text-muted-foreground shadow-sm">No users match this view.</div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {members.data.map((member) => (
                            <div key={member.id} className="flex flex-col items-center rounded-lg border bg-card p-5 text-center shadow-sm">
                                <InitialsAvatar name={member.name} className="size-16 text-xl" />
                                <h3 className="mt-3 max-w-full truncate font-semibold">{member.name}</h3>
                                <p className="max-w-full truncate text-xs text-muted-foreground">{member.email}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <RolePill role={member.role} />
                                    {!member.active && <RingPill value="inactive" label="Suspended" />}
                                </div>
                                <div className="mt-3 flex w-full items-center justify-between border-t pt-3">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="size-3.5" />
                                        {date(member.joined_on)}
                                    </span>
                                    {actions(member)}
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
                                        <th className="w-12 px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                                        <SortableHead label="Name" column="name" sort={sort} onSort={toggleSort} />
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Roles</th>
                                        <SortableHead label="Joined" column="created_at" sort={sort} onSort={toggleSort} />
                                        <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {members.data.map((member, index) => (
                                        <tr key={member.id} className="transition-colors hover:bg-muted/40">
                                            <td className="px-4 py-2.5 font-medium">{(members.from ?? 1) + index}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <InitialsAvatar name={member.name} className="size-10 text-sm" />
                                                    <div className="min-w-0">
                                                        <div className="font-medium">{member.name}</div>
                                                        <div className="truncate text-sm text-muted-foreground">{member.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <RolePill role={member.role} />
                                                    {!member.active && <RingPill value="inactive" label="Suspended" />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                                                    <Calendar className="size-4" />
                                                    {date(member.joined_on)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">{actions(member)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <DataTableFooter
                        from={members.from}
                        to={members.to}
                        total={members.total}
                        links={members.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? 'Edit User' : 'Add User'}
                    processing={form.processing}
                    submitLabel={editing ? 'Save' : 'Add User'}
                    onSubmit={(e) => {
                        e.preventDefault();
                        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
                        editing ? form.put(`/users/${editing.id}`, done) : form.post('/users', done);
                    }}
                    wide
                >
                    <TextField label="Name" value={form.data.name} onChange={(v) => form.setData('name', v)} error={form.errors.name} />
                    <TextField label="Email" type="email" value={form.data.email} onChange={(v) => form.setData('email', v)} error={form.errors.email} />
                    <SelectField
                        label="Role"
                        value={form.data.role}
                        onChange={(v) => form.setData('role', v)}
                        options={roles.map((role) => ({ value: role, label: ROLE_LABELS[role] ?? role }))}
                        error={form.errors.role}
                    />
                    <TextField label="Job title" value={form.data.title} onChange={(v) => form.setData('title', v)} error={form.errors.title} />
                    {editing ? (
                        <SelectField
                            label="Status"
                            value={form.data.active ? '1' : '0'}
                            onChange={(v) => form.setData('active', v === '1')}
                            options={[
                                { value: '1', label: 'Active' },
                                { value: '0', label: 'Suspended' },
                            ]}
                            error={form.errors.active}
                        />
                    ) : (
                        <TextField
                            label="Password"
                            type="password"
                            value={form.data.password}
                            onChange={(v) => form.setData('password', v)}
                            error={form.errors.password}
                        />
                    )}
                </FormDialog>

                <FormDialog
                    open={resetting !== null}
                    onOpenChange={(next) => !next && setResetting(null)}
                    title={`Reset password — ${resetting?.name ?? ''}`}
                    processing={secret.processing}
                    submitLabel="Reset password"
                    onSubmit={(e) => {
                        e.preventDefault();
                        secret.patch(`/users/${resetting?.id}/password`, { onSuccess: () => setResetting(null), preserveScroll: true });
                    }}
                >
                    <TextField
                        label="New password"
                        type="password"
                        value={secret.data.password}
                        onChange={(v) => secret.setData('password', v)}
                        error={secret.errors.password}
                    />
                    <TextField
                        label="Confirm password"
                        type="password"
                        value={secret.data.password_confirmation}
                        onChange={(v) => secret.setData('password_confirmation', v)}
                    />
                </FormDialog>

                <Dialog open={viewing !== null} onOpenChange={(next) => !next && setViewing(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{viewing?.name}</DialogTitle>
                        </DialogHeader>
                        {viewing && (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <InitialsAvatar name={viewing.name} className="size-12 text-base" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm">{viewing.email}</p>
                                        <p className="text-xs text-muted-foreground">{viewing.title ?? '—'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4">
                                    <Detail label="Role" value={ROLE_LABELS[viewing.role] ?? viewing.role} />
                                    <Detail label="Status" value={viewing.active ? 'Active' : 'Suspended'} />
                                    <Detail label="Joined" value={date(viewing.joined_on)} />
                                    <Detail label="Lead cases" value={String(viewing.leadCases)} />
                                    <Detail label="Logged this month" value={hours(viewing.minutesThisMonth)} />
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

function RolePill({ role }: { role: string }) {
    return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-400/20">
            {ROLE_LABELS[role] ?? role}
        </span>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium">{value}</p>
        </div>
    );
}
