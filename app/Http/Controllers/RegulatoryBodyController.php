<?php

namespace App\Http\Controllers;

use App\Models\RegulatoryBody;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * The authorities the firm answers to, and who licences its people.
 */
class RegulatoryBodyController extends Controller
{
    public const TYPES = ['bar association', 'court', 'government', 'regulator'];

    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'status');
        $perPage = (int) ($request->input('per_page') ?: 10);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => RegulatoryBody::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%$v%")
                ->orWhere('short_name', 'like', "%$v%")
                ->orWhere('jurisdiction', 'like', "%$v%")
                ->orWhere('contact_email', 'like', "%$v%")));

        return Inertia::render('compliance/bodies', [
            'bodies' => $matching()
                ->when(($filters['status'] ?? null) === 'active', fn ($q) => $q->where('active', true))
                ->when(($filters['status'] ?? null) === 'inactive', fn ($q) => $q->where('active', false))
                ->withCount('licenses')
                ->orderBy('name')
                ->paginate($perPage)
                ->withQueryString(),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => [
                'all' => $matching()->count(),
                'active' => $matching()->where('active', true)->count(),
                'inactive' => $matching()->where('active', false)->count(),
            ],
            'options' => ['types' => self::TYPES],
        ]);
    }

    /** The padlock in a row: take a body off the list, or put it back. */
    public function toggle(RegulatoryBody $body)
    {
        $body->update(['active' => ! $body->active]);

        return back()->with('success', "{$body->name} is now ".($body->active ? 'active' : 'inactive').'.');
    }

    public function store(Request $request)
    {
        RegulatoryBody::create($this->validated($request));

        return back()->with('success', 'Regulatory body added.');
    }

    public function update(Request $request, RegulatoryBody $body)
    {
        $body->update($this->validated($request));

        return back()->with('success', 'Regulatory body updated.');
    }

    public function destroy(RegulatoryBody $body)
    {
        $body->delete();

        return back()->with('success', 'Regulatory body removed.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'short_name' => ['nullable', 'string', 'max:40'],
            'type' => ['nullable', Rule::in(self::TYPES)],
            'jurisdiction' => ['nullable', 'string', 'max:120'],
            'website' => ['nullable', 'url', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'active' => ['required', 'boolean'],
        ]);
    }
}
