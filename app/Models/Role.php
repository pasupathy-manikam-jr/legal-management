<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'description', 'permissions', 'system'];

    /**
     * Everything a role can be granted, grouped as the edit form shows it.
     * "View" is read-only access to a screen; "Manage" adds create, edit and delete.
     */
    public const PERMISSIONS = [
        'Overview' => [
            'view_dashboard' => 'View Dashboard',
            'view_analytics' => 'View Analytics & Reports',
        ],
        'Cases' => [
            'view_cases' => 'View Cases',
            'manage_cases' => 'Manage Cases',
            'view_hearings' => 'View Hearings',
            'manage_hearings' => 'Manage Hearings',
            'view_courts' => 'View Courts',
            'manage_courts' => 'Manage Courts',
        ],
        'Work' => [
            'view_tasks' => 'View Tasks',
            'manage_tasks' => 'Manage Tasks',
            'view_time' => 'View Time Entries',
            'manage_time' => 'Manage Time Entries',
            'view_research' => 'View Legal Research',
            'manage_research' => 'Manage Legal Research',
            'view_compliance' => 'View Compliance',
            'manage_compliance' => 'Manage Compliance',
        ],
        'Clients' => [
            'view_clients' => 'View Clients',
            'manage_clients' => 'Manage Clients',
            'view_documents' => 'View Documents',
            'manage_documents' => 'Manage Documents',
            'view_media' => 'View Media',
            'manage_media' => 'Manage Media',
        ],
        'Billing' => [
            'view_invoices' => 'View Invoices',
            'manage_invoices' => 'Manage Invoices',
            'view_payments' => 'View Payments',
            'manage_payments' => 'Manage Payments',
            'view_expenses' => 'View Expenses',
            'manage_expenses' => 'Manage Expenses',
        ],
        'Administration' => [
            'manage_company_profile' => 'Manage Company Profile',
            'manage_users' => 'Manage Users',
            'manage_roles' => 'Manage Roles',
            'manage_firm_setup' => 'Manage Firm Setup',
            'manage_system_settings' => 'Manage System Settings',
        ],
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'system' => 'boolean',
        ];
    }

    /** Every permission key, flattened out of the groups. */
    public static function keys(): array
    {
        return array_keys(array_merge(...array_values(self::PERMISSIONS)));
    }

    /** key => label, for showing a stored permission by its proper name. */
    public static function labels(): array
    {
        return array_merge(...array_values(self::PERMISSIONS));
    }

    public function users()
    {
        return $this->hasMany(User::class, 'role', 'name');
    }
}
