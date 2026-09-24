import { DataTableFooter } from '@/components/data-table-footer';
import { Field, FormDialog, SelectField, TextareaField, TextField } from '@/components/form-dialog';
import { CountTabs, FilterActions } from '@/components/page-toolbar';
import { Dropdown } from '@/components/dropdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { CircleCheckBig, Archive, Clock, Folder, LayoutGrid, Image as ImageIcon, PenLine, Plus, Search } from 'lucide-react';
import { useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Documents', href: '/documents/library' }];

interface LibraryDoc {
    id: number;
    title: string;
    type: string | null;
    state: string;
    confidentiality: string;
    client: string | null;
}

export default function DocumentLibrary({
    documents,
    filters,
    perPage,
    counts,
    options,
}: {
    documents: Paginated<LibraryDoc>;
    filters: Record<string, string>;
    perPage: number;
    counts: { all: number; draft: number; review: number; final: number; archived: number };
    options: { categories: string[]; levels: string[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [uploading, setUploading] = useState(false);
    const picker = useRef<HTMLInputElement>(null);

    // Uploaded from the library, a document is the firm's own: there is no client to pick.
    const form = useForm<{ title: string; description: string; type: string; stage: string; confidentiality: string; tags: string; file: File | null }>({
        title: '',
        description: '',
        type: '',
        stage: 'draft',
        confidentiality: 'internal',
        tags: '',
        file: null,
    });

    function openUpload() {
        form.reset();
        form.clearErrors();
        setUploading(true);
    }

    function upload(e: React.FormEvent) {
        e.preventDefault();
        form.transform((data) => ({ ...data, tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean) }));
        form.post('/documents', { forceFormData: true, preserveScroll: true, onSuccess: () => setUploading(false) });
    }

    const apply = (patch: Record<string, string | number>) =>
        router.get('/documents/library', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });

    const filtered = filters.search || filters.category || filters.level;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Documents" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Documents</h1>
                        <p className="text-xs text-muted-foreground">Browse and manage all uploaded documents.</p>
                    </div>
                    <Button onClick={openUpload}>
                        <Plus className="size-4" /> Upload Document
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

                            <Dropdown value={filters.category ?? ''} onChange={(v) => apply({ category: v })} placeholder="All Categories" options={options.categories.map((category) => ({ value: category, label: category }))} className="h-9 w-40" aria-label="Category filter" />

                            <Dropdown value={filters.level ?? ''} onChange={(v) => apply({ level: v })} placeholder="All Levels" options={options.levels.map((level) => ({ value: level, label: level }))} className="h-9 w-40" aria-label="Level filter" capitalize />
                        </div>

                        <FilterActions
                            active={Boolean(filtered)}
                            onClear={() => {
                                setSearch('');
                                router.get('/documents/library', { stage: filters.stage ?? '' }, { preserveState: true, replace: true });
                            }}
                        />
                    </div>

                    <CountTabs
                        value={filters.stage ?? ''}
                        onSelect={(v) => apply({ stage: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all },
                            { value: 'draft', label: 'Draft', icon: PenLine, count: counts.draft },
                            { value: 'review', label: 'Review', icon: Clock, count: counts.review },
                            { value: 'final', label: 'Final', icon: CircleCheckBig, count: counts.final },
                            { value: 'archived', label: 'Archived', icon: Archive, count: counts.archived },
                        ]}
                    />
                </div>

                {documents.data.length === 0 ? (
                    <div className="rounded-lg border bg-card py-16 text-center text-sm text-muted-foreground shadow-sm">No documents match this view.</div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {documents.data.map((document) => (
                            <Link
                                key={document.id}
                                href={`/documents/library/${document.id}`}
                                title={[document.type, document.client].filter(Boolean).join(' · ') || undefined}
                                className="group flex flex-col items-center rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md dark:hover:bg-primary/10"
                            >
                                <Folder
                                    className={cn(
                                        'size-20 transition-transform duration-200 group-hover:scale-110',
                                        document.state === 'archived' ? 'text-muted-foreground' : 'text-primary',
                                    )}
                                />
                                <span className="mt-2 text-center text-sm font-medium transition-colors duration-200 group-hover:text-primary">
                                    {document.title}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <DataTableFooter from={documents.from} to={documents.to} total={documents.total} links={documents.links} perPage={perPage} />
                </div>

                <FormDialog open={uploading} onOpenChange={setUploading} title="Upload Document" processing={form.processing} submitLabel="Save" onSubmit={upload}>
                    <TextField
                        label="Name"
                        value={form.data.title}
                        onChange={(v) => form.setData('title', v)}
                        error={form.errors.title}
                        placeholder="eg. Non-Disclosure Agreement"
                    />
                    <TextareaField
                        label="Description"
                        value={form.data.description}
                        onChange={(v) => form.setData('description', v)}
                        error={form.errors.description}
                        placeholder="eg. Standard NDA template for client engagements"
                    />
                    <SelectField
                        label="Category"
                        value={form.data.type}
                        onChange={(v) => form.setData('type', v)}
                        options={options.categories.map((c) => ({ value: c, label: c }))}
                        placeholder="Select Category"
                        error={form.errors.type}
                    />
                    <Field label="File" error={form.errors.file}>
                        <div className="flex gap-2">
                            <Input readOnly value={form.data.file?.name ?? ''} placeholder="Select File" className="flex-1" onClick={() => picker.current?.click()} />
                            <Button type="button" variant="outline" onClick={() => picker.current?.click()}>
                                <ImageIcon className="size-4" /> Browse
                            </Button>
                            <input
                                ref={picker}
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.rtf,.odt"
                                onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)}
                            />
                        </div>
                    </Field>
                    <SelectField
                        label="Status"
                        value={form.data.stage}
                        onChange={(v) => form.setData('stage', v)}
                        options={[
                            { value: 'draft', label: 'Draft' },
                            { value: 'review', label: 'Review' },
                            { value: 'final', label: 'Final' },
                            { value: 'archived', label: 'Archived' },
                        ]}
                        error={form.errors.stage}
                    />
                    <SelectField
                        label="Confidentiality"
                        value={form.data.confidentiality}
                        onChange={(v) => form.setData('confidentiality', v)}
                        options={options.levels.map((l) => ({ value: l, label: l.charAt(0).toUpperCase() + l.slice(1) }))}
                        error={form.errors.confidentiality}
                    />
                    <TextField
                        label="Tags"
                        value={form.data.tags}
                        onChange={(v) => form.setData('tags', v)}
                        error={form.errors.tags}
                        placeholder="Enter tags separated by commas"
                    />
                </FormDialog>
            </div>
        </AppLayout>
    );
}
