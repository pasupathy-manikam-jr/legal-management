<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered()
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_login_screen_hides_demo_logins_by_default()
    {
        config(['app.demo_logins' => false]);

        $this->get('/login')->assertInertia(fn (Assert $page) => $page
            ->where('demoLogins', []));
    }

    public function test_login_screen_offers_seeded_logins_when_enabled()
    {
        config(['app.demo_logins' => true]);

        $this->get('/login')->assertInertia(fn (Assert $page) => $page
            ->where('demoLogins', DatabaseSeeder::LOGINS)
            ->where('demoLogins.0.email', 'admin@advocate.test'));
    }

    public function test_seeded_admin_can_log_in()
    {
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);

        $this->post('/login', [
            'email' => DatabaseSeeder::LOGINS[0]['email'],
            'password' => DatabaseSeeder::LOGINS[0]['password'],
        ]);

        $this->assertAuthenticated();
    }

    public function test_users_can_authenticate_using_the_login_screen()
    {
        $user = User::factory()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_not_authenticate_with_invalid_password()
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }
}
