<?php

namespace Tests\Feature;

use App\Models\Hearing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    /** A fresh install runs `migrate --seed`, so the seeders must match the final schema. */
    public function test_the_demo_data_seeds_a_fresh_database(): void
    {
        Storage::fake('local');

        $this->seed();

        $this->assertTrue(User::where('email', 'admin@advocate.test')->exists());
        $this->assertGreaterThan(0, Hearing::count());
        $this->assertNotEmpty(Storage::disk('local')->allFiles());
    }
}
