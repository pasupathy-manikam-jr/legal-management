<?php

namespace App\Http\Controllers;

use App\Models\LegalPrecedent;
use App\Models\Matter;
use App\Models\Taxonomy;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class LegalPrecedentController extends Controller
{
    /** How much weight a precedent still carries. */
    public const STATUSES = ['active', 'overruled', 'questioned', 'archived'];

    /** The score buckets behind the "All Scores" filter, as inclusive floors. */
    public const SCORES = ['high' => 90, 'medium' => 70, 'low' => 0];

    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'score' => ['nullable', Rule::in(array_keys(self::SCORES))],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('status', 'search', 'category', 'score');
        $perPage = (int) ($request->input('per_page') ?: 10);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => LegalPrecedent::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('case_name', 'like', "%$v%")
                ->orWhere('citation', 'like', "%$v%")
                ->orWhere('jurisdiction', 'like', "%$v%")))
            ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v))
            ->when($filters['score'] ?? null, function ($q, $v) {
                $floor = self::SCORES[$v];
                $ceiling = $v === 'high' ? 100 : ($v === 'medium' ? 89 : 69);

                return $q->whereBetween('relevance', [$floor, $ceiling]);
            });

        $counts = ['all' => $matching()->count()] + $matching()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        return Inertia::render('research/precedents', [
            'precedents' => $matching()
                ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
                ->with('matter:id,reference')
                ->orderByDesc('relevance')
                ->paginate($perPage)
                ->withQueryString(),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => $counts,
            'totals' => [
                // Shown out of ten, the way each row reads its score.
                'avgRelevance' => round(($matching()->avg('relevance') ?? 0) / 10, 1),
                'unsettled' => ($counts['overruled'] ?? 0) + ($counts['questioned'] ?? 0),
            ],
            'options' => [
                'matters' => Matter::orderBy('reference')->get()->map(fn (Matter $m) => ['id' => $m->id, 'label' => "{$m->reference} — {$m->title}"]),
                'categories' => Taxonomy::names('practice_area'),
                'statuses' => self::STATUSES,
                'scores' => array_keys(self::SCORES),
            ],
        ]);
    }

    /** The refresh button in a row: step the precedent on to the next status. */
    public function cycleStatus(LegalPrecedent $precedent)
    {
        $next = self::STATUSES[(array_search($precedent->status, self::STATUSES, true) + 1) % count(self::STATUSES)];

        $precedent->update(['status' => $next]);

        return back()->with('success', "Marked {$precedent->case_name} as {$next}.");
    }

    public function store(Request $request)
    {
        LegalPrecedent::create($this->validated($request));

        return back()->with('success', 'Precedent recorded.');
    }

    public function update(Request $request, LegalPrecedent $precedent)
    {
        $precedent->update($this->validated($request));

        return back()->with('success', 'Precedent updated.');
    }

    public function destroy(LegalPrecedent $precedent)
    {
        $precedent->delete();

        return back()->with('success', 'Precedent deleted.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'matter_id' => ['nullable', 'exists:matters,id'],
            'case_name' => ['required', 'string', 'max:255'],
            'citation' => ['required', 'string', 'max:255'],
            'court' => ['nullable', 'string', 'max:255'],
            'jurisdiction' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:120'],
            'decided_on' => ['nullable', 'date', 'before_or_equal:today'],
            'holding' => ['nullable', 'string', 'max:10000'],
            'relevance' => ['required', 'integer', 'min:0', 'max:100'],
            'status' => ['required', Rule::in(self::STATUSES)],
        ]);
    }
}
