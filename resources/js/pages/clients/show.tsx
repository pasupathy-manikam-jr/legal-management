import { InitialsAvatar } from '@/components/avatar-stack';
import { StatCard } from '@/components/stat-card';
import { RingPill, TonePill } from '@/components/tone-pill';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { date, dateTime, money } from '@/lib/format';
import type { BreadcrumbItem, Client, Invoice, Matter } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Briefcase, Building2, Mail, MapPin, Phone, Receipt, Wallet } from 'lucide-react';

interface Message {
    id: number;
    subject: string;
    body: string;
    channel: string;
    direction: string;
    occurred_at: string;
    user?: { name: string } | null;
}

type FullClient = Client & { matters?: Matter[]; invoices?: Invoice[]; messages?: Message[] };

const STATUS_COLOR: Record<string, string> = { open: '#6b7280', pending: '#f59e0b', closed: '#f97316' };

export default function ClientShow({
    client,
    totals,
}: {
    client: FullClient;
    totals: { openCases: number; billedCents: number; invoicedCents: number; outstandingCents: number };
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Clients', href: '/clients' },
        { title: client.name, href: `/clients/${client.id}` },
    ];

    const active = client.active ?? true;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={client.name} />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <InitialsAvatar name={client.name} className="size-14 text-lg" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-semibold">{client.name}</h1>
                                <RingPill value={active ? 'active' : 'inactive'} label={active ? 'Active' : 'Inactive'} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {client.type ?? 'Client'}
                                {client.company && ` · ${client.company}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.patch(`/clients/${client.id}/toggle-status`, {}, { preserveScroll: true })}>
                            {active ? 'Archive' : 'Reactivate'}
                        </Button>
                        <Button asChild>
                            <Link href="/clients">Back to clients</Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Open cases" value={totals.openCases} icon={Briefcase} hint={`${client.matters?.length ?? 0} total`} />
                    <StatCard label="Billed time" value={money(totals.billedCents)} icon={Wallet} />
                    <StatCard label="Invoiced" value={money(totals.invoicedCents)} icon={Receipt} />
                    <StatCard label="Outstanding" value={money(totals.outstandingCents)} icon={Receipt} />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="gap-0 p-5">
                        <h2 className="mb-3 text-sm font-semibold">Contact</h2>
                        <dl className="flex flex-col gap-3 text-sm">
                            <Detail icon={Mail} label="Email" value={client.email} />
                            <Detail icon={Phone} label="Phone" value={client.phone} />
                            <Detail icon={Building2} label="Company" value={client.company} />
                            <Detail icon={MapPin} label="Address" value={client.address} />
                        </dl>
                        {client.notes && (
                            <>
                                <h2 className="mt-5 mb-2 text-sm font-semibold">Notes</h2>
                                <p className="text-sm whitespace-pre-line text-muted-foreground">{client.notes}</p>
                            </>
                        )}
                    </Card>

                    <Card className="gap-0 p-0 lg:col-span-2">
                        <h2 className="border-b px-5 py-4 text-sm font-semibold">Cases</h2>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ref</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Court</TableHead>
                                    <TableHead>Opened</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(client.matters?.length ?? 0) === 0 && <TableEmpty colSpan={5}>No cases yet.</TableEmpty>}
                                {client.matters?.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-mono text-xs">{m.reference}</TableCell>
                                        <TableCell>
                                            <Link href={`/matters/${m.id}`} className="font-medium hover:underline">
                                                {m.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{m.court?.name ?? '—'}</TableCell>
                                        <TableCell className="whitespace-nowrap">{date(m.opened_on)}</TableCell>
                                        <TableCell>
                                            <TonePill color={STATUS_COLOR[m.status] ?? '#6b7280'}>
                                                <span className="capitalize">{m.status}</span>
                                            </TonePill>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="gap-0 p-0">
                        <h2 className="border-b px-5 py-4 text-sm font-semibold">Invoices</h2>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Number</TableHead>
                                    <TableHead>Issued</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(client.invoices?.length ?? 0) === 0 && <TableEmpty colSpan={4}>Nothing invoiced.</TableEmpty>}
                                {client.invoices?.map((i) => (
                                    <TableRow key={i.id}>
                                        <TableCell className="font-mono text-xs">
                                            <Link href={`/invoices/${i.id}`} className="font-medium hover:underline">
                                                {i.number}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{date(i.issued_on)}</TableCell>
                                        <TableCell className="text-right font-mono tabular-nums">{money(i.subtotal_cents + i.tax_cents)}</TableCell>
                                        <TableCell className="text-xs capitalize text-muted-foreground">{i.status}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                    <Card className="gap-0 p-0">
                        <h2 className="border-b px-5 py-4 text-sm font-semibold">Recent communication</h2>
                        <div className="flex flex-col">
                            {(client.messages?.length ?? 0) === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nothing logged.</p>}
                            {client.messages?.map((m) => (
                                <div key={m.id} className="border-b px-5 py-3 last:border-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">{m.subject}</span>
                                        <span className="text-xs text-muted-foreground">{dateTime(m.occurred_at)}</span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        <span className="capitalize">{m.direction}</span> · <span className="capitalize">{m.channel}</span>
                                        {m.user && ` · ${m.user.name}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value?: string | null }) {
    return (
        <div className="flex items-start gap-2.5">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="whitespace-pre-line">{value || '—'}</dd>
            </div>
        </div>
    );
}
