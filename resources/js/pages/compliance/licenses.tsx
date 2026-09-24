import { confirmAction } from '@/components/confirm-dialog';
import { DataTableFooter } from '@/components/data-table-footer';
import { Dropdown } from '@/components/dropdown';
import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { CountTabs } from '@/components/page-toolbar';
import { SummaryCard } from '@/components/summary-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Paginated, User } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Award,
    Building2,
    CircleCheck,
    Eye,
    Hash,
    LayoutGrid,
    MapPin,
    Plus,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldOff,
    SquarePen,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Professional Licenses', href: '/compliance/professional-licenses' }];

interface License {
    id: number;
    type: string;
    number: string | null;
    jurisdiction: string | null;
    issued_on: string | null;
    expires_on: string | null;
    days_to_expiry: number | null;
    status: string;
    state: string;
    notes: string | null;
    user_id: number | null;
    holder: string | null;
    regulatory_body_id: number | null;
    body: string | null;
}

/** The wax-seal stamp each card wears, top right. */
const STAMP: Record<string, { label: string; sub: string; icon: ComponentType<{ className?: string }>; tone: string; text: string }> = {
    active: {
        label: 'ACTIVE',
        sub: 'VERIFIED',
        icon: CircleCheck,
        tone: 'border-emerald-600 bg-emerald-100/40 dark:border-emerald-400 dark:bg-emerald-950/40',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    expired: {
        label: 'EXPIRED',
        sub: 'INVALID',
        icon: TriangleAlert,
        tone: 'border-red-600 bg-red-100/40 dark:border-red-400 dark:bg-red-950/40',
        text: 'text-red-600 dark:text-red-400',
    },
    suspended: {
        label: 'SUSPND',
        sub: 'ON HOLD',
        icon: ShieldAlert,
        tone: 'border-red-600 bg-red-100/40 dark:border-red-400 dark:bg-red-950/40',
        text: 'text-red-600 dark:text-red-400',
    },
    revoked: {
        label: 'REVOKE',
        sub: 'INVALID',
        icon: ShieldOff,
        tone: 'border-red-600 bg-red-100/40 dark:border-red-400 dark:bg-red-950/40',
        text: 'text-red-600 dark:text-red-400',
    },
};

/** "1 Year", "3 Years", "4y 2m" — how long the licence was granted for. */
function term(issued: string | null, expires: string | null): string {
    if (!issued || !expires) return 'No term';

    const from = new Date(issued);
    const to = new Date(expires);
    const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    const years = Math.floor(months / 12);
    const rest = months % 12;

    if (rest === 0) return years === 1 ? '1 Year' : `${years} Years`;

    return years === 0 ? `${rest}m` : `${years}y ${rest}m`;
}

/** How much of the term has been used, 0-100. */
function elapsed(issued: string | null, expires: string | null): number {
    if (!issued || !expires) return 0;

    const from = new Date(issued).getTime();
    const to = new Date(expires).getTime();

    if (to <= from) return 100;

    return Math.min(100, Math.max(0, ((Date.now() - from) / (to - from)) * 100));
}

const empty = () => ({
    user_id: '',
    regulatory_body_id: '',
    type: '',
    number: '',
    jurisdiction: '',
    issued_on: '',
    expires_on: '',
    status: 'active',
    notes: '',
});

const initials = (name: string) =>
    name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

export default function ProfessionalLicenses({
    licenses,
    filters,
    perPage,
    counts,
    renewalWindow,
    options,
}: {
    licenses: Paginated<License>;
    filters: Record<string, string>;
    perPage: number;
    counts: Record<string, number>;
    renewalWindow: number;
    options: { users: User[]; bodies: { id: number; name: string }[]; statuses: string[]; types: string[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<License | null>(null);
    const [viewing, setViewing] = useState<License | null>(null);
    const form = useForm(empty());

    const apply = (patch: Record<string, string | number>) =>
        router.get('/compliance/professional-licenses', { ...filters, per_page: perPage, ...patch }, { preserveState: true, replace: true });

    function openCreate() {
        form.setData(empty());
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(l: License) {
        form.setData({
            user_id: l.user_id ? String(l.user_id) : '',
            regulatory_body_id: l.regulatory_body_id ? String(l.regulatory_body_id) : '',
            type: l.type,
            number: l.number ?? '',
            jurisdiction: l.jurisdiction ?? '',
            issued_on: l.issued_on ?? '',
            expires_on: l.expires_on ?? '',
            status: l.status,
            notes: l.notes ?? '',
        });
        form.clearErrors();
        setEditing(l);
        setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const done = { onSuccess: () => setOpen(false), preserveScroll: true };
        if (editing) {
            form.put(`/compliance/professional-licenses/${editing.id}`, done);
        } else {
            form.post('/compliance/professional-licenses', done);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Professional Licenses" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Professional Licenses</h1>
                        <p className="text-muted-foreground text-xs">Manage and monitor staff professional licenses and expiry dates.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" /> Add License
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <SummaryCard label="Total" value={counts.all ?? 0} icon={Award} tone="gray" mono={false} />
                    <SummaryCard label="Active" value={counts.active ?? 0} icon={CircleCheck} tone="emerald" mono={false} />
                    <SummaryCard label="Expired" value={counts.expired ?? 0} icon={TriangleAlert} tone="amber" mono={false} />
                    <SummaryCard label="Suspended" value={counts.suspended ?? 0} icon={ShieldAlert} tone="red" mono={false} />
                    <SummaryCard label="Revoked" value={counts.revoked ?? 0} icon={ShieldOff} tone="red" mono={false} />
                </div>

                <div className="bg-card rounded-lg border shadow-sm">
                    <div className="flex min-w-0 items-center gap-2 p-3">
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

                        <Dropdown
                            value={filters.holder ?? ''}
                            onChange={(v) => apply({ holder: v })}
                            placeholder="All Members"
                            options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                            className="h-9 w-40"
                            aria-label="Member filter"
                        />
                    </div>

                    <CountTabs
                        value={filters.state ?? ''}
                        onSelect={(v) => apply({ state: v })}
                        options={[
                            { value: '', label: 'All', icon: LayoutGrid, count: counts.all ?? 0 },
                            { value: 'active', label: 'Active', icon: CircleCheck, count: counts.active ?? 0 },
                            { value: 'expired', label: 'Expired', icon: TriangleAlert, count: counts.expired ?? 0 },
                            { value: 'suspended', label: 'Suspended', icon: ShieldAlert, count: counts.suspended ?? 0 },
                            { value: 'revoked', label: 'Revoked', icon: ShieldOff, count: counts.revoked ?? 0 },
                        ]}
                    />
                </div>

                {licenses.data.length === 0 ? (
                    <div className="bg-card text-muted-foreground rounded-lg border py-16 text-center text-sm shadow-sm">
                        No licences match this view.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {licenses.data.map((l) => (
                            <LicenseCard
                                key={l.id}
                                license={l}
                                renewalWindow={renewalWindow}
                                onView={() => setViewing(l)}
                                onEdit={() => openEdit(l)}
                            />
                        ))}
                    </div>
                )}

                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <DataTableFooter
                        from={licenses.from}
                        to={licenses.to}
                        total={licenses.total}
                        links={licenses.links}
                        perPage={perPage}
                        sizes={[12, 24, 48, 96]}
                        onPerPage={(value) => apply({ per_page: value })}
                    />
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={editing ? 'Edit License' : 'Add License'}
                    onSubmit={submit}
                    processing={form.processing}
                    submitLabel={editing ? 'Save' : 'Add License'}
                    wide
                >
                    <TextField
                        label="Licence type"
                        value={form.data.type}
                        onChange={(v) => form.setData('type', v)}
                        error={form.errors.type}
                        list="license-types"
                        placeholder="Bar License"
                        className="sm:col-span-2"
                    />
                    <datalist id="license-types">
                        {options.types.map((t) => (
                            <option key={t} value={t} />
                        ))}
                    </datalist>
                    <TextField
                        label="Licence number"
                        value={form.data.number}
                        onChange={(v) => form.setData('number', v)}
                        error={form.errors.number}
                    />
                    <SelectField
                        label="Holder"
                        value={form.data.user_id}
                        onChange={(v) => form.setData('user_id', v)}
                        options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                        placeholder="Unassigned"
                        error={form.errors.user_id}
                    />
                    <SelectField
                        label="Issuing authority"
                        value={form.data.regulatory_body_id}
                        onChange={(v) => form.setData('regulatory_body_id', v)}
                        options={options.bodies.map((b) => ({ value: b.id, label: b.name }))}
                        placeholder="—"
                        error={form.errors.regulatory_body_id}
                    />
                    <TextField
                        label="Jurisdiction"
                        value={form.data.jurisdiction}
                        onChange={(v) => form.setData('jurisdiction', v)}
                        error={form.errors.jurisdiction}
                    />
                    <TextField
                        label="Issued"
                        type="date"
                        value={form.data.issued_on}
                        onChange={(v) => form.setData('issued_on', v)}
                        error={form.errors.issued_on}
                    />
                    <TextField
                        label="Expires"
                        type="date"
                        value={form.data.expires_on}
                        onChange={(v) => form.setData('expires_on', v)}
                        error={form.errors.expires_on}
                    />
                    <SelectField
                        label="Status"
                        value={form.data.status}
                        onChange={(v) => form.setData('status', v)}
                        options={options.statuses.map((s) => ({ value: s, label: s }))}
                        error={form.errors.status}
                    />
                    <TextareaField label="Notes" value={form.data.notes} onChange={(v) => form.setData('notes', v)} className="sm:col-span-2" />
                </FormDialog>

                <Dialog open={!!viewing} onOpenChange={(next) => !next && setViewing(null)}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{viewing?.type}</DialogTitle>
                        </DialogHeader>
                        {viewing && (
                            <div className="space-y-4 text-sm">
                                <dl className="grid grid-cols-2 gap-3">
                                    <Detail label="Holder" value={viewing.holder ?? 'Unassigned'} />
                                    <Detail label="Licence number" value={viewing.number ?? '—'} />
                                    <Detail label="Authority" value={viewing.body ?? '—'} />
                                    <Detail label="Jurisdiction" value={viewing.jurisdiction ?? '—'} />
                                    <Detail label="Issued" value={date(viewing.issued_on)} />
                                    <Detail label="Expires" value={date(viewing.expires_on)} />
                                    <Detail label="Term" value={term(viewing.issued_on, viewing.expires_on)} />
                                    <Detail label="State" value={viewing.state} />
                                </dl>
                                {viewing.notes && (
                                    <div>
                                        <p className="text-muted-foreground mb-1 text-xs">Notes</p>
                                        <p className="whitespace-pre-line">{viewing.notes}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

function LicenseCard({
    license: l,
    renewalWindow,
    onView,
    onEdit,
}: {
    license: License;
    renewalWindow: number;
    onView: () => void;
    onEdit: () => void;
}) {
    const stamp = STAMP[l.state] ?? STAMP.active;
    const Icon = stamp.icon;
    const used = elapsed(l.issued_on, l.expires_on);
    const expired = l.state === 'expired';
    const dueSoon = !expired && l.days_to_expiry !== null && l.days_to_expiry <= renewalWindow;

    return (
        <div className="group bg-card flex flex-col overflow-hidden rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between gap-2 border-b px-4 pt-4 pb-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm leading-tight font-semibold" title={l.type}>
                        {l.type}
                    </p>
                    {l.number && (
                        <div className="mt-0.5 flex items-center gap-1">
                            <Hash className="text-muted-foreground size-3 shrink-0" />
                            <p className="text-muted-foreground truncate font-mono text-[11px]">{l.number}</p>
                        </div>
                    )}
                </div>

                <div
                    className={cn(
                        'flex size-14 shrink-0 rotate-[-12deg] items-center justify-center rounded-full border-2 p-0.5 shadow-sm select-none',
                        stamp.tone,
                    )}
                >
                    <div
                        className={cn(
                            'bg-background/60 flex h-full w-full flex-col items-center justify-center rounded-full border border-dashed p-1 text-center',
                            stamp.tone,
                        )}
                    >
                        <div className={cn('flex items-center gap-0.5', stamp.text)}>
                            <span className="text-[6px]">★</span>
                            <Icon className="size-3" />
                            <span className="text-[6px]">★</span>
                        </div>
                        <span className={cn('mt-0.5 text-[8px] leading-none font-black tracking-widest uppercase', stamp.text)}>{stamp.label}</span>
                        <span className={cn('mt-0.5 text-[6px] leading-none font-bold tracking-tighter uppercase opacity-80', stamp.text)}>
                            {stamp.sub}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-3 px-4 pt-3 pb-4">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                        <Building2 className="text-muted-foreground size-3.5 shrink-0" />
                        <span className="truncate text-xs" title={l.body ?? undefined}>
                            {l.body ?? 'No authority recorded'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <MapPin className="text-muted-foreground size-3.5 shrink-0" />
                        <span className="truncate text-xs" title={l.jurisdiction ?? undefined}>
                            {l.jurisdiction ?? '—'}
                        </span>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px] font-medium">{term(l.issued_on, l.expires_on)}</span>
                        <span
                            className={cn(
                                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                                expired
                                    ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300'
                                    : dueSoon
                                      ? 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-muted text-muted-foreground ring-border',
                            )}
                        >
                            {expired ? 'Expired' : l.days_to_expiry === null ? 'No expiry' : `${l.days_to_expiry}d left`}
                        </span>
                    </div>

                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all',
                                expired ? 'bg-red-500' : used < 50 ? 'bg-emerald-500' : used < 75 ? 'bg-yellow-500' : 'bg-orange-500',
                            )}
                            style={{ width: `${expired ? 100 : used}%` }}
                        />
                    </div>

                    <div className="text-muted-foreground flex items-center justify-between text-[10px]">
                        <span>{l.issued_on ?? '—'}</span>
                        <span className={expired ? 'text-red-500' : ''}>{l.expires_on ?? '—'}</span>
                    </div>
                </div>
            </div>

            <div className="bg-muted/40 mt-auto flex items-center justify-between gap-2 border-t px-4 py-3">
                <Avatar className="ring-background size-7 shrink-0 ring-2" title={l.holder ?? 'Unassigned'}>
                    <AvatarFallback className="text-[10px]">{l.holder ? initials(l.holder) : '—'}</AvatarFallback>
                </Avatar>

                <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="text-muted-foreground size-7" title="View" onClick={onView}>
                        <Eye className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground size-7" title="Edit" onClick={onEdit}>
                        <SquarePen className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground size-7"
                        title="Renew for another term"
                        onClick={() => router.patch(`/compliance/professional-licenses/${l.id}/renew`, {}, { preserveScroll: true })}
                    >
                        <RefreshCw className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground size-7"
                        title="Delete"
                        onClick={() =>
                            confirmAction({ title: `Delete ${l.type}?` }).then(
                                (ok) => ok && router.delete(`/compliance/professional-licenses/${l.id}`, { preserveScroll: true }),
                            )
                        }
                    >
                        <Trash2 className="size-3.5 text-rose-600" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-muted-foreground mb-1 text-xs">{label}</dt>
            <dd className="capitalize">{value}</dd>
        </div>
    );
}
