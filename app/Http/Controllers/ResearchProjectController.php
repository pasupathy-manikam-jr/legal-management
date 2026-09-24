<?php

namespace App\Http\Controllers;

use App\Models\Matter;
use App\Models\ResearchProject;
use App\Models\Taxonomy;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ResearchProjectController extends Controller
{
    /** The status cycle behind the refresh button in each row. */
    public const STATUSES = ['active', 'completed', 'on_hold', 'cancelled'];

    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high'])],
            'view' => ['nullable', Rule::in(['list', 'grid'])],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'type', 'priority', 'matter_id', 'status');
        $view = $request->input('view') === 'grid' ? 'grid' : 'list';
        $perPage = (int) ($request->input('per_page') ?: 10);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => ResearchProject::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%$v%")
                ->orWhere('question', 'like', "%$v%")
                ->orWhereHas('matter', fn ($m) => $m->where('reference', 'like', "%$v%"))))
            ->when($filters['type'] ?? null, fn ($q, $v) => $q->where('type', $v))
            ->when($filters['priority'] ?? null, fn ($q, $v) => $q->where('priority', $v))
            ->when($filters['matter_id'] ?? null, fn ($q, $v) => $q->where('matter_id', $v));

        return Inertia::render('research/projects', [
            'view' => $view,
            'projects' => $matching()
                ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
                ->with('matter', 'lead')
                ->latest('started_on')
                ->paginate($perPage)
                ->withQueryString(),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => ['all' => $matching()->count()] + $matching()
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status')
                ->all(),
            'options' => [
                'matters' => Matter::orderBy('reference')->get()->map(fn (Matter $m) => ['id' => $m->id, 'label' => "{$m->reference} — {$m->title}"]),
                'users' => User::where('active', true)->orderBy('name')->get(['id', 'name']),
                'types' => Taxonomy::names('research_type'),
                'categories' => Taxonomy::names('research_category'),
                'statuses' => self::STATUSES,
                'priorities' => ['low', 'medium', 'high'],
            ],
        ]);
    }

    /** The refresh button in a row: step the project on to the next status. */
    public function cycleStatus(ResearchProject $researchProject)
    {
        $next = self::STATUSES[(array_search($researchProject->status, self::STATUSES, true) + 1) % count(self::STATUSES)];

        $researchProject->update(['status' => $next]);

        return back()->with('success', "Marked {$researchProject->title} as ".str_replace('_', ' ', $next).'.');
    }

    public function store(Request $request)
    {
        ResearchProject::create($this->validated($request));

        return back()->with('success', 'Research project created.');
    }

    public function update(Request $request, ResearchProject $researchProject)
    {
        $researchProject->update($this->validated($request));

        return back()->with('success', 'Research project updated.');
    }

    public function destroy(ResearchProject $researchProject)
    {
        $researchProject->delete();

        return back()->with('success', 'Research project deleted.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'matter_id' => ['nullable', 'exists:matters,id'],
            'lead_id' => ['nullable', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'priority' => ['required', Rule::in(['low', 'medium', 'high'])],
            'status' => ['required', Rule::in(self::STATUSES)],
            'question' => ['nullable', 'string', 'max:5000'],
            'findings' => ['nullable', 'string', 'max:20000'],
            'started_on' => ['required', 'date'],
            'due_on' => ['nullable', 'date', 'after_or_equal:started_on'],
        ]);
    }
}
