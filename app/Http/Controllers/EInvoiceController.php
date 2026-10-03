<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Setting;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use EInvoiceSdk\EInvoice;
use EInvoiceSdk\Enums\Environment;
use EInvoiceSdk\Enums\Status;
use EInvoiceSdk\Exceptions\EInvoiceException;
use EInvoiceSdk\Models\EInvoiceDocument;
use EInvoiceSdk\Models\EInvoiceSetting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * LHDN MyInvois: send an issued invoice, cancel it within 72 hours, check a client's TIN, and keep the firm's
 * MyInvois credentials. Sending runs on the queue; the invoice page reads the result from the e-invoice record.
 * Problems come back as validation errors under "einvoice" so the e-invoice card can show them.
 */
class EInvoiceController extends Controller
{
    public function __construct(private EInvoice $einvoice) {}

    public function submit(Invoice $invoice)
    {
        if (! in_array($invoice->status, ['sent', 'paid'], true)) {
            return $this->fail('Only issued (sent or paid) invoices can go to LHDN.');
        }

        try {
            $this->einvoice->submit($invoice);
        } catch (ValidationException $e) {
            return $this->fail('LHDN needs more details: '.implode(' ', $e->errors()['einvoice'] ?? []));
        } catch (EInvoiceException $e) {
            return $this->fail($e->getMessage());
        } catch (Throwable $e) {
            // Without a queue the send runs in this request; the e-invoice is already marked failed and logged.
            report($e);

            return $this->fail('Could not reach LHDN. Please try sending again in a few minutes.');
        }

        return back()->with('success', "Invoice {$invoice->number} sent to LHDN.");
    }

    /** Ask LHDN once whether a submitted e-invoice has been validated yet. */
    public function poll(EInvoiceDocument $einvoice)
    {
        abort_unless($einvoice->einvoiceable_type === (new Invoice)->getMorphClass(), 404);

        try {
            $this->einvoice->poll($einvoice);
        } catch (Throwable $e) {
            report($e);

            return $this->fail('Could not reach LHDN. Please try again in a few minutes.');
        }

        return back();
    }

    public function cancel(Request $request, EInvoiceDocument $einvoice)
    {
        abort_unless($einvoice->einvoiceable_type === (new Invoice)->getMorphClass(), 404);
        $reason = $request->validate(['reason' => ['required', 'string', 'max:300']])['reason'];

        try {
            $this->einvoice->cancel($einvoice, $reason);
        } catch (EInvoiceException $e) {
            return $this->fail($e->getMessage());
        }

        return back()->with('success', 'Cancellation sent to LHDN.');
    }

    /** Check a client's TIN against their ID with LHDN. */
    public function validateTin(Request $request)
    {
        $data = $request->validate([
            'tin' => ['required', 'string', 'max:20'],
            'id_type' => ['required', Rule::in(['BRN', 'NRIC', 'PASSPORT', 'ARMY'])],
            'id_number' => ['required', 'string', 'max:30'],
        ]);

        try {
            $valid = $this->einvoice->validateTin((string) Setting::get('firm_tin'), $data['tin'], $data['id_type'], $data['id_number']);
        } catch (Throwable $e) {
            report($e);

            return back()->withErrors(['tin' => 'Could not reach LHDN to check the TIN. Try again shortly.']);
        }

        return $valid
            ? back()->with('success', 'LHDN confirms this TIN matches the ID.')
            : back()->withErrors(['tin' => 'LHDN does not recognise this TIN with that ID.']);
    }

    /** Save the MyInvois credentials for the firm TIN and make them the ones used for new submissions. */
    public function saveSettings(Request $request)
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only firm admins may change e-invoice settings.');

        $tin = Setting::get('firm_tin');
        if (! $tin) {
            throw ValidationException::withMessages(['client_id' => 'Enter the firm TIN in the company profile first.']);
        }

        $data = $request->validate([
            'environment' => ['required', Rule::enum(Environment::class)],
            'client_id' => ['nullable', 'string', 'max:100'],
            'client_secret' => ['nullable', 'string', 'max:100'],
            'unsigned' => ['boolean'],
            'certificate' => ['nullable', 'string', 'max:20000'],
            'private_key' => ['nullable', 'string', 'max:20000'],
        ]);

        $setting = EInvoiceSetting::firstOrNew(['tin' => $tin, 'environment' => $data['environment']]);
        // Secrets left blank keep their saved value.
        $setting->fill(array_filter($data, fn ($value) => $value !== null && $value !== ''));
        $setting->unsigned = $data['environment'] === 'sandbox' && ($data['unsigned'] ?? false);

        if (! $setting->client_id || ! $setting->client_secret) {
            throw ValidationException::withMessages(['client_id' => 'Client ID and secret are required.']);
        }

        $setting->save();
        $setting->activate();

        return back()->with('success', 'MyInvois settings saved.');
    }

    /** The active MyInvois settings for the company profile page; secrets only report whether they are set. */
    public static function settingsSummary(): ?array
    {
        $setting = EInvoiceSetting::where('tin', Setting::get('firm_tin'))->where('active', true)->first();

        return $setting ? [
            'environment' => $setting->environment->value,
            'unsigned' => $setting->unsigned,
            'client_id' => $setting->client_id,
            'has_client_secret' => $setting->client_secret !== '',
            'has_certificate' => (bool) $setting->certificate,
        ] : null;
    }

    /** What the invoice page needs about its e-invoice, including the validation QR once valid. */
    public static function summary(Invoice $invoice): ?array
    {
        $einvoice = $invoice->einvoice;

        if (! $einvoice) {
            return null;
        }

        $url = $einvoice->validationUrl();

        return [
            'id' => $einvoice->id,
            'status' => $einvoice->status->value,
            'environment' => $einvoice->environment->value,
            'uuid' => $einvoice->uuid,
            'validation_url' => $url,
            'qr' => $url && $einvoice->status === Status::Valid ? self::qr($url) : null,
            'validated_at' => $einvoice->validated_at?->toIso8601String(),
            'cancel_until' => $einvoice->canCancel() ? $einvoice->validated_at?->copy()->addHours(EInvoiceDocument::CANCEL_WINDOW_HOURS)->toIso8601String() : null,
            // LHDN's own rejection reasons are shown; technical failures stay in the log and get a plain message.
            'errors' => match ($einvoice->status) {
                Status::Invalid => $einvoice->logs()->latest('id')->first()->errors ?? [],
                Status::Failed => ['Could not reach LHDN. Please try sending again in a few minutes.'],
                default => [],
            },
        ];
    }

    private static function qr(string $text): string
    {
        $svg = (new Writer(new ImageRenderer(new RendererStyle(180, 1), new SvgImageBackEnd)))->writeString($text);

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    private function fail(string $message)
    {
        return back()->withErrors(['einvoice' => $message]);
    }
}
