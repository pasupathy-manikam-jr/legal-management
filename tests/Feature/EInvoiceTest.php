<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Matter;
use App\Models\Setting;
use App\Models\TimeEntry;
use App\Models\User;
use EInvoiceSdk\Contracts\EInvoiceDriver;
use EInvoiceSdk\Drivers\FakeDriver;
use EInvoiceSdk\Drivers\JianniusDriver;
use EInvoiceSdk\Drivers\StatusResult;
use EInvoiceSdk\Enums\Status;
use EInvoiceSdk\Models\EInvoiceDocument;
use EInvoiceSdk\Models\EInvoiceSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EInvoiceTest extends TestCase
{
    use RefreshDatabase;

    private FakeDriver $driver;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->driver = new FakeDriver;
        $this->app->instance(EInvoiceDriver::class, $this->driver);

        foreach ([
            'firm_name' => 'Whitmore & Co.', 'firm_tin' => 'C12345678900', 'firm_id_type' => 'BRN', 'registration_no' => '202301012345',
            'msic_code' => '69100', 'msic_description' => 'Legal activities', 'firm_phone' => '+60321618888',
            'firm_address' => "Level 5, Menara A\nJalan Ampang", 'firm_city' => 'Kuala Lumpur', 'firm_state' => 'Wilayah Persekutuan Kuala Lumpur',
            'firm_postcode' => '50450', 'currency' => 'MYR',
        ] as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
        EInvoiceSetting::create(['tin' => 'C12345678900', 'environment' => 'sandbox', 'unsigned' => true, 'client_id' => 'id', 'client_secret' => 'secret']);

        $this->user = User::factory()->create(['role' => 'admin']);
    }

    /** 90 min + 30 min at 300.00/h = 600.00, 8% service tax = 48.00. */
    private function issuedInvoice(array $client = []): Invoice
    {
        $matter = Matter::create([
            'client_id' => Client::create([
                'name' => 'Tan Wei Ming', 'company' => 'Tan Trading Sdn. Bhd.', 'email' => 'tan@example.com', 'phone' => '+60123456789',
                'address' => '1 Jalan Tun Razak', 'city' => 'Petaling Jaya', 'state' => 'Selangor', 'postcode' => '47300',
                'tin' => 'C98765432100', 'id_type' => 'BRN', 'id_number' => '201901000005', ...$client,
            ])->id,
            'lead_lawyer_id' => $this->user->id, 'reference' => Matter::nextReference(), 'title' => 'Tan v. Lim',
            'priority' => 'normal', 'status' => 'open', 'opened_on' => now()->subMonth(), 'hourly_rate_cents' => 30000,
        ]);

        foreach ([90, 30] as $minutes) {
            TimeEntry::create(['matter_id' => $matter->id, 'user_id' => $this->user->id, 'worked_on' => now()->subDay(), 'minutes' => $minutes, 'rate_cents' => 30000, 'billable' => true, 'description' => 'Drafting']);
        }

        $this->actingAs($this->user)->post('/invoices', [
            'matter_id' => $matter->id, 'issued_on' => now()->toDateString(), 'due_on' => now()->addDays(30)->toDateString(), 'tax_percent' => 8,
        ]);
        $invoice = Invoice::latest('id')->first();
        $invoice->update(['status' => 'sent']);

        return $invoice;
    }

    public function test_invoice_maps_to_an_lhdn_document_the_sdk_accepts(): void
    {
        $document = $this->issuedInvoice()->toEInvoiceDocument();

        $this->assertSame('C12345678900', $document->supplier->tin);
        $this->assertSame('Jalan Ampang', $document->supplier->addressLine2);
        $this->assertSame('Tan Trading Sdn. Bhd.', $document->buyer->name);
        $this->assertSame('201901000005', $document->buyer->brn);
        $this->assertCount(2, $document->lines);
        $this->assertSame(450.0, $document->lines[0]->subtotal);
        $this->assertStringContainsString('(1h 30m)', $document->lines[0]->description);
        $this->assertSame('02', $document->taxes[0]->code);
        $this->assertSame(8.0, $document->taxes[0]->rate);
        $this->assertSame(48.0, $document->lines[0]->taxes[0]->amount + $document->lines[1]->taxes[0]->amount);
        $this->assertSame(600.0, $document->subtotal);
        $this->assertSame(648.0, $document->grandTotal);

        // The real driver's local validation (the SDK's rules), no network.
        $this->assertSame([], (new JianniusDriver)->validate($document));
    }

    public function test_sending_an_issued_invoice_ends_valid_with_a_qr_on_the_page(): void
    {
        $invoice = $this->issuedInvoice();

        $this->actingAs($this->user)->post("/invoices/{$invoice->id}/einvoice")->assertSessionHasNoErrors();

        $einvoice = EInvoiceDocument::sole();
        $this->assertSame(Status::Valid, $einvoice->status);

        $this->actingAs($this->user)->get("/invoices/{$invoice->id}")->assertInertia(fn ($page) => $page
            ->where('einvoice.status', 'valid')
            ->where('einvoice.validation_url', $einvoice->validationUrl())
            ->where('einvoice.qr', fn ($qr) => str_starts_with($qr, 'data:image/svg+xml;base64,')));
    }

    public function test_drafts_and_non_myr_firms_are_refused(): void
    {
        $invoice = $this->issuedInvoice();
        $invoice->update(['status' => 'draft']);
        $this->actingAs($this->user)->post("/invoices/{$invoice->id}/einvoice")->assertSessionHasErrors('einvoice');

        Setting::updateOrCreate(['key' => 'currency'], ['value' => 'USD']);
        $usd = $this->issuedInvoice();
        $this->actingAs($this->user)->post("/invoices/{$usd->id}/einvoice")->assertSessionHasErrors('einvoice');

        $this->assertSame(0, EInvoiceDocument::count());
    }

    public function test_a_client_without_a_tin_is_sent_with_the_general_tin_for_where_they_are(): void
    {
        $this->assertSame('EI00000000020', $this->issuedInvoice(['tin' => null, 'country' => 'Singapore'])->toEInvoiceDocument()->buyer->tin);

        $invoice = $this->issuedInvoice(['tin' => null, 'country' => 'Malaysia']);
        $this->assertSame('EI00000000010', $invoice->toEInvoiceDocument()->buyer->tin);

        $this->actingAs($this->user)->post("/invoices/{$invoice->id}/einvoice")->assertSessionHasNoErrors();
        $this->assertSame(Status::Valid, EInvoiceDocument::sole()->status);
    }

    public function test_an_invoice_live_at_lhdn_cannot_be_voided_or_deleted_until_cancelled(): void
    {
        $invoice = $this->issuedInvoice();
        $this->actingAs($this->user)->post("/invoices/{$invoice->id}/einvoice");

        $this->actingAs($this->user)->put("/invoices/{$invoice->id}", ['status' => 'void', 'due_on' => now()->addMonth()->toDateString()])
            ->assertSessionHasErrors('status');
        $this->actingAs($this->user)->delete("/invoices/{$invoice->id}")->assertSessionHasErrors('einvoice');
        $this->assertSame('sent', $invoice->fresh()->status);

        $einvoice = EInvoiceDocument::sole();
        $this->actingAs($this->user)->put("/einvoices/{$einvoice->id}/cancel", ['reason' => 'Wrong client'])->assertSessionHasNoErrors();
        $this->assertSame(Status::Cancelled, $einvoice->fresh()->status);

        $this->actingAs($this->user)->put("/invoices/{$invoice->id}", ['status' => 'void', 'due_on' => now()->addMonth()->toDateString()])
            ->assertSessionHasNoErrors();
        $this->assertSame('void', $invoice->fresh()->status);
    }

    public function test_admins_save_credentials_others_cannot(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'lawyer']))->put('/einvoice/settings', ['environment' => 'sandbox', 'client_id' => 'x', 'client_secret' => 'y'])
            ->assertForbidden();

        $this->actingAs($this->user)->put('/einvoice/settings', ['environment' => 'production', 'client_id' => 'prod-id', 'client_secret' => 'prod-secret', 'unsigned' => true])
            ->assertSessionHasNoErrors();

        $production = EInvoiceSetting::where('environment', 'production')->sole();
        $this->assertFalse($production->unsigned);
        $this->assertTrue($production->active);
        $this->assertFalse(EInvoiceSetting::where('environment', 'sandbox')->sole()->active);
    }

    public function test_an_invoice_without_time_entries_goes_as_one_fee_line(): void
    {
        $invoice = $this->issuedInvoice();
        $invoice->timeEntries()->update(['invoice_id' => null]);

        $document = $invoice->fresh()->toEInvoiceDocument();

        $this->assertCount(1, $document->lines);
        $this->assertSame(600.0, $document->lines[0]->subtotal);
        $this->assertSame(48.0, $document->lines[0]->taxes[0]->amount);
        $this->assertSame([], (new JianniusDriver)->validate($document));
    }

    public function test_send_runs_without_a_queue_and_check_status_finishes_it(): void
    {
        $invoice = $this->issuedInvoice();
        $this->driver->submitResult = new \RuntimeException('cURL error 28');
        $this->actingAs($this->user)->post("/invoices/{$invoice->id}/einvoice")->assertSessionHasErrors('einvoice');
        $this->assertSame(Status::Failed, EInvoiceDocument::sole()->status);

        $this->driver->submitResult = null;
        $this->driver->statusResult = new StatusResult(Status::Submitted);
        $this->actingAs($this->user)->post("/invoices/{$invoice->id}/einvoice")->assertSessionHasNoErrors();
        $einvoice = EInvoiceDocument::sole();
        $this->assertSame(Status::Submitted, $einvoice->status);

        $this->driver->statusResult = null;
        $this->actingAs($this->user)->put("/einvoices/{$einvoice->id}/poll")->assertRedirect();
        $this->assertSame(Status::Valid, $einvoice->fresh()->status);
    }
}
