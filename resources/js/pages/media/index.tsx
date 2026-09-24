import { DataTableFooter } from '@/components/data-table-footer';
import { FormDialog, SelectField, TextField } from '@/components/form-dialog';
import { confirmAction } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { bytes, date } from '@/lib/format';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Calendar, Download, FileText, HardDrive, Image as ImageIcon, Plus, Search, Trash2 } from 'lucide-react';
import type { ComponentType } from 'react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Media Library', href: '/media' }];

interface Medium {
    id: number;
    title: string;
    folder: string;
    extension: string;
    is_image: boolean;
    size: number;
    created_at: string | null;
    uploader: string | null;
}

export default function MediaLibrary({
    media,
    filters,
    perPage,
    totals,
    folders,
}: {
    media: Paginated<Medium>;
    filters: Record<string, string>;
    perPage: number;
    totals: { files: number; bytes: number; images: number };
    folders: string[];
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const form = useForm<{ title: string; folder: string; file: File | null }>({ title: '', folder: 'general', file: null });

    const apply = (patch: Record<string, string | number>) =>
        router.get('/media', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Media Library" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Media Library</h1>
                        <p className="text-xs text-muted-foreground">Manage all your media files in one place.</p>
                    </div>
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="size-4" /> Upload Media
                    </Button>
                </div>

                <div className="rounded-xl border p-3 lg:p-6">
                    <div className="space-y-6">
                        <div className="rounded-lg border bg-card shadow-sm">
                            <div className="flex flex-col gap-4 p-4 lg:flex-row">
                                <div className="flex-1">
                                    <div className="relative max-w-sm">
                                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && apply({ search })}
                                            placeholder="Search media files..."
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                    <Total icon={ImageIcon} tone="bg-primary/10 text-primary" label={`${totals.files} Files`} />
                                    <Total icon={HardDrive} tone="bg-green-500/10 text-green-600" label={bytes(totals.bytes)} />
                                    <Total icon={ImageIcon} tone="bg-blue-500/10 text-blue-600" label={`${totals.images} Images`} />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border bg-card shadow-sm">
                            <div className="flex h-full flex-col gap-3 overflow-hidden bg-[#F0F0F1] p-3 lg:gap-6 lg:p-6 dark:bg-neutral-800">
                                {media.data.length === 0 ? (
                                    <p className="py-12 text-center text-sm text-muted-foreground">Nothing uploaded yet.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                                        {media.data.map((medium) => (
                                            <div key={medium.id} className="group relative overflow-hidden rounded-lg border bg-card transition-all duration-200 hover:shadow-md">
                                                <a
                                                    href={`/media/${medium.id}/preview`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="relative flex aspect-square cursor-pointer items-center justify-center bg-muted"
                                                >
                                                    {medium.is_image ? (
                                                        <img src={`/media/${medium.id}/preview`} alt={medium.title} className="size-full object-cover" />
                                                    ) : (
                                                        <FileText className="size-12 text-muted-foreground" />
                                                    )}

                                                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-200 group-hover:bg-black/40">
                                                        <span className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-neutral-900 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 dark:bg-neutral-800/90 dark:text-white">
                                                            Click to view
                                                        </span>
                                                    </span>

                                                    <Badge variant="secondary" className="absolute top-2 left-2 bg-background/95 text-xs">
                                                        {medium.extension}
                                                    </Badge>
                                                </a>

                                                <div className="space-y-2 p-3">
                                                    <div>
                                                        <h3 className="truncate text-sm font-medium" title={medium.title}>
                                                            {medium.title}
                                                        </h3>
                                                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                                            <HardDrive className="size-3" />
                                                            {bytes(medium.size)}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="size-3" />
                                                            {date(medium.created_at)}
                                                        </span>
                                                        <span className="flex items-center">
                                                            <Button variant="ghost" size="icon" className="size-7" title="Download" asChild>
                                                                <a href={`/media/${medium.id}/download`}>
                                                                    <Download className="size-3.5" />
                                                                </a>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-7"
                                                                title="Delete"
                                                                onClick={() =>
                                                                    confirmAction({ title: `Delete ${medium.title}?` }).then((ok) => ok && router.delete(`/media/${medium.id}`, { preserveScroll: true }))
                                                                }
                                                            >
                                                                <Trash2 className="size-3.5 text-rose-600" />
                                                            </Button>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <DataTableFooter
                                    from={media.from}
                                    to={media.to}
                                    total={media.total}
                                    links={media.links}
                                    perPage={perPage}
                                    sizes={[12, 24, 48]}
                                    onPerPage={(value) => apply({ per_page: value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title="Upload Media"
                    processing={form.processing}
                    submitLabel="Upload"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/media', {
                            forceFormData: true,
                            onSuccess: () => {
                                setOpen(false);
                                form.reset();
                            },
                            preserveScroll: true,
                        });
                    }}
                >
                    <TextField label="Title" value={form.data.title} onChange={(v) => form.setData('title', v)} error={form.errors.title} />
                    <SelectField
                        label="Folder"
                        value={form.data.folder}
                        onChange={(v) => form.setData('folder', v)}
                        options={folders.map((f) => ({ value: f, label: f }))}
                    />
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">File</Label>
                        <Input type="file" onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)} />
                        {form.errors.file && <p className="text-xs text-rose-600">{form.errors.file}</p>}
                        <p className="text-xs text-muted-foreground">Images, SVG, PDF or Word. Max 10 MB.</p>
                    </div>
                </FormDialog>
            </div>
        </AppLayout>
    );
}

function Total({ icon: Icon, tone, label }: { icon: ComponentType<{ className?: string }>; tone: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`rounded-md p-1.5 ${tone}`}>
                <Icon className="size-4" />
            </div>
            <span className="text-sm font-semibold">{label}</span>
        </div>
    );
}
