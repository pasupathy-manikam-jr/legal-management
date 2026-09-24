<?php

namespace App\Http\Controllers;

use App\Models\NotificationTemplate;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function billing()
    {
        $this->authorizeAdmin();

        return Inertia::render('settings/billing', ['values' => Setting::all_values()]);
    }

    public function updateBilling(Request $request)
    {
        $this->authorizeAdmin();

        $data = $request->validate([
            'firm_name' => ['required', 'string', 'max:255'],
            'invoice_prefix' => ['required', 'string', 'max:10', 'regex:/^[A-Z0-9\-]+$/'],
            'payment_terms_days' => ['required', 'integer', 'min:0', 'max:365'],
            'default_tax_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'default_hourly_rate' => ['required', 'numeric', 'min:0', 'max:100000'],
            'currency' => ['required', 'string', 'size:3'],
            'invoice_footer' => ['nullable', 'string', 'max:1000'],
        ]);

        foreach ($data as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => (string) $value]);
        }

        return back()->with('success', 'Billing settings saved.');
    }

    public function templates(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate([
            'channel' => ['nullable', Rule::in(NotificationTemplate::CHANNELS)],
            'sort' => ['nullable', 'in:name'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $channel = $request->input('channel') ?: NotificationTemplate::CHANNELS[0];
        $filters = $request->only('search');
        $perPage = (int) ($request->input('per_page') ?: 10);
        $direction = $request->string('direction')->toString() ?: 'asc';

        return Inertia::render('settings/templates', [
            'channel' => $channel,
            'channels' => NotificationTemplate::CHANNELS,
            'templates' => NotificationTemplate::where('channel', $channel)
                ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                    ->where('name', 'like', "%$v%")
                    ->orWhere('body', 'like', "%$v%")))
                ->orderBy('name', $direction)
                ->paginate($perPage)
                ->withQueryString(),
            'filters' => $filters,
            'perPage' => $perPage,
            'sort' => ['column' => 'name', 'direction' => $direction],
            'variables' => ['{{client}}', '{{case}}', '{{reference}}', '{{date}}', '{{amount}}', '{{firm}}', '{{name}}'],
        ]);
    }

    /** The channel belongs to the template; only its wording and on/off can change. */
    public function updateTemplate(Request $request, NotificationTemplate $template)
    {
        $this->authorizeAdmin();

        $template->update($request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subject' => [Rule::requiredIf($template->channel === 'email'), 'nullable', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:20000'],
            'active' => ['required', 'boolean'],
        ]));

        return back()->with('success', 'Template saved.');
    }

    private function authorizeAdmin(): void
    {
        abort_unless(request()->user()?->isAdmin(), 403, 'Only firm admins may change firm settings.');
    }
}
