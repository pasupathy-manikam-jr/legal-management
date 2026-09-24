<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Court;
use App\Models\Matter;
use App\Models\Taxonomy;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MatterController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'sort' => ['nullable', 'in:title,opened_on,reference'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'status', 'priority', 'case_type', 'court_id');
        $sort = $request->string('sort')->toString() ?: 'opened_on';
        $direction = $request->string('direction')->toString() ?: 'desc';
        $perPage = (int) ($request->input('per_page') ?: 10);

        $matters = Matter::with('client', 'leadLawyer', 'court', 'team')
            ->withCount('hearings', 'tasks')
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%$s%")
                ->orWhere('reference', 'like', "%$s%")
                ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%$s%"))))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['priority'] ?? null, fn ($q, $v) => $q->where('priority', $v))
            ->when($filters['case_type'] ?? null, fn ($q, $v) => $q->where('case_type', $v))
            ->when($filters['court_id'] ?? null, fn ($q, $v) => $q->where('court_id', $v))
            ->orderBy($sort, $direction)
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('matters/index', [
            'matters' => $matters,
            'filters' => $filters,
            'sort' => ['column' => $sort, 'direction' => $direction, 'perPage' => $perPage],
            // Case-type colours come from Firm Setup, so a firm can tint its own tags.
            'typeColors' => Taxonomy::kind('case_type')->pluck('color', 'name'),
            'counts' => [
                'all' => Matter::count(),
                'active' => Matter::where('status', '!=', 'closed')->count(),
                'low' => Matter::where('priority', 'low')->count(),
                'medium' => Matter::where('priority', 'medium')->count(),
                'high' => Matter::where('priority', 'high')->count(),
            ],
            'options' => $this->options(),
        ]);
    }

    public function show(Matter $matter)
    {
        $matter->load([
            'client', 'leadLawyer', 'court', 'team',
            'hearings' => fn ($q) => $q->with('court')->orderBy('scheduled_at'),
            'tasks' => fn ($q) => $q->with('assignee')->orderByRaw('completed_at is not null, due_on'),
            'documents.uploader',
            'events' => fn ($q) => $q->with('user')->latest('occurred_at'),
            'timeEntries' => fn ($q) => $q->with('user')->latest('worked_on'),
        ]);

        $billed = $matter->timeEntries->where('billable', true);

        return Inertia::render('matters/show', [
            'matter' => $matter,
            'totals' => [
                'minutes' => (int) $matter->timeEntries->sum('minutes'),
                'billableCents' => (int) $billed->sum(fn ($e) => $e->amountCents()),
                'unbilledCents' => (int) $billed->whereNull('invoice_id')->sum(fn ($e) => $e->amountCents()),
            ],
            'options' => $this->options(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['reference'] = Matter::nextReference();
        $matter = Matter::create($data);

        return redirect()->route('matters.show', $matter)->with('success', "Case {$matter->reference} opened.");
    }

    public function update(Request $request, Matter $matter)
    {
        $data = $this->validated($request);

        // Closing a case stamps the date; reopening clears it.
        if ($data['status'] === 'closed' && $matter->status !== 'closed') {
            $data['closed_on'] = now()->toDateString();
        } elseif ($data['status'] !== 'closed') {
            $data['closed_on'] = null;
        }

        $matter->update($data);

        return back()->with('success', 'Case updated.');
    }

    /** Row action: park a case or reopen it without opening the edit dialog. */
    public function toggleStatus(Matter $matter)
    {
        $closing = $matter->status !== 'closed';

        $matter->update([
            'status' => $closing ? 'closed' : 'open',
            'closed_on' => $closing ? now()->toDateString() : null,
        ]);

        return back()->with('success', $closing ? 'Case closed.' : 'Case reopened.');
    }

    public function destroy(Matter $matter)
    {
        $matter->delete();

        return redirect()->route('matters.index')->with('success', 'Case deleted.');
    }

    public function syncTeam(Request $request, Matter $matter)
    {
        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'role' => ['required', 'in:lead,associate,paralegal'],
        ]);

        $matter->team()->syncWithoutDetaching([$data['user_id'] => ['role' => $data['role']]]);

        return back()->with('success', 'Team member added.');
    }

    public function removeTeam(Matter $matter, User $user)
    {
        $matter->team()->detach($user->id);

        return back()->with('success', 'Team member removed.');
    }

    private function options(): array
    {
        return [
            'clients' => Client::orderBy('name')->get(['id', 'name']),
            'courts' => Court::where('active', true)->orderBy('name')->get(['id', 'name']),
            'users' => User::orderBy('name')->get(['id', 'name']),
            // Driven by Case Setup; the literals are the fallback before anything is configured.
            'caseTypes' => Taxonomy::names('case_type') ?: ['civil', 'criminal', 'family', 'corporate'],
            'practiceAreas' => Taxonomy::names('practice_area'),
            'statuses' => Taxonomy::names('case_status') ?: ['open', 'pending', 'closed'],
            'priorities' => ['low', 'medium', 'high'],
        ];
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'client_id' => ['required', 'exists:clients,id'],
            'lead_lawyer_id' => ['nullable', 'exists:users,id'],
            'court_id' => ['nullable', 'exists:courts,id'],
            'title' => ['required', 'string', 'max:255'],
            'practice_area' => ['nullable', 'string', 'max:255'],
            'case_type' => ['nullable', 'string', 'max:50'],
            'priority' => ['required', 'in:low,medium,high'],
            'judge' => ['nullable', 'string', 'max:255'],
            'opposing_party' => ['nullable', 'string', 'max:255'],
            'opposing_counsel' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:open,pending,closed'],
            'opened_on' => ['required', 'date'],
            'expected_completion' => ['nullable', 'date', 'after_or_equal:opened_on'],
            'hourly_rate' => ['required', 'numeric', 'min:0', 'max:100000'],
            'description' => ['nullable', 'string', 'max:10000'],
        ]);

        $data['hourly_rate_cents'] = (int) round($data['hourly_rate'] * 100);
        unset($data['hourly_rate']);

        return $data;
    }
}
