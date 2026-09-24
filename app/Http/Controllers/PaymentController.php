<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PaymentController extends Controller
{
    /** How a payment reached the firm. Stored as a plain string on the payments table. */
    public const METHODS = ['cash', 'cheque', 'card', 'bank', 'online'];

    public function index(Request $request)
    {
        $request->validate([
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
            'method' => ['nullable', Rule::in(self::METHODS)],
        ]);

        $filters = $request->only('search', 'invoice', 'method');
        $perPage = (int) ($request->input('per_page') ?: 10);

        // Rebuilt per use: the counts must not inherit the paginator's eager loads or ordering.
        $matching = fn () => Payment::query()
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('reference', 'like', "%$s%")
                ->orWhereHas('invoice', fn ($i) => $i
                    ->where('number', 'like', "%$s%")
                    ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")))))
            ->when($filters['invoice'] ?? null, fn ($q, $v) => $q->where('invoice_id', $v));

        return Inertia::render('payments/index', [
            'payments' => $matching()
                ->with('invoice.client')
                ->when($filters['method'] ?? null, fn ($q, $v) => $q->where('method', $v))
                ->latest('paid_on')
                ->latest('id')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (Payment $p) => [
                    'id' => $p->id,
                    'invoice_id' => $p->invoice_id,
                    'invoice_number' => $p->invoice?->number,
                    'client_name' => $p->invoice?->client?->name ?? '—',
                    'client_email' => $p->invoice?->client?->email,
                    'amount_cents' => $p->amount_cents,
                    'method' => $p->method,
                    'paid_on' => $p->paid_on->toDateString(),
                    'reference' => $p->reference,
                ]),
            // Tab counts describe the search, not the method tab currently selected.
            'counts' => ['all' => $matching()->count()] + $matching()
                ->selectRaw('method, count(*) as total')
                ->groupBy('method')
                ->pluck('total', 'method')
                ->all(),
            'totals' => ['receivedCents' => (int) $matching()->sum('amount_cents')],
            'filters' => $filters,
            'perPage' => $perPage,
            'options' => [
                'methods' => self::METHODS,
                'invoices' => Invoice::with('client')
                    ->where('status', '!=', 'void')
                    ->latest('issued_on')
                    ->get()
                    ->map(fn (Invoice $i) => [
                        'id' => $i->id,
                        'number' => $i->number,
                        'client' => $i->client?->name,
                        'balance_cents' => $i->balanceCents(),
                    ]),
            ],
        ]);
    }

    public function store(Request $request, Invoice $invoice)
    {
        $data = $this->validatePayment($request);
        $amountCents = (int) round($data['amount'] * 100);

        if ($amountCents > $invoice->balanceCents()) {
            return back()->withErrors(['amount' => 'Payment exceeds the outstanding balance.']);
        }

        DB::transaction(function () use ($invoice, $data, $amountCents) {
            Payment::create([
                'invoice_id' => $invoice->id,
                'paid_on' => $data['paid_on'],
                'amount_cents' => $amountCents,
                'method' => $data['method'],
                'reference' => $data['reference'] ?? null,
            ]);

            $invoice->refresh()->refreshPaidTotal();
        });

        return back()->with('success', 'Payment recorded.');
    }

    public function update(Request $request, Invoice $invoice, Payment $payment)
    {
        abort_unless($payment->invoice_id === $invoice->id, 404);

        $data = $this->validatePayment($request);
        $amountCents = (int) round($data['amount'] * 100);

        // This payment already counts against the balance, so hand it back before comparing.
        if ($amountCents > $invoice->balanceCents() + $payment->amount_cents) {
            return back()->withErrors(['amount' => 'Payment exceeds the outstanding balance.']);
        }

        DB::transaction(function () use ($invoice, $payment, $data, $amountCents) {
            $payment->update([
                'paid_on' => $data['paid_on'],
                'amount_cents' => $amountCents,
                'method' => $data['method'],
                'reference' => $data['reference'] ?? null,
            ]);

            $invoice->refresh()->refreshPaidTotal();
        });

        return back()->with('success', 'Payment updated.');
    }

    public function destroy(Invoice $invoice, Payment $payment)
    {
        abort_unless($payment->invoice_id === $invoice->id, 404);

        DB::transaction(function () use ($invoice, $payment) {
            $payment->delete();
            $invoice->refresh()->refreshPaidTotal();
        });

        return back()->with('success', 'Payment removed.');
    }

    /** @return array{paid_on: string, amount: numeric-string, method: string, reference: ?string} */
    private function validatePayment(Request $request): array
    {
        return $request->validate([
            'paid_on' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
            'method' => ['required', Rule::in(self::METHODS)],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
