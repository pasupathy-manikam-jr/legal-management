<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class NavigationTest extends TestCase
{
    use RefreshDatabase;

    /** Every href rendered by app-sidebar.tsx that any signed-in user may open. */
    private const SIDEBAR_URLS = [
        '/dashboard',
        '/analytics',
        '/calendar',
        '/matters',
        '/hearings',
        '/tasks',
        '/tasks?state=overdue',
        '/tasks?state=done',
        '/courts',
        '/clients',
        '/messages',
        '/invoices',
        '/expenses',
        '/time-entries',
        '/time-entries?billable=unbilled',
        '/documents',
        '/media',
        '/research-projects',
        '/articles',
        '/precedents',
        '/compliance/requirements',
        '/compliance/audits',
        '/compliance/risk-assessments',
        '/compliance/professional-licenses',
        '/compliance/cle-tracking',
        '/compliance/regulatory-bodies',
        '/settings/profile',
    ];

    /** Firm configuration — admins only. */
    private const ADMIN_URLS = [
        '/setup',
        '/setup?kind=case_type',
        '/setup?kind=hearing_type',
        '/setup?kind=practice_area',
        '/setup?kind=expense_category',
        '/users',
        '/roles',
        '/settings/billing',
        '/settings/templates',
    ];

    public function test_the_root_url_sends_visitors_to_the_login_page(): void
    {
        $this->get('/')->assertRedirect('/login');
    }

    public function test_the_user_guide_renders_with_a_contents_list(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'lawyer']))
            ->get('/user-guide')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('user-guide')
                ->where('sections.0', ['id' => 'getting-started', 'title' => 'Getting started'])
                ->where('html', fn (string $html) => str_contains($html, '<h2 id="billing">Billing</h2>')
                    && str_contains($html, '<table>')));
    }

    /**
     * Every literal internal link in the front end must resolve to a GET route.
     * Renaming a route is the moment links rot, and a 405 from a leftover URL
     * looks like a working page until someone clicks it.
     */
    public function test_no_page_links_to_a_route_that_does_not_exist(): void
    {
        $links = [];

        foreach (File::allFiles(resource_path('js')) as $file) {
            if ($file->getExtension() !== 'tsx') {
                continue;
            }

            preg_match_all('/(?:href|url)=[\'"](\/[^\'"${:?#]*)[\'"]/', $file->getContents(), $attributes);
            preg_match_all('/router\.(?:get|visit)\(\s*[\'"](\/[^\'"${:?#]*)[\'"]/', $file->getContents(), $calls);

            foreach (array_merge($attributes[1], $calls[1]) as $link) {
                $links[$link][] = $file->getRelativePathname();
            }
        }

        $this->assertNotEmpty($links, 'Found no links to check — the scan is broken.');

        $routes = app('router')->getRoutes();
        $broken = [];

        foreach ($links as $link => $files) {
            try {
                $routes->match(Request::create($link, 'GET'));
            } catch (HttpException) {
                $broken[] = $link.' ('.implode(', ', array_unique($files)).')';
            }
        }

        $this->assertSame([], $broken, "These links do not resolve to a GET route:\n".implode("\n", $broken));
    }

    public function test_every_sidebar_link_resolves(): void
    {
        $user = User::factory()->create(['role' => 'lawyer']);

        foreach (self::SIDEBAR_URLS as $url) {
            $this->actingAs($user)->get($url)->assertOk();
        }
    }

    public function test_admin_screens_open_for_an_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        foreach (self::ADMIN_URLS as $url) {
            $this->actingAs($admin)->get($url)->assertOk();
        }
    }

    public function test_admin_screens_are_closed_to_other_staff(): void
    {
        $lawyer = User::factory()->create(['role' => 'lawyer']);

        foreach (['/users', '/settings/billing', '/settings/templates'] as $url) {
            $this->actingAs($lawyer)->get($url)->assertForbidden();
        }
    }

    public function test_everything_requires_auth(): void
    {
        foreach (['/matters', '/analytics', '/compliance/risk-assessments', '/users'] as $url) {
            $this->get($url)->assertRedirect('/login');
        }
    }
}
