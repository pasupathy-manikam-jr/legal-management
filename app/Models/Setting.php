<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['key', 'value'];

    /** Firm defaults — the fallbacks the app runs on before anyone visits Billing Setup. */
    public const DEFAULTS = [
        // Billing
        'firm_name' => 'Whitmore & Co.',
        'invoice_prefix' => 'INV',
        'payment_terms_days' => '30',
        'default_tax_percent' => '0',
        'default_hourly_rate' => '250',
        'invoice_footer' => 'Payable within the stated terms.',

        // Company profile — the firm's own details, shown on the Company Profile screen.
        'business_type' => 'law firm',
        'years_experience' => '',
        'practice_size' => 'small',
        'bar_registration_no' => '',
        'registration_no' => '',
        'established_on' => '',
        'advocate_name' => '',
        'firm_email' => '',
        'firm_phone' => '',
        'firm_website' => '',
        'consultation_fee' => '',
        'office_hours' => '',
        'firm_address' => '',
        'law_degree' => '',
        'university' => '',
        'languages_spoken' => '',
        'success_rate' => '',
        'specialization' => '',
        'court_jurisdictions' => '',
        'services_offered' => '',
        'notable_cases' => '',
        'firm_description' => '',

        // System
        'default_language' => 'en',
        'date_format' => 'Y-m-d',
        'time_format' => 'H:i',
        'calendar_start_day' => 'sunday',
        'default_timezone' => 'UTC',

        // Brand
        'title_text' => 'Advocate',
        'footer_text' => '© Advocate. All rights reserved.',
        'theme_color' => '#10b981',

        // Currency — these drive money formatting across the whole app.
        'currency' => 'USD',
        'currency_symbol' => '$',
        'currency_symbol_position' => 'before',
        'currency_symbol_space' => '0',
        'currency_decimals' => '2',
        'currency_show_decimals' => '1',
        'currency_decimal_separator' => '.',
        'currency_thousands_separator' => ',',

        // Email
        'mail_driver' => 'smtp',
        'mail_host' => '',
        'mail_port' => '587',
        'mail_username' => '',
        'mail_password' => '',
        'mail_encryption' => 'tls',
        'mail_from_address' => '',
        'mail_from_name' => 'Advocate',

        // Slack
        'slack_enabled' => '0',
        'slack_webhook_url' => '',

        // Twilio (SMS)
        'twilio_enabled' => '0',
        'twilio_account_sid' => '',
        'twilio_auth_token' => '',
        'twilio_from_number' => '',

        // Payments — how clients are told to pay an invoice.
        'bank_transfer_enabled' => '1',
        'bank_transfer_details' => '',
        'stripe_enabled' => '0',
        'stripe_publishable_key' => '',
        'stripe_secret_key' => '',
        'paypal_enabled' => '0',
        'paypal_mode' => 'sandbox',
        'paypal_client_id' => '',
        'paypal_secret' => '',

        // Google Calendar — hearings published as a subscribable feed.
        'google_calendar_enabled' => '0',
        'google_calendar_id' => '',
        'calendar_feed_token' => '',
    ];

    /** Keys that must never be sent to the browser. */
    public const SECRET_KEYS = ['mail_password', 'twilio_auth_token', 'stripe_secret_key', 'paypal_secret'];

    /** Everything except secrets, for sharing with the front end. */
    public static function public_values(): array
    {
        return array_diff_key(self::all_values(), array_flip(self::SECRET_KEYS));
    }

    /** The subset the money formatter needs. */
    public static function currency(): array
    {
        $all = self::all_values();

        return [
            'symbol' => $all['currency_symbol'],
            'position' => $all['currency_symbol_position'],
            'space' => $all['currency_symbol_space'] === '1',
            'decimals' => $all['currency_show_decimals'] === '1' ? (int) $all['currency_decimals'] : 0,
            'decimalSeparator' => $all['currency_decimal_separator'],
            'thousandsSeparator' => $all['currency_thousands_separator'] === 'none' ? '' : $all['currency_thousands_separator'],
        ];
    }

    public static function all_values(): array
    {
        return array_merge(self::DEFAULTS, static::query()->pluck('value', 'key')->all());
    }

    public static function get(string $key): ?string
    {
        return static::all_values()[$key] ?? null;
    }
}
