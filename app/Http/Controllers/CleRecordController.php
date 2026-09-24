<?php

namespace App\Http\Controllers;

use App\Models\CleRecord;
use App\Models\Taxonomy;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Continuing legal education: the courses each member has taken, and how far
 * each one has got towards the credits it carries.
 */
class CleRecordController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(CleRecord::STATUSES)],
            'member' => ['nullable', 'exists:users,id'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'member', 'status');
        $perPage = (int) ($request->input('per_page') ?: 10);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => CleRecord::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%$v%")
                ->orWhere('provider', 'like', "%$v%")))
            ->when($filters['member'] ?? null, fn ($q, $v) => $q->where('user_id', $v));

        $counts = ['all' => $matching()->count()] + $matching()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        return Inertia::render('compliance/cle', [
            'records' => $matching()
                ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
                ->with('member:id,name,email')
                ->orderByDesc('completed_on')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (CleRecord $r) => [
                    'id' => $r->id,
                    'title' => $r->title,
                    'provider' => $r->provider,
                    'category' => $r->category,
                    'credit_hours' => $r->credit_hours,
                    'required_hours' => $r->required_hours,
                    'progress' => $r->progress(),
                    'status' => $r->status,
                    'completed_on' => $r->completed_on?->toDateString(),
                    'compliance_year' => $r->compliance_year,
                    'notes' => $r->notes,
                    'certificate_url' => $r->certificate_url,
                    'user_id' => $r->user_id,
                    'member' => $r->member?->name,
                    'email' => $r->member?->email,
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => $counts,
            'options' => [
                'years' => range(now()->year, now()->year - 4),
                'users' => User::where('active', true)->orderBy('name')->get(['id', 'name']),
                'statuses' => CleRecord::STATUSES,
                'categories' => Taxonomy::names('compliance_category'),
                'providers' => CleRecord::whereNotNull('provider')->distinct()->orderBy('provider')->pluck('provider'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        CleRecord::create($this->validated($request));

        return back()->with('success', 'CLE credit recorded.');
    }

    public function update(Request $request, CleRecord $record)
    {
        $record->update($this->validated($request));

        return back()->with('success', 'CLE credit updated.');
    }

    public function destroy(CleRecord $record)
    {
        $record->delete();

        return back()->with('success', 'CLE credit removed.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'provider' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:120'],
            'credit_hours' => ['required', 'numeric', 'min:0', 'max:100'],
            'required_hours' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'status' => ['required', Rule::in(CleRecord::STATUSES)],
            'completed_on' => ['required', 'date', 'before_or_equal:today'],
            'compliance_year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'certificate_url' => ['nullable', 'url', 'max:500'],
        ]);

        // Credits count towards the year they were sat in unless told otherwise,
        // and a course with no stated worth is worth what was earned on it.
        $data['compliance_year'] ??= (int) date('Y', strtotime($data['completed_on']));
        $data['required_hours'] ??= $data['credit_hours'];

        return $data;
    }
}
