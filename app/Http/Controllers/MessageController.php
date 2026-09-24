<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['conversation' => ['nullable', 'integer']]);

        $owner = $request->user();
        $search = $request->string('search')->toString();

        $conversations = Conversation::where('owner_id', $owner->id)
            ->with(['messages' => fn ($q) => $q->latest('occurred_at')->limit(1)])
            ->orderByDesc('last_message_at')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->contactName(),
                'label' => $c->contactLabel(),
                'contact_type' => $c->contact_type,
                'preview' => $c->messages->first()?->body,
                'at' => $c->last_message_at?->format('H:i'),
                'unread' => $c->unreadCount(),
            ])
            ->when($search !== '', fn ($rows) => $rows->filter(
                fn ($row) => str_contains(strtolower($row['name']), strtolower($search))
                    || str_contains(strtolower($row['preview'] ?? ''), strtolower($search))
            )->values());

        $selected = $request->filled('conversation')
            ? Conversation::where('owner_id', $owner->id)->find($request->integer('conversation'))
            : null;

        // Opening a thread marks what the contact sent as read.
        if ($selected) {
            $selected->messages()->where('sender', 'contact')->whereNull('read_at')->update(['read_at' => now()]);
        }

        return Inertia::render('communication/index', [
            'conversations' => $conversations,
            'filters' => ['search' => $search],
            'selected' => $selected ? [
                'id' => $selected->id,
                'name' => $selected->contactName(),
                'label' => $selected->contactLabel(),
                'messages' => $selected->messages()->with('user')->orderBy('occurred_at')->get()->map(fn ($m) => [
                    'id' => $m->id,
                    'body' => $m->body,
                    'sender' => $m->sender,
                    'author' => $m->sender === 'firm' ? ($m->user?->name ?? 'Firm') : $selected->contactName(),
                    'at' => $m->occurred_at->format('Y-m-d H:i'),
                ]),
            ] : null,
            // Anyone the firm can start a thread with, minus threads that already exist.
            'contacts' => [
                'users' => User::where('active', true)->where('id', '!=', $owner->id)->orderBy('name')->get(['id', 'name']),
                'clients' => Client::where('active', true)->orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }

    /** Open (or create) the thread with one contact. */
    public function start(Request $request)
    {
        $data = $request->validate([
            'contact_type' => ['required', Rule::in(['user', 'client'])],
            'contact_id' => ['required', 'integer'],
        ]);

        $exists = $data['contact_type'] === 'user'
            ? User::whereKey($data['contact_id'])->exists()
            : Client::whereKey($data['contact_id'])->exists();

        abort_unless($exists, 404);

        $conversation = Conversation::firstOrCreate([
            'owner_id' => $request->user()->id,
            'contact_type' => $data['contact_type'],
            'contact_id' => $data['contact_id'],
        ]);

        return redirect()->route('messages.index', ['conversation' => $conversation->id]);
    }

    public function store(Request $request, Conversation $conversation)
    {
        abort_unless($conversation->owner_id === $request->user()->id, 403);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:20000'],
            'sender' => ['nullable', Rule::in(['firm', 'contact'])],
        ]);

        $sender = $data['sender'] ?? 'firm';

        $conversation->messages()->create([
            // Client threads keep the client link so the profile page can still show them.
            'client_id' => $conversation->contact_type === 'client' ? $conversation->contact_id : null,
            'user_id' => $request->user()->id,
            'sender' => $sender,
            'direction' => $sender === 'firm' ? 'outbound' : 'inbound',
            'channel' => 'portal',
            'body' => $data['body'],
            'occurred_at' => now(),
            'read_at' => $sender === 'firm' ? now() : null,
        ]);

        $conversation->update(['last_message_at' => now()]);

        return back();
    }

    public function destroy(Request $request, Conversation $conversation)
    {
        abort_unless($conversation->owner_id === $request->user()->id, 403);

        $conversation->delete();

        return redirect()->route('messages.index')->with('success', 'Conversation deleted.');
    }
}
