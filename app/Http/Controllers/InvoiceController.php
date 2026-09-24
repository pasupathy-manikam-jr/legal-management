<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Matter;
use App\Models\Setting;
use App\Models\TimeEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(['draft', 'sent', 'paid', 'overdue', 'void'])],
            'client' => ['nullable', 'exists:clients,id'],
            'sort' => ['nullable', 'in:number,issued_on,due_on'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'client', 'status');
        $status = $filters['status'] ?? null;
        $perPage = (int) ($request->input('per_page') ?: 10);
        $sort = $request->string('sort')->toString() ?: 'issued_on';
        $direction = $request->string('direction')->toString() ?: 'desc';

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => Invoice::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('number', 'like', "%$v%")
                ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%$v%")->orWhere('email', 'like', "%$v%"))
                ->orWhereHas('matter', fn ($m) => $m->where('reference', 'like', "%$v%"))))
            ->when($filters['client'] ?? null, fn ($q, $v) => $q->where('client_id', $v));

        $overdue = $matching()->overdue()->count();

        return Inertia::render('invoices/index', [
            'invoices' => $matching()
                ->when($status === 'overdue', fn ($q) => $q->overdue())
                // Sent means issued and not yet late; the late ones stand on their own tab.
                ->when($status === 'sent', fn ($q) => $q->where('status', 'sent')->whereNot(fn ($w) => $w->overdue()))
                ->when(in_array($status, ['draft', 'paid', 'void'], true), fn ($q) => $q->where('status', $status))
                ->with('client:id,name,email', 'matter:id,reference')
                ->orderBy($sort, $direction)
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (Invoice $invoice) => [
                    'id' => $invoice->id,
                    'number' => $invoice->number,
                    'state' => $invoice->state(),
                    'total_cents' => $invoice->totalCents(),
                    'balance_cents' => $invoice->balanceCents(),
                    'issued_on' => $invoice->issued_on?->toDateString(),
                    'due_on' => $invoice->due_on?->toDateString(),
                    'client_id' => $invoice->client_id,
                    'client' => $invoice->client?->name,
                    'client_email' => $invoice->client?->email,
                    'matter' => $invoice->matter?->reference,
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'sort' => ['column' => $sort, 'direction' => $direction],
            'counts' => [
                'all' => $matching()->count(),
                'draft' => $matching()->where('status', 'draft')->count(),
                'sent' => $matching()->where('status', 'sent')->count() - $overdue,
                'paid' => $matching()->where('status', 'paid')->count(),
                'overdue' => $overdue,
                'void' => $matching()->where('status', 'void')->count(),
            ],
            'options' => [
                'matters' => Matter::with('client')->orderBy('reference')->get()
                    ->map(fn ($m) => [
                        'id' => $m->id,
                        'label' => "{$m->reference} — {$m->title}",
                        'client_id' => $m->client_id,
                        'unbilled' => $m->timeEntries()->where('billable', true)->whereNull('invoice_id')->count(),
                    ]),
                'clients' => Client::orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }

    public function show(Invoice $invoice)
    {
        $invoice->load('client', 'matter', 'payments', 'timeEntries.user');

        return Inertia::render('invoices/show', [
            'invoice' => $invoice,
            'lines' => $invoice->timeEntries->map(fn ($e) => [
                'id' => $e->id,
                'worked_on' => $e->worked_on->toDateString(),
                'description' => $e->description,
                'user' => $e->user->name,
                'minutes' => $e->minutes,
                'rate_cents' => $e->rate_cents,
                'amount_cents' => $e->amountCents(),
            ]),
            'totals' => [
                'total_cents' => $invoice->totalCents(),
                'balance_cents' => $invoice->balanceCents(),
            ],
            'payTo' => Setting::get('bank_transfer_enabled') === '1' ? Setting::get('bank_transfer_details') : null,
            'invoiceFooter' => Setting::get('invoice_footer'),
        ]);
    }

    /**
     * Bill every unbilled billable entry on a matter. The select-and-claim runs in one
     * transaction so two people hitting "generate" can't put the same entry on two invoices.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'matter_id' => ['required', 'exists:matters,id'],
            'issued_on' => ['required', 'date'],
            'due_on' => ['required', 'date', 'after_or_equal:issued_on'],
            'tax_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $invoice = DB::transaction(function () use ($data) {
            $matter = Matter::lockForUpdate()->findOrFail($data['matter_id']);

            $entries = TimeEntry::where('matter_id', $matter->id)
                ->where('billable', true)
                ->whereNull('invoice_id')
                ->lockForUpdate()
                ->get();

            if ($entries->isEmpty()) {
                return null;
            }

            $subtotal = (int) $entries->sum(fn ($e) => $e->amountCents());

            $invoice = Invoice::create([
                'client_id' => $matter->client_id,
                'matter_id' => $matter->id,
                'number' => Invoice::nextNumber(),
                'issued_on' => $data['issued_on'],
                'due_on' => $data['due_on'],
                'status' => 'draft',
                'subtotal_cents' => $subtotal,
                'tax_cents' => (int) round($subtotal * $data['tax_percent'] / 100),
                'notes' => $data['notes'] ?? null,
            ]);

            TimeEntry::whereIn('id', $entries->pluck('id'))->update(['invoice_id' => $invoice->id]);

            return $invoice;
        });

        if (! $invoice) {
            return back()->withErrors(['matter_id' => 'That case has no unbilled time to invoice.']);
        }

        return redirect()->route('invoices.show', $invoice)->with('success', "Invoice {$invoice->number} created.");
    }

    public function update(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'status' => ['required', 'in:draft,sent,paid,void'],
            'due_on' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        // Voiding releases the time entries so they can be billed again.
        if ($data['status'] === 'void' && $invoice->status !== 'void') {
            DB::transaction(function () use ($invoice, $data) {
                $invoice->timeEntries()->update(['invoice_id' => null]);
                $invoice->update($data);
            });

            return back()->with('success', 'Invoice voided; its time is unbilled again.');
        }

        $invoice->update($data);

        return back()->with('success', 'Invoice updated.');
    }

    /** The paper plane in a row: a draft becomes an issued invoice. */
    public function send(Invoice $invoice)
    {
        abort_unless($invoice->status === 'draft', 422);

        $invoice->update(['status' => 'sent']);

        return back()->with('success', "Invoice {$invoice->number} marked as sent.");
    }

    public function destroy(Invoice $invoice)
    {
        DB::transaction(function () use ($invoice) {
            $invoice->timeEntries()->update(['invoice_id' => null]);
            $invoice->delete();
        });

        return redirect()->route('invoices.index')->with('success', 'Invoice deleted.');
    }
}
