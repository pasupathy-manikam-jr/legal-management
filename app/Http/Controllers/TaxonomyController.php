<?php

namespace App\Http\Controllers;

use App\Models\Taxonomy;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * One screen for every configurable list in the firm — case types, statuses,
 * hearing types, document types, practice areas, research lists, expense categories.
 */
class TaxonomyController extends Controller
{
    public function index(Request $request)
    {
        $kind = $request->string('kind')->toString() ?: array_key_first(Taxonomy::KINDS);
        $facet = Taxonomy::FACETS[$kind] ?? null;
        $parentKind = Taxonomy::PARENTS[$kind] ?? null;

        $request->validate([
            'kind' => ['nullable', Rule::in(array_keys(Taxonomy::KINDS))],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'level' => ['nullable', Rule::in($facet['values'] ?? [])],
            'sort' => ['nullable', 'in:name,sort'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'status', 'name', 'level', 'parent');
        $perPage = (int) ($request->input('per_page') ?: 10);
        // Lists sit in the order the firm arranged them until a column is clicked.
        $sort = $request->string('sort')->toString() ?: 'sort';
        $direction = $request->string('direction')->toString() ?: 'asc';

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => Taxonomy::where('kind', $kind)
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%$v%")
                ->orWhere('description', 'like', "%$v%")))
            ->when($filters['name'] ?? null, fn ($q, $v) => $q->where('name', $v))
            ->when($parentKind && ($filters['parent'] ?? null), fn ($q) => $q->where("meta->$parentKind", $filters['parent']))
            ->when($facet && ! $facet['tabs'] && ($filters['level'] ?? null), fn ($q) => $q->where("meta->{$facet['key']}", $filters['level']))
            // Where the facet owns the tabs, status is a dropdown and narrows the counts;
            // otherwise status is the tab itself, and a tab must never narrow its own counts.
            ->when($facet && $facet['tabs'] && ($filters['status'] ?? null) === 'active', fn ($q) => $q->where('active', true))
            ->when($facet && $facet['tabs'] && ($filters['status'] ?? null) === 'inactive', fn ($q) => $q->where('active', false));

        // Only a tabbed facet replaces the Active/Inactive counts; a dropdown one narrows them.
        $counts = ['all' => $matching()->count()];

        if ($facet && $facet['tabs']) {
            foreach ($facet['values'] as $value) {
                $counts[$value] = $matching()->where("meta->{$facet['key']}", $value)->count();
            }
        } else {
            $counts['active'] = $matching()->where('active', true)->count();
            $counts['inactive'] = $counts['all'] - $counts['active'];
        }

        return Inertia::render('setup/index', [
            'kind' => $kind,
            'kinds' => Taxonomy::KINDS,
            'label' => Taxonomy::KINDS[$kind],
            'singular' => Taxonomy::singular($kind),
            'layout' => Taxonomy::LAYOUTS[$kind] ?? 'table',
            'hasColor' => in_array($kind, Taxonomy::COLOURED, true),
            'hasUrl' => in_array($kind, Taxonomy::WITH_URL, true),
            'filters' => $filters,
            'perPage' => $perPage,
            'sort' => ['column' => $sort, 'direction' => $direction],
            'facet' => $facet,
            'parent' => $parentKind ? [
                'kind' => $parentKind,
                'label' => Taxonomy::singular($parentKind),
                'options' => Taxonomy::kind($parentKind)->pluck('name'),
            ] : null,
            'entries' => $matching()
                ->when($facet && $facet['tabs'] && ($filters['level'] ?? null), fn ($q) => $q->where("meta->{$facet['key']}", $filters['level']))
                ->when((! $facet || ! $facet['tabs']) && ($filters['status'] ?? null) === 'active', fn ($q) => $q->where('active', true))
                ->when((! $facet || ! $facet['tabs']) && ($filters['status'] ?? null) === 'inactive', fn ($q) => $q->where('active', false))
                ->orderBy($sort, $direction)
                ->orderBy('name')
                ->paginate($perPage)
                ->withQueryString(),
            'counts' => $counts,
            'names' => Taxonomy::where('kind', $kind)->orderBy('name')->pluck('name'),
            'kindCounts' => Taxonomy::selectRaw('kind, count(*) as total')->groupBy('kind')->pluck('total', 'kind'),
        ]);
    }

    public function store(Request $request)
    {
        Taxonomy::create($this->validated($request));

        return back()->with('success', 'Entry added.');
    }

    public function update(Request $request, Taxonomy $taxonomy)
    {
        $taxonomy->update($this->validated($request, $taxonomy));

        return back()->with('success', 'Entry updated.');
    }

    /** The padlock in the row: retire an entry without deleting its history. */
    public function toggle(Taxonomy $taxonomy)
    {
        $taxonomy->update(['active' => ! $taxonomy->active]);

        return back();
    }

    public function destroy(Taxonomy $taxonomy)
    {
        $taxonomy->delete();

        return back()->with('success', 'Entry removed.');
    }

    private function validated(Request $request, ?Taxonomy $existing = null): array
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in(array_keys(Taxonomy::KINDS))],
            'name' => [
                'required', 'string', 'max:120',
                Rule::unique('taxonomies')->where('kind', $request->input('kind'))->ignore($existing?->id),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'sort' => ['required', 'integer', 'min:0', 'max:999'],
            'active' => ['required', 'boolean'],
            'meta.is_default' => ['nullable', 'boolean'],
            'meta.is_closed' => ['nullable', 'boolean'],
            'meta.duration_minutes' => ['nullable', 'integer', 'min:5', 'max:1440'],
            'meta.days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'meta.expertise' => ['nullable', Rule::in(Taxonomy::FACETS['practice_area']['values'])],
            'meta.type' => ['nullable', Rule::in(Taxonomy::FACETS['research_source']['values'])],
            // A parented list must say which entry of the other list it belongs to.
            'meta.practice_area' => [Rule::requiredIf($request->input('kind') === 'research_category'), 'nullable', 'string', 'max:120'],
            'meta.primary' => ['nullable', 'boolean'],
            'meta.url' => ['nullable', 'url', 'max:500'],
            'meta.note' => ['nullable', 'string', 'max:500'],
        ]);

        $data['meta'] = array_filter($request->input('meta', []), fn ($v) => $v !== null && $v !== '');

        return $data;
    }
}
