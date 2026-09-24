import { confirmAction } from '@/components/confirm-dialog';
import { DataTableFooter } from '@/components/data-table-footer';
import { FormDialog, TextField } from '@/components/form-dialog';
import { SortableHead } from '@/components/sortable-head';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Eye, Plus, Search, SquarePen, Trash2, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Roles', href: '/roles' }];

interface Role {
    id: number;
    name: string;
    description: string | null;
    system: boolean;
    members: number;
    permissions: string[];
    labels: string[];
}

/** Shipped roles are stored lowercase ("admin"); every screen shows them as titles. */
const title = (name: string) => name.replace(/\b\w/g, (c) => c.toUpperCase());

/** How many permission chips a row shows before collapsing to "+N more". */
const CHIPS = 3;

export default function Roles({
    roles,
    filters,
    perPage,
    sort,
    groups,
}: {
    roles: Paginated<Role>;
    filters: Record<string, string>;
    perPage: number;
    sort: { column: string; direction: string };
    groups: Record<string, Record<string, string>>;
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Role | null>(null);
    const [viewing, setViewing] = useState<Role | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const form = useForm<{ name: string; description: string; permissions: string[] }>({ name: '', description: '', permissions: [] });

    const apply = (patch: Record<string, string | number>) =>
        router.get(
            '/roles',
            { ...filters, per_page: perPage, sort: sort.column, direction: sort.direction, ...patch },
            { preserveState: true, replace: true },
        );

    const toggleSort = (column: string) => apply({ sort: column, direction: sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc' });

    function openCreate() {
        form.setData({ name: '', description: '', permissions: [] });
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(role: Role) {
        form.setData({ name: role.name, description: role.description ?? '', permissions: [...role.permissions] });
        form.clearErrors();
        setEditing(role);
        setOpen(true);
    }

    /**
     * A shipped role is refused before any request is sent; anything the server
     * refuses (a role still held by someone) comes back as a notice on the page.
     */
    async function remove(role: Role) {
        if (role.system) {
            setNotice(`${title(role.name)} is a built-in role and can't be removed. You can still change its permissions.`);

            return;
        }

        if (!(await confirmAction({ title: `Remove the ${title(role.name)} role?`, confirmLabel: 'Remove' }))) {
            return;
        }

        router.delete(`/roles/${role.id}`, {
            preserveScroll: true,
            onSuccess: () => setNotice(null),
            onError: (errors) => setNotice(errors.name ?? 'This role could not be removed.'),
        });
    }

    function togglePermission(key: string, granted: boolean) {
        form.setData('permissions', granted ? [...form.data.permissions, key] : form.data.permissions.filter((p) => p !== key));
    }

    function toggleGroup(keys: string[], granted: boolean) {
        const without = form.data.permissions.filter((p) => !keys.includes(p));
        form.setData('permissions', granted ? [...without, ...keys] : without);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Roles</h1>
                        <p className="text-muted-foreground text-xs">Define roles and control what each role can access within the system.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Role
                    </Button>
                </div>

                <div className="bg-card rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between gap-2 p-3">
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
                    </div>
                </div>

                {notice && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    >
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        <span className="flex-1">{notice}</span>
                        <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
                            <X className="size-4" />
                        </button>
                    </div>
                )}

                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="text-muted-foreground w-12 px-4 py-2.5 text-left font-semibold">#</th>
                                    <SortableHead label="Name" column="name" sort={sort} onSort={toggleSort} />
                                    <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Permissions</th>
                                    <th className="text-muted-foreground w-24 px-4 py-2.5 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {roles.data.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-muted-foreground py-16 text-center text-sm">
                                            No roles match this search.
                                        </td>
                                    </tr>
                                )}
                                {roles.data.map((role, index) => (
                                    <tr key={role.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="px-4 py-2.5 font-medium">{(roles.from ?? 1) + index}</td>
                                        <td className="px-4 py-2.5">
                                            <span className="font-semibold">{title(role.name)}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex flex-wrap gap-1">
                                                {role.labels.slice(0, CHIPS).map((label) => (
                                                    <Chip key={label}>{label}</Chip>
                                                ))}
                                                {role.labels.length > CHIPS && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewing(role)}
                                                        className="bg-muted text-muted-foreground hover:text-foreground inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                                                    >
                                                        +{role.labels.length - CHIPS} more
                                                    </button>
                                                )}
                                                {role.labels.length === 0 && <span className="text-muted-foreground text-xs">No permissions</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="View"
                                                    onClick={() => setViewing(role)}
                                                >
                                                    <Eye className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="Edit"
                                                    onClick={() => openEdit(role)}
                                                >
                                                    <SquarePen className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="Delete"
                                                    onClick={() => remove(role)}
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
                        from={roles.from}
                        to={roles.to}
                        total={roles.total}
                        links={roles.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? `Edit ${title(editing.name)}` : 'Add Role'}
                    processing={form.processing}
                    submitLabel={editing ? 'Save' : 'Add Role'}
                    onSubmit={(e) => {
                        e.preventDefault();
                        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
                        if (editing) {
                            form.put(`/roles/${editing.id}`, done);
                        } else {
                            form.post('/roles', done);
                        }
                    }}
                    wide
                >
                    <TextField
                        label="Name"
                        value={form.data.name}
                        onChange={(v) => form.setData('name', v)}
                        error={form.errors.name}
                        disabled={editing?.system}
                        placeholder="Senior Associate"
                    />
                    <TextField
                        label="Description"
                        value={form.data.description}
                        onChange={(v) => form.setData('description', v)}
                        error={form.errors.description}
                    />

                    {editing?.system && (
                        <p className="text-muted-foreground text-xs sm:col-span-2">
                            {title(editing.name)} is a built-in role. Its permissions can change; its name cannot.
                        </p>
                    )}

                    <div className="flex flex-col gap-4 sm:col-span-2">
                        {Object.entries(groups).map(([group, permissions]) => {
                            const keys = Object.keys(permissions);
                            const all = keys.every((key) => form.data.permissions.includes(key));

                            return (
                                <div key={group} className="rounded-lg border p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">{group}</h3>
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(keys, !all)}
                                            className="text-muted-foreground hover:text-foreground text-xs"
                                        >
                                            {all ? 'Clear all' : 'Select all'}
                                        </button>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {Object.entries(permissions).map(([key, label]) => (
                                            <Label key={key} className="flex items-center gap-2 text-xs font-normal">
                                                <Checkbox
                                                    checked={form.data.permissions.includes(key)}
                                                    onCheckedChange={(checked) => togglePermission(key, checked === true)}
                                                />
                                                {label}
                                            </Label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </FormDialog>

                <Dialog open={viewing !== null} onOpenChange={(next) => !next && setViewing(null)}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{viewing ? title(viewing.name) : ''}</DialogTitle>
                        </DialogHeader>
                        {viewing && (
                            <div className="flex flex-col gap-4">
                                <p className="text-muted-foreground text-sm">
                                    {viewing.description ?? 'No description.'} · {viewing.members} {viewing.members === 1 ? 'user' : 'users'} ·{' '}
                                    {viewing.permissions.length} of {Object.values(groups).flatMap((g) => Object.keys(g)).length} permissions
                                </p>
                                {Object.entries(groups).map(([group, permissions]) => {
                                    const granted = Object.entries(permissions).filter(([key]) => viewing.permissions.includes(key));

                                    return (
                                        <div key={group}>
                                            <h3 className="text-sm font-semibold">{group}</h3>
                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                {granted.length === 0 ? (
                                                    <span className="text-muted-foreground text-xs">None</span>
                                                ) : (
                                                    granted.map(([key, label]) => <Chip key={key}>{label}</Chip>)
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

function Chip({ children }: { children: string }) {
    return (
        <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            {children}
        </span>
    );
}
