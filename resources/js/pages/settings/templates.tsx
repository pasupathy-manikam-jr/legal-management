import { DataTableFooter } from '@/components/data-table-footer';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { SortableHead } from '@/components/sortable-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Eye, Search } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Notification Templates', href: '/settings/templates' }];

interface Template {
    id: number;
    key: string;
    name: string;
    channel: string;
    subject: string | null;
    body: string;
    active: boolean;
}

const CHANNEL_LABELS: Record<string, string> = { slack: 'Slack', twilio: 'Twilio', email: 'Email' };

export default function Templates({
    channel,
    channels,
    templates,
    filters,
    perPage,
    sort,
    variables,
}: {
    channel: string;
    channels: string[];
    templates: Paginated<Template>;
    filters: Record<string, string>;
    perPage: number;
    sort: { column: string; direction: string };
    variables: string[];
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [editing, setEditing] = useState<Template | null>(null);
    const form = useForm({ name: '', subject: '', body: '', active: true as boolean });

    const apply = (patch: Record<string, string | number>) =>
        router.get(
            '/settings/templates',
            { ...filters, channel, per_page: perPage, direction: sort.direction, ...patch },
            { preserveState: true, replace: true },
        );

    function open(template: Template) {
        form.setData({ name: template.name, subject: template.subject ?? '', body: template.body, active: template.active });
        form.clearErrors();
        setEditing(template);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notification Templates" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div>
                    <h1 className="text-xl font-semibold">Notification Templates</h1>
                    <p className="text-muted-foreground text-xs">Manage email and system notification templates for automated messages.</p>
                </div>

                <div className="bg-card rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between gap-2 p-3">
                        <div className="relative w-64">
                            <Search className="text-muted-foreground absolute top-2 left-2.5 size-4" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && apply({ search })}
                                placeholder="Search..."
                                className="h-8 w-full px-9"
                            />
                        </div>

                        <div className="mr-2 rounded-md border p-0.5">
                            <div
                                role="tablist"
                                className="bg-muted text-muted-foreground grid h-10 w-fit items-center gap-1 rounded-md p-1"
                                style={{ gridTemplateColumns: `repeat(${channels.length}, minmax(0, 1fr))` }}
                            >
                                {channels.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        role="tab"
                                        aria-selected={channel === value}
                                        onClick={() => {
                                            setSearch('');
                                            router.get(
                                                '/settings/templates',
                                                { channel: value, per_page: perPage },
                                                { preserveState: true, replace: true },
                                            );
                                        }}
                                        className={cn(
                                            'inline-flex cursor-pointer items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all',
                                            channel === value && 'bg-primary text-primary-foreground shadow-sm',
                                        )}
                                    >
                                        {CHANNEL_LABELS[value] ?? value}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-[#F0F0F1] dark:bg-neutral-800">
                                    <th className="text-muted-foreground w-12 px-4 py-2.5 text-left font-semibold">#</th>
                                    <SortableHead
                                        label="Name"
                                        column="name"
                                        sort={sort}
                                        onSort={() => apply({ direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
                                    />
                                    <th className="text-muted-foreground w-24 px-4 py-2.5 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {templates.data.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-muted-foreground py-16 text-center text-sm">
                                            No {CHANNEL_LABELS[channel] ?? channel} templates match this search.
                                        </td>
                                    </tr>
                                )}
                                {templates.data.map((template, index) => (
                                    <tr key={template.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="px-4 py-2.5 font-medium">{(templates.from ?? 1) + index}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={cn('text-sm font-medium', !template.active && 'text-muted-foreground line-through')}>
                                                {template.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground size-8"
                                                    title="View"
                                                    onClick={() => open(template)}
                                                >
                                                    <Eye className="size-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <DataTableFooter
                        from={templates.from}
                        to={templates.to}
                        total={templates.total}
                        links={templates.links}
                        perPage={perPage}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={editing !== null}
                    onOpenChange={(next) => !next && setEditing(null)}
                    title={`${editing?.name ?? ''} — ${CHANNEL_LABELS[editing?.channel ?? ''] ?? ''}`}
                    processing={form.processing}
                    submitLabel="Save"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.put(`/settings/templates/${editing?.id}`, { onSuccess: () => setEditing(null), preserveScroll: true });
                    }}
                    wide
                >
                    <TextField label="Name" value={form.data.name} onChange={(v) => form.setData('name', v)} error={form.errors.name} />
                    <SelectField
                        label="Status"
                        value={form.data.active ? '1' : '0'}
                        onChange={(v) => form.setData('active', v === '1')}
                        options={[
                            { value: '1', label: 'Active' },
                            { value: '0', label: 'Off' },
                        ]}
                    />
                    {/* Only an email has a subject line; a Slack post or a text message is just the body. */}
                    {editing?.channel === 'email' && (
                        <TextField
                            label="Subject"
                            value={form.data.subject}
                            onChange={(v) => form.setData('subject', v)}
                            error={form.errors.subject}
                            className="sm:col-span-2"
                        />
                    )}
                    <TextareaField
                        label="Message"
                        value={form.data.body}
                        onChange={(v) => form.setData('body', v)}
                        error={form.errors.body}
                        className="sm:col-span-2"
                    />
                    <p className="text-muted-foreground text-xs sm:col-span-2">
                        Variables:{' '}
                        {variables.map((v) => (
                            <code key={v} className="bg-muted mr-1 rounded px-1 py-0.5 font-mono text-[11px]">
                                {v}
                            </code>
                        ))}
                    </p>
                </FormDialog>
            </div>
        </AppLayout>
    );
}
