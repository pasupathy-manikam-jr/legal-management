<?php

namespace App\Models;

use EInvoiceSdk\Concerns\HasEInvoices;
use EInvoiceSdk\Contracts\EInvoiceable;
use EInvoiceSdk\Data\Document;
use EInvoiceSdk\Data\LineItem;
use EInvoiceSdk\Data\Party;
use EInvoiceSdk\Data\Tax;
use EInvoiceSdk\Enums\DocumentType;
use EInvoiceSdk\Enums\Status;
use EInvoiceSdk\Exceptions\EInvoiceException;
use EInvoiceSdk\Models\EInvoiceDocument;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class Invoice extends Model implements EInvoiceable
{
    use HasEInvoices, HasFactory;

    protected $fillable = [
        'client_id', 'matter_id', 'number', 'issued_on', 'due_on',
        'status', 'subtotal_cents', 'tax_cents', 'paid_cents', 'notes',
    ];

    protected $casts = [
        'issued_on' => 'date',
        'due_on' => 'date',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function matter()
    {
        return $this->belongsTo(Matter::class);
    }

    public function timeEntries()
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function totalCents(): int
    {
        return $this->subtotal_cents + $this->tax_cents;
    }

    public function balanceCents(): int
    {
        return $this->totalCents() - $this->paid_cents;
    }

    /**
     * What the invoice reads as on screen. Overdue is not a stored status —
     * it is an issued invoice past its due date with money still owing.
     */
    public function state(): string
    {
        if ($this->status === 'sent' && $this->due_on?->isPast() && $this->balanceCents() > 0) {
            return 'overdue';
        }

        return $this->status;
    }

    /** @param  Builder  $query */
    public function scopeOverdue($query)
    {
        return $query->where('status', 'sent')
            ->whereDate('due_on', '<', now()->toDateString())
            ->whereRaw('subtotal_cents + tax_cents - paid_cents > 0');
    }

    /** Recompute paid total and status from the payments actually recorded. */
    public function refreshPaidTotal(): void
    {
        $this->paid_cents = (int) $this->payments()->sum('amount_cents');

        if ($this->status !== 'void') {
            $this->status = $this->paid_cents >= $this->totalCents() && $this->totalCents() > 0
                ? 'paid'
                : ($this->status === 'draft' ? 'draft' : 'sent');
        }

        $this->save();
    }

    public static function nextNumber(): string
    {
        $year = now()->year;
        $last = static::where('number', 'like', "INV-$year-%")->max('number');
        $seq = $last ? ((int) substr($last, 9)) + 1 : 1;

        return sprintf('INV-%d-%04d', $year, $seq);
    }

    /** The latest LHDN e-invoice submission for this invoice. */
    public function einvoice(): MorphOne
    {
        return $this->morphOne(EInvoiceDocument::class, 'einvoiceable')->latestOfMany();
    }

    /** Submitted to or validated by LHDN: the invoice must not be voided, reopened or deleted until it is cancelled there. */
    public function hasLiveEInvoice(): bool
    {
        return in_array($this->einvoice?->status, [Status::Submitted, Status::Valid], true);
    }

    /**
     * This invoice as an LHDN e-invoice. Each time entry is one fee line (quantity 1, the time in the description);
     * the invoice's single tax figure is reported under the firm's e-invoice tax type and split across lines by amount.
     */
    public function toEInvoiceDocument(): Document
    {
        $this->loadMissing('client', 'matter', 'timeEntries');
        $settings = Setting::all_values();

        if (strtoupper($settings['currency']) !== 'MYR') {
            throw new EInvoiceException("LHDN e-invoices are sent in MYR; this firm's currency is {$settings['currency']}. Change it under System Settings → Currency.");
        }

        $taxCode = $this->tax_cents > 0 ? $settings['einvoice_tax_type'] : '06';
        $rate = $this->subtotal_cents > 0 ? round($this->tax_cents * 100 / $this->subtotal_cents, 2) : 0;
        $entries = $this->timeEntries->values();
        $left = $this->tax_cents;

        $lines = $entries->map(function (TimeEntry $entry, int $i) use ($entries, $taxCode, $rate, &$left) {
            $amount = $entry->amountCents();
            // The last line takes the rounding remainder so line taxes add up to the invoice tax exactly.
            $tax = $i === $entries->count() - 1 ? $left : intdiv($this->tax_cents * $amount, max(1, $this->subtotal_cents));
            $left -= $tax;
            $time = sprintf('%dh %02dm', intdiv($entry->minutes, 60), $entry->minutes % 60);

            return new LineItem(
                description: trim("{$entry->worked_on->toDateString()} · {$entry->description} ({$time})"),
                quantity: 1,
                unitPrice: $amount / 100,
                subtotal: $amount / 100,
                classificationCodes: ['022'],
                taxes: [new Tax($taxCode, $tax / 100, $amount / 100, $rate)],
            );
        })->all();

        // Invoices without time entries (imported or seeded) go as one line for their subtotal.
        $lines = $lines ?: [new LineItem(
            description: 'Professional fees'.($this->matter ? " · {$this->matter->reference}" : ''),
            quantity: 1,
            unitPrice: $this->subtotal_cents / 100,
            subtotal: $this->subtotal_cents / 100,
            classificationCodes: ['022'],
            taxes: [new Tax($taxCode, $this->tax_cents / 100, $this->subtotal_cents / 100, $rate)],
        )];

        return new Document(
            type: DocumentType::Invoice,
            number: $this->number,
            // LHDN rejects issue times more than 72 hours before submission, so the e-invoice is issued when sent.
            issuedAt: now(),
            supplier: self::einvoiceSupplier($settings),
            buyer: $this->einvoiceBuyer(),
            lines: $lines,
            taxes: [new Tax($taxCode, $this->tax_cents / 100, $this->subtotal_cents / 100, $rate)],
            subtotal: $this->subtotal_cents / 100,
            grandTotal: $this->totalCents() / 100,
            currency: 'MYR',
        );
    }

    /** @param  array<string, string|null>  $settings */
    private static function einvoiceSupplier(array $settings): Party
    {
        $address = self::addressLines($settings['firm_address']);
        $idType = $settings['firm_id_type'];

        return new Party(
            name: (string) $settings['firm_name'],
            tin: (string) $settings['firm_tin'],
            brn: $idType === 'BRN' ? ($settings['registration_no'] ?: null) : null,
            nric: $idType === 'NRIC' ? ($settings['registration_no'] ?: null) : null,
            sstNumber: $settings['sst_no'] ?: null,
            email: $settings['firm_email'] ?: null,
            phone: $settings['firm_phone'] ?: null,
            addressLine1: $address[0] ?? null,
            addressLine2: $address[1] ?? null,
            addressLine3: $address[2] ?? null,
            postcode: $settings['firm_postcode'] ?: null,
            city: $settings['firm_city'] ?: null,
            state: $settings['firm_state'] ?: null,
            country: $settings['firm_country'] ?: 'MYS',
            msicCode: $settings['msic_code'] ?: null,
            msicDescription: $settings['msic_description'] ?: null,
        );
    }

    /**
     * LHDN's general TIN sent for a client whose own TIN isn't on file. The general-public TIN
     * (EI00000000010) is only accepted on the monthly consolidated e-invoice, never on a standard
     * invoice, so every client without a TIN goes out under the general buyer TIN instead.
     */
    public const DEFAULT_BUYER_TIN = 'EI00000000020';

    private function einvoiceBuyer(): Party
    {
        $client = $this->client;
        $address = self::addressLines($client->address);
        $id = fn (string $type) => $client->id_type === $type ? $client->id_number : null;

        return new Party(
            name: $client->company ?: $client->name,
            tin: $client->tin ?: self::DEFAULT_BUYER_TIN,
            brn: $id('BRN'),
            nric: $id('NRIC'),
            passport: $id('PASSPORT'),
            army: $id('ARMY'),
            email: $client->email,
            phone: $client->phone,
            addressLine1: $address[0] ?? null,
            addressLine2: $address[1] ?? null,
            addressLine3: $address[2] ?? null,
            postcode: $client->postcode,
            city: $client->city,
            state: $client->state,
            country: $client->country ?: 'MYS',
        );
    }

    /** @return list<string> up to three non-empty address lines */
    private static function addressLines(?string $address): array
    {
        return array_slice(array_values(array_filter(array_map('trim', preg_split('/\R/', (string) $address) ?: []))), 0, 3);
    }
}
