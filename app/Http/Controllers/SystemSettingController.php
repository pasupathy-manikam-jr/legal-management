<?php

namespace App\Http\Controllers;

use App\Models\NotificationTemplate;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Firm-wide configuration. The signed-in user's own account settings
 * (profile, password, appearance) stay in Settings\* and are untouched.
 */
class SystemSettingController extends Controller
{
    public function index()
    {
        $this->authorizeAdmin();

        return Inertia::render('system-settings/index', [
            'values' => Setting::public_values(),
            // Never send stored secrets to the browser; say only whether one exists.
            'hasSecret' => [
                'mail_password' => filled(Setting::get('mail_password')),
                'twilio_auth_token' => filled(Setting::get('twilio_auth_token')),
                'stripe_secret_key' => filled(Setting::get('stripe_secret_key')),
                'paypal_secret' => filled(Setting::get('paypal_secret')),
            ],
            'calendarFeedUrl' => filled(Setting::get('calendar_feed_token'))
                ? route('calendar.feed', ['token' => Setting::get('calendar_feed_token')])
                : null,
            'templates' => NotificationTemplate::where('channel', 'email')->orderBy('name')->get(['id', 'key', 'name', 'active']),
            'options' => [
                'languages' => ['en' => 'English', 'es' => 'Español', 'fr' => 'Français', 'de' => 'Deutsch', 'ar' => 'العربية'],
                'dateFormats' => ['Y-m-d' => 'Y-m-d (2026-01-01)', 'd-m-Y' => 'd-m-Y (01-01-2026)', 'm/d/Y' => 'm/d/Y (01/01/2026)', 'd M, Y' => 'd M, Y (01 Jan, 2026)', 'F j, Y' => 'F j, Y (January 1, 2026)'],
                'timeFormats' => ['H:i' => 'H:i (13:30)', 'h:i A' => 'h:i A (01:30 PM)', 'g:i a' => 'g:i a (1:30 pm)'],
                'timezones' => ['UTC', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Kuala_Lumpur', 'Asia/Dubai', 'Asia/Kolkata', 'Australia/Sydney'],
                'currencies' => ['USD' => '$ USD — US Dollar', 'EUR' => '€ EUR — Euro', 'GBP' => '£ GBP — British Pound', 'MYR' => 'RM MYR — Malaysian Ringgit', 'AUD' => 'A$ AUD — Australian Dollar', 'INR' => '₹ INR — Indian Rupee', 'AED' => 'د.إ AED — UAE Dirham'],
                'encryptions' => ['tls' => 'TLS', 'ssl' => 'SSL', 'none' => 'None'],
            ],
        ]);
    }

    public function updateSystem(Request $request)
    {
        return $this->save($request->validate([
            'default_language' => ['required', 'string', 'max:10'],
            'date_format' => ['required', 'string', 'max:30'],
            'time_format' => ['required', 'string', 'max:30'],
            'calendar_start_day' => ['required', Rule::in(['sunday', 'monday'])],
            'default_timezone' => ['required', 'timezone'],
        ]), 'System settings saved.');
    }

    public function updateBrand(Request $request)
    {
        return $this->save($request->validate([
            'firm_name' => ['required', 'string', 'max:255'],
            'title_text' => ['required', 'string', 'max:255'],
            'footer_text' => ['nullable', 'string', 'max:255'],
            'theme_color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]), 'Brand settings saved.');
    }

    public function updateCurrency(Request $request)
    {
        return $this->save($request->validate([
            'currency' => ['required', 'string', 'size:3'],
            'currency_symbol' => ['required', 'string', 'max:5'],
            'currency_symbol_position' => ['required', Rule::in(['before', 'after'])],
            'currency_symbol_space' => ['required', 'boolean'],
            'currency_decimals' => ['required', 'integer', 'min:0', 'max:4'],
            'currency_show_decimals' => ['required', 'boolean'],
            'currency_decimal_separator' => ['required', Rule::in(['.', ','])],
            'currency_thousands_separator' => ['required', Rule::in([',', '.', ' ', 'none'])],
        ]), 'Currency settings saved.');
    }

    public function updateEmail(Request $request)
    {
        $data = $request->validate([
            'mail_driver' => ['required', 'string', 'max:30'],
            'mail_host' => ['required', 'string', 'max:255'],
            'mail_port' => ['required', 'integer', 'min:1', 'max:65535'],
            'mail_username' => ['nullable', 'string', 'max:255'],
            'mail_password' => ['nullable', 'string', 'max:255'],
            'mail_encryption' => ['required', Rule::in(['tls', 'ssl', 'none'])],
            'mail_from_address' => ['required', 'email', 'max:255'],
            'mail_from_name' => ['required', 'string', 'max:255'],
        ]);

        return $this->save($this->keepStoredSecrets($data, ['mail_password']), 'Email settings saved.');
    }

    public function updateSlack(Request $request)
    {
        return $this->save($request->validate([
            'slack_enabled' => ['required', 'boolean'],
            // required_if_accepted matches true/"1"/"on", unlike required_if against a literal.
            'slack_webhook_url' => ['nullable', 'required_if_accepted:slack_enabled', 'url', 'starts_with:https://hooks.slack.com/', 'max:500'],
        ]), 'Slack settings saved.');
    }

    public function updateTwilio(Request $request)
    {
        $data = $request->validate([
            'twilio_enabled' => ['required', 'boolean'],
            'twilio_account_sid' => ['nullable', 'required_if_accepted:twilio_enabled', 'string', 'starts_with:AC', 'max:64'],
            'twilio_auth_token' => ['nullable', 'string', 'max:255'],
            'twilio_from_number' => ['nullable', 'required_if_accepted:twilio_enabled', 'string', 'max:20'],
        ]);

        return $this->save($this->keepStoredSecrets($data, ['twilio_auth_token']), 'Twilio settings saved.');
    }

    public function updatePayments(Request $request)
    {
        $data = $request->validate([
            'bank_transfer_enabled' => ['required', 'boolean'],
            'bank_transfer_details' => ['nullable', 'required_if_accepted:bank_transfer_enabled', 'string', 'max:1000'],
            'stripe_enabled' => ['required', 'boolean'],
            'stripe_publishable_key' => ['nullable', 'required_if_accepted:stripe_enabled', 'string', 'max:255'],
            'stripe_secret_key' => ['nullable', 'string', 'max:255'],
            'paypal_enabled' => ['required', 'boolean'],
            'paypal_mode' => ['required', Rule::in(['sandbox', 'live'])],
            'paypal_client_id' => ['nullable', 'required_if_accepted:paypal_enabled', 'string', 'max:255'],
            'paypal_secret' => ['nullable', 'string', 'max:255'],
        ]);

        return $this->save($this->keepStoredSecrets($data, ['stripe_secret_key', 'paypal_secret']), 'Payment settings saved.');
    }

    public function updateCalendar(Request $request)
    {
        $data = $request->validate([
            'google_calendar_enabled' => ['required', 'boolean'],
            'google_calendar_id' => ['nullable', 'string', 'max:255'],
        ]);

        // The feed is useless without a link, so mint one the first time it is switched on.
        if ($data['google_calendar_enabled'] && blank(Setting::get('calendar_feed_token'))) {
            $data['calendar_feed_token'] = Str::random(40);
        }

        return $this->save($data, 'Google Calendar settings saved.');
    }

    /** Invalidate the current subscription link and issue a new one. */
    public function regenerateCalendarFeed()
    {
        $this->authorizeAdmin();

        Setting::updateOrCreate(['key' => 'calendar_feed_token'], ['value' => Str::random(40)]);

        return back()->with('success', 'Calendar link regenerated. The previous link no longer works.');
    }

    public function testSms(Request $request)
    {
        $this->authorizeAdmin();

        $data = $request->validate(['phone' => ['required', 'string', 'max:20']]);
        $values = Setting::all_values();

        if (blank($values['twilio_account_sid']) || blank($values['twilio_auth_token'])) {
            return back()->withErrors(['phone' => 'Save your Twilio credentials first.']);
        }

        try {
            $response = Http::asForm()
                ->withBasicAuth($values['twilio_account_sid'], $values['twilio_auth_token'])
                ->timeout(15)
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$values['twilio_account_sid']}/Messages.json", [
                    'From' => $values['twilio_from_number'],
                    'To' => $data['phone'],
                    'Body' => 'Test message from your Advocate installation.',
                ]);
        } catch (\Throwable $e) {
            return back()->withErrors(['phone' => 'Could not reach Twilio: '.$e->getMessage()]);
        }

        return $response->successful()
            ? back()->with('success', "Test SMS sent to {$data['phone']}.")
            : back()->withErrors(['phone' => 'Twilio rejected the message: '.($response->json('message') ?? $response->body())]);
    }

    public function testStripe()
    {
        $this->authorizeAdmin();

        $key = Setting::get('stripe_secret_key');

        if (blank($key)) {
            return back()->withErrors(['stripe_secret_key' => 'Save a secret key first.']);
        }

        try {
            $response = Http::withToken($key)->timeout(15)->get('https://api.stripe.com/v1/balance');
        } catch (\Throwable $e) {
            return back()->withErrors(['stripe_secret_key' => 'Could not reach Stripe: '.$e->getMessage()]);
        }

        return $response->successful()
            ? back()->with('success', 'Stripe accepted the key.')
            : back()->withErrors(['stripe_secret_key' => 'Stripe rejected the key: '.($response->json('error.message') ?? $response->body())]);
    }

    /** Flip one notification template on or off. */
    public function toggleTemplate(NotificationTemplate $template)
    {
        $this->authorizeAdmin();

        $template->update(['active' => ! $template->active]);

        return back();
    }

    public function testEmail(Request $request)
    {
        $this->authorizeAdmin();

        $data = $request->validate(['email' => ['required', 'email']]);

        $this->applyMailConfig();

        try {
            Mail::raw('This is a test message from your Advocate installation. If you can read it, email is configured.', function ($message) use ($data) {
                $message->to($data['email'])->subject('Advocate test email');
            });
        } catch (\Throwable $e) {
            return back()->withErrors(['email' => 'Could not send: '.$e->getMessage()]);
        }

        return back()->with('success', "Test email sent to {$data['email']}.");
    }

    public function testSlack()
    {
        $this->authorizeAdmin();

        $url = Setting::get('slack_webhook_url');

        if (blank($url)) {
            return back()->withErrors(['slack_webhook_url' => 'Save a webhook URL first.']);
        }

        try {
            $response = Http::timeout(10)->post($url, ['text' => 'Test message from Advocate.']);
        } catch (\Throwable $e) {
            return back()->withErrors(['slack_webhook_url' => 'Could not reach Slack: '.$e->getMessage()]);
        }

        return $response->successful()
            ? back()->with('success', 'Test message posted to Slack.')
            : back()->withErrors(['slack_webhook_url' => 'Slack rejected the message: '.$response->body()]);
    }

    /**
     * A blank secret field means "leave the stored one alone", not "clear it".
     *
     * @param  array<string, mixed>  $data
     * @param  list<string>  $keys
     * @return array<string, mixed>
     */
    private function keepStoredSecrets(array $data, array $keys): array
    {
        foreach ($keys as $key) {
            if (blank($data[$key] ?? null)) {
                unset($data[$key]);
            }
        }

        return $data;
    }

    /** Push the saved SMTP settings into the mailer for this request. */
    private function applyMailConfig(): void
    {
        $values = Setting::all_values();

        config([
            'mail.default' => $values['mail_driver'] ?: 'smtp',
            'mail.mailers.smtp.host' => $values['mail_host'],
            'mail.mailers.smtp.port' => (int) $values['mail_port'],
            'mail.mailers.smtp.username' => $values['mail_username'] ?: null,
            'mail.mailers.smtp.password' => $values['mail_password'] ?: null,
            'mail.mailers.smtp.encryption' => $values['mail_encryption'] === 'none' ? null : $values['mail_encryption'],
            'mail.from.address' => $values['mail_from_address'] ?: 'noreply@localhost',
            'mail.from.name' => $values['mail_from_name'],
        ]);
    }

    private function save(array $data, string $message)
    {
        $this->authorizeAdmin();

        foreach ($data as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => is_bool($value) ? (string) (int) $value : (string) $value]);
        }

        return back()->with('success', $message);
    }

    private function authorizeAdmin(): void
    {
        abort_unless(request()->user()?->isAdmin(), 403, 'Only firm admins may change system settings.');
    }
}
