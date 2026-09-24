<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * The four shipped roles. They are `system`, so the firm may re-permission
     * them but not rename or delete them — the app's checks read these names.
     */
    public function run(): void
    {
        $all = Role::keys();
        $read = fn (array $keys) => $keys;

        $lawyer = [
            'view_dashboard', 'view_analytics',
            'view_cases', 'manage_cases', 'view_hearings', 'manage_hearings', 'view_courts',
            'view_tasks', 'manage_tasks', 'view_time', 'manage_time',
            'view_research', 'manage_research', 'view_compliance',
            'view_clients', 'manage_clients', 'view_documents', 'manage_documents', 'view_media',
            'view_invoices',
        ];

        $paralegal = [
            'view_dashboard',
            'view_cases', 'view_hearings', 'manage_hearings', 'view_courts',
            'view_tasks', 'manage_tasks', 'view_time', 'manage_time',
            'view_research', 'view_compliance',
            'view_clients', 'view_documents', 'manage_documents', 'view_media',
        ];

        $billing = [
            'view_dashboard', 'view_analytics',
            'view_cases', 'view_clients',
            'view_time', 'manage_time',
            'view_invoices', 'manage_invoices', 'view_payments', 'manage_payments',
            'view_expenses', 'manage_expenses',
        ];

        foreach ([
            ['admin', 'Full access to every screen and every setting.', $all],
            ['lawyer', 'Runs cases end to end, bills time, cannot change firm setup.', $read($lawyer)],
            ['paralegal', 'Supports cases, hearings, tasks and documents. No billing.', $read($paralegal)],
            ['billing', 'Invoices, payments and expenses. Read-only on cases.', $read($billing)],
        ] as [$name, $description, $permissions]) {
            Role::firstOrCreate(['name' => $name], [
                'description' => $description,
                'permissions' => $permissions,
                'system' => true,
            ]);
        }
    }
}
