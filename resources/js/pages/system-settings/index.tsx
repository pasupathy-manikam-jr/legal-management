import { Field, SelectField, TextField } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Bell, CalendarDays, Copy, CreditCard, DollarSign, Mail, MessageSquare, Palette, RefreshCw, Save, Send, Settings as SettingsIcon, Slack } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'System Settings', href: '/system-settings' }];

interface Template {
    id: number;
    key: string;
    name: string;
    active: boolean;
}

interface Props {
    values: Record<string, string>;
    hasSecret: Record<string, boolean>;
    calendarFeedUrl: string | null;
    templates: Template[];
    options: {
        languages: Record<string, string>;
        dateFormats: Record<string, string>;
        timeFormats: Record<string, string>;
        timezones: string[];
        currencies: Record<string, string>;
        encryptions: Record<string, string>;
    };
}

const SECTIONS = [
    { id: 'system', label: 'System Settings', icon: SettingsIcon },
    { id: 'brand', label: 'Brand Settings', icon: Palette },
    { id: 'currency', label: 'Currency Settings', icon: DollarSign },
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'notifications', label: 'Email Notifications', icon: Bell },
    { id: 'slack', label: 'Slack Settings', icon: Slack },
    { id: 'twilio', label: 'Twilio Settings', icon: MessageSquare },
    { id: 'payments', label: 'Payment Settings', icon: CreditCard },
    { id: 'calendar', label: 'Google Calendar', icon: CalendarDays },
];

const secretPlaceholder = (stored: boolean) => (stored ? '•••••••• (leave blank to keep)' : 'Not set');

const entries = (record: Record<string, string>) => Object.entries(record).map(([value, label]) => ({ value, label }));

export default function SystemSettings({ values, hasSecret, calendarFeedUrl, templates, options }: Props) {
    const [active, setActive] = useState('system');

    const system = useForm({
        default_language: values.default_language,
        date_format: values.date_format,
        time_format: values.time_format,
        calendar_start_day: values.calendar_start_day,
        default_timezone: values.default_timezone,
    });

    const brand = useForm({
        firm_name: values.firm_name,
        title_text: values.title_text,
        footer_text: values.footer_text ?? '',
        theme_color: values.theme_color,
    });

    const currency = useForm({
        currency: values.currency,
        currency_symbol: values.currency_symbol,
        currency_symbol_position: values.currency_symbol_position,
        currency_symbol_space: values.currency_symbol_space === '1',
        currency_decimals: values.currency_decimals,
        currency_show_decimals: values.currency_show_decimals === '1',
        currency_decimal_separator: values.currency_decimal_separator,
        currency_thousands_separator: values.currency_thousands_separator,
    });

    const email = useForm({
        mail_driver: values.mail_driver,
        mail_host: values.mail_host,
        mail_port: values.mail_port,
        mail_username: values.mail_username,
        mail_password: '',
        mail_encryption: values.mail_encryption,
        mail_from_address: values.mail_from_address,
        mail_from_name: values.mail_from_name,
    });

    const slack = useForm({
        slack_enabled: values.slack_enabled === '1',
        slack_webhook_url: values.slack_webhook_url ?? '',
    });

    const twilio = useForm({
        twilio_enabled: values.twilio_enabled === '1',
        twilio_account_sid: values.twilio_account_sid ?? '',
        twilio_auth_token: '',
        twilio_from_number: values.twilio_from_number ?? '',
    });

    const payments = useForm({
        bank_transfer_enabled: values.bank_transfer_enabled === '1',
        bank_transfer_details: values.bank_transfer_details ?? '',
        stripe_enabled: values.stripe_enabled === '1',
        stripe_publishable_key: values.stripe_publishable_key ?? '',
        stripe_secret_key: '',
        paypal_enabled: values.paypal_enabled === '1',
        paypal_mode: values.paypal_mode ?? 'sandbox',
        paypal_client_id: values.paypal_client_id ?? '',
        paypal_secret: '',
    });

    const calendar = useForm({
        google_calendar_enabled: values.google_calendar_enabled === '1',
        google_calendar_id: values.google_calendar_id ?? '',
    });

    const testMail = useForm({ email: '' });
    const testSms = useForm({ phone: '' });

    // Preview the sample using the values in the form, not the saved ones.
    const preview = (() => {
        const decimals = currency.data.currency_show_decimals ? Number(currency.data.currency_decimals) : 0;
        const [whole, fraction] = (1234.56).toFixed(decimals).split('.');
        const thousands = currency.data.currency_thousands_separator === 'none' ? '' : currency.data.currency_thousands_separator;
        const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u0000').split('\u0000').join(thousands);
        const body = fraction ? `${grouped}${currency.data.currency_decimal_separator}${fraction}` : grouped;
        const gap = currency.data.currency_symbol_space ? ' ' : '';

        return currency.data.currency_symbol_position === 'before'
            ? `${currency.data.currency_symbol}${gap}${body}`
            : `${body}${gap}${currency.data.currency_symbol}`;
    })();

    const submit = (form: { put: (url: string, opts: object) => void }, url: string) => (e: FormEvent) => {
        e.preventDefault();
        form.put(url, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Settings" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div>
                    <h1 className="text-xl font-semibold">System Settings</h1>
                    <p className="text-xs text-muted-foreground">Firm-wide configuration. Your own account settings live under Settings.</p>
                </div>

                <div className="rounded-xl border p-4 lg:p-6">
                    <div className="flex w-full flex-col gap-8 min-[992px]:flex-row">
                        <nav className="w-full shrink-0 min-[992px]:sticky min-[992px]:top-20 min-[992px]:h-fit min-[992px]:w-72">
                            <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
                                {SECTIONS.map((section) => (
                                    <a
                                        key={section.id}
                                        href={`#${section.id}`}
                                        onClick={() => setActive(section.id)}
                                        className={cn(
                                            'flex h-9 w-full items-center gap-2 rounded-md px-4 text-sm transition-colors hover:bg-accent',
                                            active === section.id && 'bg-muted font-medium',
                                        )}
                                    >
                                        <section.icon className="size-4" />
                                        {section.label}
                                    </a>
                                ))}
                            </div>
                        </nav>

                        <div className="min-w-0 flex-1">
                            <Section
                                id="system"
                                title="System Settings"
                                description="Configure system-wide settings for your application"
                                onSave={submit(system, '/system-settings/system')}
                                saving={system.processing}
                            >
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <SelectField
                                        label="Default Language"
                                        value={system.data.default_language}
                                        onChange={(v) => system.setData('default_language', v)}
                                        options={entries(options.languages)}
                                    />
                                    <SelectField
                                        label="Date Format"
                                        value={system.data.date_format}
                                        onChange={(v) => system.setData('date_format', v)}
                                        options={entries(options.dateFormats)}
                                    />
                                    <SelectField
                                        label="Time Format"
                                        value={system.data.time_format}
                                        onChange={(v) => system.setData('time_format', v)}
                                        options={entries(options.timeFormats)}
                                    />
                                    <SelectField
                                        label="Calendar Start Day"
                                        value={system.data.calendar_start_day}
                                        onChange={(v) => system.setData('calendar_start_day', v)}
                                        options={[
                                            { value: 'sunday', label: 'Sunday' },
                                            { value: 'monday', label: 'Monday' },
                                        ]}
                                    />
                                    <SelectField
                                        label="Default Timezone"
                                        value={system.data.default_timezone}
                                        onChange={(v) => system.setData('default_timezone', v)}
                                        options={options.timezones.map((t) => ({ value: t, label: t }))}
                                        error={system.errors.default_timezone}
                                        className="md:col-span-2"
                                    />
                                </div>
                            </Section>

                            <Section
                                id="brand"
                                title="Brand Settings"
                                description="Customize your application's branding and appearance"
                                onSave={submit(brand, '/system-settings/brand')}
                                saving={brand.processing}
                            >
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <TextField label="Firm Name" value={brand.data.firm_name} onChange={(v) => brand.setData('firm_name', v)} error={brand.errors.firm_name} />
                                    <TextField label="Title Text" value={brand.data.title_text} onChange={(v) => brand.setData('title_text', v)} error={brand.errors.title_text} />
                                    <Field label="Theme Colour" error={brand.errors.theme_color}>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={brand.data.theme_color}
                                                onChange={(e) => brand.setData('theme_color', e.target.value)}
                                                className="h-9 w-14 cursor-pointer rounded-md border bg-transparent"
                                            />
                                            <Input value={brand.data.theme_color} onChange={(e) => brand.setData('theme_color', e.target.value)} className="font-mono" />
                                        </div>
                                    </Field>
                                    <TextField label="Footer Text" value={brand.data.footer_text} onChange={(v) => brand.setData('footer_text', v)} />
                                </div>
                            </Section>

                            <Section
                                id="currency"
                                title="Currency Settings"
                                description="Configure how currency values are displayed throughout the application"
                                onSave={submit(currency, '/system-settings/currency')}
                                saving={currency.processing}
                            >
                                <div className="mb-6 flex flex-col items-center justify-between gap-3 rounded-md border bg-muted/30 p-4 md:flex-row">
                                    <div className="flex flex-col items-center md:items-start">
                                        <div className="mb-1 font-mono text-2xl font-semibold">{preview}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {options.currencies[currency.data.currency] ?? currency.data.currency} — live preview
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">Saved value renders as {money(123456)}</div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 min-[1230px]:grid-cols-2">
                                    <SelectField
                                        label="Default Currency"
                                        value={currency.data.currency}
                                        onChange={(v) => currency.setData('currency', v)}
                                        options={entries(options.currencies)}
                                        error={currency.errors.currency}
                                    />
                                    <TextField
                                        label="Currency Symbol"
                                        value={currency.data.currency_symbol}
                                        onChange={(v) => currency.setData('currency_symbol', v)}
                                        error={currency.errors.currency_symbol}
                                    />
                                    <SelectField
                                        label="Decimal Places"
                                        value={currency.data.currency_decimals}
                                        onChange={(v) => currency.setData('currency_decimals', v)}
                                        options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} (e.g. ${(1234.5678).toFixed(n)})` }))}
                                    />
                                    <SelectField
                                        label="Thousands Separator"
                                        value={currency.data.currency_thousands_separator}
                                        onChange={(v) => currency.setData('currency_thousands_separator', v)}
                                        options={[
                                            { value: ',', label: 'Comma (1,234.56)' },
                                            { value: '.', label: 'Dot (1.234,56)' },
                                            { value: ' ', label: 'Space (1 234.56)' },
                                            { value: 'none', label: 'None (123456)' },
                                        ]}
                                    />
                                    <Field label="Symbol Position">
                                        <div className="flex flex-wrap gap-2">
                                            {(['before', 'after'] as const).map((position) => (
                                                <Button
                                                    key={position}
                                                    type="button"
                                                    variant={currency.data.currency_symbol_position === position ? 'default' : 'outline'}
                                                    className="min-w-[100px] flex-1 font-mono"
                                                    onClick={() => currency.setData('currency_symbol_position', position)}
                                                >
                                                    {position === 'before' ? `${currency.data.currency_symbol}100` : `100${currency.data.currency_symbol}`}
                                                </Button>
                                            ))}
                                        </div>
                                    </Field>
                                    <Field label="Decimal Separator">
                                        <div className="flex flex-wrap gap-2">
                                            {([['.', 'Dot (123.45)'], [',', 'Comma (123,45)']] as const).map(([value, label]) => (
                                                <Button
                                                    key={value}
                                                    type="button"
                                                    variant={currency.data.currency_decimal_separator === value ? 'default' : 'outline'}
                                                    className="min-w-[110px] flex-1"
                                                    onClick={() => currency.setData('currency_decimal_separator', value)}
                                                >
                                                    {label}
                                                </Button>
                                            ))}
                                        </div>
                                    </Field>
                                    <Toggle
                                        label="Show Decimals"
                                        hint="Display decimal places in amounts"
                                        checked={currency.data.currency_show_decimals}
                                        onChange={(v) => currency.setData('currency_show_decimals', v)}
                                    />
                                    <Toggle
                                        label="Add Space"
                                        hint="Space between amount and symbol"
                                        checked={currency.data.currency_symbol_space}
                                        onChange={(v) => currency.setData('currency_symbol_space', v)}
                                    />
                                </div>
                            </Section>

                            <Section
                                id="email"
                                title="Email Settings"
                                description="Configure the mail server used for notifications and communications"
                                onSave={submit(email, '/system-settings/email')}
                                saving={email.processing}
                            >
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <TextField label="Mail Driver" value={email.data.mail_driver} onChange={(v) => email.setData('mail_driver', v)} error={email.errors.mail_driver} />
                                    <TextField label="SMTP Host" value={email.data.mail_host} onChange={(v) => email.setData('mail_host', v)} error={email.errors.mail_host} />
                                    <TextField label="SMTP Port" type="number" value={email.data.mail_port} onChange={(v) => email.setData('mail_port', v)} error={email.errors.mail_port} />
                                    <TextField label="SMTP Username" value={email.data.mail_username} onChange={(v) => email.setData('mail_username', v)} />
                                    <TextField
                                        label="SMTP Password"
                                        type="password"
                                        value={email.data.mail_password}
                                        onChange={(v) => email.setData('mail_password', v)}
                                        placeholder={hasSecret.mail_password ? '•••••••• (leave blank to keep)' : 'Not set'}
                                    />
                                    <SelectField
                                        label="Encryption"
                                        value={email.data.mail_encryption}
                                        onChange={(v) => email.setData('mail_encryption', v)}
                                        options={entries(options.encryptions)}
                                    />
                                    <TextField
                                        label="From Address"
                                        type="email"
                                        value={email.data.mail_from_address}
                                        onChange={(v) => email.setData('mail_from_address', v)}
                                        error={email.errors.mail_from_address}
                                    />
                                    <TextField label="From Name" value={email.data.mail_from_name} onChange={(v) => email.setData('mail_from_name', v)} error={email.errors.mail_from_name} />
                                </div>

                                <div className="mt-6 rounded-lg border p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Send className="size-4 text-primary" />
                                        <h3 className="text-sm font-medium">Test Email Configuration</h3>
                                    </div>
                                    <div className="flex flex-wrap items-end gap-2">
                                        <div className="min-w-[220px] flex-1">
                                            <Label className="text-xs">Send test to</Label>
                                            <Input
                                                type="email"
                                                placeholder="test@example.com"
                                                value={testMail.data.email}
                                                onChange={(e) => testMail.setData('email', e.target.value)}
                                                className="mt-1.5"
                                            />
                                            {testMail.errors.email && <p className="mt-1 text-xs text-rose-600">{testMail.errors.email}</p>}
                                        </div>
                                        <Button
                                            type="button"
                                            disabled={testMail.processing || !testMail.data.email}
                                            onClick={() => testMail.post('/system-settings/test-email', { preserveScroll: true })}
                                        >
                                            <Send className="size-4" /> Send Test Email
                                        </Button>
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground">Uses the saved settings above, so save before testing.</p>
                                </div>
                            </Section>

                            <Section id="notifications" title="Email Notifications" description="Choose which notifications the firm sends">
                                <div className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-2 min-[1500px]:grid-cols-3">
                                    {templates.length === 0 && <p className="text-sm text-muted-foreground">No templates configured.</p>}
                                    {templates.map((template) => (
                                        <div key={template.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                            <Label className="min-w-0 flex-1 text-sm leading-tight font-medium">{template.name}</Label>
                                            <Switch
                                                checked={template.active}
                                                onChange={() => router.patch(`/system-settings/templates/${template.id}`, {}, { preserveScroll: true })}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-3 text-xs text-muted-foreground">Edit the wording of each template under Notification Templates.</p>
                            </Section>

                            <Section
                                id="slack"
                                title="Slack Settings"
                                description="Post firm notifications to a Slack channel"
                                onSave={submit(slack, '/system-settings/slack')}
                                saving={slack.processing}
                            >
                                <Toggle
                                    label="Enable Slack Integration"
                                    hint="Turn on to post notifications to Slack"
                                    checked={slack.data.slack_enabled}
                                    onChange={(v) => slack.setData('slack_enabled', v)}
                                />

                                <div className="mt-4">
                                    <TextField
                                        label="Webhook URL"
                                        value={slack.data.slack_webhook_url}
                                        onChange={(v) => slack.setData('slack_webhook_url', v)}
                                        error={slack.errors.slack_webhook_url}
                                        placeholder="https://hooks.slack.com/services/..."
                                        disabled={!slack.data.slack_enabled}
                                    />
                                </div>

                                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border p-4">
                                    <div className="min-w-[200px] flex-1">
                                        <h3 className="text-sm font-medium">Test Slack Configuration</h3>
                                        <p className="mt-1 text-xs text-muted-foreground">Posts a test message to the saved webhook.</p>
                                    </div>
                                    <Button type="button" variant="outline" onClick={() => router.post('/system-settings/test-slack', {}, { preserveScroll: true })}>
                                        <Send className="size-4" /> Send Test Message
                                    </Button>
                                </div>
                            </Section>

                            <Section
                                id="twilio"
                                title="Twilio Settings"
                                description="Send SMS reminders and alerts through your Twilio account"
                                onSave={submit(twilio, '/system-settings/twilio')}
                                saving={twilio.processing}
                            >
                                <Toggle
                                    label="Enable Twilio SMS"
                                    hint="Turn on to send text messages from the firm"
                                    checked={twilio.data.twilio_enabled}
                                    onChange={(v) => twilio.setData('twilio_enabled', v)}
                                />

                                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <TextField
                                        label="Account SID"
                                        value={twilio.data.twilio_account_sid}
                                        onChange={(v) => twilio.setData('twilio_account_sid', v)}
                                        error={twilio.errors.twilio_account_sid}
                                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        disabled={!twilio.data.twilio_enabled}
                                    />
                                    <TextField
                                        label="Auth Token"
                                        type="password"
                                        value={twilio.data.twilio_auth_token}
                                        onChange={(v) => twilio.setData('twilio_auth_token', v)}
                                        error={twilio.errors.twilio_auth_token}
                                        placeholder={secretPlaceholder(hasSecret.twilio_auth_token)}
                                        disabled={!twilio.data.twilio_enabled}
                                    />
                                    <TextField
                                        label="From Number"
                                        value={twilio.data.twilio_from_number}
                                        onChange={(v) => twilio.setData('twilio_from_number', v)}
                                        error={twilio.errors.twilio_from_number}
                                        placeholder="+15550123456"
                                        disabled={!twilio.data.twilio_enabled}
                                    />
                                </div>

                                <div className="mt-6 rounded-lg border p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Send className="size-4 text-primary" />
                                        <h3 className="text-sm font-medium">Test SMS Configuration</h3>
                                    </div>
                                    <div className="flex flex-wrap items-end gap-2">
                                        <div className="min-w-[220px] flex-1">
                                            <Label className="text-xs">Send test to</Label>
                                            <Input
                                                placeholder="+15550123456"
                                                value={testSms.data.phone}
                                                onChange={(e) => testSms.setData('phone', e.target.value)}
                                                className="mt-1.5"
                                            />
                                            {testSms.errors.phone && <p className="mt-1 text-xs text-rose-600">{testSms.errors.phone}</p>}
                                        </div>
                                        <Button
                                            type="button"
                                            disabled={testSms.processing || !testSms.data.phone}
                                            onClick={() => testSms.post('/system-settings/test-sms', { preserveScroll: true })}
                                        >
                                            <Send className="size-4" /> Send Test SMS
                                        </Button>
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground">Uses the saved credentials above, so save before testing. Twilio charges for the message.</p>
                                </div>
                            </Section>

                            <Section
                                id="payments"
                                title="Payment Settings"
                                description="How clients are told to pay an invoice"
                                onSave={submit(payments, '/system-settings/payments')}
                                saving={payments.processing}
                            >
                                <Toggle
                                    label="Bank Transfer"
                                    hint="Print these details on every invoice"
                                    checked={payments.data.bank_transfer_enabled}
                                    onChange={(v) => payments.setData('bank_transfer_enabled', v)}
                                />

                                <div className="mt-4">
                                    <Field label="Bank details" error={payments.errors.bank_transfer_details}>
                                        <textarea
                                            rows={4}
                                            value={payments.data.bank_transfer_details}
                                            onChange={(e) => payments.setData('bank_transfer_details', e.target.value)}
                                            disabled={!payments.data.bank_transfer_enabled}
                                            placeholder={'Whitmore & Co. Client Account\nSort code 00-00-00\nAccount 12345678\nIBAN GB00 XXXX 0000 0000 0000 00'}
                                            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
                                        />
                                    </Field>
                                </div>

                                <div className="mt-6">
                                    <Toggle
                                        label="Stripe"
                                        hint="Card payments through Stripe"
                                        checked={payments.data.stripe_enabled}
                                        onChange={(v) => payments.setData('stripe_enabled', v)}
                                    />
                                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <TextField
                                            label="Publishable Key"
                                            value={payments.data.stripe_publishable_key}
                                            onChange={(v) => payments.setData('stripe_publishable_key', v)}
                                            error={payments.errors.stripe_publishable_key}
                                            placeholder="pk_live_..."
                                            disabled={!payments.data.stripe_enabled}
                                        />
                                        <TextField
                                            label="Secret Key"
                                            type="password"
                                            value={payments.data.stripe_secret_key}
                                            onChange={(v) => payments.setData('stripe_secret_key', v)}
                                            error={payments.errors.stripe_secret_key}
                                            placeholder={secretPlaceholder(hasSecret.stripe_secret_key)}
                                            disabled={!payments.data.stripe_enabled}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <Toggle
                                        label="PayPal"
                                        hint="Payments through a PayPal business account"
                                        checked={payments.data.paypal_enabled}
                                        onChange={(v) => payments.setData('paypal_enabled', v)}
                                    />
                                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <SelectField
                                            label="Mode"
                                            value={payments.data.paypal_mode}
                                            onChange={(v) => payments.setData('paypal_mode', v)}
                                            options={[
                                                { value: 'sandbox', label: 'Sandbox (testing)' },
                                                { value: 'live', label: 'Live' },
                                            ]}
                                        />
                                        <TextField
                                            label="Client ID"
                                            value={payments.data.paypal_client_id}
                                            onChange={(v) => payments.setData('paypal_client_id', v)}
                                            error={payments.errors.paypal_client_id}
                                            disabled={!payments.data.paypal_enabled}
                                        />
                                        <TextField
                                            label="Secret"
                                            type="password"
                                            value={payments.data.paypal_secret}
                                            onChange={(v) => payments.setData('paypal_secret', v)}
                                            error={payments.errors.paypal_secret}
                                            placeholder={secretPlaceholder(hasSecret.paypal_secret)}
                                            disabled={!payments.data.paypal_enabled}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border p-4">
                                    <div className="min-w-[200px] flex-1">
                                        <h3 className="text-sm font-medium">Verify Stripe Key</h3>
                                        <p className="mt-1 text-xs text-muted-foreground">Asks Stripe whether the saved secret key is valid.</p>
                                    </div>
                                    <Button type="button" variant="outline" onClick={() => router.post('/system-settings/test-stripe', {}, { preserveScroll: true })}>
                                        <Send className="size-4" /> Verify Key
                                    </Button>
                                </div>
                            </Section>

                            <Section
                                id="calendar"
                                title="Google Calendar Settings"
                                description="Publish hearings as a calendar anyone on the team can subscribe to"
                                onSave={submit(calendar, '/system-settings/calendar')}
                                saving={calendar.processing}
                            >
                                <Toggle
                                    label="Enable Calendar Feed"
                                    hint="Serve hearings at a private subscription link"
                                    checked={calendar.data.google_calendar_enabled}
                                    onChange={(v) => calendar.setData('google_calendar_enabled', v)}
                                />

                                <div className="mt-4">
                                    <TextField
                                        label="Google Calendar ID (optional)"
                                        value={calendar.data.google_calendar_id}
                                        onChange={(v) => calendar.setData('google_calendar_id', v)}
                                        error={calendar.errors.google_calendar_id}
                                        placeholder="firm@group.calendar.google.com"
                                        disabled={!calendar.data.google_calendar_enabled}
                                    />
                                    <p className="mt-1.5 text-xs text-muted-foreground">A note of which calendar the feed was added to. Nothing is sent to Google.</p>
                                </div>

                                <div className="mt-6 rounded-lg border p-4">
                                    <h3 className="text-sm font-medium">Subscription Link</h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        In Google Calendar choose <span className="font-medium">Other calendars → From URL</span> and paste this address. Anyone holding the
                                        link can read the firm&apos;s hearings, so treat it as a password.
                                    </p>
                                    {calendarFeedUrl ? (
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <Input readOnly value={calendarFeedUrl} className="min-w-[260px] flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
                                            <Button type="button" variant="outline" onClick={() => navigator.clipboard?.writeText(calendarFeedUrl)}>
                                                <Copy className="size-4" /> Copy
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => router.post('/system-settings/calendar/regenerate', {}, { preserveScroll: true })}
                                            >
                                                <RefreshCw className="size-4" /> Regenerate
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-xs text-muted-foreground">Turn the feed on and save to generate a link.</p>
                                    )}
                                </div>
                            </Section>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function Section({
    id,
    title,
    description,
    children,
    onSave,
    saving,
}: {
    id: string;
    title: string;
    description: string;
    children: ReactNode;
    onSave?: (e: FormEvent) => void;
    saving?: boolean;
}) {
    return (
        <section id={id} className="mb-8 scroll-mt-24">
            <div className="rounded-lg border bg-card shadow-sm">
                <header className="flex items-start justify-between gap-3 p-6 pb-3">
                    <div>
                        <h2 className="text-lg font-medium tracking-tight">{title}</h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
                    </div>
                    {onSave && (
                        <Button type="submit" form={`${id}-form`} size="sm" disabled={saving}>
                            <Save className="size-4" /> Save Changes
                        </Button>
                    )}
                </header>
                <div className="p-6 pt-0">
                    {onSave ? (
                        <form id={`${id}-form`} onSubmit={onSave}>
                            {children}
                        </form>
                    ) : (
                        children
                    )}
                </div>
            </div>
        </section>
    );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                checked ? 'bg-primary' : 'bg-input',
            )}
        >
            <span
                className={cn(
                    'pointer-events-none block size-5 rounded-full bg-background shadow-lg transition-transform',
                    checked ? 'translate-x-5' : 'translate-x-0',
                )}
            />
        </button>
    );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-md border p-4">
            <div>
                <Label className="text-sm font-medium">{label}</Label>
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </div>
            <Switch checked={checked} onChange={onChange} />
        </div>
    );
}
