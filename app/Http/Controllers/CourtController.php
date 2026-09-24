<?php

namespace App\Http\Controllers;

use App\Models\Court;
use App\Models\Taxonomy;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CourtController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'view' => ['nullable', Rule::in(['grid', 'list'])],
            'per_page' => ['nullable', 'integer', 'in:8,16,32,64'],
        ]);

        $filters = $request->only('search', 'type', 'status');
        $perPage = (int) ($request->input('per_page') ?: 8);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => Court::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%$v%")
                ->orWhere('reference', 'like', "%$v%")
                ->orWhere('jurisdiction', 'like', "%$v%")
                ->orWhere('email', 'like', "%$v%")))
            ->when($filters['type'] ?? null, fn ($q, $v) => $q->where('type', $v));

        return Inertia::render('courts/index', [
            // Courts show as cards; the table is the alternative behind ?view=list.
            'view' => $request->input('view') === 'list' ? 'list' : 'grid',
            'courts' => $matching()
                ->when(($filters['status'] ?? null) === 'active', fn ($q) => $q->where('active', true))
                ->when(($filters['status'] ?? null) === 'inactive', fn ($q) => $q->where('active', false))
                ->withCount('matters')
                ->orderBy('reference')
                ->paginate($perPage)
                ->withQueryString(),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => [
                'all' => $matching()->count(),
                'active' => $matching()->where('active', true)->count(),
                'inactive' => $matching()->where('active', false)->count(),
            ],
            'types' => Taxonomy::kind('court_type')->get(['name', 'color']),
        ]);
    }

    public function store(Request $request)
    {
        Court::create($this->validated($request));

        return back()->with('success', 'Court added.');
    }

    public function update(Request $request, Court $court)
    {
        $court->update($this->validated($request));

        return back()->with('success', 'Court updated.');
    }

    /** The padlock on a card: take a court off the list, or put it back. */
    public function toggle(Court $court)
    {
        $court->update(['active' => ! $court->active]);

        return back()->with('success', "{$court->name} is now ".($court->active ? 'active' : 'inactive').'.');
    }

    public function destroy(Court $court)
    {
        $court->delete();

        return back()->with('success', 'Court deleted.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:50'],
            'bench' => ['nullable', 'string', 'max:255'],
            'jurisdiction' => ['nullable', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:1000'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'active' => ['required', 'boolean'],
        ]);
    }
}
