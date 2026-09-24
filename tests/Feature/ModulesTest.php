<?php

namespace Tests\Feature;

use App\Models\CleRecord;
use App\Models\Client;
use App\Models\ComplianceAudit;
use App\Models\ComplianceRequirement;
use App\Models\Conversation;
use App\Models\Court;
use App\Models\Document;
use App\Models\Expense;
use App\Models\Hearing;
use App\Models\Invoice;
use App\Models\Judge;
use App\Models\KnowledgeArticle;
use App\Models\LegalPrecedent;
use App\Models\Matter;
use App\Models\MatterEvent;
use App\Models\NotificationTemplate;
use App\Models\ProfessionalLicense;
use App\Models\RegulatoryBody;
use App\Models\ResearchProject;
use App\Models\RiskAssessment;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Task;
use App\Models\Taxonomy;
use App\Models\TimeEntry;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ModulesTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        // The four shipped roles are what user validation checks against.
        $this->seed(RoleSeeder::class);

        return User::factory()->create(['role' => 'admin']);
    }

    public function test_a_list_entry_is_unique_within_its_kind_but_not_across_kinds(): void
    {
        $admin = $this->admin();
        $entry = ['name' => 'civil', 'sort' => 0, 'active' => true];

        $this->actingAs($admin)->post('/setup', $entry + ['kind' => 'case_type'])->assertSessionHasNoErrors();
        $this->actingAs($admin)->post('/setup', $entry + ['kind' => 'case_type'])->assertSessionHasErrors('name');
        $this->actingAs($admin)->post('/setup', $entry + ['kind' => 'practice_area'])->assertSessionHasNoErrors();

        $this->assertSame(2, Taxonomy::count());
    }

    public function test_case_dropdowns_are_driven_by_firm_setup(): void
    {
        $admin = $this->admin();
        Taxonomy::create(['kind' => 'case_type', 'name' => 'maritime', 'sort' => 0, 'active' => true]);

        $this->actingAs($admin)->get('/matters')
            ->assertInertia(fn ($page) => $page->where('options.caseTypes', ['maritime']));
    }

    public function test_the_last_admin_cannot_be_demoted_or_deleted(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->put("/users/{$admin->id}", [
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => 'lawyer',
            'active' => true,
        ])->assertSessionHasErrors('role');

        $this->assertSame('admin', $admin->refresh()->role);

        $second = User::factory()->create(['role' => 'admin']);
        $this->actingAs($second)->delete("/users/{$admin->id}")->assertSessionHasNoErrors();
        $this->assertSame(1, User::where('role', 'admin')->count());
    }

    public function test_an_admin_cannot_delete_their_own_account_from_the_team_screen(): void
    {
        $admin = $this->admin();
        User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->delete("/users/{$admin->id}")->assertSessionHasErrors('name');
        $this->assertNotNull(User::find($admin->id));
    }

    public function test_publishing_an_article_stamps_the_date_once(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/articles', [
            'title' => 'Opening a file',
            'body' => 'Steps.',
            'status' => 'published',
        ])->assertSessionHasNoErrors();

        $article = KnowledgeArticle::sole();
        $this->assertNotNull($article->published_at);
        $this->assertSame('opening-a-file', $article->slug);

        $firstPublish = $article->published_at;

        $this->travel(2)->days();
        $this->actingAs($admin)->put("/articles/{$article->id}", [
            'title' => 'Opening a file',
            'body' => 'Revised steps.',
            'status' => 'published',
        ]);

        $this->assertTrue($firstPublish->equalTo($article->refresh()->published_at));
    }

    public function test_a_duplicate_article_title_still_gets_its_own_slug(): void
    {
        $admin = $this->admin();

        foreach (range(1, 2) as $ignored) {
            $this->actingAs($admin)->post('/articles', ['title' => 'Costs', 'body' => 'Body.', 'status' => 'draft']);
        }

        $this->assertSame(['costs', 'costs-2'], KnowledgeArticle::orderBy('id')->pluck('slug')->all());
    }

    public function test_risk_score_bands_follow_the_matrix(): void
    {
        // Low 1-4, medium 5-9, high 10-19, critical 20-25 — the colours of the matrix.
        $cases = [[1, 1, 'low'], [1, 4, 'low'], [2, 3, 'medium'], [3, 3, 'medium'], [2, 5, 'high'], [3, 5, 'high'], [4, 5, 'critical'], [5, 5, 'critical']];

        foreach ($cases as [$likelihood, $impact, $band]) {
            $risk = new RiskAssessment(['likelihood' => $likelihood, 'impact' => $impact]);
            $this->assertSame($likelihood * $impact, $risk->score());
            $this->assertSame($band, $risk->band(), "L$likelihood x I$impact");
        }
    }

    public function test_the_risk_matrix_counts_where_the_register_sits(): void
    {
        $admin = $this->admin();

        $make = fn (string $title, string $category, int $likelihood, int $impact, string $status) => RiskAssessment::create([
            'owner_id' => $admin->id, 'title' => $title, 'category' => $category,
            'likelihood' => $likelihood, 'impact' => $impact, 'status' => $status,
            'identified_on' => now()->subMonth(),
        ]);

        $make('Strategic partnership failure', 'market', 5, 5, 'identified');   // 25, critical
        $make('Employee turnover', 'reputational', 2, 5, 'mitigated');          // 10, high
        $make('Brand impersonation', 'reputational', 2, 3, 'identified');       //  6, medium
        $make('Platform downtime', 'cyber', 1, 2, 'assessed');                  //  2, low
        $make('Negative reviews', 'reputational', 1, 3, 'closed');              //  3, low

        $this->actingAs($admin)->get('/compliance/risk-assessments')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('totals.all', 5)
                ->where('totals.severe', 2)       // critical and high together
                ->where('totals.open', 4)
                ->where('totals.closed', 1)
                ->where('counts.identified', 2)
                ->where('matrix.5x5', 1)
                ->where('matrix.1x3', 1)
                ->where('risks.data.0.band', 'critical')
                ->where('risks.data.0.score', 25));

        // The band dropdown is a filter, so it narrows the tab counts and the matrix.
        $this->actingAs($admin)->get('/compliance/risk-assessments?band=low')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('risks.total', 2)
                ->where('counts.all', 2)
                ->where('totals.severe', 0));

        // A status tab must not narrow its own counts.
        $this->actingAs($admin)->get('/compliance/risk-assessments?status=identified')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('risks.total', 2)->where('counts.all', 5)->where('counts.closed', 1));

        $this->actingAs($admin)->get('/compliance/risk-assessments?band=nonsense')->assertSessionHasErrors('band');
        $this->actingAs($admin)->get('/compliance/risk-assessments?status=open')->assertSessionHasErrors('status');
    }

    public function test_risk_scores_out_of_range_are_rejected(): void
    {
        $this->actingAs($this->admin())->post('/compliance/risk-assessments', [
            'title' => 'Impossible risk',
            'likelihood' => 9,
            'impact' => 3,
            'status' => 'identified',
        ])->assertSessionHasErrors('likelihood');

        $this->assertSame(0, RiskAssessment::count());
    }

    public function test_billing_settings_fall_back_to_defaults_and_persist(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->get('/settings/billing')
            ->assertInertia(fn ($page) => $page->where('values.invoice_prefix', 'INV'));

        $this->actingAs($admin)->put('/settings/billing', [
            'firm_name' => 'Whitmore & Co.',
            'invoice_prefix' => 'WC',
            'payment_terms_days' => 14,
            'default_tax_percent' => 7.5,
            'default_hourly_rate' => 300,
            'currency' => 'EUR',
        ])->assertSessionHasNoErrors();

        $this->actingAs($admin)->get('/settings/billing')
            ->assertInertia(fn ($page) => $page->where('values.invoice_prefix', 'WC')->where('values.currency', 'EUR'));
    }

    public function test_an_invalid_invoice_prefix_is_rejected(): void
    {
        $this->actingAs($this->admin())->put('/settings/billing', [
            'firm_name' => 'Firm',
            'invoice_prefix' => 'lower case!',
            'payment_terms_days' => 30,
            'default_tax_percent' => 0,
            'default_hourly_rate' => 250,
            'currency' => 'USD',
        ])->assertSessionHasErrors('invoice_prefix');
    }

    public function test_the_case_list_sorts_and_pages_on_request(): void
    {
        $user = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd']);

        foreach (['Beta matter', 'Alpha matter', 'Gamma matter'] as $i => $title) {
            Matter::create([
                'client_id' => $client->id,
                'reference' => Matter::nextReference(),
                'title' => $title,
                'priority' => 'medium',
                'status' => 'open',
                'opened_on' => now()->subDays($i),
                'hourly_rate_cents' => 25000,
            ]);
        }

        $this->actingAs($user)->get('/matters?sort=title&direction=asc&per_page=10')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort.column', 'title')
                ->where('sort.direction', 'asc')
                ->where('matters.data.0.title', 'Alpha matter'));

        $this->actingAs($user)->get('/matters?sort=title&direction=desc')
            ->assertInertia(fn ($page) => $page->where('matters.data.0.title', 'Gamma matter'));
    }

    public function test_an_unknown_sort_column_is_rejected(): void
    {
        $this->actingAs($this->admin())->get('/matters?sort=hourly_rate_cents')->assertSessionHasErrors('sort');
    }

    public function test_the_row_action_closes_and_reopens_a_case(): void
    {
        $user = $this->admin();
        $matter = Matter::create([
            'client_id' => Client::create(['name' => 'Acme Ltd'])->id,
            'reference' => Matter::nextReference(),
            'title' => 'Acme v. Nemo',
            'priority' => 'high',
            'status' => 'open',
            'opened_on' => now()->subMonth(),
            'hourly_rate_cents' => 30000,
        ]);

        $this->actingAs($user)->patch("/matters/{$matter->id}/toggle-status");
        $matter->refresh();
        $this->assertSame('closed', $matter->status);
        $this->assertNotNull($matter->closed_on);

        $this->actingAs($user)->patch("/matters/{$matter->id}/toggle-status");
        $matter->refresh();
        $this->assertSame('open', $matter->status);
        $this->assertNull($matter->closed_on);
    }

    public function test_clients_filter_by_type_and_status(): void
    {
        $user = $this->admin();

        Client::create(['name' => 'Acme Ltd', 'type' => 'Corporate', 'active' => true]);
        Client::create(['name' => 'Jane Doe', 'type' => 'Individual', 'active' => true]);
        Client::create(['name' => 'Old Co', 'type' => 'Corporate', 'active' => false]);

        $this->actingAs($user)->get('/clients?type=Corporate')
            ->assertInertia(fn ($page) => $page->where('clients.total', 2));

        $this->actingAs($user)->get('/clients?status=inactive')
            ->assertInertia(fn ($page) => $page->where('clients.total', 1)->where('clients.data.0.name', 'Old Co'));

        $this->actingAs($user)->get('/clients?type=Corporate&status=active')
            ->assertInertia(fn ($page) => $page->where('clients.total', 1)->where('clients.data.0.name', 'Acme Ltd'));
    }

    public function test_archiving_a_client_keeps_their_cases(): void
    {
        $user = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd', 'active' => true]);

        Matter::create([
            'client_id' => $client->id,
            'reference' => Matter::nextReference(),
            'title' => 'Acme v. Nemo',
            'priority' => 'high',
            'status' => 'open',
            'opened_on' => now(),
            'hourly_rate_cents' => 30000,
        ]);

        $this->actingAs($user)->patch("/clients/{$client->id}/toggle-status");

        $this->assertFalse($client->refresh()->active);
        $this->assertSame(1, Matter::where('client_id', $client->id)->count());

        $this->actingAs($user)->patch("/clients/{$client->id}/toggle-status");
        $this->assertTrue($client->refresh()->active);
    }

    public function test_the_client_profile_totals_only_count_that_client(): void
    {
        $user = $this->admin();
        $mine = Client::create(['name' => 'Acme Ltd']);
        $other = Client::create(['name' => 'Other Ltd']);

        foreach ([$mine, $other] as $client) {
            $matter = Matter::create([
                'client_id' => $client->id,
                'reference' => Matter::nextReference(),
                'title' => "Matter for {$client->name}",
                'priority' => 'medium',
                'status' => 'open',
                'opened_on' => now(),
                'hourly_rate_cents' => 30000,
            ]);

            TimeEntry::create([
                'matter_id' => $matter->id,
                'user_id' => $user->id,
                'worked_on' => now(),
                'minutes' => 60,
                'rate_cents' => 30000,
                'billable' => true,
                'description' => 'Work',
            ]);
        }

        // 60 minutes at 300.00/h bills 300.00 — the other client's time must not appear.
        $this->actingAs($user)->get("/clients/{$mine->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('totals.billedCents', 30000)->where('totals.openCases', 1));
    }

    private function hearingOn(string $when, string $status = 'scheduled'): Hearing
    {
        $matter = Matter::first() ?: Matter::create([
            'client_id' => Client::create(['name' => 'Acme Ltd'])->id,
            'reference' => Matter::nextReference(),
            'title' => 'Acme v. Nemo',
            'priority' => 'medium',
            'status' => 'open',
            'opened_on' => now()->subMonth(),
            'hourly_rate_cents' => 30000,
        ]);

        return Hearing::create([
            'matter_id' => $matter->id,
            'scheduled_at' => $when,
            'duration_minutes' => 60,
            'title' => 'Initial Hearing',
            'type' => 'arguments',
            'status' => $status,
        ]);
    }

    public function test_the_hearing_diary_shows_only_the_selected_day(): void
    {
        $user = $this->admin();

        $this->hearingOn(now()->setTime(10, 15)->toDateTimeString());
        $this->hearingOn(now()->setTime(14, 0)->toDateTimeString(), 'completed');
        $this->hearingOn(now()->addDay()->setTime(9, 0)->toDateTimeString());

        $this->actingAs($user)->get('/hearings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('isToday', true)
                ->where('counts.all', 2)
                ->where('counts.completed', 1)
                ->has('hearings', 2)
                ->where('hearings.0.time', '10:15'));

        $tomorrow = now()->addDay()->toDateString();
        $this->actingAs($user)->get("/hearings?date={$tomorrow}")
            ->assertInertia(fn ($page) => $page->where('isToday', false)->has('hearings', 1)->where('counts.all', 1));
    }

    public function test_status_tabs_filter_the_list_but_keep_their_own_counts(): void
    {
        $user = $this->admin();

        $this->hearingOn(now()->setTime(9, 0)->toDateTimeString(), 'scheduled');
        $this->hearingOn(now()->setTime(11, 0)->toDateTimeString(), 'cancelled');

        // Filtering to one status still shows both tab counts, so the tabs stay usable.
        $this->actingAs($user)->get('/hearings?status=cancelled')
            ->assertInertia(fn ($page) => $page
                ->has('hearings', 1)
                ->where('hearings.0.status', 'cancelled')
                ->where('counts.all', 2)
                ->where('counts.scheduled', 1));
    }

    public function test_the_calendar_marks_days_that_have_hearings(): void
    {
        $user = $this->admin();

        $this->hearingOn(now()->startOfMonth()->addDays(4)->setTime(9, 0)->toDateTimeString());
        $this->hearingOn(now()->startOfMonth()->addDays(4)->setTime(15, 0)->toDateTimeString());
        $this->hearingOn(now()->startOfMonth()->addDays(9)->setTime(9, 0)->toDateTimeString());

        $expected = [
            now()->startOfMonth()->addDays(4)->toDateString(),
            now()->startOfMonth()->addDays(9)->toDateString(),
        ];

        $this->actingAs($user)->get('/hearings')
            ->assertInertia(fn ($page) => $page->where('markedDays', fn ($days) => collect($days)->sort()->values()->all() === $expected));
    }

    public function test_a_hearing_needs_a_title_and_a_sane_duration(): void
    {
        $user = $this->admin();
        $matter = Matter::create([
            'client_id' => Client::create(['name' => 'Acme Ltd'])->id,
            'reference' => Matter::nextReference(),
            'title' => 'Acme v. Nemo',
            'priority' => 'medium',
            'status' => 'open',
            'opened_on' => now(),
            'hourly_rate_cents' => 30000,
        ]);

        $this->actingAs($user)->post('/hearings', [
            'matter_id' => $matter->id,
            'scheduled_at' => now()->toDateTimeString(),
            'duration_minutes' => 5000,
            'status' => 'scheduled',
        ])->assertSessionHasErrors(['title', 'duration_minutes']);

        $this->assertSame(0, Hearing::count());
    }

    public function test_starting_a_conversation_is_idempotent(): void
    {
        $user = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd']);

        $this->actingAs($user)->post('/messages/start', ['contact_type' => 'client', 'contact_id' => $client->id])
            ->assertRedirect();
        $this->actingAs($user)->post('/messages/start', ['contact_type' => 'client', 'contact_id' => $client->id]);

        $this->assertSame(1, Conversation::count());
    }

    public function test_a_conversation_cannot_be_started_with_someone_who_does_not_exist(): void
    {
        $this->actingAs($this->admin())->post('/messages/start', ['contact_type' => 'client', 'contact_id' => 9999])
            ->assertNotFound();

        $this->assertSame(0, Conversation::count());
    }

    public function test_opening_a_thread_marks_the_contacts_messages_read(): void
    {
        $user = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd']);

        $conversation = Conversation::create([
            'owner_id' => $user->id,
            'contact_type' => 'client',
            'contact_id' => $client->id,
        ]);

        foreach (['contact', 'firm'] as $sender) {
            $conversation->messages()->create([
                'client_id' => $client->id,
                'user_id' => $user->id,
                'sender' => $sender,
                'direction' => $sender === 'firm' ? 'outbound' : 'inbound',
                'channel' => 'portal',
                'body' => 'Hello',
                'occurred_at' => now(),
            ]);
        }

        $this->assertSame(1, $conversation->unreadCount());

        $this->actingAs($user)->get("/messages?conversation={$conversation->id}")->assertOk();

        $this->assertSame(0, $conversation->refresh()->unreadCount());
    }

    public function test_a_thread_belongs_to_its_owner_only(): void
    {
        $owner = $this->admin();
        $stranger = User::factory()->create(['role' => 'lawyer']);
        $client = Client::create(['name' => 'Acme Ltd']);

        $conversation = Conversation::create([
            'owner_id' => $owner->id,
            'contact_type' => 'client',
            'contact_id' => $client->id,
        ]);

        $this->actingAs($stranger)->post("/messages/{$conversation->id}", ['body' => 'Sneaking in'])->assertForbidden();
        $this->actingAs($stranger)->delete("/messages/{$conversation->id}")->assertForbidden();

        $this->assertSame(0, $conversation->messages()->count());
    }

    public function test_sending_a_message_stamps_the_thread(): void
    {
        $user = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd']);

        $conversation = Conversation::create([
            'owner_id' => $user->id,
            'contact_type' => 'client',
            'contact_id' => $client->id,
        ]);

        $this->assertNull($conversation->last_message_at);

        $this->actingAs($user)->post("/messages/{$conversation->id}", ['body' => 'Engagement letter attached.'])
            ->assertSessionHasNoErrors();

        $conversation->refresh();
        $this->assertNotNull($conversation->last_message_at);

        $message = $conversation->messages()->sole();
        $this->assertSame('firm', $message->sender);
        $this->assertSame($client->id, $message->client_id);
        $this->assertNotNull($message->read_at);
    }

    public function test_system_settings_are_admin_only(): void
    {
        $lawyer = User::factory()->create(['role' => 'lawyer']);

        $this->actingAs($lawyer)->get('/system-settings')->assertForbidden();
        $this->actingAs($lawyer)->put('/system-settings/brand', [
            'firm_name' => 'Hijacked',
            'title_text' => 'Hijacked',
            'theme_color' => '#000000',
        ])->assertForbidden();

        $this->assertNotSame('Hijacked', Setting::get('firm_name'));
    }

    public function test_currency_settings_drive_the_shared_formatter(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->put('/system-settings/currency', [
            'currency' => 'EUR',
            'currency_symbol' => '€',
            'currency_symbol_position' => 'after',
            'currency_symbol_space' => true,
            'currency_decimals' => 2,
            'currency_show_decimals' => true,
            'currency_decimal_separator' => ',',
            'currency_thousands_separator' => '.',
        ])->assertSessionHasNoErrors();

        $this->actingAs($admin)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('settings.currency.symbol', '€')
                ->where('settings.currency.position', 'after')
                ->where('settings.currency.space', true)
                ->where('settings.currency.decimalSeparator', ',')
                ->where('settings.currency.thousandsSeparator', '.'));
    }

    public function test_turning_decimals_off_reports_zero_places(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->put('/system-settings/currency', [
            'currency' => 'USD',
            'currency_symbol' => '$',
            'currency_symbol_position' => 'before',
            'currency_symbol_space' => false,
            'currency_decimals' => 2,
            'currency_show_decimals' => false,
            'currency_decimal_separator' => '.',
            'currency_thousands_separator' => ',',
        ]);

        $this->assertSame(0, Setting::currency()['decimals']);
    }

    public function test_the_mail_password_is_never_sent_to_the_browser(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->put('/system-settings/email', [
            'mail_driver' => 'smtp',
            'mail_host' => 'smtp.example.com',
            'mail_port' => 587,
            'mail_username' => 'user@example.com',
            'mail_password' => 'super-secret',
            'mail_encryption' => 'tls',
            'mail_from_address' => 'noreply@example.com',
            'mail_from_name' => 'Advocate',
        ])->assertSessionHasNoErrors();

        $this->actingAs($admin)->get('/system-settings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->missing('values.mail_password')->where('hasSecret.mail_password', true));
    }

    public function test_a_blank_mail_password_keeps_the_stored_one(): void
    {
        $admin = $this->admin();
        Setting::updateOrCreate(['key' => 'mail_password'], ['value' => 'original']);

        $this->actingAs($admin)->put('/system-settings/email', [
            'mail_driver' => 'smtp',
            'mail_host' => 'smtp.example.com',
            'mail_port' => 587,
            'mail_username' => 'user@example.com',
            'mail_password' => '',
            'mail_encryption' => 'tls',
            'mail_from_address' => 'noreply@example.com',
            'mail_from_name' => 'Advocate',
        ]);

        $this->assertSame('original', Setting::get('mail_password'));
    }

    public function test_credentials_for_the_new_integrations_never_reach_the_browser(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->put('/system-settings/twilio', [
            'twilio_enabled' => true,
            'twilio_account_sid' => 'AC'.str_repeat('a', 32),
            'twilio_auth_token' => 'token-secret',
            'twilio_from_number' => '+15550123456',
        ])->assertSessionHasNoErrors();

        $this->actingAs($admin)->put('/system-settings/payments', [
            'bank_transfer_enabled' => true,
            'bank_transfer_details' => 'Account 12345678',
            'stripe_enabled' => true,
            'stripe_publishable_key' => 'pk_test_123',
            'stripe_secret_key' => 'sk_test_secret',
            'paypal_enabled' => false,
            'paypal_mode' => 'sandbox',
            'paypal_client_id' => '',
            'paypal_secret' => '',
        ])->assertSessionHasNoErrors();

        $this->actingAs($admin)->get('/system-settings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->missing('values.twilio_auth_token')
                ->missing('values.stripe_secret_key')
                ->where('hasSecret.twilio_auth_token', true)
                ->where('hasSecret.stripe_secret_key', true)
                ->where('values.twilio_account_sid', 'AC'.str_repeat('a', 32)));

        // A blank secret means "keep what is stored", as with the mail password.
        $this->actingAs($admin)->put('/system-settings/twilio', [
            'twilio_enabled' => true,
            'twilio_account_sid' => 'AC'.str_repeat('b', 32),
            'twilio_auth_token' => '',
            'twilio_from_number' => '+15550123456',
        ]);

        $this->assertSame('token-secret', Setting::get('twilio_auth_token'));
    }

    public function test_the_hearing_feed_is_served_only_for_the_current_token(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->put('/system-settings/calendar', [
            'google_calendar_enabled' => true,
            'google_calendar_id' => 'firm@group.calendar.google.com',
        ])->assertSessionHasNoErrors();

        $token = Setting::get('calendar_feed_token');
        $this->assertNotEmpty($token);

        // Calendar clients fetch it without a session.
        $this->get("/calendar/feed/{$token}.ics")
            ->assertOk()
            ->assertHeader('content-type', 'text/calendar; charset=utf-8')
            ->assertSee('BEGIN:VCALENDAR');

        $this->get('/calendar/feed/'.str_repeat('z', 40).'.ics')->assertNotFound();

        $this->actingAs($admin)->post('/system-settings/calendar/regenerate');
        $this->assertNotSame($token, Setting::get('calendar_feed_token'));
        $this->get("/calendar/feed/{$token}.ics")->assertNotFound();
    }

    public function test_the_feed_stops_serving_when_the_integration_is_switched_off(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->put('/system-settings/calendar', ['google_calendar_enabled' => true, 'google_calendar_id' => '']);
        $token = Setting::get('calendar_feed_token');

        $this->actingAs($admin)->put('/system-settings/calendar', ['google_calendar_enabled' => false, 'google_calendar_id' => '']);

        $this->get("/calendar/feed/{$token}.ics")->assertNotFound();
    }

    public function test_only_admins_may_change_the_new_integration_settings(): void
    {
        $lawyer = User::factory()->create(['role' => 'lawyer']);

        $this->actingAs($lawyer)->put('/system-settings/twilio', [
            'twilio_enabled' => false,
            'twilio_account_sid' => '',
            'twilio_auth_token' => '',
            'twilio_from_number' => '',
        ])->assertForbidden();

        $this->actingAs($lawyer)->put('/system-settings/calendar', [
            'google_calendar_enabled' => false,
            'google_calendar_id' => '',
        ])->assertForbidden();

        $this->actingAs($lawyer)->post('/system-settings/calendar/regenerate')->assertForbidden();
    }

    public function test_slack_requires_a_real_slack_webhook_when_enabled(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->put('/system-settings/slack', [
            'slack_enabled' => true,
            'slack_webhook_url' => 'https://evil.example.com/hook',
        ])->assertSessionHasErrors('slack_webhook_url');

        $this->actingAs($admin)->put('/system-settings/slack', [
            'slack_enabled' => true,
            'slack_webhook_url' => '',
        ])->assertSessionHasErrors('slack_webhook_url');

        $this->actingAs($admin)->put('/system-settings/slack', [
            'slack_enabled' => true,
            'slack_webhook_url' => 'https://hooks.slack.com/services/T000/B000/xyz',
        ])->assertSessionHasNoErrors();
    }

    public function test_a_notification_template_can_be_toggled(): void
    {
        $admin = $this->admin();
        $template = NotificationTemplate::create([
            'key' => 'hearing_reminder',
            'name' => 'Hearing reminder',
            'channel' => 'email',
            'subject' => 'Reminder',
            'body' => 'Body',
            'active' => true,
        ]);

        $this->actingAs($admin)->patch("/system-settings/templates/{$template->id}");
        $this->assertFalse($template->refresh()->active);

        $this->actingAs($admin)->patch("/system-settings/templates/{$template->id}");
        $this->assertTrue($template->refresh()->active);
    }

    public function test_task_status_is_the_single_source_of_truth_for_done(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/tasks', [
            'title' => 'File exhibits', 'status' => 'in_progress', 'priority' => 'high', 'type' => 'Filing',
        ])->assertSessionHasNoErrors();

        $task = Task::firstOrFail();
        $this->assertNull($task->completed_at);

        // Moving the card to Completed is what marks it done...
        $this->actingAs($admin)->patch("/tasks/{$task->id}/status", ['status' => 'completed']);
        $this->assertNotNull($task->refresh()->completed_at);

        // ...and dragging it back out clears the timestamp again.
        $this->actingAs($admin)->patch("/tasks/{$task->id}/status", ['status' => 'on_hold']);
        $this->assertNull($task->refresh()->completed_at);

        // The list checkbox goes through the same status field.
        $this->actingAs($admin)->patch("/tasks/{$task->id}/toggle");
        $this->assertSame('completed', $task->refresh()->status);
        $this->assertNotNull($task->completed_at);

        $this->actingAs($admin)->patch("/tasks/{$task->id}/status", ['status' => 'nonsense'])->assertSessionHasErrors('status');
    }

    public function test_the_kanban_view_groups_tasks_by_status_and_counts_every_priority(): void
    {
        $admin = $this->admin();

        foreach ([['a', 'critical', 'not_started'], ['b', 'critical', 'blocked'], ['c', 'low', 'blocked']] as [$title, $priority, $status]) {
            $this->actingAs($admin)->post('/tasks', ['title' => $title, 'priority' => $priority, 'status' => $status]);
        }

        $this->actingAs($admin)->get('/tasks?view=kanban&priority=critical')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('view', 'kanban')
                ->where('tasks', null)
                ->count('board.blocked', 1)
                ->count('board.not_started', 1)
                // Counts describe the search, not the priority tab standing on it.
                ->where('counts.all', 3)
                ->where('counts.critical', 2)
                ->where('counts.low', 1));

        $this->actingAs($admin)->get('/tasks?view=kanban&status=blocked')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 2)->count('board.blocked', 2));
    }

    public function test_task_types_come_from_firm_setup(): void
    {
        $admin = $this->admin();
        Taxonomy::create(['kind' => 'task_type', 'name' => 'Mediation', 'color' => '#123456', 'sort' => 0, 'active' => true]);

        $this->actingAs($admin)->get('/tasks')
            ->assertOk()
            // The board is what Tasks opens on; the table is the alternative view.
            ->assertInertia(fn ($page) => $page
                ->where('view', 'kanban')
                ->where('options.types', [['name' => 'Mediation', 'color' => '#123456']]));

        $this->actingAs($admin)->get('/tasks?view=list')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('view', 'list')->where('board', null));
    }

    public function test_expenses_group_by_case_and_narrow_to_the_selected_status(): void
    {
        $admin = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd']);

        $first = Matter::create([
            'client_id' => $client->id, 'reference' => 'CASE-1', 'title' => 'Employment', 'priority' => 'high',
            'status' => 'open', 'opened_on' => now(), 'hourly_rate_cents' => 30000,
        ]);
        $second = Matter::create([
            'client_id' => $client->id, 'reference' => 'CASE-2', 'title' => 'Injury', 'priority' => 'low',
            'status' => 'open', 'opened_on' => now(), 'hourly_rate_cents' => 30000,
        ]);

        $make = fn (?Matter $m, string $status, int $cents, bool $billable) => Expense::create([
            'matter_id' => $m?->id, 'user_id' => $admin->id, 'description' => 'Filing fee', 'category' => 'court fees',
            'amount_cents' => $cents, 'billable' => $billable, 'status' => $status, 'incurred_on' => now()->toDateString(),
        ]);

        $make($first, 'pending', 10000, true);
        $make($first, 'pending', 5000, false);
        $make($first, 'approved', 2000, true);
        $make($second, 'rejected', 7000, true);
        $make(null, 'pending', 300, false);

        $this->actingAs($admin)->get('/expenses?matter='.$first->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('status', 'pending')
                ->where('expenses.total', 2)
                ->where('caseSummary.billableCents', 12000)
                ->where('caseSummary.nonBillableCents', 5000)
                ->where('caseSummary.counts.pending', 2)
                ->where('caseSummary.counts.approved', 1)
                ->where('totals.allCents', 24300)
                ->where('totals.pendingCents', 15300)
                ->where('totals.approvedCents', 2000)
                // Every case with an expense appears, including firm overhead.
                ->count('cases', 3));

        $this->actingAs($admin)->get('/expenses?matter='.$second->id.'&status=rejected')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('expenses.total', 1)->where('expenses.data.0.amount_cents', 7000));

        // The Bill Type filter reshapes the rail, not just the table.
        $this->actingAs($admin)->get('/expenses?billable=no')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->count('cases', 2)->where('totals.allCents', 5300));
    }

    public function test_an_expense_is_approved_or_rejected_in_place_and_frozen_once_invoiced(): void
    {
        $admin = $this->admin();
        $expense = Expense::create([
            'user_id' => $admin->id, 'description' => 'Courier', 'category' => 'courier', 'amount_cents' => 1500,
            'billable' => true, 'status' => 'pending', 'incurred_on' => now()->toDateString(),
        ]);

        $this->actingAs($admin)->patch("/expenses/{$expense->id}/status", ['status' => 'approved'])->assertSessionHasNoErrors();
        $this->assertSame('approved', $expense->refresh()->status);

        $this->actingAs($admin)->patch("/expenses/{$expense->id}/status", ['status' => 'nonsense'])->assertSessionHasErrors('status');

        $invoice = Invoice::create([
            'client_id' => Client::create(['name' => 'Acme'])->id, 'number' => 'INV-1',
            'issued_on' => now(), 'due_on' => now()->addDays(30), 'status' => 'sent',
            'subtotal_cents' => 1500, 'tax_cents' => 0, 'paid_cents' => 0,
        ]);
        $expense->update(['invoice_id' => $invoice->id]);

        $this->actingAs($admin)->patch("/expenses/{$expense->id}/status", ['status' => 'rejected'])->assertSessionHasErrors('status');
        $this->assertSame('approved', $expense->refresh()->status);
    }

    public function test_analytics_series_are_zero_filled_and_scoped_to_the_chosen_year(): void
    {
        $admin = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd']);

        $make = fn (string $openedOn, string $priority) => Matter::create([
            'client_id' => $client->id, 'reference' => 'CASE-'.uniqid(), 'title' => 'Matter', 'priority' => $priority,
            'status' => 'open', 'opened_on' => $openedOn, 'hourly_rate_cents' => 30000,
        ]);

        $make('2026-03-04', 'high');
        $make('2026-03-19', 'low');
        $make('2025-03-04', 'high');

        $this->actingAs($admin)->get('/analytics?year=2026')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('year', 2026)
                ->count('casesByMonth', 12)
                ->count('revenueByMonth', 12)
                ->count('tasksByMonth', 12)
                ->where('casesByMonth.2.label', 'Mar')
                ->where('casesByMonth.2.high', 1)
                ->where('casesByMonth.2.low', 1)
                // January has nothing, and must still be present as a zero.
                ->where('casesByMonth.0.high', 0));

        $this->actingAs($admin)->get('/analytics?year=2025')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('casesByMonth.2.high', 1)->where('casesByMonth.2.low', 0));

        $this->actingAs($admin)->get('/analytics?year=nonsense')->assertSessionHasErrors('year');
    }

    public function test_analytics_headline_numbers_come_from_real_invoices_and_cases(): void
    {
        $admin = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd']);

        Matter::create([
            'client_id' => $client->id, 'reference' => 'CASE-A', 'title' => 'Open one', 'priority' => 'high',
            'status' => 'open', 'opened_on' => now()->subDays(40), 'hourly_rate_cents' => 30000,
        ]);
        Matter::create([
            'client_id' => $client->id, 'reference' => 'CASE-B', 'title' => 'Closed one', 'priority' => 'low',
            'status' => 'closed', 'opened_on' => now()->subDays(40), 'closed_on' => now()->subDays(20),
            'hourly_rate_cents' => 30000,
        ]);

        // 1000.00 invoiced, 250.00 paid, and it is overdue.
        Invoice::create([
            'client_id' => $client->id, 'number' => 'INV-9', 'issued_on' => now()->subDays(60),
            'due_on' => now()->subDays(30), 'status' => 'sent',
            'subtotal_cents' => 100000, 'tax_cents' => 0, 'paid_cents' => 25000,
        ]);

        $this->actingAs($admin)->get('/analytics')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('metrics.closureRate', 50)
                ->where('metrics.avgResolutionDays', 20)
                ->where('metrics.collectionRate', 25)
                ->where('metrics.outstandingCents', 75000)
                ->where('overdueInvoices.0.number', 'INV-9')
                ->where('overdueInvoices.0.balance_cents', 75000)
                ->count('recentCases', 2));
    }

    public function test_the_calendar_window_follows_the_chosen_view(): void
    {
        $admin = $this->admin();

        // A Wednesday, with the firm's default Sunday week start.
        $this->actingAs($admin)->get('/calendar?view=day&date=2026-09-23')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('view', 'day')
                ->where('label', 'Wednesday, 23 September 2026')
                ->count('days', 1)
                ->where('days.0.date', '2026-09-23')
                ->where('nav.previous', '2026-09-22')
                ->where('nav.next', '2026-09-24'));

        $this->actingAs($admin)->get('/calendar?view=week&date=2026-09-23')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('view', 'week')
                ->count('days', 7)
                ->where('days.0.date', '2026-09-20')
                ->where('days.6.date', '2026-09-26')
                ->where('nav.previous', '2026-09-16'));

        // The month grid runs whole weeks, so it spills either side of September.
        $this->actingAs($admin)->get('/calendar?view=month&date=2026-09-23')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('label', 'September 2026')
                ->where('days.0.date', '2026-08-30')
                ->where('days.0.inMonth', false)
                ->where('days.2.inMonth', true)
                ->where('nav.previous', '2026-08-23'));

        $this->actingAs($admin)->get('/calendar?view=nonsense')->assertSessionHasErrors('view');
    }

    public function test_calendar_cells_carry_hearings_tasks_and_timeline_events(): void
    {
        $admin = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd']);
        $matter = Matter::create([
            'client_id' => $client->id, 'reference' => 'CASE-7', 'title' => 'Dispute', 'priority' => 'high',
            'status' => 'open', 'opened_on' => '2026-09-01', 'hourly_rate_cents' => 30000,
        ]);

        Hearing::create([
            'matter_id' => $matter->id, 'scheduled_at' => '2026-09-23 10:30:00', 'duration_minutes' => 60,
            'type' => 'arguments', 'status' => 'scheduled', 'title' => 'Court Hearing',
        ]);
        Task::create([
            'matter_id' => $matter->id, 'title' => 'Document Review', 'priority' => 'high',
            'status' => 'not_started', 'due_on' => '2026-09-23',
        ]);
        MatterEvent::create([
            'matter_id' => $matter->id, 'kind' => 'timeline', 'title' => 'Trial Preparation', 'occurred_at' => '2026-09-23 09:00:00',
        ]);

        $this->actingAs($admin)->get('/calendar?view=day&date=2026-09-23')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->count('events', 3)
                // A task has no clock time, so it heads the day, then the timed rows in order.
                ->where('events.0.kind', 'task')
                ->where('events.0.title', 'Document Review')
                ->where('events.1.kind', 'event')
                ->where('events.1.title', 'Trial Preparation')
                ->where('events.2.kind', 'hearing')
                ->where('events.2.time', '10:30')
                ->where('events.2.detail', 'CASE-7')
                ->where('summary.hearings', 1)
                ->where('summary.tasks', 1)
                ->where('summary.events', 1));

        // A neighbouring day holds none of them.
        $this->actingAs($admin)->get('/calendar?view=day&date=2026-09-24')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->count('events', 0)->where('summary.hearings', 1));
    }

    public function test_a_list_entry_carries_a_description_and_colour_and_can_be_retired(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'case_type', 'name' => 'Criminal Law', 'description' => 'Criminal defense and prosecution cases',
            'color' => '#EF4444', 'sort' => 0, 'active' => true,
        ])->assertSessionHasNoErrors();

        $entry = Taxonomy::firstOrFail();
        $this->assertSame('Criminal defense and prosecution cases', $entry->description);
        $this->assertSame('#EF4444', $entry->color);

        // A colour must be a six-digit hex, since the row tile paints with it directly.
        $this->actingAs($admin)->post('/setup', [
            'kind' => 'case_type', 'name' => 'Civil Law', 'color' => 'red', 'sort' => 1, 'active' => true,
        ])->assertSessionHasErrors('color');

        // The padlock retires an entry without deleting the cases that reference it.
        $this->actingAs($admin)->patch("/setup/{$entry->id}/toggle");
        $this->assertFalse($entry->refresh()->active);
        $this->actingAs($admin)->patch("/setup/{$entry->id}/toggle");
        $this->assertTrue($entry->refresh()->active);
    }

    public function test_the_setup_screen_searches_and_filters_within_one_list(): void
    {
        $admin = $this->admin();

        foreach ([['Criminal Law', 'Defense work', true], ['Civil Law', 'Disputes', true], ['Tax Law', 'Compliance', false]] as $i => [$name, $description, $active]) {
            Taxonomy::create(['kind' => 'case_type', 'name' => $name, 'description' => $description, 'sort' => $i, 'active' => $active]);
        }
        Taxonomy::create(['kind' => 'hearing_type', 'name' => 'Criminal arraignment', 'sort' => 0, 'active' => true]);

        $this->actingAs($admin)->get('/setup?kind=case_type&search=Criminal')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('label', 'Case Types')
                ->where('singular', 'Case Type')
                ->where('layout', 'form')
                // The other list's matching entry stays out of this one.
                ->count('entries.data', 1)
                ->where('entries.data.0.name', 'Criminal Law')
                // Tab counts describe the search, not the tab standing on it.
                ->where('counts.all', 1));

        $this->actingAs($admin)->get('/setup?kind=case_type&search=Disputes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->count('entries.data', 1)->where('entries.data.0.name', 'Civil Law'));

        $this->actingAs($admin)->get('/setup?kind=case_type&status=inactive')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->count('entries.data', 1)
                ->where('entries.data.0.name', 'Tax Law')
                ->where('counts.all', 3)
                ->where('counts.active', 2)
                ->where('counts.inactive', 1));

        $this->actingAs($admin)->get('/setup?kind=case_type&status=nonsense')->assertSessionHasErrors('status');
    }

    public function test_hearing_types_use_the_table_layout_and_carry_a_duration(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'hearing_type', 'name' => 'Motion Hearing', 'sort' => 0, 'active' => true,
            'meta' => ['duration_minutes' => 45],
        ])->assertSessionHasNoErrors();

        $this->assertSame(45, Taxonomy::firstOrFail()->meta['duration_minutes']);

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'hearing_type', 'name' => 'Too long', 'sort' => 1, 'active' => true,
            'meta' => ['duration_minutes' => 5000],
        ])->assertSessionHasErrors('meta.duration_minutes');

        $this->actingAs($admin)->get('/setup?kind=hearing_type')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('layout', 'table')
                ->where('label', 'Hearing Types')
                ->where('singular', 'Hearing Type')
                ->where('entries.data.0.meta.duration_minutes', 45)
                ->where('counts.all', 1)
                ->where('counts.inactive', 0));
    }

    public function test_research_projects_filter_and_count_across_every_status(): void
    {
        $admin = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd']);
        $matter = Matter::create([
            'client_id' => $client->id, 'reference' => 'CASE-4', 'title' => 'Dispute', 'priority' => 'high',
            'status' => 'open', 'opened_on' => now(), 'hourly_rate_cents' => 30000,
        ]);

        $make = fn (string $title, string $status, string $priority, ?int $matterId, string $type) => ResearchProject::create([
            'matter_id' => $matterId, 'title' => $title, 'type' => $type, 'priority' => $priority,
            'status' => $status, 'started_on' => '2026-09-01', 'due_on' => '2026-09-30',
        ]);

        $make('Regulatory Compliance Research', 'active', 'low', $matter->id, 'case law');
        $make('Constitutional Law Review', 'completed', 'medium', null, 'statute');
        $make('Criminal Procedure Analysis', 'on_hold', 'high', $matter->id, 'case law');

        $this->actingAs($admin)->get('/research-projects')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('view', 'list')
                ->where('counts.all', 3)
                ->where('counts.active', 1)
                ->where('counts.on_hold', 1)
                ->where('projects.total', 3));

        // The type filter narrows the rows and the tab counts together.
        $this->actingAs($admin)->get('/research-projects?type=case+law')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 2)->where('projects.total', 2));

        $this->actingAs($admin)->get('/research-projects?status=on_hold&view=grid')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('view', 'grid')
                ->where('projects.total', 1)
                ->where('projects.data.0.title', 'Criminal Procedure Analysis')
                // Counts still describe the whole search, not the chosen tab.
                ->where('counts.all', 3));

        $this->actingAs($admin)->get('/research-projects?search=Constitutional')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('projects.total', 1));

        $this->actingAs($admin)->get('/research-projects?status=nonsense')->assertSessionHasErrors('status');
    }

    public function test_the_refresh_button_steps_a_project_through_the_status_cycle(): void
    {
        $admin = $this->admin();
        $project = ResearchProject::create([
            'title' => 'Contract precedents', 'priority' => 'medium', 'status' => 'active', 'started_on' => '2026-09-01',
        ]);

        foreach (['completed', 'on_hold', 'cancelled', 'active'] as $expected) {
            $this->actingAs($admin)->patch("/research-projects/{$project->id}/status");
            $this->assertSame($expected, $project->refresh()->status);
        }
    }

    public function test_articles_carry_tags_and_count_every_status(): void
    {
        $admin = $this->admin();
        Taxonomy::create(['kind' => 'research_category', 'name' => 'Criminal Law', 'color' => '#7C2D12', 'sort' => 0, 'active' => true]);

        $this->actingAs($admin)->post('/articles', [
            'title' => 'Criminal Defense', 'category' => 'Criminal Law', 'summary' => 'Preparing a defence.',
            'tags' => ['criminal', 'defense', 'evidence', 'discovery'], 'body' => 'Long form body.', 'status' => 'published',
        ])->assertSessionHasNoErrors();

        $article = KnowledgeArticle::firstOrFail();
        $this->assertSame(['criminal', 'defense', 'evidence', 'discovery'], $article->tags);
        $this->assertNotNull($article->published_at);
        $this->assertSame($admin->id, $article->author_id);

        $this->actingAs($admin)->post('/articles', [
            'title' => 'Workplace Rights', 'summary' => 'Employment protections.', 'body' => 'Body.', 'status' => 'archived',
        ]);
        $this->actingAs($admin)->post('/articles', [
            'title' => 'Corporate Governance', 'summary' => 'Board duties.', 'body' => 'Body.', 'status' => 'draft',
        ]);

        $this->actingAs($admin)->get('/articles')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('counts.all', 3)
                ->where('counts.published', 1)
                ->where('counts.draft', 1)
                ->where('counts.archived', 1)
                // The category pill paints with the colour set in Firm Setup.
                ->where('categories.0.color', '#7C2D12'));

        $this->actingAs($admin)->get('/articles?category=Criminal+Law')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 1)->where('articles.total', 1));

        $this->actingAs($admin)->get('/articles?status=draft')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('articles.total', 1)
                ->where('articles.data.0.title', 'Corporate Governance')
                // Counts still describe the whole search, not the chosen tab.
                ->where('counts.all', 3));

        $this->actingAs($admin)->get('/articles?status=nonsense')->assertSessionHasErrors('status');
    }

    public function test_an_article_keeps_its_first_publication_date(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/articles', ['title' => 'Draft piece', 'body' => 'Body.', 'status' => 'draft']);
        $article = KnowledgeArticle::firstOrFail();
        $this->assertNull($article->published_at);

        $this->actingAs($admin)->put("/articles/{$article->id}", ['title' => 'Draft piece', 'body' => 'Body.', 'status' => 'published']);
        $published = $article->refresh()->published_at;
        $this->assertNotNull($published);

        // Editing a published article must not re-stamp the date.
        $this->actingAs($admin)->put("/articles/{$article->id}", ['title' => 'Renamed', 'body' => 'Body.', 'status' => 'published']);
        $this->assertTrue($published->equalTo($article->refresh()->published_at));
    }

    public function test_precedents_filter_by_score_band_and_report_the_average(): void
    {
        $admin = $this->admin();

        $make = fn (string $name, int $relevance, string $status, ?string $category) => LegalPrecedent::create([
            'case_name' => $name, 'citation' => "[1900] $relevance", 'jurisdiction' => 'England',
            'category' => $category, 'decided_on' => '1932-05-26', 'relevance' => $relevance, 'status' => $status,
        ]);

        $make('Donoghue v. Stevenson', 100, 'active', 'litigation');
        $make('Carlill v. Carbolic', 90, 'active', 'litigation');
        $make('Mapp v. Ohio', 80, 'questioned', 'family');
        $make('Plessy v. Ferguson', 60, 'overruled', 'family');

        $this->actingAs($admin)->get('/precedents')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('counts.all', 4)
                ->where('counts.active', 2)
                // The card adds overruled and questioned together.
                ->where('totals.unsettled', 2)
                // (100 + 90 + 80 + 60) / 4 = 82.5, shown out of ten.
                ->where('totals.avgRelevance', 8.3)
                ->where('precedents.data.0.case_name', 'Donoghue v. Stevenson'));

        // 90 and above is the top band; 70–89 the middle; below 70 the rest.
        $this->actingAs($admin)->get('/precedents?score=high')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('precedents.total', 2)->where('counts.all', 2));

        $this->actingAs($admin)->get('/precedents?score=medium')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('precedents.total', 1)->where('precedents.data.0.case_name', 'Mapp v. Ohio'));

        $this->actingAs($admin)->get('/precedents?score=low')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('precedents.total', 1)->where('precedents.data.0.case_name', 'Plessy v. Ferguson'));

        $this->actingAs($admin)->get('/precedents?category=family')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 2));

        $this->actingAs($admin)->get('/precedents?score=nonsense')->assertSessionHasErrors('score');
    }

    public function test_a_precedent_records_its_jurisdiction_and_decision_date(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/precedents', [
            'case_name' => 'Brown v. Board of Education', 'citation' => '347 U.S. 483 (1954)',
            'jurisdiction' => 'United States', 'category' => 'litigation', 'decided_on' => '1954-05-17',
            'relevance' => 100, 'status' => 'active',
        ])->assertSessionHasNoErrors();

        $precedent = LegalPrecedent::firstOrFail();
        $this->assertSame('United States', $precedent->jurisdiction);
        $this->assertSame('1954-05-17', $precedent->decided_on->toDateString());

        // A decision cannot be dated in the future.
        $this->actingAs($admin)->post('/precedents', [
            'case_name' => 'Future v. Time', 'citation' => 'x', 'decided_on' => now()->addYear()->toDateString(),
            'relevance' => 50, 'status' => 'active',
        ])->assertSessionHasErrors('decided_on');

        foreach (['overruled', 'questioned', 'archived', 'active'] as $expected) {
            $this->actingAs($admin)->patch("/precedents/{$precedent->id}/status");
            $this->assertSame($expected, $precedent->refresh()->status);
        }
    }

    public function test_only_colour_carrying_lists_offer_a_colour(): void
    {
        $admin = $this->admin();

        // Research types use the side form, but store no colour.
        $this->actingAs($admin)->get('/setup?kind=research_type')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('layout', 'form')
                ->where('hasColor', false)
                ->where('singular', 'Research Type'));

        $this->actingAs($admin)->get('/setup?kind=case_type')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('layout', 'form')->where('hasColor', true));

        $this->actingAs($admin)->get('/setup?kind=hearing_type')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('layout', 'table')->where('hasColor', false));

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'research_type', 'name' => 'Comparative Law',
            'description' => 'Comparative analysis of different legal systems', 'sort' => 0, 'active' => true,
        ])->assertSessionHasNoErrors();

        $this->assertSame('Comparative analysis of different legal systems', Taxonomy::firstOrFail()->description);
    }

    public function test_practice_areas_tab_by_expertise_rather_than_status(): void
    {
        $admin = $this->admin();

        $make = fn (string $name, string $expertise, bool $primary, bool $active) => Taxonomy::create([
            'kind' => 'practice_area', 'name' => $name, 'sort' => 0, 'active' => $active,
            'meta' => ['expertise' => $expertise, 'primary' => $primary],
        ]);

        $make('Criminal Law', 'expert', true, true);
        $make('Civil Litigation', 'expert', false, true);
        $make('Family Law', 'intermediate', false, true);
        $make('Immigration Law', 'beginner', false, false);

        $this->actingAs($admin)->get('/setup?kind=practice_area')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('facet.key', 'expertise')
                ->where('counts.all', 4)
                ->where('counts.expert', 2)
                ->where('counts.intermediate', 1)
                ->where('counts.beginner', 1)
                ->count('names', 4));

        $this->actingAs($admin)->get('/setup?kind=practice_area&level=expert')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('entries.total', 2)->where('counts.all', 4));

        // The status dropdown narrows the tab counts too, since it is a filter not a tab.
        $this->actingAs($admin)->get('/setup?kind=practice_area&status=inactive')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 1)->where('counts.beginner', 1)->where('counts.expert', 0));

        $this->actingAs($admin)->get('/setup?kind=practice_area&name=Family+Law')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('entries.total', 1)->where('entries.data.0.name', 'Family Law'));

        $this->actingAs($admin)->get('/setup?kind=practice_area&level=nonsense')->assertSessionHasErrors('level');

        // A list without a facet keeps the active/inactive tabs.
        $this->actingAs($admin)->get('/setup?kind=hearing_type')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('facet', null));
    }

    public function test_a_practice_area_stores_its_expertise_and_primary_flag(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'practice_area', 'name' => 'Corporate Law', 'sort' => 0, 'active' => true,
            'meta' => ['expertise' => 'intermediate', 'primary' => true],
        ])->assertSessionHasNoErrors();

        $area = Taxonomy::firstOrFail();
        $this->assertSame('intermediate', $area->meta['expertise']);
        $this->assertTrue($area->meta['primary']);

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'practice_area', 'name' => 'Nonsense', 'sort' => 1, 'active' => true,
            'meta' => ['expertise' => 'wizard'],
        ])->assertSessionHasErrors('meta.expertise');
    }

    public function test_audit_tabs_count_the_search_not_the_tab(): void
    {
        $admin = $this->admin();

        $make = fn (string $title, string $type, string $risk, string $status) => ComplianceAudit::create([
            'auditor_id' => $admin->id, 'auditor_firm' => 'Internal Audit Team', 'title' => $title,
            'type' => $type, 'risk_level' => $risk, 'status' => $status, 'scheduled_on' => now(),
        ]);

        $make('Quality assurance review', 'quality', 'critical', 'planned');
        $make('Financial controls review', 'financial', 'low', 'planned');
        $make('Annual compliance review', 'compliance', 'medium', 'in_progress');
        $make('Data protection audit', 'quality', 'high', 'cancelled');

        $this->actingAs($admin)->get('/compliance/audits')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('counts.all', 4)
                ->where('counts.planned', 2)
                ->where('counts.in_progress', 1)
                ->where('counts.cancelled', 1));

        // A tab must not narrow its own counts.
        $this->actingAs($admin)->get('/compliance/audits?status=planned')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('audits.total', 2)->where('counts.all', 4)->where('counts.cancelled', 1));

        // The dropdowns are filters, so they do narrow them.
        $this->actingAs($admin)->get('/compliance/audits?type=quality')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 2)->where('counts.planned', 1));

        $this->actingAs($admin)->get('/compliance/audits?risk_level=critical')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('audits.total', 1)->where('audits.data.0.auditor_firm', 'Internal Audit Team'));

        $this->actingAs($admin)->get('/compliance/audits?risk_level=nonsense')->assertSessionHasErrors('risk_level');

        $this->actingAs($admin)->post('/compliance/audits', [
            'title' => 'Trust account inspection', 'risk_level' => 'critical', 'status' => 'planned',
            'scheduled_on' => now()->toDateString(), 'auditor_firm' => 'External Auditing Firm',
        ])->assertSessionHasNoErrors();

        // Completion cannot land before the audit itself.
        $this->actingAs($admin)->post('/compliance/audits', [
            'title' => 'Backwards audit', 'risk_level' => 'low', 'status' => 'completed',
            'scheduled_on' => now()->toDateString(), 'completed_on' => now()->subWeek()->toDateString(),
        ])->assertSessionHasErrors('completed_on');
    }

    public function test_a_missed_deadline_outranks_a_requirement_status(): void
    {
        $admin = $this->admin();

        $make = fn (string $title, string $status, ?int $days) => ComplianceRequirement::create([
            'owner_id' => $admin->id, 'title' => $title, 'category' => 'CLE',
            'priority' => 'high', 'status' => $status,
            'due_on' => $days === null ? null : now()->addDays($days),
        ]);

        $make('Insurance renewal', 'pending', -30);
        $make('Conflict checks', 'in_progress', -5);
        $make('Trust reconciliation', 'compliant', -90);   // done, so the date no longer matters
        $make('Data retention review', 'pending', 14);
        $make('Ethics training', 'compliant', null);

        $this->actingAs($admin)->get('/compliance/requirements')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('counts.all', 5)
                ->where('counts.overdue', 2)
                ->where('counts.compliant', 2)
                ->where('counts.pending', 1)
                ->where('counts.in_progress', 0));

        $this->actingAs($admin)->get('/compliance/requirements?state=overdue')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('requirements.total', 2)
                ->where('requirements.data.0.state', 'overdue')
                ->where('requirements.data.0.days_overdue', 30));

        // Filtering narrows the counts, because the dropdowns are not the tabs.
        $this->actingAs($admin)->get('/compliance/requirements?priority=high&category=CLE')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 5));

        $this->actingAs($admin)->get('/compliance/requirements?state=nonsense')->assertSessionHasErrors('state');

        // The refresh button steps the status on and stamps the review date.
        $requirement = ComplianceRequirement::where('title', 'Conflict checks')->firstOrFail();
        $this->actingAs($admin)->patch("/compliance/requirements/{$requirement->id}/status");
        $this->assertSame('compliant', $requirement->refresh()->status);
        $this->assertSame(today()->toDateString(), $requirement->last_reviewed_on->toDateString());

        $this->actingAs($admin)->post('/compliance/requirements', [
            'title' => 'Critical filing', 'priority' => 'critical', 'status' => 'pending',
        ])->assertSessionHasNoErrors();
    }

    public function test_a_regulatory_body_can_be_retired_and_brought_back(): void
    {
        $admin = $this->admin();

        $make = fn (string $name, string $jurisdiction, bool $active) => RegulatoryBody::create([
            'name' => $name, 'jurisdiction' => $jurisdiction, 'active' => $active,
            'contact_email' => 'info@'.str($name)->slug().'.example.gov',
            'phone' => '+1-555-0100', 'website' => 'https://'.str($name)->slug().'.example.gov',
        ]);

        $make('State Bar Association', 'State', true);
        $make('Federal Bar Association', 'Federal', true);
        $body = $make('Data Protection Authority', 'Federal', false);

        $this->actingAs($admin)->get('/compliance/regulatory-bodies')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('counts.all', 3)
                ->where('counts.active', 2)
                ->where('counts.inactive', 1));

        // A tab must not narrow its own counts.
        $this->actingAs($admin)->get('/compliance/regulatory-bodies?status=inactive')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('bodies.total', 1)->where('counts.all', 3)->where('counts.active', 2));

        // The search is a filter, so it does — and it reaches the jurisdiction,
        // so "Federal" finds the federal body and the one with a federal remit.
        $this->actingAs($admin)->get('/compliance/regulatory-bodies?search=Federal')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 2)->where('counts.inactive', 1));

        // The padlock flips the row both ways.
        $this->actingAs($admin)->patch("/compliance/regulatory-bodies/{$body->id}/toggle");
        $this->assertTrue($body->refresh()->active);

        $this->actingAs($admin)->patch("/compliance/regulatory-bodies/{$body->id}/toggle");
        $this->assertFalse($body->refresh()->active);

        $this->actingAs($admin)->post('/compliance/regulatory-bodies', [
            'name' => 'Nowhere Board', 'active' => true, 'website' => 'not-a-url', 'contact_email' => 'not-an-email',
        ])->assertSessionHasErrors(['website', 'contact_email']);
    }

    public function test_a_licence_reads_its_state_from_its_expiry_date(): void
    {
        $admin = $this->admin();

        $make = fn (string $type, ?int $days, string $status) => ProfessionalLicense::create([
            'user_id' => $admin->id, 'type' => $type, 'status' => $status,
            'issued_on' => now()->subYear(),
            'expires_on' => $days === null ? null : now()->addDays($days),
        ]);

        $make('Bar admission', 300, 'active');
        $make('Notary', 30, 'active');       // still active; the card just warns
        $make('Solicitor', -5, 'active');    // the calendar overrules the status
        $make('Conveyancer', 300, 'suspended');
        $make('Patent attorney', -20, 'revoked');

        $this->actingAs($admin)->get('/compliance/professional-licenses')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('counts.all', 5)
                ->where('counts.active', 2)
                ->where('counts.expired', 1)
                ->where('counts.suspended', 1)
                ->where('counts.revoked', 1));

        // A tab must not narrow its own counts.
        $this->actingAs($admin)->get('/compliance/professional-licenses?state=expired')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('licenses.total', 1)
                ->where('licenses.data.0.type', 'Solicitor')
                ->where('counts.all', 5));

        $this->actingAs($admin)->get('/compliance/professional-licenses?state=nonsense')->assertSessionHasErrors('state');

        $this->actingAs($admin)->post('/compliance/professional-licenses', [
            'user_id' => $admin->id, 'type' => 'Bar admission', 'status' => 'active',
            'issued_on' => now()->toDateString(), 'expires_on' => now()->subYear()->toDateString(),
        ])->assertSessionHasErrors('expires_on');
    }

    public function test_renewing_a_licence_rolls_it_on_by_its_own_term(): void
    {
        $admin = $this->admin();

        $license = ProfessionalLicense::create([
            'user_id' => $admin->id, 'type' => 'Notary', 'status' => 'revoked',
            'issued_on' => now()->subMonths(18), 'expires_on' => now()->subMonths(6),
        ]);

        $this->actingAs($admin)->patch("/compliance/professional-licenses/{$license->id}/renew");

        $license->refresh();

        // Expired, so the new term starts today and runs the original 12 months.
        $this->assertSame(today()->toDateString(), $license->issued_on->toDateString());
        $this->assertSame(today()->addMonths(12)->toDateString(), $license->expires_on->toDateString());
        $this->assertSame('active', $license->status);

        // A licence still in date is extended from its old expiry, not from today.
        $live = ProfessionalLicense::create([
            'user_id' => $admin->id, 'type' => 'Bar admission', 'status' => 'active',
            'issued_on' => now()->subMonths(10), 'expires_on' => now()->addMonths(2),
        ]);

        $expiry = $live->expires_on->copy();
        $this->actingAs($admin)->patch("/compliance/professional-licenses/{$live->id}/renew");

        $this->assertSame($expiry->copy()->addMonths(12)->toDateString(), $live->refresh()->expires_on->toDateString());
    }

    public function test_a_cle_record_tracks_its_progress_towards_the_course_credits(): void
    {
        $admin = $this->admin();

        $log = fn (string $title, float $earned, ?float $required, string $status) => $this->actingAs($admin)
            ->post('/compliance/cle-tracking', [
                'user_id' => $admin->id, 'title' => $title, 'provider' => 'Legal Education Institute',
                'credit_hours' => $earned, 'required_hours' => $required, 'status' => $status,
                'completed_on' => now()->subMonth()->toDateString(),
            ]);

        $log('Legal ethics', 4.7, 4.7, 'completed')->assertSessionHasNoErrors();
        $log('Contract law updates', 2.1, 4.2, 'in_progress')->assertSessionHasNoErrors();
        $log('Family law practice', 3.3, 2.8, 'expired')->assertSessionHasNoErrors();
        // No stated worth: the course is worth whatever was earned on it.
        $log('Trust accounting', 1.5, null, 'in_progress')->assertSessionHasNoErrors();

        $this->assertSame(100, CleRecord::where('title', 'Legal ethics')->firstOrFail()->progress());
        $this->assertSame(50, CleRecord::where('title', 'Contract law updates')->firstOrFail()->progress());
        // Over-earning is still 100%, never more.
        $this->assertSame(100, CleRecord::where('title', 'Family law practice')->firstOrFail()->progress());
        $this->assertSame(1.5, CleRecord::where('title', 'Trust accounting')->firstOrFail()->required_hours);

        $this->actingAs($admin)->get('/compliance/cle-tracking')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('counts.all', 4)
                ->where('counts.completed', 1)
                ->where('counts.in_progress', 2)
                ->where('counts.expired', 1));

        // A tab must not narrow its own counts.
        $this->actingAs($admin)->get('/compliance/cle-tracking?status=expired')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('records.total', 1)->where('counts.all', 4)->where('counts.in_progress', 2));

        // The search is a filter, so it does narrow them.
        $this->actingAs($admin)->get('/compliance/cle-tracking?search=Contract')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 1)->where('records.data.0.progress', 50));

        $this->actingAs($admin)->get('/compliance/cle-tracking?status=nonsense')->assertSessionHasErrors('status');

        // Credits count towards the year they were sat in unless told otherwise.
        $this->assertSame((int) now()->subMonth()->year, CleRecord::where('title', 'Legal ethics')->firstOrFail()->compliance_year);
    }

    public function test_users_management_filters_by_role_and_guards_the_last_admin(): void
    {
        $admin = $this->admin();
        User::factory()->create(['name' => 'Ada Paralegal', 'role' => 'paralegal']);
        User::factory()->create(['name' => 'Bo Lawyer', 'role' => 'lawyer']);

        $this->actingAs($admin)->get('/users?role=paralegal')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('view', 'list')
                ->where('members.total', 1)
                ->where('members.data.0.name', 'Ada Paralegal')
                ->etc());

        // Searching reaches the email as well as the name.
        $this->actingAs($admin)->get('/users?search='.urlencode($admin->email))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('members.total', 1)->etc());

        // The only active admin may not suspend themselves.
        $this->actingAs($admin)->patch("/users/{$admin->id}/toggle")->assertSessionHasErrors('active');
        $this->assertTrue($admin->fresh()->active);

        $paralegal = User::where('role', 'paralegal')->firstOrFail();
        $this->actingAs($admin)->patch("/users/{$paralegal->id}/toggle")->assertSessionHasNoErrors();
        $this->assertFalse($paralegal->fresh()->active);
    }

    public function test_an_admin_resets_a_members_password_and_a_lawyer_cannot(): void
    {
        $admin = $this->admin();
        $member = User::factory()->create(['role' => 'lawyer']);
        $secret = ['password' => 'fresh-secret-1', 'password_confirmation' => 'fresh-secret-1'];

        $this->actingAs($member)->patch("/users/{$member->id}/password", $secret)->assertForbidden();

        $this->actingAs($admin)->patch("/users/{$member->id}/password", $secret)->assertSessionHasNoErrors();
        $this->assertTrue(Hash::check('fresh-secret-1', $member->fresh()->password));

        // A mismatched confirmation changes nothing.
        $this->actingAs($admin)
            ->patch("/users/{$member->id}/password", ['password' => 'other-secret-1', 'password_confirmation' => 'nope'])
            ->assertSessionHasErrors('password');
        $this->assertTrue(Hash::check('fresh-secret-1', $member->fresh()->password));
    }

    public function test_a_role_carries_its_permissions_and_a_shipped_one_is_protected(): void
    {
        $admin = $this->admin();
        User::factory()->count(2)->create(['role' => 'lawyer']);

        $this->actingAs($admin)->get('/roles')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('roles.total', 4)
                ->where('roles.data.0.name', 'admin')
                ->where('roles.data.0.system', true)
                ->where('roles.data.0.members', 1)
                ->where('roles.data.2.name', 'lawyer')
                ->where('roles.data.2.members', 2)
                ->etc());

        // A shipped role may be re-permissioned but never renamed or deleted.
        $lawyer = Role::where('name', 'lawyer')->firstOrFail();
        $this->actingAs($admin)
            ->put("/roles/{$lawyer->id}", ['name' => 'Advocate', 'permissions' => ['view_cases']])
            ->assertSessionHasNoErrors();
        $fresh = $lawyer->fresh();
        $this->assertSame('lawyer', $fresh->name);
        $this->assertSame(['view_cases'], $fresh->permissions);

        $this->actingAs($admin)->delete("/roles/{$lawyer->id}")->assertSessionHasErrors('name');
        $this->assertNotNull($lawyer->fresh());
    }

    public function test_a_firm_role_cannot_be_deleted_while_someone_holds_it(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post('/roles', ['name' => 'Costs Draftsman', 'permissions' => ['view_cases', 'view_invoices']])
            ->assertSessionHasNoErrors();

        $role = Role::where('name', 'Costs Draftsman')->firstOrFail();
        $this->assertFalse($role->system);

        User::factory()->create(['role' => 'Costs Draftsman']);
        $this->actingAs($admin)->delete("/roles/{$role->id}")->assertSessionHasErrors('name');

        User::where('role', 'Costs Draftsman')->delete();
        $this->actingAs($admin)->delete("/roles/{$role->id}")->assertSessionHasNoErrors();
        $this->assertNull($role->fresh());

        // Only permissions from the catalogue may be granted.
        $this->actingAs($admin)
            ->post('/roles', ['name' => 'Bogus', 'permissions' => ['rule_the_world']])
            ->assertSessionHasErrors('permissions.0');
    }

    public function test_templates_are_listed_per_channel_and_only_email_needs_a_subject(): void
    {
        $admin = $this->admin();
        $make = fn (string $channel, string $name, ?string $subject) => NotificationTemplate::create([
            'key' => 'new_judge', 'channel' => $channel, 'name' => $name, 'subject' => $subject, 'body' => '{{name}} joined.', 'active' => true,
        ]);

        // The same event can exist once on each channel.
        $slack = $make('slack', 'New Judge', null);
        $make('twilio', 'New Judge', null);
        $email = $make('email', 'New Judge', 'A judge was added');

        $this->actingAs($admin)->get('/settings/templates?channel=twilio')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('channel', 'twilio')
                ->where('templates.total', 1)
                ->where('templates.data.0.channel', 'twilio')
                ->etc());

        // A Slack post saves without a subject; an email does not.
        $this->actingAs($admin)
            ->put("/settings/templates/{$slack->id}", ['name' => 'New Judge', 'body' => 'Welcome {{name}}.', 'active' => false])
            ->assertSessionHasNoErrors();
        $this->assertFalse($slack->fresh()->active);

        $this->actingAs($admin)
            ->put("/settings/templates/{$email->id}", ['name' => 'New Judge', 'subject' => '', 'body' => 'x', 'active' => true])
            ->assertSessionHasErrors('subject');

        // System Settings' email list stays email-only.
        $this->actingAs($admin)->get('/system-settings')
            ->assertInertia(fn ($page) => $page->has('templates', 1)->where('templates.0.id', $email->id)->etc());
    }

    public function test_only_an_admin_may_change_the_company_profile(): void
    {
        $lawyer = User::factory()->create(['role' => 'lawyer']);
        $valid = [
            'firm_name' => 'Whitmore & Co.', 'business_type' => 'law firm', 'practice_size' => 'medium',
            'years_experience' => 18, 'success_rate' => 87, 'firm_email' => 'clerks@whitmore.test',
            'firm_website' => 'https://whitmore.test', 'consultation_fee' => '250.00',
        ];

        $this->actingAs($lawyer)->put('/company-profile', $valid)->assertForbidden();
        $this->assertNull(Setting::query()->find('bar_registration_no'));

        $this->actingAs($this->admin())->put('/company-profile', $valid)->assertSessionHasNoErrors();
        $this->assertSame('87', Setting::get('success_rate'));

        // A website must be a URL and the rate a percentage.
        $this->actingAs($this->admin())
            ->put('/company-profile', ['firm_website' => 'not-a-url', 'success_rate' => 140] + $valid)
            ->assertSessionHasErrors(['firm_website', 'success_rate']);

        $this->actingAs($this->admin())->get('/company-profile')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('profile.firm_name', 'Whitmore & Co.')
                ->where('profile.success_rate', '87')
                ->etc());
    }

    public function test_a_document_keeps_its_versions_and_serves_the_current_one(): void
    {
        Storage::fake('local');
        $admin = $this->admin();

        Storage::disk('local')->put('library/brief-v1.pdf', 'first');
        $document = Document::create([
            'title' => 'Summary Judgment Brief', 'path' => 'library/brief-v1.pdf', 'mime' => 'application/pdf',
            'type' => 'Legal Brief', 'stage' => 'draft', 'confidentiality' => 'internal', 'size' => 5,
        ]);

        // Created by any route, its first file is version 1 and current.
        $first = $document->versions()->firstOrFail();
        $this->assertSame('v1.0', $first->label());
        $this->assertSame($first->id, $document->fresh()->current_version_id);

        // A new version becomes current; the old file stays.
        $this->actingAs($admin)->post("/documents/{$document->id}/versions", [
            'file' => UploadedFile::fake()->create('brief-v2.pdf', 4, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $second = $document->versions()->where('sequence', 2)->firstOrFail();
        $this->assertSame('v1.1', $second->label());
        $this->assertSame($second->path, $document->fresh()->path);
        Storage::disk('local')->assertExists('library/brief-v1.pdf');

        // The current version cannot be deleted; an older one can, and takes its file with it.
        $this->actingAs($admin)->delete("/documents/{$document->id}/versions/{$second->id}")->assertSessionHasErrors('version');

        $this->actingAs($admin)->patch("/documents/{$document->id}/versions/{$first->id}/restore")->assertSessionHasNoErrors();
        $this->assertSame($first->id, $document->fresh()->current_version_id);
        $this->assertSame('library/brief-v1.pdf', $document->fresh()->path);

        $this->actingAs($admin)->delete("/documents/{$document->id}/versions/{$second->id}")->assertSessionHasNoErrors();
        Storage::disk('local')->assertMissing($second->path);

        // A version is only reachable through its own document.
        $other = Document::create(['title' => 'Other', 'path' => 'library/brief-v1.pdf', 'confidentiality' => 'internal', 'size' => 1]);
        $this->actingAs($admin)->get("/documents/{$other->id}/versions/{$first->id}/download")->assertNotFound();

        // Firm work product has no client, and still saves.
        $this->actingAs($admin)->put("/documents/{$document->id}", [
            'title' => 'Summary Judgment Brief', 'type' => 'Legal Brief', 'stage' => 'review',
            'confidentiality' => 'confidential', 'tags' => ['brief', 'motion'], 'description' => 'For the June hearing.',
        ])->assertSessionHasNoErrors();
        $this->assertSame(['brief', 'motion'], $document->fresh()->tags);

        $this->actingAs($admin)->get("/documents/library/{$document->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('documents/show')
                ->where('document.state', 'review')
                ->has('versions', 1)
                ->where('versions.0.current', true)
                ->etc());
    }

    public function test_deleting_a_document_removes_every_version_file(): void
    {
        Storage::fake('local');
        $admin = $this->admin();

        Storage::disk('local')->put('library/a.pdf', 'a');
        $document = Document::create(['title' => 'Retainer', 'path' => 'library/a.pdf', 'confidentiality' => 'internal', 'size' => 1]);
        Storage::disk('local')->put('library/b.pdf', 'b');
        $document->addVersion('library/b.pdf', 'application/pdf', 1, $admin->id);

        // Deleted from its own page, it lands on the library rather than a dead page.
        $this->actingAs($admin)
            ->from("/documents/library/{$document->id}")
            ->delete("/documents/{$document->id}")
            ->assertRedirect('/documents/library');

        Storage::disk('local')->assertMissing('library/a.pdf');
        Storage::disk('local')->assertMissing('library/b.pdf');
    }

    public function test_the_library_uploads_firm_documents_without_a_client(): void
    {
        Storage::fake('local');
        $admin = $this->admin();
        $upload = fn (array $extra) => $this->actingAs($admin)->post('/documents', $extra + [
            'title' => 'Non-Disclosure Agreement', 'type' => 'Contract', 'confidentiality' => 'restricted',
            'file' => UploadedFile::fake()->create('nda.pdf', 10, 'application/pdf'),
        ]);

        $upload(['stage' => 'draft', 'description' => 'Standard NDA template.', 'tags' => ['nda', 'template']])->assertSessionHasNoErrors();

        $document = Document::where('title', 'Non-Disclosure Agreement')->firstOrFail();
        $this->assertNull($document->client_id);
        $this->assertSame('restricted', $document->confidentiality);
        $this->assertSame(['nda', 'template'], $document->tags);
        $this->assertStringStartsWith('library/', $document->path);
        $this->assertSame('v1.0', $document->versions()->firstOrFail()->label());

        // "Archived" chosen up front archives it and keeps "final" as the stage reached.
        $upload(['title' => 'Old NDA', 'stage' => 'archived'])->assertSessionHasNoErrors();
        $archived = Document::where('title', 'Old NDA')->firstOrFail();
        $this->assertNotNull($archived->archived_at);
        $this->assertSame('final', $archived->stage);
        $this->assertSame('archived', $archived->state());

        $upload(['title' => 'Bad', 'stage' => 'draft', 'confidentiality' => 'top-secret'])->assertSessionHasErrors('confidentiality');
    }

    public function test_the_library_groups_documents_by_stage_and_counts_archived_once(): void
    {
        $admin = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd']);

        $file = fn (string $title, string $stage, string $level, ?string $archived = null) => Document::create([
            'client_id' => $client->id, 'title' => $title, 'path' => "fake/{$title}", 'type' => 'Contract',
            'stage' => $stage, 'confidentiality' => $level, 'size' => 10, 'archived_at' => $archived,
        ]);

        $file('Retainer Agreement.docx', 'draft', 'internal');
        $file('Mediation Statement.docx', 'review', 'internal');
        $file('Summary Judgment Brief.pdf', 'final', 'confidential');
        // Archived, but it had reached "final" — the stage is kept, the tab is not.
        $archived = $file('Old Retainer.pdf', 'final', 'public', now()->subYear());

        $this->assertSame('archived', $archived->state());
        $this->assertSame('final', $archived->stage);

        $this->actingAs($admin)->get('/documents/library')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('counts.all', 4)
                ->where('counts.draft', 1)
                ->where('counts.review', 1)
                ->where('counts.final', 1)
                ->where('counts.archived', 1)
                ->where('documents.total', 4)
                ->etc());

        $this->actingAs($admin)->get('/documents/library?stage=final')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('documents.total', 1)
                ->where('documents.data.0.title', 'Summary Judgment Brief.pdf')
                ->etc());

        // The level filter narrows the counts; a tab never narrows its own.
        $this->actingAs($admin)->get('/documents/library?level=internal')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 2)->where('counts.archived', 0)->etc());
    }

    public function test_an_overdue_invoice_leaves_the_sent_tab_without_changing_its_status(): void
    {
        $admin = $this->admin();
        $matter = Matter::create([
            'client_id' => Client::create(['name' => 'Acme Ltd', 'email' => 'legal@acme.test'])->id,
            'reference' => Matter::nextReference(),
            'title' => 'Acme v. Nemo',
            'priority' => 'high',
            'status' => 'open',
            'opened_on' => now()->subMonths(2),
            'hourly_rate_cents' => 30000,
        ]);

        $bill = fn (string $status, int $dueInDays, int $paid = 0) => Invoice::create([
            'client_id' => $matter->client_id, 'matter_id' => $matter->id,
            'number' => Invoice::nextNumber(), 'issued_on' => now()->subDays(40),
            'due_on' => now()->addDays($dueInDays), 'status' => $status,
            'subtotal_cents' => 100000, 'tax_cents' => 0, 'paid_cents' => $paid,
        ]);

        $bill('draft', 30);
        $onTime = $bill('sent', 10);
        $late = $bill('sent', -5);
        // Settled in full, so being past its due date does not make it overdue.
        $bill('sent', -5, 100000);
        $bill('void', -5);

        $this->assertSame('overdue', $late->state());
        $this->assertSame('sent', $onTime->state());
        $this->assertSame('sent', $late->status, 'Overdue is derived, never written back.');

        $this->actingAs($admin)->get('/invoices?status=overdue')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('counts.all', 5)
                ->where('counts.draft', 1)
                // Three are sent; the late one is counted once, on its own tab.
                ->where('counts.sent', 2)
                ->where('counts.overdue', 1)
                ->where('counts.void', 1)
                ->where('invoices.total', 1)
                ->where('invoices.data.0.number', $late->number)
                ->where('invoices.data.0.state', 'overdue')
                ->etc());

        $this->actingAs($admin)->get('/invoices?status=sent')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('invoices.total', 2)->where('counts.overdue', 1)->etc());
    }

    public function test_sending_a_draft_issues_it(): void
    {
        $admin = $this->admin();
        $invoice = Invoice::create([
            'client_id' => Client::create(['name' => 'Acme Ltd'])->id,
            'number' => Invoice::nextNumber(), 'issued_on' => now(), 'due_on' => now()->addDays(30),
            'status' => 'draft', 'subtotal_cents' => 50000, 'tax_cents' => 0,
        ]);

        $this->actingAs($admin)->patch("/invoices/{$invoice->id}/send")->assertSessionHasNoErrors();
        $this->assertSame('sent', $invoice->fresh()->status);

        // Only a draft can be issued.
        $this->actingAs($admin)->patch("/invoices/{$invoice->id}/send")->assertStatus(422);
    }

    public function test_a_list_keeps_its_arranged_order_until_a_column_is_clicked(): void
    {
        $admin = $this->admin();
        foreach ([['Corporate', 0], ['Individual', 1], ['Non-Profit', 2]] as [$name, $sort]) {
            Taxonomy::create(['kind' => 'client_type', 'name' => $name, 'sort' => $sort, 'active' => true]);
        }

        $this->actingAs($admin)->get('/setup?kind=client_type')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('layout', 'form')
                ->where('sort.column', 'sort')
                ->where('entries.data.0.name', 'Corporate')
                ->etc());

        $this->actingAs($admin)->get('/setup?kind=client_type&sort=name&direction=desc')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('entries.data.0.name', 'Non-Profit')->etc());

        // Only the two real columns are sortable.
        $this->actingAs($admin)->get('/setup?kind=client_type&sort=description')->assertSessionHasErrors('sort');
    }

    public function test_a_document_is_filed_against_a_client_and_can_be_archived(): void
    {
        Storage::fake('local');
        $admin = $this->admin();
        $client = Client::create(['name' => 'Acme Ltd', 'email' => 'legal@acme.test']);

        $this->actingAs($admin)->post('/documents', [
            'client_id' => $client->id,
            'title' => 'Engagement_Letter.pdf',
            'type' => 'Contract',
            'stage' => 'draft',
            'confidentiality' => 'confidential',
            'file' => UploadedFile::fake()->create('engagement.pdf', 12, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $document = Document::firstOrFail();
        $this->assertSame($client->id, $document->client_id);
        $this->assertNull($document->matter_id);
        $this->assertNull($document->archived_at);
        Storage::disk('local')->assertExists($document->path);

        // Archiving keeps the file; only delete removes it.
        $this->actingAs($admin)->patch("/documents/{$document->id}/archive")->assertSessionHasNoErrors();
        $this->assertNotNull($document->fresh()->archived_at);
        Storage::disk('local')->assertExists($document->path);

        $this->actingAs($admin)->delete("/documents/{$document->id}")->assertSessionHasNoErrors();
        Storage::disk('local')->assertMissing($document->path);
    }

    public function test_an_upload_from_a_case_takes_that_cases_client(): void
    {
        Storage::fake('local');
        $admin = $this->admin();
        $matter = Matter::create([
            'client_id' => Client::create(['name' => 'Borealis Ltd'])->id,
            'reference' => Matter::nextReference(),
            'title' => 'Borealis v. Crane',
            'priority' => 'high',
            'status' => 'open',
            'opened_on' => now()->subMonth(),
            'hourly_rate_cents' => 30000,
        ]);

        $this->actingAs($admin)->post("/matters/{$matter->id}/documents", [
            'title' => 'Witness_Statement.pdf',
            'type' => 'Evidence',
            'stage' => 'review',
            'confidentiality' => 'confidential',
            'file' => UploadedFile::fake()->create('witness.pdf', 8, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $document = Document::firstOrFail();
        $this->assertSame($matter->id, $document->matter_id);
        $this->assertSame($matter->client_id, $document->client_id);
    }

    public function test_the_document_register_counts_the_search_not_the_tab(): void
    {
        $admin = $this->admin();
        $acme = Client::create(['name' => 'Acme Ltd', 'email' => 'legal@acme.test']);
        $borealis = Client::create(['name' => 'Borealis Ltd', 'email' => 'legal@borealis.test']);

        $file = fn (Client $client, string $title, string $type, ?string $archived = null) => Document::create([
            'client_id' => $client->id, 'title' => $title, 'path' => "fake/{$title}",
            'type' => $type, 'confidentiality' => 'internal', 'size' => 10, 'archived_at' => $archived,
        ]);

        $file($acme, 'Contract_Copy.pdf', 'Contract');
        $file($acme, 'Tax_Documents.pdf', 'Evidence');
        $file($acme, 'Old_Retainer.pdf', 'Contract', now()->subYear());
        $file($borealis, 'Bank_Statements.pdf', 'Correspondence');

        // The Archived tab narrows the rows but never its own counts.
        $this->actingAs($admin)->get('/documents?status=archived')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('counts.all', 4)
                ->where('counts.active', 3)
                ->where('counts.archived', 1)
                ->where('documents.total', 1)
                ->where('documents.data.0.title', 'Old_Retainer.pdf')
                ->where('documents.data.0.archived', true)
                ->where('documents.data.0.client', 'Acme Ltd')
                ->etc());

        // A dropdown filter does narrow the counts.
        $this->actingAs($admin)->get("/documents?client={$acme->id}&type=Contract")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('counts.all', 2)
                ->where('counts.active', 1)
                ->where('counts.archived', 1)
                ->etc());

        // Searching reaches the client as well as the document.
        $this->actingAs($admin)->get('/documents?search=Borealis')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 1)->etc());

        $this->actingAs($admin)->get('/documents?sort=title&direction=asc')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('documents.data.0.title', 'Bank_Statements.pdf')->etc());
    }

    public function test_the_bench_lists_judges_by_court(): void
    {
        $admin = $this->admin();

        $high = Court::create(['name' => 'State High Court', 'type' => 'High Court', 'active' => true]);
        $district = Court::create(['name' => 'Central District Court', 'type' => 'Magistrate Court', 'active' => true]);

        $this->actingAs($admin)->post('/judges', [
            'court_id' => $high->id, 'name' => 'Hon. Miriam Adeyemi', 'designation' => 'Chief Justice',
            'email' => 'chambers1@statehigh.gov', 'appointed_on' => now()->subYears(4)->toDateString(), 'active' => true,
        ])->assertSessionHasNoErrors();

        Judge::create(['court_id' => $district->id, 'name' => 'Hon. Grace Mbeki', 'active' => false]);

        // Hearings name their judge as text, so the count is matched on that name.
        $matter = Matter::create([
            'client_id' => Client::create(['name' => 'Acme Ltd'])->id,
            'reference' => Matter::nextReference(),
            'title' => 'Acme v. Nemo',
            'priority' => 'high',
            'status' => 'open',
            'opened_on' => now()->subMonth(),
            'hourly_rate_cents' => 30000,
        ]);
        foreach (range(1, 2) as $ignored) {
            Hearing::create([
                'matter_id' => $matter->id, 'court_id' => $high->id, 'judge' => 'Hon. Miriam Adeyemi',
                'scheduled_at' => now()->addWeek(), 'status' => 'scheduled',
            ]);
        }

        $judge = Judge::where('name', 'Hon. Miriam Adeyemi')->firstOrFail();
        $this->assertSame(sprintf('JG%06d', $judge->id), $judge->reference);

        $this->actingAs($admin)->get('/judges')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('view', 'grid')
                ->where('counts.all', 2)
                ->where('counts.active', 1)
                ->where('counts.inactive', 1)
                // Ordered by name, so Grace comes first and Miriam carries the two hearings.
                ->where('judges.data.0.hearings_count', 0)
                ->where('judges.data.1.name', 'Hon. Miriam Adeyemi')
                ->where('judges.data.1.hearings_count', 2));

        // A tab must not narrow its own counts; the court dropdown is a filter and does.
        $this->actingAs($admin)->get('/judges?status=inactive')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('judges.total', 1)->where('counts.all', 2));

        $this->actingAs($admin)->get("/judges?court={$district->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 1)->where('counts.active', 0));

        $this->actingAs($admin)->get('/judges?view=list')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('view', 'list'));

        $this->actingAs($admin)->patch("/judges/{$judge->id}/toggle");
        $this->assertFalse($judge->refresh()->active);

        $this->actingAs($admin)->post('/judges', [
            'name' => 'Hon. Future Appointee', 'appointed_on' => now()->addYear()->toDateString(), 'active' => true,
        ])->assertSessionHasErrors('appointed_on');
    }

    public function test_a_court_gets_a_reference_and_can_be_retired(): void
    {
        $admin = $this->admin();

        Taxonomy::create(['kind' => 'court_type', 'name' => 'High Court', 'color' => '#ef4444', 'sort' => 0, 'active' => true]);

        $this->actingAs($admin)->post('/courts', [
            'name' => 'Commercial Court Plaza', 'type' => 'High Court',
            'jurisdiction' => 'Queens County', 'phone' => '+1-555-0021',
            'email' => 'court1@company.gov', 'active' => true,
        ])->assertSessionHasNoErrors();

        $court = Court::firstOrFail();
        $this->assertSame(sprintf('CT%06d', $court->id), $court->reference);

        Court::create(['name' => 'Retired Bench', 'type' => 'High Court', 'active' => false]);

        $this->actingAs($admin)->get('/courts')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('view', 'grid')
                ->where('counts.all', 2)
                ->where('counts.active', 1)
                ->where('counts.inactive', 1));

        // A tab must not narrow its own counts.
        $this->actingAs($admin)->get('/courts?status=inactive')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('courts.total', 1)->where('counts.all', 2)->where('counts.active', 1));

        // The search reaches the reference, and being a filter it does narrow them.
        $this->actingAs($admin)->get("/courts?search={$court->reference}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('counts.all', 1));

        $this->actingAs($admin)->get('/courts?view=list')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('view', 'list'));

        // The padlock flips the row both ways.
        $this->actingAs($admin)->patch("/courts/{$court->id}/toggle");
        $this->assertFalse($court->refresh()->active);

        $this->actingAs($admin)->patch("/courts/{$court->id}/toggle");
        $this->assertTrue($court->refresh()->active);
    }

    public function test_the_task_board_takes_its_columns_from_firm_setup(): void
    {
        $admin = $this->admin();

        // With nothing set up, the board falls back to the statuses it ships with.
        $this->assertSame(Task::STATUSES, Task::statuses());

        foreach ([['Not Started', '#6b7280'], ['In Progress', '#3b82f6'], ['Waiting On Client', '#a855f7']] as $sort => [$name, $color]) {
            Taxonomy::create(['kind' => 'task_status', 'name' => $name, 'color' => $color, 'sort' => $sort, 'active' => true]);
        }

        // The key a task stores is the name in snake case, so the seeded ones keep working.
        $this->assertSame(
            ['not_started', 'in_progress', 'waiting_on_client'],
            array_keys(Task::statuses()),
        );
        $this->assertSame('#a855f7', Task::statuses()['waiting_on_client']['color']);

        $this->actingAs($admin)->get('/tasks')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->count('options.statuses', 3)->where('options.statuses.waiting_on_client.label', 'Waiting On Client'));

        // A column the firm has not set up is no longer a status a task can take.
        $this->actingAs($admin)->post('/tasks', [
            'title' => 'Draft the reply', 'status' => 'archived', 'priority' => 'medium',
        ])->assertSessionHasErrors('status');

        $this->actingAs($admin)->post('/tasks', [
            'title' => 'Draft the reply', 'status' => 'waiting_on_client', 'priority' => 'medium',
        ])->assertSessionHasNoErrors();
    }

    public function test_a_compliance_frequency_records_the_days_between_repeats(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'compliance_frequency', 'name' => 'Bi-Weekly',
            'description' => 'Bi-weekly compliance requirement',
            'sort' => 0, 'active' => true, 'meta' => ['days' => 14],
        ])->assertSessionHasNoErrors();

        $this->assertSame(14, Taxonomy::where('name', 'Bi-Weekly')->firstOrFail()->meta['days']);

        // A one-off obligation has no interval at all.
        $this->actingAs($admin)->post('/setup', [
            'kind' => 'compliance_frequency', 'name' => 'One Time', 'sort' => 1, 'active' => true,
        ])->assertSessionHasNoErrors();

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'compliance_frequency', 'name' => 'Forever', 'sort' => 2, 'active' => true,
            'meta' => ['days' => 5000],
        ])->assertSessionHasErrors('meta.days');

        // The list keeps the editor beside the table, like the other setup lists.
        $this->actingAs($admin)->get('/setup?kind=compliance_frequency')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('layout', 'form')
                ->where('hasColor', false)
                ->where('entries.total', 2));
    }

    public function test_research_sources_carry_a_type_and_a_url(): void
    {
        $admin = $this->admin();

        $make = fn (string $name, string $type, ?string $url, bool $active) => Taxonomy::create([
            'kind' => 'research_source', 'name' => $name, 'sort' => 0, 'active' => $active,
            'meta' => ['type' => $type, 'url' => $url],
        ]);

        $make('Westlaw', 'database', 'https://westlaw.com', true);
        $make('Casetext', 'database', 'https://casetext.com', true);
        $make('Justia', 'case law', 'https://justia.com', true);
        $make('Law Library', 'secondary', null, false);

        $this->actingAs($admin)->get('/setup?kind=research_source')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('hasUrl', true)
                ->where('facet.key', 'type')
                ->where('facet.tabs', false)
                ->where('counts.all', 4)
                ->where('counts.active', 3)
                ->where('counts.inactive', 1));

        // Type is a dropdown here, so it narrows the status counts it sits above.
        $this->actingAs($admin)->get('/setup?kind=research_source&level=database')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('entries.total', 2)->where('counts.all', 2)->where('counts.active', 2));

        // Status is the tab, and a tab must not narrow its own counts.
        $this->actingAs($admin)->get('/setup?kind=research_source&status=inactive')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('entries.total', 1)->where('counts.all', 4)->where('counts.active', 3));

        $this->actingAs($admin)->get('/setup?kind=research_source&level=nonsense')->assertSessionHasErrors('level');

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'research_source', 'name' => 'HeinOnline', 'sort' => 4, 'active' => true,
            'meta' => ['type' => 'secondary', 'url' => 'https://heinonline.org'],
        ])->assertSessionHasNoErrors();

        $this->assertSame('secondary', Taxonomy::where('name', 'HeinOnline')->firstOrFail()->meta['type']);

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'research_source', 'name' => 'Nowhere', 'sort' => 5, 'active' => true,
            'meta' => ['type' => 'gossip', 'url' => 'not-a-url'],
        ])->assertSessionHasErrors(['meta.type', 'meta.url']);
    }

    public function test_a_research_category_must_belong_to_a_practice_area(): void
    {
        $admin = $this->admin();
        Taxonomy::create(['kind' => 'practice_area', 'name' => 'litigation', 'sort' => 0, 'active' => true]);
        Taxonomy::create(['kind' => 'practice_area', 'name' => 'family', 'sort' => 1, 'active' => true]);

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'research_category', 'name' => 'Constitutional Law',
            'description' => 'Constitutional law research and precedents', 'color' => '#DC2626',
            'sort' => 0, 'active' => true, 'meta' => ['practice_area' => 'litigation'],
        ])->assertSessionHasNoErrors();

        $this->assertSame('litigation', Taxonomy::where('kind', 'research_category')->firstOrFail()->meta['practice_area']);

        // The relation is required on this list, unlike every other one.
        $this->actingAs($admin)->post('/setup', [
            'kind' => 'research_category', 'name' => 'Orphan', 'sort' => 1, 'active' => true,
        ])->assertSessionHasErrors('meta.practice_area');

        $this->actingAs($admin)->post('/setup', [
            'kind' => 'research_type', 'name' => 'Case Law', 'sort' => 0, 'active' => true,
        ])->assertSessionHasNoErrors();
    }

    public function test_research_categories_filter_by_their_practice_area(): void
    {
        $admin = $this->admin();

        foreach ([['Constitutional Law', 'litigation'], ['Criminal Law', 'litigation'], ['Family Law', 'family']] as $i => [$name, $area]) {
            Taxonomy::create([
                'kind' => 'research_category', 'name' => $name, 'sort' => $i, 'active' => true,
                'meta' => ['practice_area' => $area],
            ]);
        }

        $this->actingAs($admin)->get('/setup?kind=research_category')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('layout', 'form')
                ->where('hasColor', true)
                ->where('parent.kind', 'practice_area')
                ->where('parent.label', 'Practice Area')
                ->where('entries.total', 3));

        $this->actingAs($admin)->get('/setup?kind=research_category&parent=family')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('entries.total', 1)->where('entries.data.0.name', 'Family Law'));

        // Lists with no parent report none.
        $this->actingAs($admin)->get('/setup?kind=research_type')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('parent', null));
    }
}
