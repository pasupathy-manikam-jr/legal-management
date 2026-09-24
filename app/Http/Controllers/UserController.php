<?php

namespace App\Http\Controllers;

use App\Models\Matter;
use App\Models\Role;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate([
            'role' => ['nullable', Rule::exists('roles', 'name')],
            'sort' => ['nullable', 'in:name,created_at'],
            'direction' => ['nullable', 'in:asc,desc'],
            'view' => ['nullable', 'in:list,grid'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'role');
        $perPage = (int) ($request->input('per_page') ?: 10);
        $sort = $request->string('sort')->toString() ?: 'name';
        $direction = $request->string('direction')->toString() ?: 'asc';

        return Inertia::render('users/index', [
            'view' => $request->input('view') === 'grid' ? 'grid' : 'list',
            'members' => User::query()
                ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                    ->where('name', 'like', "%$v%")
                    ->orWhere('email', 'like', "%$v%")
                    ->orWhere('title', 'like', "%$v%")))
                ->when($filters['role'] ?? null, fn ($q, $v) => $q->where('role', $v))
                ->orderBy($sort, $direction)
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'title' => $user->title,
                    'active' => $user->active,
                    'joined_on' => $user->created_at?->toDateString(),
                    'leadCases' => Matter::where('lead_lawyer_id', $user->id)->count(),
                    'minutesThisMonth' => (int) TimeEntry::where('user_id', $user->id)
                        ->whereMonth('worked_on', now()->month)
                        ->whereYear('worked_on', now()->year)
                        ->sum('minutes'),
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'sort' => ['column' => $sort, 'direction' => $direction],
            'roles' => Role::orderBy('name')->pluck('name'),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', Rule::exists('roles', 'name')],
            'title' => ['nullable', 'string', 'max:120'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $data['password'] = Hash::make($data['password']);
        $data['email_verified_at'] = now();
        User::create($data);

        return back()->with('success', 'User added.');
    }

    public function update(Request $request, User $user)
    {
        $this->authorizeAdmin();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', Rule::exists('roles', 'name')],
            'title' => ['nullable', 'string', 'max:120'],
            'active' => ['required', 'boolean'],
        ]);

        // Never let the last admin demote or deactivate themselves out of the firm.
        if ($user->isAdmin() && ($data['role'] !== 'admin' || ! $data['active'])) {
            $otherAdmins = User::where('role', 'admin')->where('active', true)->where('id', '!=', $user->id)->count();
            if ($otherAdmins === 0) {
                return back()->withErrors(['role' => 'This is the only active admin. Promote someone else first.']);
            }
        }

        $user->update($data);

        return back()->with('success', 'User updated.');
    }

    public function destroy(Request $request, User $user)
    {
        $this->authorizeAdmin();

        if ($user->id === $request->user()->id) {
            return back()->withErrors(['name' => 'You cannot remove your own account here.']);
        }

        if ($user->isAdmin() && User::where('role', 'admin')->where('id', '!=', $user->id)->count() === 0) {
            return back()->withErrors(['name' => 'The firm needs at least one admin.']);
        }

        $user->delete();

        return back()->with('success', 'User removed.');
    }

    /** The padlock in a row: suspend a member without deleting their history. */
    public function toggle(Request $request, User $user)
    {
        $this->authorizeAdmin();

        if ($user->active && $user->isAdmin() && User::where('role', 'admin')->where('active', true)->where('id', '!=', $user->id)->doesntExist()) {
            return back()->withErrors(['active' => 'This is the only active admin. Promote someone else first.']);
        }

        $user->update(['active' => ! $user->active]);

        return back()->with('success', "{$user->name} is now ".($user->active ? 'active' : 'suspended').'.');
    }

    /** The key in a row: an admin sets a new password for someone who cannot sign in. */
    public function resetPassword(Request $request, User $user)
    {
        $this->authorizeAdmin();

        $data = $request->validate(['password' => ['required', 'string', 'min:8', 'confirmed']]);

        $user->update(['password' => Hash::make($data['password'])]);

        return back()->with('success', "Password reset for {$user->name}.");
    }

    private function authorizeAdmin(): void
    {
        abort_unless(request()->user()?->isAdmin(), 403, 'Only firm admins may manage users.');
    }
}
