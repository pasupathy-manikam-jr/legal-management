import { DataTableFooter } from '@/components/data-table-footer';
import { Field, FormDialog, SelectField, TextField } from '@/components/form-dialog';
import { confirmAction } from '@/components/confirm-dialog';
import { Dropdown } from '@/components/dropdown';
import { CountTabs, FilterActions } from '@/components/page-toolbar';
import { SortableHead } from '@/components/sortable-head';
import { RingPill, TonePill } from '@/components/tone-pill';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Archive, ArchiveRestore, Calendar, CircleCheck, Download, Eye, LayoutGrid, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Documents', href: '/documents' }];

interface Doc {
    id: number;
    title: string;
    type: string | null;
    stage: string;
    confidentiality: string;
    size: number;
    archived: boolean;
    uploaded_on: string | null;
    uploader: string | null;
    client_id: number | null;
    client: string | null;
    client_email: string | null;
    matter_id: number | null;
    matter: string | null;
}

interface Options {
    clients: { id: number; name: string }[];
    matters: { id: number; client_id: number; reference: string; title: string }[];
    types: string[];
}

const empty = () => ({ client_id: '', matter_id: '', title: '', type: '', stage: 'draft', confidentiality: 'internal', file: null as File | null });

const initials = (name: string) =>
    name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

export default function DocumentsIndex({
    documents,
    filters,
    perPage,
    sort,
    counts,
    typeColors,
    options,
}: {
    documents: Paginated<Doc>;
    filters: Record<string, string>;
    perPage: number;
    sort: { column: string; direction: string };
    counts: { all: number; active: number; archived: number };
    typeColors: Record<string, string | null>;
    options: Options;
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Doc | null>(null);
    const form = useForm(empty());

    const apply = (patch: Record<string, string | number>) =>
        router.get('/documents', { ...filters, ...sortParams(), ...patch }, { preserveState: true, replace: true });

    const sortParams = () => ({ sort: sort.column, direction: sort.direction, per_page: perPage });

    const toggleSort = (column: string) =>
        apply({ sort: column, direction: sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc' });

    const filtered = filters.search || filters.client || filters.type;

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(document: Doc) {
        form.setData({
            client_id: document.client_id ? String(document.client_id) : '',
            matter_id: document.matter_id ? String(document.matter_id) : '',
            title: document.title,
            type: document.type ?? '',
            stage: document.stage,
            confidentiality: document.confidentiality,
            file: null,
        });
        form.clearErrors();
        setEditing(document);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();

        if (editing) {
            form.put(`/documents/${editing.id}`, { onSuccess: () => setOpen(false), preserveScroll: true });

            return;
        }

        form.post('/documents', { forceFormData: true, onSuccess: () => setOpen(false), preserveScroll: true });
    }

    // A file can only be filed against one of its own client's cases.
    const cases = options.matters.filter((matter) => String(matter.client_id) === form.data.client_id);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Documents" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Documents</h1>
                        <p className="text-xs text-muted-foreground">Upload and manage documents for your clients.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add Document
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

                            <Dropdown value={filters.client ?? ''} onChange={(v) => apply({ client: v })} placeholder="All Clients" options={options.clients.map((client) => ({ value: client.id, label: client.name }))} className="h-9 w-40" aria-label="Client filter" />

                            <Dropdown value={filters.type ?? ''} onChange={(v) => apply({ type: v })} placeholder="All Types" options={options.types.map((type) => ({ value: type, label: type }))} className="h-9 w-40" aria-label="Type filter" />
                        </div>

                        <FilterActions
                            active={Boolean(filtered)}
                            onClear={() => {
                                setSearch('');
                                router.get('/documents', { status: filters.status ?? '' }, { preserveState: true, replace: true });
                            }}
                        />
                    </div>

                    <CountTabs
                        value={filters.status ?? ''}
                        onSelect={(v) => apply({ status: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all },
                            { value: 'active', label: 'Active', icon: CircleCheck, count: counts.active },
                            { value: 'archived', label: 'Archived', icon: Archive, count: counts.archived },
                        ]}
                    />
                </div>

                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="w-12 px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Client</th>
                                    <SortableHead label="Document Name" column="title" sort={sort} onSort={toggleSort} />
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Type</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                                    <SortableHead label="Uploaded" column="created_at" sort={sort} onSort={toggleSort} />
                                    <th className="w-24 px-4 py-2.5 text-center font-semibold text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {documents.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                                            No documents filed yet.
                                        </td>
                                    </tr>
                                )}
                                {documents.data.map((document, index) => (
                                    <tr key={document.id} className="transition-colors hover:bg-muted/40">
                                        <td className="px-4 py-2.5 font-medium">{(documents.from ?? 1) + index}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="size-8">
                                                    <AvatarFallback className="text-xs">{initials(document.client ?? '—')}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium">{document.client ?? '—'}</div>
                                                    <div className="truncate text-xs text-muted-foreground">{document.client_email ?? '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="text-sm font-medium">{document.title}</div>
                                            {document.matter && <div className="text-xs text-muted-foreground">{document.matter}</div>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {document.type ? (
                                                <TonePill color={typeColors[document.type] ?? '#6b7280'}>{document.type}</TonePill>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <RingPill
                                                value={document.archived ? 'inactive' : 'active'}
                                                label={document.archived ? 'Archived' : 'Active'}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                                                <Calendar className="size-4" />
                                                {date(document.uploaded_on)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="View" asChild>
                                                    <a href={`/documents/${document.id}/preview`} target="_blank" rel="noreferrer">
                                                        <Eye className="size-4" />
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground"
                                                    title="Edit"
                                                    onClick={() => openEdit(document)}
                                                >
                                                    <SquarePen className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="Download" asChild>
                                                    <a href={`/documents/${document.id}/download`}>
                                                        <Download className="size-4" />
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground"
                                                    title={document.archived ? 'Restore' : 'Archive'}
                                                    onClick={() => router.patch(`/documents/${document.id}/archive`, {}, { preserveScroll: true })}
                                                >
                                                    {document.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground"
                                                    title="Delete"
                                                    onClick={() =>
                                                        confirmAction({ title: `Delete ${document.title}?` }).then((ok) => ok && router.delete(`/documents/${document.id}`, { preserveScroll: true }))
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
                        from={documents.from}
                        to={documents.to}
                        total={documents.total}
                        links={documents.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? 'Edit Document' : 'Add Document'}
                    onSubmit={submit}
                    processing={form.processing}
                    submitLabel={editing ? 'Save' : 'Upload'}
                    wide
                >
                    <SelectField
                        label="Client"
                        value={form.data.client_id}
                        onChange={(v) => form.setData({ ...form.data, client_id: v, matter_id: '' })}
                        options={options.clients.map((client) => ({ value: client.id, label: client.name }))}
                        placeholder="Select a client"
                        error={form.errors.client_id}
                    />
                    <SelectField
                        label="Case"
                        value={form.data.matter_id}
                        onChange={(v) => form.setData('matter_id', v)}
                        options={cases.map((matter) => ({ value: matter.id, label: `${matter.reference} — ${matter.title}` }))}
                        placeholder="Not case related"
                        error={form.errors.matter_id}
                    />
                    <TextField
                        label="Document Name"
                        value={form.data.title}
                        onChange={(v) => form.setData('title', v)}
                        error={form.errors.title}
                        placeholder="Engagement_Letter.pdf"
                        className="sm:col-span-2"
                    />
                    <SelectField
                        label="Type"
                        value={form.data.type}
                        onChange={(v) => form.setData('type', v)}
                        options={options.types.map((type) => ({ value: type, label: type }))}
                        placeholder="Untyped"
                        error={form.errors.type}
                    />
                    <SelectField
                        label="Stage"
                        value={form.data.stage}
                        onChange={(v) => form.setData('stage', v)}
                        options={[
                            { value: 'draft', label: 'Draft' },
                            { value: 'review', label: 'Review' },
                            { value: 'final', label: 'Final' },
                        ]}
                        error={form.errors.stage}
                    />
                    <SelectField
                        label="Confidentiality"
                        value={form.data.confidentiality}
                        onChange={(v) => form.setData('confidentiality', v)}
                        options={[
                            { value: 'internal', label: 'Internal' },
                            { value: 'confidential', label: 'Confidential' },
                            { value: 'public', label: 'Public' },
                            { value: 'restricted', label: 'Restricted' },
                        ]}
                        error={form.errors.confidentiality}
                    />
                    {!editing && (
                        <Field label="File" error={form.errors.file} className="sm:col-span-2">
                            <Input
                                type="file"
                                onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.rtf,.odt"
                            />
                        </Field>
                    )}
                </FormDialog>
            </div>
        </AppLayout>
    );
}
