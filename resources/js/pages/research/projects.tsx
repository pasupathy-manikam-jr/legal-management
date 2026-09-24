import { confirmAction } from '@/components/confirm-dialog';
import { DataTableFooter } from '@/components/data-table-footer';
import { Dropdown } from '@/components/dropdown';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { CountTabs } from '@/components/page-toolbar';
import { RingPill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated, User } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Calendar,
    CircleCheckBig,
    CirclePause,
    CirclePlay,
    CircleX,
    Filter,
    Grid3x3,
    LayoutGrid,
    List,
    Plus,
    RefreshCcw,
    RefreshCw,
    Search,
    SquarePen,
    Trash2,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Research Projects', href: '/research-projects' }];

interface Project {
    id: number;
    matter_id: number | null;
    matter?: { id: number; reference: string } | null;
    lead?: User | null;
    title: string;
    type: string | null;
    category: string | null;
    priority: string;
    status: string;
    question: string | null;
    started_on: string;
    due_on: string | null;
}

const STATUS: Record<string, { label: string; icon: ComponentType<{ className?: string }>; tone: string }> = {
    active: { label: 'Active', icon: CirclePlay, tone: 'active' },
    completed: { label: 'Completed', icon: CircleCheckBig, tone: 'completed' },
    on_hold: { label: 'On Hold', icon: CirclePause, tone: 'medium' },
    cancelled: { label: 'Cancelled', icon: CircleX, tone: 'inactive' },
};

const empty = () => ({
    matter_id: '',
    lead_id: '',
    title: '',
    type: '',
    category: '',
    priority: 'medium',
    status: 'active',
    question: '',
    findings: '',
    started_on: new Date().toISOString().slice(0, 10),
    due_on: '',
});

export default function ResearchProjects({
    view,
    projects,
    filters,
    perPage,
    counts,
    options,
}: {
    view: 'list' | 'grid';
    projects: Paginated<Project>;
    filters: Record<string, string>;
    perPage: number;
    counts: Record<string, number>;
    options: {
        matters: { id: number; label: string }[];
        users: User[];
        types: string[];
        categories: string[];
        statuses: string[];
        priorities: string[];
    };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Project | null>(null);
    const form = useForm(empty());

    const hasFilters = Boolean(filters.search || filters.type || filters.priority || filters.matter_id || filters.status);

    function apply(patch: Record<string, string | number>) {
        router.get('/research-projects', { ...filters, view, per_page: perPage, ...patch }, { preserveState: true, replace: true });
    }

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(p: Project) {
        form.setData({
            matter_id: p.matter_id ? String(p.matter_id) : '',
            lead_id: p.lead?.id ? String(p.lead.id) : '',
            title: p.title,
            type: p.type ?? '',
            category: p.category ?? '',
            priority: p.priority,
            status: p.status,
            question: p.question ?? '',
            findings: '',
            started_on: p.started_on.slice(0, 10),
            due_on: p.due_on?.slice(0, 10) ?? '',
        });
        form.clearErrors();
        setEditing(p);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        if (editing) {
            form.put(`/research-projects/${editing.id}`, done);
        } else {
            form.post('/research-projects', done);
        }
    }

    const actions = (p: Project) => (
        <div className="flex items-center justify-end gap-1">
            {p.matter_id && (
                <Button variant="ghost" size="icon" className="text-muted-foreground size-8" asChild title="View case">
                    <Link href={`/matters/${p.matter_id}`}>
                        <Search className="size-4" />
                    </Link>
                </Button>
            )}
            <Button variant="ghost" size="icon" className="text-muted-foreground size-8" title="Edit" onClick={() => openEdit(p)}>
                <SquarePen className="size-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground size-8"
                title="Move to the next status"
                onClick={() => router.patch(`/research-projects/${p.id}/status`, {}, { preserveScroll: true })}
            >
                <RefreshCw className="size-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground size-8"
                title="Delete"
                onClick={() =>
                    confirmAction({ title: `Delete ${p.title}?` }).then(
                        (ok) => ok && router.delete(`/research-projects/${p.id}`, { preserveScroll: true }),
                    )
                }
            >
                <Trash2 className="size-4 text-rose-600" />
            </Button>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Research Projects" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Research Projects</h1>
                        <p className="text-muted-foreground text-xs">Manage your research projects.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Research Project
                    </Button>
                </div>

                <div className="bg-card rounded-lg border shadow-sm">
                    <div className="p-3">
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
                                    capitalize
                                />

                                <Dropdown
                                    value={filters.priority ?? ''}
                                    onChange={(v) => apply({ priority: v })}
                                    placeholder="All Priorities"
                                    options={options.priorities.map((p) => ({ value: p, label: p }))}
                                    className="h-9 w-40"
                                    capitalize
                                />

                                <Dropdown
                                    value={filters.matter_id ?? ''}
                                    onChange={(v) => apply({ matter_id: v })}
                                    placeholder="All Cases"
                                    options={options.matters.map((m) => ({ value: m.id, label: m.label }))}
                                    className="h-9 w-40"
                                />
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {hasFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground h-9"
                                        onClick={() => {
                                            setSearch('');
                                            router.get('/research-projects', { view });
                                        }}
                                    >
                                        <RefreshCcw className="size-4" /> Clear Filters
                                    </Button>
                                )}
                                <span className="text-muted-foreground flex h-8 items-center gap-1.5 rounded-md border px-2 text-sm">
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
                        </div>
                    </div>

                    <CountTabs
                        value={filters.status ?? ''}
                        onSelect={(v) => apply({ status: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                            ...options.statuses.map((s) => ({ value: s, label: STATUS[s].label, icon: STATUS[s].icon, count: counts[s] ?? 0 })),
                        ]}
                    />
                </div>

                {view === 'grid' ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {projects.data.length === 0 && (
                            <p className="text-muted-foreground py-12 text-center text-sm">No research projects match these filters.</p>
                        )}
                        {projects.data.map((p) => (
                            <div key={p.id} className="bg-card flex flex-col rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md">
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <p className="font-medium">{p.title}</p>
                                    <RingPill value={STATUS[p.status].tone} label={STATUS[p.status].label} />
                                </div>
                                {p.matter && <RingPill value="low" label={p.matter.reference} className="mb-2 w-fit" />}
                                <div className="text-muted-foreground mt-auto flex items-center justify-between pt-3 text-xs">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="size-3.5" />
                                        {p.due_on ? date(p.due_on) : 'No due date'}
                                    </span>
                                    <RingPill value={p.priority} label={p.priority} />
                                </div>
                                <div className="mt-2 border-t pt-2">{actions(p)}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead>
                                    <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                        <th className="text-muted-foreground w-12 px-4 py-2.5 text-left font-semibold">#</th>
                                        <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Title</th>
                                        <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Type</th>
                                        <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Priority</th>
                                        <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Due Date</th>
                                        <th className="text-muted-foreground px-4 py-2.5 text-left font-semibold">Status</th>
                                        <th className="text-muted-foreground w-24 px-4 py-2.5 text-center font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projects.data.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-muted-foreground py-12 text-center text-sm">
                                                No research projects match these filters.
                                            </td>
                                        </tr>
                                    )}
                                    {projects.data.map((p, i) => (
                                        <tr key={p.id} className="hover:bg-muted/40 border-b transition-colors last:border-0">
                                            <td className="px-4 py-2.5 font-medium tabular-nums">{(projects.from ?? 1) + i}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="font-medium">{p.title}</div>
                                                {p.matter && (
                                                    <Link href={`/matters/${p.matter_id}`} className="mt-1 inline-block">
                                                        <RingPill value="low" label={p.matter.reference} />
                                                    </Link>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 capitalize">{p.type ? <RingPill value="low" label={p.type} /> : '—'}</td>
                                            <td className="px-4 py-2.5">
                                                <RingPill value={p.priority} label={p.priority} />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="text-muted-foreground flex items-center gap-2 whitespace-nowrap">
                                                    <Calendar className="size-4" />
                                                    <span>{p.due_on ? date(p.due_on) : '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <RingPill value={STATUS[p.status].tone} label={STATUS[p.status].label} />
                                            </td>
                                            <td className={cn('px-4 py-2.5')}>{actions(p)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <DataTableFooter
                            from={projects.from}
                            to={projects.to}
                            total={projects.total}
                            links={projects.links}
                            perPage={perPage}
                            onPerPage={(value) => apply({ per_page: value })}
                        />
                    </div>
                )}
            </div>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? 'Edit research project' : 'Add Research Project'}
                onSubmit={submit}
                processing={form.processing}
                wide
            >
                <TextField
                    label="Title"
                    value={form.data.title}
                    onChange={(v) => form.setData('title', v)}
                    error={form.errors.title}
                    className="sm:col-span-2"
                />
                <SelectField
                    label="Case"
                    value={form.data.matter_id}
                    onChange={(v) => form.setData('matter_id', v)}
                    options={options.matters.map((m) => ({ value: m.id, label: m.label }))}
                    placeholder="No case"
                />
                <SelectField
                    label="Lead"
                    value={form.data.lead_id}
                    onChange={(v) => form.setData('lead_id', v)}
                    options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                    placeholder="Unassigned"
                />
                <SelectField
                    label="Type"
                    value={form.data.type}
                    onChange={(v) => form.setData('type', v)}
                    options={options.types.map((t) => ({ value: t, label: t }))}
                    placeholder="—"
                />
                <SelectField
                    label="Category"
                    value={form.data.category}
                    onChange={(v) => form.setData('category', v)}
                    options={options.categories.map((c) => ({ value: c, label: c }))}
                    placeholder="—"
                />
                <SelectField
                    label="Priority"
                    value={form.data.priority}
                    onChange={(v) => form.setData('priority', v)}
                    options={options.priorities.map((p) => ({ value: p, label: p }))}
                />
                <SelectField
                    label="Status"
                    value={form.data.status}
                    onChange={(v) => form.setData('status', v)}
                    options={options.statuses.map((s) => ({ value: s, label: STATUS[s].label }))}
                />
                <TextField
                    label="Started"
                    type="date"
                    value={form.data.started_on}
                    onChange={(v) => form.setData('started_on', v)}
                    error={form.errors.started_on}
                />
                <TextField label="Due" type="date" value={form.data.due_on} onChange={(v) => form.setData('due_on', v)} error={form.errors.due_on} />
                <TextareaField
                    label="Research question"
                    value={form.data.question}
                    onChange={(v) => form.setData('question', v)}
                    error={form.errors.question}
                    className="sm:col-span-2"
                />
            </FormDialog>
        </AppLayout>
    );
}
