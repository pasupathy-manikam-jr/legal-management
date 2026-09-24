<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Matter;
use App\Models\Taxonomy;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ExpenseController extends Controller
{
    /** Where an expense sits in the approval flow. */
    public const STATUSES = ['pending', 'approved', 'rejected'];

    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'billable' => ['nullable', Rule::in(['yes', 'no'])],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'category', 'billable', 'matter', 'status');
        $status = $filters['status'] ?? 'pending';
        $perPage = (int) ($request->input('per_page') ?: 10);

        // Search and the two dropdowns narrow everything on the page: cards, rail and table.
        $matching = fn () => Expense::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('description', 'like', "%$v%")
                ->orWhere('category', 'like', "%$v%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$v%"))))
            ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v))
            ->when(($filters['billable'] ?? null) === 'yes', fn ($q) => $q->where('billable', true))
            ->when(($filters['billable'] ?? null) === 'no', fn ($q) => $q->where('billable', false));

        $cases = $this->casesFor($matching());

        // Default to the first case in the rail so the table is never empty on arrival.
        $selected = $request->filled('matter') ? (int) $request->input('matter') : (int) ($cases->first()['id'] ?? 0);
        $ofCase = fn () => $matching()->where('matter_id', $selected ?: null);

        $expenses = $ofCase()
            ->where('status', $status)
            ->with('matter:id,reference,title', 'user:id,name,email')
            ->latest('incurred_on')
            ->paginate($perPage)
            ->withQueryString();

        $caseTotals = $ofCase()->selectRaw('billable, coalesce(sum(amount_cents), 0) as total')->groupBy('billable')->pluck('total', 'billable');
        $totals = $matching()->selectRaw('status, coalesce(sum(amount_cents), 0) as total')->groupBy('status')->pluck('total', 'status');

        return Inertia::render('expenses/index', [
            'expenses' => $expenses,
            'cases' => $cases,
            'selected' => $selected,
            'status' => $status,
            'caseSummary' => [
                'billableCents' => (int) ($caseTotals[1] ?? 0),
                'nonBillableCents' => (int) ($caseTotals[0] ?? 0),
                'counts' => $ofCase()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
            ],
            'totals' => [
                'allCents' => (int) $totals->sum(),
                'pendingCents' => (int) ($totals['pending'] ?? 0),
                'approvedCents' => (int) ($totals['approved'] ?? 0),
            ],
            'filters' => $filters,
            'perPage' => $perPage,
            'options' => [
                'matters' => Matter::orderBy('reference')->get()->map(fn ($m) => ['id' => $m->id, 'label' => "{$m->reference} — {$m->title}"]),
                'users' => User::where('active', true)->orderBy('name')->get(['id', 'name']),
                'categories' => Taxonomy::names('expense_category') ?: ['court fees', 'travel', 'expert fees'],
                'statuses' => self::STATUSES,
            ],
        ]);
    }

    /** Flip one expense between pending, approved and rejected. */
    public function updateStatus(Request $request, Expense $expense)
    {
        $data = $request->validate(['status' => ['required', Rule::in(self::STATUSES)]]);

        if ($expense->invoice_id) {
            return back()->withErrors(['status' => 'This expense is already invoiced.']);
        }

        $expense->update($data);

        return back()->with('success', "Expense {$data['status']}.");
    }

    /**
     * The left rail: every case that has a matching expense, with its totals.
     * Expenses with no case are grouped under a single "Firm overhead" entry.
     *
     * @param  Builder<Expense>  $query
     * @return Collection<int, array<string, mixed>>
     */
    private function casesFor($query)
    {
        return $query->with('matter:id,reference,title')
            ->get(['id', 'matter_id', 'amount_cents', 'status'])
            ->groupBy(fn (Expense $e) => (int) $e->matter_id)
            ->map(fn ($group, $id) => [
                'id' => (int) $id,
                'label' => $group->first()->matter
                    ? $group->first()->matter->reference.' - '.$group->first()->matter->title
                    : 'Firm overhead',
                'total_cents' => (int) $group->sum('amount_cents'),
                'count' => $group->count(),
                'pending' => $group->where('status', 'pending')->count(),
            ])
            ->sortBy('label')
            ->values();
    }

    public function store(Request $request)
    {
        Expense::create($this->validated($request));

        return back()->with('success', 'Expense recorded.');
    }

    public function update(Request $request, Expense $expense)
    {
        // An expense already on an invoice is frozen, like billed time.
        if ($expense->invoice_id) {
            return back()->withErrors(['amount' => 'This expense is already invoiced.']);
        }

        $expense->update($this->validated($request));

        return back()->with('success', 'Expense updated.');
    }

    public function destroy(Expense $expense)
    {
        if ($expense->invoice_id) {
            return back()->withErrors(['amount' => 'This expense is already invoiced.']);
        }

        $expense->delete();

        return back()->with('success', 'Expense removed.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'matter_id' => ['nullable', 'exists:matters,id'],
            'user_id' => ['nullable', 'exists:users,id'],
            'description' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
            'billable' => ['required', 'boolean'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'incurred_on' => ['required', 'date'],
        ]);

        $data['amount_cents'] = (int) round($data['amount'] * 100);
        unset($data['amount']);

        return $data;
    }
}
