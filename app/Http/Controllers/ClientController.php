<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Taxonomy;
use App\Models\TimeEntry;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['per_page' => ['nullable', 'integer', 'in:10,25,50,100']]);

        $filters = $request->only('search', 'type', 'status');
        $perPage = (int) ($request->input('per_page') ?: 10);

        return Inertia::render('clients/index', [
            'clients' => Client::withCount('matters')
                ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                    ->where('name', 'like', "%$s%")
                    ->orWhere('company', 'like', "%$s%")
                    ->orWhere('email', 'like', "%$s%")
                    ->orWhere('phone', 'like', "%$s%")))
                ->when($filters['type'] ?? null, fn ($q, $v) => $q->where('type', $v))
                ->when(($filters['status'] ?? null) === 'active', fn ($q) => $q->where('active', true))
                ->when(($filters['status'] ?? null) === 'inactive', fn ($q) => $q->where('active', false))
                ->orderBy('name')
                ->paginate($perPage)
                ->withQueryString(),
            'filters' => $filters,
            'perPage' => $perPage,
            'options' => [
                'types' => Taxonomy::names('client_type') ?: ['Individual', 'Corporate'],
                'statuses' => ['active', 'inactive'],
            ],
        ]);
    }

    public function show(Client $client)
    {
        $client->load([
            'matters' => fn ($q) => $q->with('court')->latest('opened_on'),
            'invoices' => fn ($q) => $q->latest('issued_on'),
            'messages' => fn ($q) => $q->with('user')->latest('occurred_at')->limit(10),
        ]);

        $billedCents = (int) TimeEntry::whereIn('matter_id', $client->matters->pluck('id'))
            ->where('billable', true)
            ->get()
            ->sum(fn ($e) => $e->amountCents());

        return Inertia::render('clients/show', [
            'client' => $client,
            'totals' => [
                'openCases' => $client->matters->where('status', '!=', 'closed')->count(),
                'billedCents' => $billedCents,
                'invoicedCents' => (int) $client->invoices->where('status', '!=', 'void')->sum(fn ($i) => $i->totalCents()),
                'outstandingCents' => (int) $client->invoices->where('status', '!=', 'void')->sum(fn ($i) => $i->balanceCents()),
            ],
            'options' => ['types' => Taxonomy::names('client_type') ?: ['Individual', 'Corporate']],
        ]);
    }

    public function store(Request $request)
    {
        Client::create($this->validated($request));

        return back()->with('success', 'Client added.');
    }

    public function update(Request $request, Client $client)
    {
        $client->update($this->validated($request));

        return back()->with('success', 'Client updated.');
    }

    /** Row action: archive a client without deleting their case history. */
    public function toggleStatus(Client $client)
    {
        $client->update(['active' => ! $client->active]);

        return back()->with('success', $client->active ? 'Client reactivated.' : 'Client archived.');
    }

    public function destroy(Client $client)
    {
        $client->delete();

        return back()->with('success', 'Client deleted.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'active' => ['required', 'boolean'],
        ]);
    }
}
