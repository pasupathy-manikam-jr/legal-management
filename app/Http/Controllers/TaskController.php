<?php

namespace App\Http\Controllers;

use App\Models\Matter;
use App\Models\Task;
use App\Models\Taxonomy;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'view' => ['nullable', Rule::in(['list', 'kanban'])],
            'priority' => ['nullable', Rule::in(Task::PRIORITIES)],
            'status' => ['nullable', Rule::in(array_keys(Task::statuses()))],
        ]);

        $filters = $request->only('search', 'type', 'status', 'assignee', 'priority', 'state');
        // Tasks open on the board; the table is the alternative behind ?view=list.
        $view = $request->input('view') === 'list' ? 'list' : 'kanban';

        // Rebuilt per use so the priority counts are not narrowed by the priority tab itself.
        $matching = fn () => Task::query()
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%$s%")
                ->orWhere('notes', 'like', "%$s%")
                ->orWhereHas('matter', fn ($m) => $m->where('reference', 'like', "%$s%")->orWhere('title', 'like', "%$s%"))))
            ->when($filters['type'] ?? null, fn ($q, $v) => $q->where('type', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['assignee'] ?? null, fn ($q, $v) => $q->where('assigned_to', $v))
            ->when(($filters['state'] ?? null) === 'done', fn ($q) => $q->whereNotNull('completed_at'))
            ->when(($filters['state'] ?? null) === 'open', fn ($q) => $q->whereNull('completed_at'))
            ->when(($filters['state'] ?? null) === 'overdue', fn ($q) => $q->whereNull('completed_at')->whereDate('due_on', '<', now()));

        $listed = fn () => $matching()
            ->when($filters['priority'] ?? null, fn ($q, $v) => $q->where('priority', $v))
            ->with('matter', 'assignee')
            ->orderByRaw('completed_at is not null, due_on is null, due_on');

        return Inertia::render('tasks/index', [
            'view' => $view,
            // The board needs every matching task at once; the table pages through them.
            'tasks' => $view === 'list' ? $listed()->paginate(20)->withQueryString() : null,
            'board' => $view === 'kanban' ? $listed()->get()->groupBy('status') : null,
            'filters' => $filters,
            'counts' => ['all' => $matching()->count()] + $matching()
                ->selectRaw('priority, count(*) as total')
                ->groupBy('priority')
                ->pluck('total', 'priority')
                ->all(),
            'states' => [
                'open' => Task::whereNull('completed_at')->count(),
                'overdue' => Task::whereNull('completed_at')->whereDate('due_on', '<', now())->count(),
                'done' => Task::whereNotNull('completed_at')->count(),
            ],
            'options' => [
                'matters' => Matter::with('client')->orderBy('reference')->get()
                    ->map(fn ($m) => ['id' => $m->id, 'label' => "{$m->reference} — {$m->title}"]),
                'users' => User::orderBy('name')->get(['id', 'name']),
                'priorities' => Task::PRIORITIES,
                'statuses' => Task::statuses(),
                'types' => Taxonomy::kind('task_type')->get(['name', 'color']),
            ],
        ]);
    }

    public function store(Request $request)
    {
        Task::create($this->validated($request));

        return back()->with('success', 'Task added.');
    }

    public function update(Request $request, Task $task)
    {
        $task->update($this->validated($request));

        return back()->with('success', 'Task updated.');
    }

    /** Checkbox in the list — flips done/not-done without touching the rest of the row. */
    public function toggle(Task $task)
    {
        $task->update(['status' => $task->completed_at ? 'not_started' : 'completed']);

        return back();
    }

    /** Dropping a card on another kanban column. */
    public function moveStatus(Request $request, Task $task)
    {
        $task->update($request->validate([
            'status' => ['required', Rule::in(array_keys(Task::statuses()))],
        ]));

        return back(303);
    }

    public function destroy(Task $task)
    {
        $task->delete();

        return back()->with('success', 'Task deleted.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'matter_id' => ['nullable', 'exists:matters,id'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', Rule::in(array_keys(Task::statuses()))],
            'type' => ['nullable', 'string', 'max:100'],
            'priority' => ['required', Rule::in(Task::PRIORITIES)],
            'due_on' => ['nullable', 'date'],
        ]);
    }
}
