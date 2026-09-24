<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Roles the firm defines for itself. The four shipped roles are marked `system`:
 * their names are what the app's authorisation checks read, so they may be
 * re-permissioned but not renamed or deleted.
 */
class RoleController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate([
            'sort' => ['nullable', 'in:name,created_at'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search');
        $perPage = (int) ($request->input('per_page') ?: 10);
        $sort = $request->string('sort')->toString() ?: 'name';
        $direction = $request->string('direction')->toString() ?: 'asc';
        $labels = Role::labels();

        return Inertia::render('users/roles', [
            'roles' => Role::query()
                ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                    ->where('name', 'like', "%$v%")
                    ->orWhere('description', 'like', "%$v%")))
                ->withCount('users')
                ->orderBy($sort, $direction)
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (Role $role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'description' => $role->description,
                    'system' => $role->system,
                    'members' => $role->users_count,
                    'permissions' => $role->permissions,
                    // Shown as chips, so the row carries the readable names too.
                    'labels' => array_values(array_intersect_key($labels, array_flip($role->permissions ?? []))),
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'sort' => ['column' => $sort, 'direction' => $direction],
            'groups' => Role::PERMISSIONS,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin();

        Role::create($this->validated($request));

        return back()->with('success', 'Role added.');
    }

    public function update(Request $request, Role $role)
    {
        $this->authorizeAdmin();

        $data = $this->validated($request, $role);

        // A shipped role keeps its name: the app's own checks are written against it.
        if ($role->system) {
            unset($data['name']);
        }

        $role->update($data);

        return back()->with('success', 'Role updated.');
    }

    public function destroy(Role $role)
    {
        $this->authorizeAdmin();

        if ($role->system) {
            return back()->withErrors(['name' => "{$role->name} is a built-in role and cannot be removed."]);
        }

        if (User::where('role', $role->name)->exists()) {
            return back()->withErrors(['name' => 'Move its members to another role first.']);
        }

        $role->delete();

        return back()->with('success', 'Role removed.');
    }

    /**
     * @return array{name?: string, description: ?string, permissions: array<int, string>}
     */
    private function validated(Request $request, ?Role $existing = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:60', Rule::unique('roles', 'name')->ignore($existing?->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['present', 'array'],
            'permissions.*' => [Rule::in(Role::keys())],
        ]);
    }

    private function authorizeAdmin(): void
    {
        abort_unless(request()->user()?->isAdmin(), 403, 'Only firm admins may manage roles.');
    }
}
