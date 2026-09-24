import { confirmAction } from '@/components/confirm-dialog';
import { DataTableFooter } from '@/components/data-table-footer';
import { Dropdown } from '@/components/dropdown';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { CountTabs } from '@/components/page-toolbar';
import { SummaryCard } from '@/components/summary-card';
import { RingPill, TonePill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import type { BreadcrumbItem, Paginated, User } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Archive,
    BookOpen,
    Calendar,
    CircleCheckBig,
    Ellipsis,
    FileText,
    Filter,
    LayoutGrid,
    Pencil,
    Plus,
    RefreshCcw,
    Search,
    Tag,
    Trash2,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Knowledge Articles', href: '/articles' }];

interface Article {
    id: number;
    title: string;
    category: string | null;
    summary: string | null;
    tags: string[] | null;
    status: string;
    published_at: string | null;
    updated_at: string;
    author?: Pick<User, 'id' | 'name'> | null;
}

interface Category {
    name: string;
    color: string | null;
}

const STATUS: Record<string, { label: string; icon: ComponentType<{ className?: string }>; tone: string }> = {
    published: { label: 'Published', icon: CircleCheckBig, tone: 'active' },
    draft: { label: 'Draft', icon: FileText, tone: 'low' },
    archived: { label: 'Archived', icon: Archive, tone: 'medium' },
};

const empty = () => ({ title: '', category: '', summary: '', tags: '', body: '', status: 'draft' });

export default function KnowledgeArticles({
    articles,
    filters,
    perPage,
    counts,
    categories,
    statuses,
}: {
    articles: Paginated<Article>;
    filters: Record<string, string>;
    perPage: number;
    counts: Record<string, number>;
    categories: Category[];
    statuses: string[];
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Article | null>(null);
    const form = useForm(empty());

    const hasFilters = Boolean(filters.search || filters.category || filters.status);
    const colourOf = (name: string | null) => categories.find((c) => c.name === name)?.color ?? '#6b7280';

    function apply(patch: Record<string, string | number>) {
        router.get('/articles', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });
    }

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(a: Article) {
        form.setData({
            title: a.title,
            category: a.category ?? '',
            summary: a.summary ?? '',
            tags: (a.tags ?? []).join(', '),
            body: '',
            status: a.status,
        });
        form.clearErrors();
        setEditing(a);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        // Tags are typed as a comma-separated line and stored as a list.
        const done = {
            onSuccess: () => setOpen(false),
            preserveScroll: true,
            transform: (data: Record<string, unknown>) => ({
                ...data,
                tags: String(data.tags ?? '')
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
            }),
        };

        form.transform(done.transform);
        if (editing) {
            form.put(`/articles/${editing.id}`, done);
        } else {
            form.post('/articles', done);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Knowledge Articles" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Knowledge Article</h1>
                        <p className="text-muted-foreground text-xs">Create and manage legal knowledge articles in one place.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> New Article
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <SummaryCard label="Total" value={counts.all ?? 0} icon={BookOpen} tone="gray" mono={false} />
                    <SummaryCard label="Published" value={counts.published ?? 0} icon={CircleCheckBig} tone="emerald" mono={false} />
                    <SummaryCard label="Draft" value={counts.draft ?? 0} icon={FileText} tone="blue" mono={false} />
                    <SummaryCard label="Archived" value={counts.archived ?? 0} icon={Archive} tone="amber" mono={false} />
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
                                    value={filters.category ?? ''}
                                    onChange={(v) => apply({ category: v })}
                                    placeholder="All Categories"
                                    options={categories.map((c) => ({ value: c.name, label: c.name }))}
                                    className="h-9 w-40"
                                    capitalize
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
                                            router.get('/articles');
                                        }}
                                    >
                                        <RefreshCcw className="size-4" /> Clear Filters
                                    </Button>
                                )}
                                <span className="text-muted-foreground flex h-8 items-center gap-1.5 rounded-md border px-2 text-sm">
                                    <Filter className="size-4" /> Filters
                                </span>
                            </div>
                        </div>
                    </div>

                    <CountTabs
                        value={filters.status ?? ''}
                        onSelect={(v) => apply({ status: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                            ...statuses.map((s) => ({ value: s, label: STATUS[s].label, icon: STATUS[s].icon, count: counts[s] ?? 0 })),
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {articles.data.length === 0 && (
                        <p className="text-muted-foreground py-12 text-center text-sm sm:col-span-2 lg:col-span-3 2xl:col-span-4">
                            No articles match these filters.
                        </p>
                    )}
                    {articles.data.map((a) => {
                        const tags = a.tags ?? [];

                        return (
                            <div
                                key={a.id}
                                className="group bg-card relative flex flex-col overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="p-4 pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1 pr-2">
                                            <h3 className="mb-1.5 truncate text-base font-semibold tracking-tight" title={a.title}>
                                                {a.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <RingPill value={STATUS[a.status].tone} label={STATUS[a.status].label} />
                                                {a.category && <TonePill color={colourOf(a.category)}>{a.category}</TonePill>}
                                            </div>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground size-7 shrink-0">
                                                    <Ellipsis className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEdit(a)}>
                                                    <Pencil className="mr-2 size-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-rose-600 focus:text-rose-600"
                                                    onClick={() =>
                                                        confirmAction({ title: `Delete ${a.title}?` }).then(
                                                            (ok) => ok && router.delete(`/articles/${a.id}`, { preserveScroll: true }),
                                                        )
                                                    }
                                                >
                                                    <Trash2 className="mr-2 size-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                <div className="flex flex-1 flex-col px-4 pt-0 pb-4">
                                    <p className="text-muted-foreground mb-3 line-clamp-3 min-h-[54px] text-xs leading-relaxed">
                                        {a.summary ?? 'No summary yet.'}
                                    </p>

                                    {tags.length > 0 && (
                                        <div className="mb-3 flex flex-wrap items-center gap-1">
                                            <Tag className="text-muted-foreground size-3 shrink-0" />
                                            {tags.slice(0, 3).map((t) => (
                                                <span
                                                    key={t}
                                                    className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                            {tags.length > 3 && (
                                                <span
                                                    className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium"
                                                    title={tags.slice(3).join(', ')}
                                                >
                                                    +{tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="-mx-4 mt-auto flex items-center justify-between border-t px-4 pt-3">
                                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                            <Calendar className="size-3.5" />
                                            <span>{date(a.published_at ?? a.updated_at)}</span>
                                        </div>
                                        {a.author && (
                                            <span
                                                title={a.author.name}
                                                className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-full text-[10px] font-semibold"
                                            >
                                                {a.author.name
                                                    .split(' ')
                                                    .map((p) => p[0])
                                                    .slice(0, 2)
                                                    .join('')
                                                    .toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
                    <DataTableFooter
                        from={articles.from}
                        to={articles.to}
                        total={articles.total}
                        links={articles.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>
            </div>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? `Edit ${editing.title}` : 'New Article'}
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
                    label="Category"
                    value={form.data.category}
                    onChange={(v) => form.setData('category', v)}
                    options={categories.map((c) => ({ value: c.name, label: c.name }))}
                    placeholder="—"
                />
                <SelectField
                    label="Status"
                    value={form.data.status}
                    onChange={(v) => form.setData('status', v)}
                    options={statuses.map((s) => ({ value: s, label: STATUS[s].label }))}
                />
                <TextField
                    label="Tags"
                    value={form.data.tags}
                    onChange={(v) => form.setData('tags', v)}
                    placeholder="criminal, defense, evidence"
                    className="sm:col-span-2"
                />
                <TextareaField
                    label="Summary"
                    value={form.data.summary}
                    onChange={(v) => form.setData('summary', v)}
                    error={form.errors.summary}
                    className="sm:col-span-2"
                />
                <TextareaField
                    label="Body"
                    value={form.data.body}
                    onChange={(v) => form.setData('body', v)}
                    error={form.errors.body}
                    rows={8}
                    className="sm:col-span-2"
                />
            </FormDialog>
        </AppLayout>
    );
}
