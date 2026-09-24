<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Matter;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PracticeTest extends TestCase
{
    use RefreshDatabase;

    private function matterFor(User $user): Matter
    {
        return Matter::create([
            'client_id' => Client::create(['name' => 'Acme Ltd'])->id,
            'lead_lawyer_id' => $user->id,
            'reference' => Matter::nextReference(),
            'title' => 'Acme v. Nemo',
            'priority' => 'high',
            'status' => 'open',
            'opened_on' => now()->subMonth(),
            'hourly_rate_cents' => 30000,
        ]);
    }

    /** An issued invoice with one billable hour on it, so there is a balance to pay. */
    private function invoiceWithBalance(): Invoice
    {
        $user = User::factory()->create();
        $matter = $this->matterFor($user);

        TimeEntry::create([
            'matter_id' => $matter->id,
            'user_id' => $user->id,
            'worked_on' => now()->subDay(),
            'minutes' => 60,
            'rate_cents' => 30000,
            'billable' => true,
            'description' => 'Hearing',
        ]);

        $this->actingAs($user)->post('/invoices', [
            'matter_id' => $matter->id,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(30)->toDateString(),
            'tax_percent' => 0,
        ]);

        return Invoice::latest('id')->firstOrFail();
    }

    public function test_renders_every_practice_screen_for_a_signed_in_user(): void
    {
        $user = User::factory()->create();
        $matter = $this->matterFor($user);

        foreach (['/dashboard', '/matters', '/clients', '/hearings', '/tasks', '/time-entries', '/invoices', '/payments', '/courts', "/matters/{$matter->id}"] as $url) {
            $this->actingAs($user)->get($url)->assertOk();
        }
    }

    public function test_locks_the_practice_behind_auth(): void
    {
        $this->get('/matters')->assertRedirect('/login');
        $this->get('/invoices')->assertRedirect('/login');
    }

    public function test_numbers_cases_sequentially_within_the_year(): void
    {
        $user = User::factory()->create();
        $this->matterFor($user);

        $this->assertSame(now()->year.'-002', Matter::nextReference());
    }

    public function test_bills_unbilled_time_onto_one_invoice_and_no_more(): void
    {
        $user = User::factory()->create();
        $matter = $this->matterFor($user);

        // 90 min @ 300.00/h = 450.00, plus 30 min = 150.00 → 600.00 subtotal.
        foreach ([90, 30] as $minutes) {
            TimeEntry::create([
                'matter_id' => $matter->id,
                'user_id' => $user->id,
                'worked_on' => now()->subDay(),
                'minutes' => $minutes,
                'rate_cents' => 30000,
                'billable' => true,
                'description' => 'Drafting',
            ]);
        }

        // A non-billable entry must stay off the invoice.
        TimeEntry::create([
            'matter_id' => $matter->id,
            'user_id' => $user->id,
            'worked_on' => now()->subDay(),
            'minutes' => 60,
            'rate_cents' => 30000,
            'billable' => false,
            'description' => 'Internal review',
        ]);

        $this->actingAs($user)->post('/invoices', [
            'matter_id' => $matter->id,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(30)->toDateString(),
            'tax_percent' => 10,
        ])->assertRedirect();

        $invoice = Invoice::sole();
        $this->assertSame(60000, $invoice->subtotal_cents);
        $this->assertSame(6000, $invoice->tax_cents);
        $this->assertSame(66000, $invoice->totalCents());
        $this->assertSame(2, $invoice->timeEntries()->count());

        // Re-running finds nothing left to bill rather than double-billing.
        $this->actingAs($user)->post('/invoices', [
            'matter_id' => $matter->id,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(30)->toDateString(),
            'tax_percent' => 10,
        ])->assertSessionHasErrors('matter_id');

        $this->assertSame(1, Invoice::count());
    }

    public function test_keeps_payments_within_the_balance_and_flips_status_when_settled(): void
    {
        $user = User::factory()->create();
        $matter = $this->matterFor($user);

        TimeEntry::create([
            'matter_id' => $matter->id,
            'user_id' => $user->id,
            'worked_on' => now()->subDay(),
            'minutes' => 60,
            'rate_cents' => 30000,
            'billable' => true,
            'description' => 'Hearing',
        ]);

        $this->actingAs($user)->post('/invoices', [
            'matter_id' => $matter->id,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(30)->toDateString(),
            'tax_percent' => 0,
        ]);

        $invoice = Invoice::sole();
        $this->assertSame(30000, $invoice->totalCents());

        $this->actingAs($user)->post("/invoices/{$invoice->id}/payments", [
            'paid_on' => now()->toDateString(),
            'amount' => 400,
            'method' => 'bank',
        ])->assertSessionHasErrors('amount');

        $this->actingAs($user)->post("/invoices/{$invoice->id}/payments", [
            'paid_on' => now()->toDateString(),
            'amount' => 300,
            'method' => 'bank',
        ])->assertSessionHasNoErrors();

        $this->assertSame('paid', $invoice->refresh()->status);
        $this->assertSame(0, $invoice->balanceCents());
    }

    public function test_releases_billed_time_when_an_invoice_is_voided(): void
    {
        $user = User::factory()->create();
        $matter = $this->matterFor($user);

        TimeEntry::create([
            'matter_id' => $matter->id,
            'user_id' => $user->id,
            'worked_on' => now()->subDay(),
            'minutes' => 60,
            'rate_cents' => 30000,
            'billable' => true,
            'description' => 'Hearing',
        ]);

        $this->actingAs($user)->post('/invoices', [
            'matter_id' => $matter->id,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(30)->toDateString(),
            'tax_percent' => 0,
        ]);

        $invoice = Invoice::sole();
        $this->actingAs($user)->put("/invoices/{$invoice->id}", [
            'status' => 'void',
            'due_on' => $invoice->due_on->toDateString(),
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, TimeEntry::whereNull('invoice_id')->count());
    }

    public function test_refuses_to_edit_time_that_is_already_invoiced(): void
    {
        $user = User::factory()->create();
        $matter = $this->matterFor($user);

        $entry = TimeEntry::create([
            'matter_id' => $matter->id,
            'user_id' => $user->id,
            'worked_on' => now()->subDay(),
            'minutes' => 60,
            'rate_cents' => 30000,
            'billable' => true,
            'description' => 'Hearing',
        ]);

        $this->actingAs($user)->post('/invoices', [
            'matter_id' => $matter->id,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(30)->toDateString(),
            'tax_percent' => 0,
        ]);

        $this->actingAs($user)->put("/time-entries/{$entry->id}", [
            'matter_id' => $matter->id,
            'user_id' => $user->id,
            'worked_on' => now()->toDateString(),
            'minutes' => 600,
            'rate' => 300,
            'billable' => true,
            'description' => 'Padded',
        ])->assertSessionHasErrors('minutes');

        $this->assertSame(60, $entry->refresh()->minutes);
    }

    public function test_payments_list_filters_by_method_and_counts_the_whole_search(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $invoice = $this->invoiceWithBalance();

        $this->actingAs($user)->post("/invoices/{$invoice->id}/payments", [
            'paid_on' => '2026-09-01', 'amount' => 10, 'method' => 'cash', 'reference' => 'R1',
        ])->assertSessionHasNoErrors();
        $this->actingAs($user)->post("/invoices/{$invoice->id}/payments", [
            'paid_on' => '2026-09-02', 'amount' => 20, 'method' => 'bank', 'reference' => 'R2',
        ])->assertSessionHasNoErrors();

        $this->actingAs($user)->get('/payments?method=bank')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('payments.total', 1)
                ->where('payments.data.0.method', 'bank')
                ->where('counts.all', 2)
                ->where('counts.cash', 1)
                ->where('counts.bank', 1));
    }

    public function test_editing_a_payment_re_totals_the_invoice_and_respects_the_balance(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $invoice = $this->invoiceWithBalance();
        $balanceCents = $invoice->balanceCents();

        $this->actingAs($user)->post("/invoices/{$invoice->id}/payments", [
            'paid_on' => '2026-09-01', 'amount' => 10, 'method' => 'cash', 'reference' => null,
        ]);
        $payment = Payment::firstOrFail();

        $this->actingAs($user)->put("/invoices/{$invoice->id}/payments/{$payment->id}", [
            'paid_on' => '2026-09-03', 'amount' => 25, 'method' => 'card', 'reference' => 'ref',
        ])->assertSessionHasNoErrors();

        $this->assertSame(2500, $payment->refresh()->amount_cents);
        $this->assertSame(2500, $invoice->refresh()->paid_cents);

        // Its own amount is given back before the check, so the full balance is reachable.
        $this->actingAs($user)->put("/invoices/{$invoice->id}/payments/{$payment->id}", [
            'paid_on' => '2026-09-03', 'amount' => $balanceCents / 100, 'method' => 'card', 'reference' => 'ref',
        ])->assertSessionHasNoErrors();

        $this->actingAs($user)->put("/invoices/{$invoice->id}/payments/{$payment->id}", [
            'paid_on' => '2026-09-03', 'amount' => $balanceCents / 100 + 1, 'method' => 'card', 'reference' => 'ref',
        ])->assertSessionHasErrors('amount');
    }

    public function test_a_payment_cannot_be_edited_through_another_invoice(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $invoice = $this->invoiceWithBalance();
        $other = $this->invoiceWithBalance();

        $this->actingAs($user)->post("/invoices/{$invoice->id}/payments", [
            'paid_on' => '2026-09-01', 'amount' => 10, 'method' => 'cash', 'reference' => null,
        ]);
        $payment = Payment::firstOrFail();

        $this->actingAs($user)->put("/invoices/{$other->id}/payments/{$payment->id}", [
            'paid_on' => '2026-09-03', 'amount' => 11, 'method' => 'cash', 'reference' => null,
        ])->assertNotFound();
    }

    public function test_the_week_grid_totals_each_member_and_marks_billed_days(): void
    {
        $user = User::factory()->create(['name' => 'Amara Diallo']);
        $matter = $this->matterFor($user);
        $monday = now()->startOfWeek(Carbon::MONDAY);

        // Two entries the same day: one billed, one not, so the day reads as mixed.
        $invoice = $this->invoiceWithBalance();

        TimeEntry::create([
            'matter_id' => $matter->id, 'user_id' => $user->id, 'worked_on' => $monday->toDateString(),
            'minutes' => 90, 'rate_cents' => 30000, 'billable' => true, 'description' => 'Drafting',
        ]);
        TimeEntry::create([
            'matter_id' => $matter->id, 'user_id' => $user->id, 'worked_on' => $monday->toDateString(),
            'minutes' => 30, 'rate_cents' => 30000, 'billable' => true, 'invoice_id' => $invoice->id, 'description' => 'Billed work',
        ]);
        TimeEntry::create([
            'matter_id' => $matter->id, 'user_id' => $user->id, 'worked_on' => $monday->copy()->addDay()->toDateString(),
            'minutes' => 60, 'rate_cents' => 30000, 'billable' => true, 'description' => 'Hearing',
        ]);

        // The firm's week starts on Sunday by default, so Monday is the second column.
        $this->actingAs($user)->get("/billing/time-entries?week={$monday->toDateString()}&member={$user->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('rows.0.name', 'Amara Diallo')
                ->where('rows.0.minutes', 180)
                ->where('days.0.weekday', 'Sun')
                ->where('rows.0.cells.0.state', 'empty')
                ->where('rows.0.cells.1.state', 'mixed')
                ->where('rows.0.cells.1.entries', 2)
                ->where('rows.0.cells.2.state', 'unbilled')
                ->where('totals.minutes', 180)
                ->where('totals.entries', 3)
                ->where('totals.members', 1)
                ->count('days', 7));

        // Switching the firm to a Monday week shifts the whole grid.
        Setting::updateOrCreate(['key' => 'calendar_start_day'], ['value' => 'monday']);

        $this->actingAs($user)->get("/billing/time-entries?week={$monday->toDateString()}&member={$user->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('days.0.weekday', 'Mon')
                ->where('rows.0.cells.0.state', 'mixed')
                ->where('rows.0.cells.1.state', 'unbilled'));

        // A different week shows the same member with nothing logged.
        $this->actingAs($user)->get('/billing/time-entries?week='.$monday->copy()->subWeek()->toDateString()."&member={$user->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('totals.minutes', 0)->where('rows.0.cells.0.state', 'empty'));
    }

    public function test_a_grid_cell_drills_into_that_members_day(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $matter = $this->matterFor($user);

        foreach ([[$user, '2026-09-21', 'Mine'], [$other, '2026-09-21', 'Theirs'], [$user, '2026-09-22', 'Another day']] as [$who, $day, $what]) {
            TimeEntry::create([
                'matter_id' => $matter->id, 'user_id' => $who->id, 'worked_on' => $day,
                'minutes' => 60, 'rate_cents' => 30000, 'billable' => true, 'description' => $what,
            ]);
        }

        $this->actingAs($user)->get("/time-entries?user={$user->id}&date=2026-09-21")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('entries.total', 1)
                ->where('entries.data.0.description', 'Mine'));
    }
}
