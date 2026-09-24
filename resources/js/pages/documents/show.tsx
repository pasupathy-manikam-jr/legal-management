import { InitialsAvatar } from '@/components/avatar-stack';
import { Field, FormDialog, SelectField, TextareaField, TextField } from '@/components/form-dialog';
import { confirmAction } from '@/components/confirm-dialog';
import { TonePill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { bytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CircleCheckBig,
    Download,
    Eye,
    FileImage,
    FileSpreadsheet,
    FileText,
    FolderOpen,
    Plus,
    RefreshCw,
    RotateCcw,
    SquarePen,
    Trash2,
    TriangleAlert,
    X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useState } from 'react';

interface DocumentDetail {
    id: number;
    title: string;
    description: string | null;
    tags: string[];
    type: string | null;
    typeColor: string | null;
    stage: string;
    state: string;
    confidentiality: string;
    created_on: string | null;
    owner: string;
    client_id: number | null;
    matter_id: number | null;
    matter: string | null;
}

interface Version {
    id: number;
    label: string;
    created_on: string | null;
    size: number;
    mime: string | null;
    uploader: string | null;
    current: boolean;
}

interface Options {
    clients: { id: number; name: string }[];
    matters: { id: number; client_id: number; reference: string; title: string }[];
    types: string[];
    stages: string[];
}

const STAGE_TONES: Record<string, string> = {
    draft: 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-neutral-900 dark:text-neutral-300',
    review: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300',
    final: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950 dark:text-green-300',
    archived: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-neutral-800 dark:text-neutral-400',
};

const LEVEL_TONES: Record<string, string> = {
    confidential: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300',
    internal: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300',
    public: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950 dark:text-green-300',
    restricted: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300',
};

const title = (value: string) => value.replace(/\b\w/g, (c) => c.toUpperCase());

/** The file icon each version tile draws, from what the stored file is. */
function iconFor(mime: string | null): ComponentType<{ className?: string }> {
    if (mime?.startsWith('image/')) return FileImage;
    if (mime?.includes('sheet') || mime?.includes('excel')) return FileSpreadsheet;

    return FileText;
}

export default function DocumentShow({ document, versions, options }: { document: DocumentDetail; versions: Version[]; options: Options }) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const [uploading, setUploading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const current = versions.find((v) => v.current) ?? versions[0];
    const base = `/documents/${document.id}`;

    const upload = useForm<{ file: File | null }>({ file: null });
    const details = useForm({
        client_id: document.client_id ? String(document.client_id) : '',
        matter_id: document.matter_id ? String(document.matter_id) : '',
        title: document.title,
        type: document.type ?? '',
        stage: document.stage,
        confidentiality: document.confidentiality,
        tags: document.tags.join(', '),
        description: document.description ?? '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Documents', href: '/documents/library' },
        { title: document.title, href: `/documents/library/${document.id}` },
    ];

    const cases = options.matters.filter((m) => String(m.client_id) === details.data.client_id);

    function openEdit() {
        details.clearErrors();
        setEditing(true);
    }

    function saveDetails(e: React.FormEvent) {
        e.preventDefault();
        // Tags are typed as one comma-separated line and saved as a list.
        details.transform((data) => ({ ...data, tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean) }));
        details.put(base, { onSuccess: () => setEditing(false), preserveScroll: true });
    }

    async function removeVersion(version: Version) {
        if (!(await confirmAction({ title: `Delete ${version.label}?`, description: 'Its file is removed for good.' }))) return;
        router.delete(`${base}/versions/${version.id}`, {
            preserveScroll: true,
            onError: (e) => setNotice(e.version ?? 'This version could not be deleted.'),
        });
    }

    const message = notice ?? errors.version ?? null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={document.title} />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-semibold">{document.title}</h1>
                        <p className="text-xs text-muted-foreground">View all versions of this document and manage version history.</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button onClick={() => setUploading(true)}>
                            <Plus className="size-4" /> Add Version
                        </Button>
                        <Button variant="outline" size="sm" className="h-8" asChild>
                            <Link href="/documents/library">
                                <ArrowLeft className="size-4" /> Back
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="space-y-5 rounded-xl border p-3 lg:p-6">
                    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                        <div className="h-1 w-full" style={{ backgroundColor: document.typeColor ?? 'var(--primary)' }} />
                        <div className="flex items-center gap-3 px-5 py-4">
                            <InitialsAvatar name={document.owner} className="size-10 text-sm" />
                            <div className="min-w-0">
                                <h2 className="truncate text-base font-bold">{document.title}</h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {document.owner} | {versions.length} {versions.length === 1 ? 'version' : 'versions'}
                                    {document.matter && ` | ${document.matter}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                            <span className="flex-1">{message}</span>
                            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
                                <X className="size-4" />
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 items-start gap-5 min-[1481px]:grid-cols-[70%_30%] min-[1481px]:pr-5">
                        <div className="rounded-lg border bg-card p-5 shadow-sm">
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                                {versions.map((version) => {
                                    const Icon = iconFor(version.mime);

                                    return (
                                        <div
                                            key={version.id}
                                            className={cn(
                                                'group flex flex-col items-center gap-1 rounded-xl border p-3 transition-all duration-200',
                                                version.current ? 'border-primary/30 bg-primary/5 dark:bg-primary/10' : 'bg-card hover:border-primary/40 hover:bg-primary/5',
                                            )}
                                        >
                                            <a
                                                href={`${base}/versions/${version.id}/preview`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full cursor-pointer text-center"
                                                title={`Open ${version.label}${version.uploader ? ` — uploaded by ${version.uploader}` : ''} · ${bytes(version.size)}`}
                                            >
                                                <div className="relative flex w-full justify-center">
                                                    <Icon className={cn('size-14 text-primary', !version.current && 'opacity-80')} />
                                                    {version.current && (
                                                        <span className="absolute -top-1 -right-1 rounded-full bg-primary p-0.5 shadow">
                                                            <CircleCheckBig className="size-2.5 text-white" />
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={cn('text-[11px] leading-tight font-semibold', version.current ? 'text-primary' : 'text-foreground')}>{version.label}</p>
                                                <p className="mb-1 text-[10px] text-muted-foreground">{version.created_on}</p>
                                            </a>
                                            <div className="mt-auto flex w-full items-center justify-center gap-1 border-t pt-1.5">
                                                <a
                                                    href={`${base}/versions/${version.id}/download`}
                                                    title="Download"
                                                    className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                                                >
                                                    <Download className="size-4" />
                                                </a>
                                                {!version.current && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            title="Make current"
                                                            onClick={() => router.patch(`${base}/versions/${version.id}/restore`, {}, { preserveScroll: true })}
                                                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                                                        >
                                                            <RotateCcw className="size-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Delete version"
                                                            onClick={() => removeVersion(version)}
                                                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="min-[1481px]:sticky min-[1481px]:top-6">
                            <div className="flex flex-col rounded-lg border bg-card shadow-sm">
                                <div className="flex items-center justify-between gap-2 rounded-t-lg border-b bg-muted/40 px-5 py-3">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                                        <FileText className="size-4 text-muted-foreground" />
                                        Document Details
                                    </h3>
                                    <div className="flex items-center gap-0.5">
                                        {current && (
                                            <Button variant="ghost" size="icon" className="size-7" title="Open current version" asChild>
                                                <a href={`${base}/versions/${current.id}/preview`} target="_blank" rel="noreferrer">
                                                    <Eye className="size-4 text-muted-foreground" />
                                                </a>
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="size-7" title="Edit details" onClick={openEdit}>
                                            <SquarePen className="size-4 text-muted-foreground" />
                                        </Button>
                                        {current && (
                                            <Button variant="ghost" size="icon" className="size-7" title="Download current version" asChild>
                                                <a href={`${base}/versions/${current.id}/download`}>
                                                    <Download className="size-4 text-muted-foreground" />
                                                </a>
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="size-7" title="Replace with a new version" onClick={() => setUploading(true)}>
                                            <RefreshCw className="size-4 text-muted-foreground" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-7"
                                            title="Delete document"
                                            onClick={() => confirmAction({ title: `Delete ${document.title} and all ${versions.length} versions?` }).then((ok) => ok && router.delete(base))}
                                        >
                                            <Trash2 className="size-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-3 px-5 py-4">
                                    <Row label="Category">
                                        {document.type ? (
                                            <TonePill color={document.typeColor ?? '#6b7280'}>
                                                <FolderOpen className="size-3" />
                                                {document.type}
                                            </TonePill>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </Row>
                                    <Row label="Status">
                                        <Pill tone={STAGE_TONES[document.state]}>{title(document.state)}</Pill>
                                    </Row>
                                    <Row label="Confidentiality">
                                        <Pill tone={LEVEL_TONES[document.confidentiality]}>{title(document.confidentiality)}</Pill>
                                    </Row>
                                    <Row label="Tags">
                                        <div className="flex max-w-60 flex-wrap justify-end gap-1">
                                            {document.tags.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                                            {document.tags.map((tag) => (
                                                <span key={tag} className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </Row>
                                    <Row label="Current Version">
                                        <Pill tone="bg-primary/5 text-primary ring-primary/20">
                                            <CircleCheckBig className="size-3" />
                                            {current?.label ?? '—'}
                                        </Pill>
                                    </Row>
                                    <Row label="Created">
                                        <span className="text-right text-xs font-medium">{document.created_on ?? '—'}</span>
                                    </Row>
                                    <div className="border-t" />
                                    <div>
                                        <p className="mb-1.5 text-xs font-semibold tracking-wide">Description</p>
                                        <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{document.description || 'No description.'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <FormDialog
                    open={uploading}
                    onOpenChange={setUploading}
                    title="Add Version"
                    processing={upload.processing}
                    submitLabel="Upload"
                    onSubmit={(e) => {
                        e.preventDefault();
                        upload.post(`${base}/versions`, {
                            forceFormData: true,
                            preserveScroll: true,
                            onSuccess: () => {
                                setUploading(false);
                                upload.reset();
                            },
                        });
                    }}
                >
                    <p className="text-sm text-muted-foreground">
                        The new file becomes the current version. {current ? `${current.label} stays in the history and can be restored.` : ''}
                    </p>
                    <Field label="File" error={upload.errors.file}>
                        <Input
                            type="file"
                            onChange={(e) => upload.setData('file', e.target.files?.[0] ?? null)}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.rtf,.odt"
                        />
                    </Field>
                </FormDialog>

                <FormDialog open={editing} onOpenChange={setEditing} title="Edit Details" processing={details.processing} onSubmit={saveDetails} wide>
                    <TextField label="Document Name" value={details.data.title} onChange={(v) => details.setData('title', v)} error={details.errors.title} className="sm:col-span-2" />
                    <SelectField
                        label="Client"
                        value={details.data.client_id}
                        onChange={(v) => details.setData({ ...details.data, client_id: v, matter_id: '' })}
                        options={options.clients.map((c) => ({ value: c.id, label: c.name }))}
                        placeholder="Firm (no client)"
                        error={details.errors.client_id}
                    />
                    <SelectField
                        label="Case"
                        value={details.data.matter_id}
                        onChange={(v) => details.setData('matter_id', v)}
                        options={cases.map((m) => ({ value: m.id, label: `${m.reference} — ${m.title}` }))}
                        placeholder="Not case related"
                        error={details.errors.matter_id}
                    />
                    <SelectField
                        label="Category"
                        value={details.data.type}
                        onChange={(v) => details.setData('type', v)}
                        options={options.types.map((t) => ({ value: t, label: t }))}
                        placeholder="Uncategorised"
                        error={details.errors.type}
                    />
                    <SelectField
                        label="Status"
                        value={details.data.stage}
                        onChange={(v) => details.setData('stage', v)}
                        options={options.stages.map((s) => ({ value: s, label: title(s) }))}
                        error={details.errors.stage}
                    />
                    <SelectField
                        label="Confidentiality"
                        value={details.data.confidentiality}
                        onChange={(v) => details.setData('confidentiality', v)}
                        options={[
                            { value: 'internal', label: 'Internal' },
                            { value: 'confidential', label: 'Confidential' },
                            { value: 'public', label: 'Public' },
                            { value: 'restricted', label: 'Restricted' },
                        ]}
                        error={details.errors.confidentiality}
                    />
                    <TextField label="Tags" value={details.data.tags} onChange={(v) => details.setData('tags', v)} error={details.errors.tags} placeholder="legal, evidence, case 11" />
                    <TextareaField
                        label="Description"
                        value={details.data.description}
                        onChange={(v) => details.setData('description', v)}
                        error={details.errors.description}
                        className="sm:col-span-2"
                    />
                </FormDialog>
            </div>
        </AppLayout>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-wide">{label}</span>
            {children}
        </div>
    );
}

function Pill({ tone, children }: { tone?: string; children: React.ReactNode }) {
    return <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', tone)}>{children}</span>;
}
