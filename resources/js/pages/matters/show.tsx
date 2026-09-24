import { confirmAction } from '@/components/confirm-dialog';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { date, dateTime, hours, money } from '@/lib/format';
import type { BreadcrumbItem, Client, Court, Matter, User } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Download, FileText, Plus, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';

type Tab = 'timeline' | 'team' | 'documents' | 'tasks' | 'hearings' | 'time';

interface Props {
    matter: Matter;
    totals: { minutes: number; billableCents: number; unbilledCents: number };
    options: { clients: Client[]; courts: Court[]; users: User[]; caseTypes: string[]; statuses: string[]; priorities: string[] };
}

export default function MatterShow({ matter, totals, options }: Props) {
    const [tab, setTab] = useState<Tab>('timeline');
    const [editOpen, setEditOpen] = useState(false);
    const [eventOpen, setEventOpen] = useState(false);
    const [docOpen, setDocOpen] = useState(false);
    const [teamOpen, setTeamOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Cases', href: '/matters' },
        { title: matter.reference, href: `/matters/${matter.id}` },
    ];

    const edit = useForm({
        client_id: String(matter.client_id),
        lead_lawyer_id: matter.lead_lawyer_id ? String(matter.lead_lawyer_id) : '',
        court_id: matter.court_id ? String(matter.court_id) : '',
        title: matter.title,
        practice_area: matter.practice_area ?? '',
        case_type: matter.case_type ?? 'civil',
        priority: matter.priority as string,
        judge: matter.judge ?? '',
        opposing_party: matter.opposing_party ?? '',
        opposing_counsel: matter.opposing_counsel ?? '',
        status: matter.status as string,
        opened_on: matter.opened_on?.slice(0, 10) ?? '',
        expected_completion: matter.expected_completion?.slice(0, 10) ?? '',
        hourly_rate: String(matter.hourly_rate_cents / 100),
        description: matter.description ?? '',
    });

    const event = useForm({ kind: 'timeline', title: '', body: '', occurred_at: new Date().toISOString().slice(0, 16) });
    const doc = useForm<{ title: string; confidentiality: string; file: File | null }>({ title: '', confidentiality: 'internal', file: null });
    const team = useForm({ user_id: '', role: 'associate' });

    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: 'timeline', label: 'Timeline & notes', count: matter.events?.length },
        { id: 'hearings', label: 'Hearings', count: matter.hearings?.length },
        { id: 'tasks', label: 'Tasks', count: matter.tasks?.length },
        { id: 'documents', label: 'Documents', count: matter.documents?.length },
        { id: 'time', label: 'Time', count: matter.time_entries?.length },
        { id: 'team', label: 'Team', count: matter.team?.length },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${matter.reference} — ${matter.title}`} />
            <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono text-xs">{matter.reference}</span>
                            <StatusBadge value={matter.status} />
                            <StatusBadge value={matter.priority} />
                        </div>
                        <h1 className="mt-1 text-xl font-semibold">{matter.title}</h1>
                        <p className="text-muted-foreground text-sm">
                            {matter.client?.name}
                            {matter.court && ` · ${matter.court.name}`}
                            {matter.judge && ` · ${matter.judge}`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditOpen(true)}>
                            Edit case
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() =>
                                confirmAction({ title: 'Delete this case and everything on it?' }).then(
                                    (ok) => ok && router.delete(`/matters/${matter.id}`),
                                )
                            }
                        >
                            <Trash2 className="size-4 text-rose-600" />
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Opened"
                        value={date(matter.opened_on)}
                        hint={matter.expected_completion ? `target ${date(matter.expected_completion)}` : undefined}
                    />
                    <StatCard label="Time logged" value={hours(totals.minutes)} />
                    <StatCard label="Billable" value={money(totals.billableCents)} />
                    <StatCard label="Unbilled" value={money(totals.unbilledCents)} hint="ready to invoice" />
                </div>

                {matter.description && (
                    <Card className="p-4">
                        <h2 className="mb-1 text-sm font-semibold">Description</h2>
                        <p className="text-muted-foreground text-sm whitespace-pre-line">{matter.description}</p>
                    </Card>
                )}

                <div className="bg-muted flex flex-wrap gap-1 rounded-lg p-1">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={
                                tab === t.id
                                    ? 'bg-background rounded-md px-3 py-1.5 text-xs font-medium shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-xs font-medium'
                            }
                        >
                            {t.label}
                            {t.count !== undefined && <span className="ml-1.5 tabular-nums opacity-60">{t.count}</span>}
                        </button>
                    ))}
                </div>

                <Card className="gap-0 p-4">
                    {tab === 'timeline' && (
                        <>
                            <div className="mb-3 flex justify-between">
                                <h2 className="text-sm font-semibold">Timeline & notes</h2>
                                <Button size="sm" onClick={() => setEventOpen(true)}>
                                    <Plus className="size-4" /> Add entry
                                </Button>
                            </div>
                            {(matter.events?.length ?? 0) === 0 && (
                                <p className="text-muted-foreground py-6 text-center text-sm">Nothing recorded yet.</p>
                            )}
                            <ol className="flex flex-col gap-3 border-l pl-4">
                                {matter.events?.map((e) => (
                                    <li key={e.id} className="relative">
                                        <span className="bg-primary absolute top-1.5 -left-[1.42rem] size-2 rounded-full" />
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="text-sm font-medium">{e.title}</div>
                                                {e.body && <p className="text-muted-foreground mt-0.5 text-sm whitespace-pre-line">{e.body}</p>}
                                                <div className="text-muted-foreground mt-0.5 text-xs">
                                                    {dateTime(e.occurred_at)} · {e.kind} · {e.user?.name ?? 'system'}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => router.delete(`/matter-events/${e.id}`, { preserveScroll: true })}
                                            >
                                                <Trash2 className="size-3.5 text-rose-600" />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}

                    {tab === 'hearings' && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>When</TableHead>
                                    <TableHead>Court</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Outcome</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(matter.hearings?.length ?? 0) === 0 && <TableEmpty colSpan={5}>No hearings scheduled.</TableEmpty>}
                                {matter.hearings?.map((h) => (
                                    <TableRow key={h.id}>
                                        <TableCell className="whitespace-nowrap">{dateTime(h.scheduled_at)}</TableCell>
                                        <TableCell className="text-muted-foreground">{h.court?.name ?? '—'}</TableCell>
                                        <TableCell className="text-muted-foreground">{h.type ?? '—'}</TableCell>
                                        <TableCell className="text-muted-foreground max-w-xs truncate">{h.outcome ?? '—'}</TableCell>
                                        <TableCell>
                                            <StatusBadge value={h.status} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {tab === 'tasks' && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Due</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Done</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(matter.tasks?.length ?? 0) === 0 && <TableEmpty colSpan={5}>No tasks.</TableEmpty>}
                                {matter.tasks?.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell className={t.completed_at ? 'line-through opacity-60' : 'font-medium'}>{t.title}</TableCell>
                                        <TableCell className="text-muted-foreground">{t.assignee?.name ?? '—'}</TableCell>
                                        <TableCell>{date(t.due_on)}</TableCell>
                                        <TableCell>
                                            <StatusBadge value={t.priority} />
                                        </TableCell>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={!!t.completed_at}
                                                onChange={() => router.patch(`/tasks/${t.id}/toggle`, {}, { preserveScroll: true })}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {tab === 'documents' && (
                        <>
                            <div className="mb-3 flex justify-between">
                                <h2 className="text-sm font-semibold">Documents</h2>
                                <Button size="sm" onClick={() => setDocOpen(true)}>
                                    <Upload className="size-4" /> Upload
                                </Button>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Access</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(matter.documents?.length ?? 0) === 0 && <TableEmpty colSpan={5}>No documents.</TableEmpty>}
                                    {matter.documents?.map((d) => (
                                        <TableRow key={d.id}>
                                            <TableCell className="flex items-center gap-2 font-medium">
                                                <FileText className="text-muted-foreground size-4" />
                                                {d.title}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground capitalize">{d.confidentiality}</TableCell>
                                            <TableCell className="text-muted-foreground tabular-nums">{(d.size / 1024).toFixed(0)} KB</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {date(d.created_at)} · {d.uploader?.name ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <a href={`/documents/${d.id}/download`}>
                                                        <Download className="size-4" />
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        confirmAction({ title: 'Delete this document?' }).then(
                                                            (ok) => ok && router.delete(`/documents/${d.id}`, { preserveScroll: true }),
                                                        )
                                                    }
                                                >
                                                    <Trash2 className="size-4 text-rose-600" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </>
                    )}

                    {tab === 'time' && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Who</TableHead>
                                    <TableHead className="text-right">Time</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Billed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(matter.time_entries?.length ?? 0) === 0 && <TableEmpty colSpan={6}>No time logged.</TableEmpty>}
                                {matter.time_entries?.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell className="whitespace-nowrap">{date(e.worked_on)}</TableCell>
                                        <TableCell>{e.description}</TableCell>
                                        <TableCell className="text-muted-foreground">{e.user?.name}</TableCell>
                                        <TableCell className="text-right tabular-nums">{hours(e.minutes)}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {e.billable ? money(Math.round((e.minutes * e.rate_cents) / 60)) : '—'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">{e.invoice_id ? 'invoiced' : 'open'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {tab === 'team' && (
                        <>
                            <div className="mb-3 flex justify-between">
                                <h2 className="text-sm font-semibold">Team members</h2>
                                <Button size="sm" onClick={() => setTeamOpen(true)}>
                                    <Plus className="size-4" /> Add member
                                </Button>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(matter.team?.length ?? 0) === 0 && <TableEmpty colSpan={3}>Nobody assigned.</TableEmpty>}
                                    {matter.team?.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">{u.name}</TableCell>
                                            <TableCell className="text-muted-foreground capitalize">{u.pivot.role}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => router.delete(`/matters/${matter.id}/team/${u.id}`, { preserveScroll: true })}
                                                >
                                                    <Trash2 className="size-4 text-rose-600" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </>
                    )}
                </Card>
            </div>

            <FormDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                title={`Edit ${matter.reference}`}
                processing={edit.processing}
                wide
                onSubmit={(e) => {
                    e.preventDefault();
                    edit.put(`/matters/${matter.id}`, { onSuccess: () => setEditOpen(false), preserveScroll: true });
                }}
            >
                <TextField
                    label="Title"
                    value={edit.data.title}
                    onChange={(v) => edit.setData('title', v)}
                    error={edit.errors.title}
                    className="sm:col-span-2"
                />
                <SelectField
                    label="Client"
                    value={edit.data.client_id}
                    onChange={(v) => edit.setData('client_id', v)}
                    options={options.clients.map((c) => ({ value: c.id, label: c.name }))}
                    error={edit.errors.client_id}
                />
                <SelectField
                    label="Lead lawyer"
                    value={edit.data.lead_lawyer_id}
                    onChange={(v) => edit.setData('lead_lawyer_id', v)}
                    options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                    placeholder="Unassigned"
                />
                <SelectField
                    label="Court"
                    value={edit.data.court_id}
                    onChange={(v) => edit.setData('court_id', v)}
                    options={options.courts.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Not filed"
                />
                <TextField label="Judge" value={edit.data.judge} onChange={(v) => edit.setData('judge', v)} />
                <SelectField
                    label="Status"
                    value={edit.data.status}
                    onChange={(v) => edit.setData('status', v)}
                    options={options.statuses.map((s) => ({ value: s, label: s }))}
                />
                <SelectField
                    label="Priority"
                    value={edit.data.priority}
                    onChange={(v) => edit.setData('priority', v)}
                    options={options.priorities.map((p) => ({ value: p, label: p }))}
                />
                <TextField
                    label="Opened on"
                    type="date"
                    value={edit.data.opened_on}
                    onChange={(v) => edit.setData('opened_on', v)}
                    error={edit.errors.opened_on}
                />
                <TextField
                    label="Expected completion"
                    type="date"
                    value={edit.data.expected_completion}
                    onChange={(v) => edit.setData('expected_completion', v)}
                    error={edit.errors.expected_completion}
                />
                <TextField
                    label="Hourly rate"
                    type="number"
                    step="0.01"
                    value={edit.data.hourly_rate}
                    onChange={(v) => edit.setData('hourly_rate', v)}
                    error={edit.errors.hourly_rate}
                />
                <TextField label="Opposing party" value={edit.data.opposing_party} onChange={(v) => edit.setData('opposing_party', v)} />
                <TextareaField
                    label="Description"
                    value={edit.data.description}
                    onChange={(v) => edit.setData('description', v)}
                    className="sm:col-span-2"
                />
            </FormDialog>

            <FormDialog
                open={eventOpen}
                onOpenChange={setEventOpen}
                title="Add timeline entry"
                processing={event.processing}
                onSubmit={(e) => {
                    e.preventDefault();
                    event.post(`/matters/${matter.id}/events`, {
                        onSuccess: () => {
                            setEventOpen(false);
                            event.reset('title', 'body');
                        },
                        preserveScroll: true,
                    });
                }}
            >
                <SelectField
                    label="Kind"
                    value={event.data.kind}
                    onChange={(v) => event.setData('kind', v)}
                    options={[
                        { value: 'timeline', label: 'Timeline event' },
                        { value: 'note', label: 'Note' },
                    ]}
                />
                <TextField label="Title" value={event.data.title} onChange={(v) => event.setData('title', v)} error={event.errors.title} />
                <TextField
                    label="Occurred at"
                    type="datetime-local"
                    value={event.data.occurred_at}
                    onChange={(v) => event.setData('occurred_at', v)}
                    error={event.errors.occurred_at}
                />
                <TextareaField label="Details" value={event.data.body} onChange={(v) => event.setData('body', v)} />
            </FormDialog>

            <FormDialog
                open={docOpen}
                onOpenChange={setDocOpen}
                title="Upload document"
                processing={doc.processing}
                submitLabel="Upload"
                onSubmit={(e) => {
                    e.preventDefault();
                    doc.post(`/matters/${matter.id}/documents`, {
                        forceFormData: true,
                        onSuccess: () => {
                            setDocOpen(false);
                            doc.reset();
                        },
                        preserveScroll: true,
                    });
                }}
            >
                <TextField label="Title" value={doc.data.title} onChange={(v) => doc.setData('title', v)} error={doc.errors.title} />
                <SelectField
                    label="Confidentiality"
                    value={doc.data.confidentiality}
                    onChange={(v) => doc.setData('confidentiality', v)}
                    options={[
                        { value: 'internal', label: 'Internal' },
                        { value: 'confidential', label: 'Confidential' },
                        { value: 'public', label: 'Public' },
                        { value: 'restricted', label: 'Restricted' },
                    ]}
                />
                <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">File</Label>
                    <Input type="file" onChange={(e) => doc.setData('file', e.target.files?.[0] ?? null)} />
                    {doc.errors.file && <p className="text-xs text-rose-600">{doc.errors.file}</p>}
                    <p className="text-muted-foreground text-xs">PDF, Office, image or text. Max 20 MB.</p>
                </div>
            </FormDialog>

            <FormDialog
                open={teamOpen}
                onOpenChange={setTeamOpen}
                title="Add team member"
                processing={team.processing}
                onSubmit={(e) => {
                    e.preventDefault();
                    team.post(`/matters/${matter.id}/team`, { onSuccess: () => setTeamOpen(false), preserveScroll: true });
                }}
            >
                <SelectField
                    label="User"
                    value={team.data.user_id}
                    onChange={(v) => team.setData('user_id', v)}
                    options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                    placeholder="Select…"
                    error={team.errors.user_id}
                />
                <SelectField
                    label="Role"
                    value={team.data.role}
                    onChange={(v) => team.setData('role', v)}
                    options={[
                        { value: 'lead', label: 'Lead' },
                        { value: 'associate', label: 'Associate' },
                        { value: 'paralegal', label: 'Paralegal' },
                    ]}
                />
            </FormDialog>
        </AppLayout>
    );
}
