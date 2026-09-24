<?php

namespace App\Http\Controllers;

use App\Models\Court;
use App\Models\Judge;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class JudgeController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'court' => ['nullable', 'exists:courts,id'],
            'view' => ['nullable', Rule::in(['grid', 'list'])],
            'per_page' => ['nullable', 'integer', 'in:12,24,48,96'],
        ]);

        $filters = $request->only('search', 'court', 'status');
        $perPage = (int) ($request->input('per_page') ?: 12);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => Judge::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%$v%")
                ->orWhere('reference', 'like', "%$v%")
                ->orWhere('designation', 'like', "%$v%")
                ->orWhere('email', 'like', "%$v%")))
            ->when($filters['court'] ?? null, fn ($q, $v) => $q->where('court_id', $v));

        return Inertia::render('courts/judges', [
            // The bench shows as cards; the table is the alternative behind ?view=list.
            'view' => $request->input('view') === 'list' ? 'list' : 'grid',
            'judges' => $matching()
                ->when(($filters['status'] ?? null) === 'active', fn ($q) => $q->where('active', true))
                ->when(($filters['status'] ?? null) === 'inactive', fn ($q) => $q->where('active', false))
                ->with('court:id,name')
                ->orderBy('name')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (Judge $judge) => [
                    'id' => $judge->id,
                    'reference' => $judge->reference,
                    'name' => $judge->name,
                    'designation' => $judge->designation,
                    'email' => $judge->email,
                    'phone' => $judge->phone,
                    'appointed_on' => $judge->appointed_on?->toDateString(),
                    'notes' => $judge->notes,
                    'active' => $judge->active,
                    'created_at' => $judge->created_at?->toDateString(),
                    'court_id' => $judge->court_id,
                    'court' => $judge->court?->name,
                    'hearings_count' => $judge->hearings()->count(),
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => [
                'all' => $matching()->count(),
                'active' => $matching()->where('active', true)->count(),
                'inactive' => $matching()->where('active', false)->count(),
            ],
            'options' => [
                'courts' => Court::where('active', true)->orderBy('name')->get(['id', 'name']),
                'designations' => Judge::query()->whereNotNull('designation')->distinct()->orderBy('designation')->pluck('designation'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        Judge::create($this->validated($request));

        return back()->with('success', 'Judge added.');
    }

    public function update(Request $request, Judge $judge)
    {
        $judge->update($this->validated($request));

        return back()->with('success', 'Judge updated.');
    }

    /** The padlock in a row: take a judge off the list, or put them back. */
    public function toggle(Judge $judge)
    {
        $judge->update(['active' => ! $judge->active]);

        return back()->with('success', "{$judge->name} is now ".($judge->active ? 'active' : 'inactive').'.');
    }

    public function destroy(Judge $judge)
    {
        $judge->delete();

        return back()->with('success', 'Judge removed.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'court_id' => ['nullable', 'exists:courts,id'],
            'name' => ['required', 'string', 'max:255'],
            'designation' => ['nullable', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'appointed_on' => ['nullable', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'active' => ['required', 'boolean'],
        ]);
    }
}
