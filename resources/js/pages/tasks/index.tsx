import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { CountTabs } from '@/components/page-toolbar';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { TonePill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated, Task, User } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Calendar,
    CircleArrowDown,
    CircleArrowUp,
    CircleMinus,
    Columns2,
    ExternalLink,
    Filter,
    LayoutGrid,
    List,
    OctagonAlert,
    Pencil,
    Plus,
    RefreshCcw,
    Search,
    Trash2,
} from 'lucide-react';
import { useEffect, useState, type ComponentType } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tasks', href: '/tasks' }];

interface StatusMeta {
    label: string;
    color: string;
}

const PRIORITY_ICON: Record<string, ComponentType<{ className?: string }>> = {
    critical: OctagonAlert,
    high: CircleArrowUp,
    medium: CircleMinus,
    low: CircleArrowDown,
};

const PRIORITY_COLOR: Record<string, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#16a34a',
};

const empty = () => ({ matter_id: '', assigned_to: '', title: '', notes: '', status: 'not_started', type: '', priority: 'medium', due_on: '' });

/** Soft tint + matching border, the treatment each kanban column is painted with. */
function columnTint(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return { bg: `rgba(${r}, ${g}, ${b}, 0.07)`, border: `rgba(${r}, ${g}, ${b}, 0.19)`, chip: `rgba(${r}, ${g}, ${b}, 0.133)`, solid: hex };
}

export default function TasksIndex({
    view,
    tasks,
    board,
    filters,
    counts,
    states,
    options,
}: {
    view: 'list' | 'kanban';
    tasks: Paginated<Task> | null;
    board: Record<string, Task[]> | null;
    filters: Record<string, string>;
    counts: Record<string, number>;
    states: { open: number; overdue: number; done: number };
    options: {
        matters: { id: number; label: string }[];
        users: User[];
        priorities: string[];
        statuses: Record<string, StatusMeta>;
        types: { name: string; color: string | null }[];
    };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Task | null>(null);
    const [columns, setColumns] = useState<Record<string, Task[]>>(board ?? {});
    const [dragging, setDragging] = useState<Task | null>(null);
    const form = useForm(empty());

    // The board is dragged locally for instant feedback, then re-synced from the server.
    useEffect(() => setColumns(board ?? {}), [board]);

    const hasFilters = Boolean(filters.search || filters.type || filters.status || filters.assignee || filters.priority);
    const typeColor = (name: string | null) => options.types.find((t) => t.name === name)?.color ?? '#6b7280';

    function apply(patch: Record<string, string | number>) {
        router.get('/tasks', { ...filters, view, ...patch }, { preserveState: true, replace: true });
    }

    function openCreate(status = 'not_started') {
        form.setData({ ...empty(), status });
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(t: Task) {
        form.setData({
            matter_id: t.matter_id ? String(t.matter_id) : '',
            assigned_to: t.assigned_to ? String(t.assigned_to) : '',
            title: t.title,
            notes: t.notes ?? '',
            status: t.status,
            type: t.type ?? '',
            priority: t.priority,
            due_on: t.due_on?.slice(0, 10) ?? '',
        });
        form.clearErrors();
        setEditing(t);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        editing ? form.put(`/tasks/${editing.id}`, done) : form.post('/tasks', done);
    }

    function drop(status: string) {
        const task = dragging;
        setDragging(null);

        if (!task || task.status === status) {
            return;
        }

        setColumns((current) => {
            const without = Object.fromEntries(Object.entries(current).map(([key, list]) => [key, list.filter((t) => t.id !== task.id)]));

            return { ...without, [status]: [{ ...task, status }, ...(without[status] ?? [])] };
        });

        router.patch(`/tasks/${task.id}/status`, { status }, { preserveScroll: true, preserveState: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tasks" />

            <div className="flex flex-1 flex-col gap-4 overflow-hidden px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Tasks</h1>
                        <p className="text-xs text-muted-foreground">
                            Manage and track tasks assigned to cases and team members. {states.open} open · {states.overdue} overdue.
                        </p>
                    </div>
                    <Button onClick={() => openCreate()}>
                        <Plus className="size-4" /> Add Task
                    </Button>
                </div>

                <div className="rounded-lg border bg-card shadow-sm">
                    <div className="p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <div className="relative w-64 min-w-40 shrink">
                                    <Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && apply({ search })}
                                        className="h-8 w-full px-9"
                                    />
                                </div>

                                <Dropdown value={filters.type ?? ''} onChange={(v) => apply({ type: v })} placeholder="All Types" options={options.types.map((t) => ({ value: t.name, label: t.name }))} className="h-9 w-40" />

                                <Dropdown value={filters.status ?? ''} onChange={(v) => apply({ status: v })} placeholder="All Status" options={Object.entries(options.statuses).map(([key, meta]) => ({ value: key, label: meta.label }))} className="h-9 w-40" />

                                <Dropdown value={filters.assignee ?? ''} onChange={(v) => apply({ assignee: v })} placeholder="All Users" options={options.users.map((u) => ({ value: u.id, label: u.name }))} className="h-9 w-40" />
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {hasFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 text-muted-foreground"
                                        onClick={() => {
                                            setSearch('');
                                            router.get('/tasks', { view });
                                        }}
                                    >
                                        <RefreshCcw className="size-4" /> Clear Filters
                                    </Button>
                                )}
                                <span className="flex h-8 items-center gap-1.5 rounded-md border px-2 text-sm text-muted-foreground">
                                    <Filter className="size-4" /> Filters
                                </span>

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
                                        variant={view === 'kanban' ? 'default' : 'ghost'}
                                        size="sm"
                                        className="h-7 px-2"
                                        title="Kanban View"
                                        onClick={() => apply({ view: 'kanban' })}
                                    >
                                        <Columns2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <CountTabs
                        value={filters.priority ?? ''}
                        onSelect={(v) => apply({ priority: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                            ...options.priorities.map((p) => ({
                                value: p,
                                label: p.charAt(0).toUpperCase() + p.slice(1),
                                icon: PRIORITY_ICON[p],
                                count: counts[p] ?? 0,
                            })),
                        ]}
                    />
                </div>

                {view === 'kanban' ? (
                    <div className="flex gap-4 overflow-x-auto pb-2" style={{ height: 'calc(100vh - 240px)' }}>
                        {Object.entries(options.statuses).map(([key, meta]) => {
                            const tint = columnTint(meta.color);
                            const cards = columns[key] ?? [];

                            return (
                                <div
                                    key={key}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => drop(key)}
                                    className="flex h-full w-[300px] min-w-[300px] flex-shrink-0 flex-col rounded-xl border"
                                    style={{ backgroundColor: tint.bg, borderColor: tint.border }}
                                >
                                    <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: tint.border }}>
                                        <div className="flex items-center gap-2">
                                            <span className="size-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: tint.solid }} />
                                            <span className="text-sm font-semibold">{meta.label}</span>
                                            <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: tint.chip, color: tint.solid }}>
                                                {cards.length}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            title="Add Task"
                                            onClick={() => openCreate(key)}
                                            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                                        >
                                            <Plus className="size-4" />
                                        </button>
                                    </div>

                                    <div className="flex-1 space-y-3 overflow-y-auto p-3">
                                        {cards.length === 0 && <p className="pt-6 text-center text-xs text-muted-foreground">Nothing here.</p>}
                                        {cards.map((t) => (
                                            <div
                                                key={t.id}
                                                draggable
                                                onDragStart={() => setDragging(t)}
                                                onDragEnd={() => setDragging(null)}
                                                className={cn(
                                                    'rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
                                                    dragging?.id === t.id && 'opacity-50',
                                                )}
                                            >
                                                <div className="mb-2.5 flex items-start gap-2.5">
                                                    <h4 className="min-w-0 flex-1 truncate text-sm leading-tight font-semibold">{t.title}</h4>
                                                    <TaskMenu task={t} onEdit={() => openEdit(t)} />
                                                </div>

                                                {t.matter && (
                                                    <Link href={`/matters/${t.matter_id}`} className="mb-2 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                                        <ExternalLink className="size-3 flex-shrink-0" />
                                                        <span className="truncate">{t.matter.reference}</span>
                                                    </Link>
                                                )}

                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                    <TonePill color={PRIORITY_COLOR[t.priority]}>{t.priority}</TonePill>
                                                    {t.type && <TonePill color={typeColor(t.type)}>{t.type}</TonePill>}
                                                </div>

                                                <div className="mt-2 flex items-center justify-between border-t pt-2">
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Calendar className="size-3" />
                                                        <span>{t.due_on ? date(t.due_on) : 'No due date'}</span>
                                                    </div>
                                                    {t.assignee && <InitialsChip name={t.assignee.name} />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead>
                                    <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                        <th className="w-12 px-4 py-2.5 text-left font-semibold text-muted-foreground">Done</th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Task</th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Case</th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Type</th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Priority</th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Assignee</th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Due</th>
                                        <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks?.data.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                                                No tasks match these filters.
                                            </td>
                                        </tr>
                                    )}
                                    {tasks?.data.map((t) => {
                                        const overdue = !t.completed_at && t.due_on && new Date(t.due_on) < new Date();

                                        return (
                                            <tr key={t.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                                                <td className="px-4 py-2.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!t.completed_at}
                                                        onChange={() => router.patch(`/tasks/${t.id}/toggle`, {}, { preserveScroll: true })}
                                                        className="size-4 accent-primary"
                                                    />
                                                </td>
                                                <td className={cn('px-4 py-2.5 font-medium', t.completed_at && 'text-muted-foreground line-through')}>{t.title}</td>
                                                <td className="px-4 py-2.5 text-muted-foreground">
                                                    {t.matter ? (
                                                        <Link href={`/matters/${t.matter_id}`} className="hover:underline">
                                                            {t.matter.reference}
                                                        </Link>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5">{t.type ? <TonePill color={typeColor(t.type)}>{t.type}</TonePill> : '—'}</td>
                                                <td className="px-4 py-2.5">
                                                    <TonePill color={options.statuses[t.status]?.color ?? '#6b7280'}>{options.statuses[t.status]?.label ?? t.status}</TonePill>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <TonePill color={PRIORITY_COLOR[t.priority]}>{t.priority}</TonePill>
                                                </td>
                                                <td className="px-4 py-2.5 text-muted-foreground">{t.assignee?.name ?? '—'}</td>
                                                <td className={cn('px-4 py-2.5 whitespace-nowrap', overdue ? 'font-medium text-rose-600' : 'text-muted-foreground')}>
                                                    {t.due_on ? date(t.due_on) : '—'}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="Edit" onClick={() => openEdit(t)}>
                                                            <Pencil className="size-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-muted-foreground"
                                                            title="Delete"
                                                            onClick={() => confirmAction({ title: 'Delete this task?' }).then((ok) => ok && router.delete(`/tasks/${t.id}`, { preserveScroll: true }))}
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
                    </div>
                )}
            </div>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? 'Edit task' : 'Add Task'}
                onSubmit={submit}
                processing={form.processing}
                wide
            >
                <TextField label="Title" value={form.data.title} onChange={(v) => form.setData('title', v)} error={form.errors.title} className="sm:col-span-2" />
                <SelectField
                    label="Case"
                    value={form.data.matter_id}
                    onChange={(v) => form.setData('matter_id', v)}
                    options={options.matters.map((m) => ({ value: m.id, label: m.label }))}
                    placeholder="No case"
                />
                <SelectField
                    label="Assignee"
                    value={form.data.assigned_to}
                    onChange={(v) => form.setData('assigned_to', v)}
                    options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                    placeholder="Unassigned"
                />
                <SelectField
                    label="Status"
                    value={form.data.status}
                    onChange={(v) => form.setData('status', v)}
                    options={Object.entries(options.statuses).map(([key, meta]) => ({ value: key, label: meta.label }))}
                    error={form.errors.status}
                />
                <SelectField
                    label="Type"
                    value={form.data.type}
                    onChange={(v) => form.setData('type', v)}
                    options={options.types.map((t) => ({ value: t.name, label: t.name }))}
                    placeholder="—"
                />
                <SelectField
                    label="Priority"
                    value={form.data.priority}
                    onChange={(v) => form.setData('priority', v)}
                    options={options.priorities.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
                    error={form.errors.priority}
                />
                <TextField label="Due date" type="date" value={form.data.due_on} onChange={(v) => form.setData('due_on', v)} error={form.errors.due_on} />
                <TextareaField label="Notes" value={form.data.notes} onChange={(v) => form.setData('notes', v)} error={form.errors.notes} className="sm:col-span-2" />
            </FormDialog>
        </AppLayout>
    );
}

function TaskMenu({ task, onEdit }: { task: Task; onEdit: () => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6 flex-shrink-0 text-muted-foreground">
                    <span className="text-lg leading-none">⋯</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 size-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="text-rose-600 focus:text-rose-600"
                    onClick={() => confirmAction({ title: 'Delete this task?' }).then((ok) => ok && router.delete(`/tasks/${task.id}`, { preserveScroll: true }))}
                >
                    <Trash2 className="mr-2 size-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function InitialsChip({ name }: { name: string }) {
    const initials = name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <span title={name} className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            {initials}
        </span>
    );
}
