<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use EInvoiceSdk\Codes;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * The firm's own details — who it is, what it practises and how to reach it.
 * Kept in the settings store alongside the rest of the firm's configuration.
 */
class CompanyProfileController extends Controller
{
    /** How a firm describes its shape. */
    public const BUSINESS_TYPES = ['sole practitioner', 'law firm', 'legal consultancy', 'chambers'];

    public const PRACTICE_SIZES = ['solo', 'small', 'medium', 'large'];

    /** Every field the screen reads and the edit form writes. */
    private const FIELDS = [
        'firm_name', 'business_type', 'years_experience', 'practice_size', 'bar_registration_no',
        'registration_no', 'established_on', 'advocate_name', 'firm_email', 'firm_phone',
        'firm_website', 'consultation_fee', 'office_hours', 'firm_address', 'law_degree',
        'university', 'languages_spoken', 'success_rate', 'specialization', 'court_jurisdictions',
        'services_offered', 'notable_cases', 'firm_description',
        'firm_tin', 'firm_id_type', 'sst_no', 'msic_code', 'msic_description',
        'firm_city', 'firm_postcode', 'firm_state', 'firm_country', 'einvoice_tax_type',
    ];

    public function index()
    {
        return Inertia::render('system-settings/company-profile', [
            'profile' => array_intersect_key(Setting::all_values(), array_flip(self::FIELDS)),
            'options' => [
                'businessTypes' => self::BUSINESS_TYPES,
                'practiceSizes' => self::PRACTICE_SIZES,
                'states' => array_values(Codes::states()),
                'taxTypes' => Codes::taxTypes(),
            ],
            'einvoice' => EInvoiceController::settingsSummary(),
        ]);
    }

    public function update(Request $request)
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only firm admins may change the company profile.');

        $data = $request->validate([
            'firm_name' => ['required', 'string', 'max:255'],
            'business_type' => ['required', Rule::in(self::BUSINESS_TYPES)],
            'years_experience' => ['nullable', 'integer', 'min:0', 'max:200'],
            'practice_size' => ['required', Rule::in(self::PRACTICE_SIZES)],
            'bar_registration_no' => ['nullable', 'string', 'max:120'],
            'registration_no' => ['nullable', 'string', 'max:120'],
            'established_on' => ['nullable', 'date', 'before_or_equal:today'],
            'advocate_name' => ['nullable', 'string', 'max:255'],
            'firm_email' => ['nullable', 'email', 'max:255'],
            'firm_phone' => ['nullable', 'string', 'max:40'],
            'firm_website' => ['nullable', 'url', 'max:255'],
            'consultation_fee' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'office_hours' => ['nullable', 'string', 'max:255'],
            'firm_address' => ['nullable', 'string', 'max:500'],
            'law_degree' => ['nullable', 'string', 'max:255'],
            'university' => ['nullable', 'string', 'max:255'],
            'languages_spoken' => ['nullable', 'string', 'max:255'],
            'success_rate' => ['nullable', 'integer', 'min:0', 'max:100'],
            'specialization' => ['nullable', 'string', 'max:500'],
            'court_jurisdictions' => ['nullable', 'string', 'max:500'],
            'services_offered' => ['nullable', 'string', 'max:1000'],
            'notable_cases' => ['nullable', 'string', 'max:2000'],
            'firm_description' => ['nullable', 'string', 'max:2000'],
            'firm_tin' => ['nullable', 'string', 'max:20'],
            'firm_id_type' => ['sometimes', Rule::in(['BRN', 'NRIC'])],
            'sst_no' => ['nullable', 'string', 'max:50'],
            'msic_code' => ['nullable', 'digits:5'],
            'msic_description' => ['nullable', 'string', 'max:255'],
            'firm_city' => ['nullable', 'string', 'max:100'],
            'firm_postcode' => ['nullable', 'string', 'max:20'],
            'firm_state' => ['nullable', 'string', 'max:100'],
            'firm_country' => ['nullable', 'string', 'max:100'],
            'einvoice_tax_type' => ['sometimes', Rule::in(array_keys(Codes::taxTypes()))],
        ]);

        foreach ($data as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => (string) ($value ?? '')]);
        }

        return back()->with('success', 'Company profile saved.');
    }
}
