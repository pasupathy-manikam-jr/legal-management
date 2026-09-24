import { InitialsAvatar } from '@/components/avatar-stack';
import { confirmAction } from '@/components/confirm-dialog';
import { FormDialog, SelectField } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { MessageSquare, Plus, Search, Send, Trash2, User, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Communication', href: '/messages' }];

interface Row {
    id: number;
    name: string;
    label: string;
    contact_type: 'user' | 'client';
    preview: string | null;
    at: string | null;
    unread: number;
}

interface Thread {
    id: number;
    name: string;
    label: string;
    messages: { id: number; body: string; sender: 'firm' | 'contact'; author: string; at: string }[];
}

export default function Communication({
    conversations,
    filters,
    selected,
    contacts,
}: {
    conversations: Row[];
    filters: { search: string };
    selected: Thread | null;
    contacts: { users: { id: number; name: string }[]; clients: { id: number; name: string }[] };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [startOpen, setStartOpen] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const send = useForm({ body: '' });
    const start = useForm({ contact_type: 'user', contact_id: '' });

    // Keep the newest message in view when a thread opens or a reply lands.
    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'end' });
    }, [selected?.id, selected?.messages.length]);

    function openThread(id: number) {
        router.get('/messages', { conversation: id, search }, { preserveState: true, preserveScroll: true });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!selected || !send.data.body.trim()) return;

        send.post(`/messages/${selected.id}`, {
            preserveScroll: true,
            onSuccess: () => send.reset('body'),
        });
    }

    const options = start.data.contact_type === 'user' ? contacts.users : contacts.clients;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Communication" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Communication</h1>
                        <p className="text-muted-foreground text-xs">Manage and track conversations and communication history.</p>
                    </div>
                    <Button onClick={() => setStartOpen(true)}>
                        <Plus className="size-4" /> New conversation
                    </Button>
                </div>

                <div className="bg-muted/30 flex h-[calc(100vh-220px)] overflow-hidden rounded-xl border">
                    <aside className={cn('bg-card flex w-full flex-col border-r min-[1000px]:w-80', selected && 'hidden min-[1000px]:flex')}>
                        <div className="flex h-[65px] items-center border-b p-4">
                            <div className="relative w-full">
                                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    placeholder="Search conversations..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && router.get('/messages', { search }, { preserveState: true })}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {conversations.length === 0 && <p className="text-muted-foreground p-6 text-center text-sm">No conversations yet.</p>}
                            {conversations.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => openThread(c.id)}
                                    className={cn(
                                        'hover:bg-accent/50 flex w-full cursor-pointer items-center p-4 text-left transition-colors',
                                        selected?.id === c.id && 'bg-accent',
                                    )}
                                >
                                    <InitialsAvatar name={c.name} className="mr-3 size-10 shadow-sm" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                <h3 className="truncate text-sm font-medium">{c.name}</h3>
                                                <span className="flex h-5 shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium">
                                                    {c.contact_type === 'user' ? <Users className="size-3" /> : <User className="size-3" />}
                                                    {c.label}
                                                </span>
                                            </div>
                                            <span className="text-muted-foreground text-xs">{c.at ?? ''}</span>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between gap-2">
                                            <p className="text-muted-foreground flex-1 truncate text-sm">{c.preview ?? 'No messages yet.'}</p>
                                            {c.unread > 0 && (
                                                <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
                                                    {c.unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <section className="flex flex-1 flex-col">
                        {!selected && (
                            <div className="flex flex-1 items-center justify-center">
                                <div className="text-muted-foreground text-center">
                                    <MessageSquare className="mx-auto mb-4 size-16 opacity-50" />
                                    <p className="text-lg">Select a conversation to start messaging</p>
                                </div>
                            </div>
                        )}

                        {selected && (
                            <>
                                <header className="bg-card flex h-[65px] items-center gap-3 border-b px-4">
                                    <Button variant="ghost" size="sm" className="min-[1000px]:hidden" onClick={() => router.get('/messages')}>
                                        ‹
                                    </Button>
                                    <InitialsAvatar name={selected.name} className="size-9" />
                                    <div className="min-w-0 flex-1">
                                        <h2 className="truncate font-medium">{selected.name}</h2>
                                        <p className="text-muted-foreground text-xs">{selected.label}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground"
                                        title="Delete conversation"
                                        onClick={() =>
                                            confirmAction({ title: 'Delete this conversation and its messages?' }).then(
                                                (ok) => ok && router.delete(`/messages/${selected.id}`),
                                            )
                                        }
                                    >
                                        <Trash2 className="size-4 text-rose-600" />
                                    </Button>
                                </header>

                                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                                    {selected.messages.length === 0 && (
                                        <p className="text-muted-foreground py-10 text-center text-sm">Nothing sent yet.</p>
                                    )}
                                    {selected.messages.map((m) => {
                                        const outbound = m.sender === 'firm';

                                        return (
                                            <div key={m.id} className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
                                                <div
                                                    className={cn(
                                                        'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                                                        outbound ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card rounded-bl-sm',
                                                    )}
                                                >
                                                    <p className="whitespace-pre-line">{m.body}</p>
                                                    <p
                                                        className={cn(
                                                            'mt-1 text-[11px]',
                                                            outbound ? 'text-primary-foreground/70' : 'text-muted-foreground',
                                                        )}
                                                    >
                                                        {m.author} · {m.at}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={endRef} />
                                </div>

                                <form onSubmit={submit} className="bg-card flex items-center gap-2 border-t p-3">
                                    <Input
                                        placeholder="Write a message…"
                                        value={send.data.body}
                                        onChange={(e) => send.setData('body', e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit" disabled={send.processing || !send.data.body.trim()}>
                                        <Send className="size-4" /> Send
                                    </Button>
                                </form>
                            </>
                        )}
                    </section>
                </div>
            </div>

            <FormDialog
                open={startOpen}
                onOpenChange={setStartOpen}
                title="New conversation"
                processing={start.processing}
                submitLabel="Open"
                onSubmit={(e) => {
                    e.preventDefault();
                    start.post('/messages/start', { onSuccess: () => setStartOpen(false) });
                }}
            >
                <SelectField
                    label="Who"
                    value={start.data.contact_type}
                    onChange={(v) => start.setData({ ...start.data, contact_type: v, contact_id: '' })}
                    options={[
                        { value: 'user', label: 'Team member' },
                        { value: 'client', label: 'Client' },
                    ]}
                />
                <SelectField
                    label="Contact"
                    value={start.data.contact_id}
                    onChange={(v) => start.setData('contact_id', v)}
                    options={options.map((o) => ({ value: o.id, label: o.name }))}
                    placeholder="Select…"
                    error={start.errors.contact_id}
                />
            </FormDialog>
        </AppLayout>
    );
}
