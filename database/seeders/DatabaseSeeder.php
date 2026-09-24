<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Court;
use App\Models\Hearing;
use App\Models\Invoice;
use App\Models\Matter;
use App\Models\MatterEvent;
use App\Models\Payment;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Users are validated against these, so they come first.
        $this->call(RoleSeeder::class);

        $admin = User::firstOrCreate(
            ['email' => 'admin@advocate.test'],
            ['name' => 'Ada Whitmore', 'password' => Hash::make('password'), 'email_verified_at' => now()],
        );

        $team = collect(['Marcus Reyes', 'Priya Nair', 'Tom Okafor'])->map(fn ($name) => User::firstOrCreate(
            ['email' => strtolower(explode(' ', $name)[0]).'@advocate.test'],
            ['name' => $name, 'password' => Hash::make('password'), 'email_verified_at' => now()],
        ))->prepend($admin);

        $courts = collect([
            ['name' => 'Central District Court', 'type' => 'district', 'bench' => 'Bench 3'],
            ['name' => 'State High Court', 'type' => 'high', 'bench' => 'Division II'],
            ['name' => 'Commercial Tribunal', 'type' => 'commercial', 'bench' => null],
        ])->map(fn ($c) => Court::firstOrCreate(['name' => $c['name']], $c + ['phone' => '+1 555 0100']));

        $clients = collect([
            ['name' => 'Helena Brandt', 'company' => 'Brandt Logistics', 'email' => 'helena@brandt.test'],
            ['name' => 'Oyelaran Family', 'company' => null, 'email' => 'oyelaran@mail.test'],
            ['name' => 'Northwind Foods', 'company' => 'Northwind Foods Ltd', 'email' => 'legal@northwind.test'],
            ['name' => 'Samuel Cheng', 'company' => 'Cheng Property', 'email' => 'sam@chengprop.test'],
        ])->map(fn ($c) => Client::firstOrCreate(['name' => $c['name']], $c + ['phone' => '+1 555 0199']));

        if (Matter::exists()) {
            $this->call(ModuleSeeder::class);

            return;
        }

        $specs = [
            ['Brandt Logistics v. Corvus Freight', 'commercial contract dispute', 'civil', 'high', 0],
            ['Oyelaran custody arrangement', 'family', 'family', 'medium', 1],
            ['Northwind supplier arbitration', 'commercial', 'corporate', 'high', 2],
            ['Cheng Property — lease rectification', 'property', 'property', 'low', 3],
            ['Brandt Logistics — employment claim', 'labour', 'labour', 'medium', 0],
        ];

        foreach ($specs as $i => [$title, $area, $type, $priority, $clientIdx]) {
            $matter = Matter::create([
                'client_id' => $clients[$clientIdx]->id,
                'lead_lawyer_id' => $team[$i % $team->count()]->id,
                'court_id' => $courts[$i % $courts->count()]->id,
                'reference' => Matter::nextReference(),
                'title' => $title,
                'practice_area' => $area,
                'case_type' => $type,
                'priority' => $priority,
                'judge' => ['Hon. R. Alvarez', 'Hon. P. Mensah', 'Hon. L. Tanaka'][$i % 3],
                'opposing_party' => ['Corvus Freight', '—', 'Delta Supplies', 'Marrow Estates', 'Former employee'][$i],
                'status' => $i === 4 ? 'closed' : ($i === 3 ? 'pending' : 'open'),
                'opened_on' => now()->subDays(120 - $i * 20),
                'expected_completion' => now()->addDays(60 + $i * 10),
                'closed_on' => $i === 4 ? now()->subDays(5) : null,
                'hourly_rate_cents' => [30000, 22000, 35000, 25000, 28000][$i],
                'description' => "Seeded case for demo purposes — $area matter.",
            ]);

            $matter->team()->attach($team[($i + 1) % $team->count()]->id, ['role' => 'associate']);

            MatterEvent::create([
                'matter_id' => $matter->id,
                'user_id' => $matter->lead_lawyer_id,
                'kind' => 'timeline',
                'title' => 'Matter opened',
                'body' => 'Engagement letter signed and file opened.',
                'occurred_at' => $matter->opened_on,
            ]);

            foreach (range(1, 2) as $h) {
                Hearing::create([
                    'matter_id' => $matter->id,
                    'court_id' => $matter->court_id,
                    'scheduled_at' => now()->addDays($h * 7 + $i)->setTime(10 + $h, 30),
                    'duration_minutes' => 60 * $h,
                    'type' => $h === 1 ? 'first hearing' : 'arguments',
                    'status' => $i === 4 ? 'completed' : 'scheduled',
                    'judge' => $matter->judge,
                    'purpose' => $h === 1 ? 'Directions' : 'Substantive arguments',
                ]);
            }

            foreach (range(1, 3) as $t) {
                Task::create([
                    'matter_id' => $matter->id,
                    'assigned_to' => $team[($i + $t) % $team->count()]->id,
                    'title' => ['Draft pleadings', 'Collect client affidavit', 'File exhibits', 'Review discovery'][$t % 4],
                    'priority' => Task::PRIORITIES[($i + $t) % 4],
                    // completed_at follows the status, so the board and the list agree.
                    'status' => array_keys(Task::STATUSES)[($i * 3 + $t) % 9],
                    'type' => ['Drafting', 'Filing', 'Meeting', 'Review', 'Negotiation', 'Investigation', 'Administrative'][($i + $t) % 7],
                    'due_on' => now()->addDays($t * 4 - $i * 3),
                ]);
            }

            foreach (range(1, 4) as $e) {
                TimeEntry::create([
                    'matter_id' => $matter->id,
                    'user_id' => $team[($i + $e) % $team->count()]->id,
                    'worked_on' => now()->subDays($e * 3),
                    'minutes' => [45, 90, 120, 30][$e % 4],
                    'rate_cents' => $matter->hourly_rate_cents,
                    'billable' => $e !== 4,
                    'description' => ['Client conference', 'Drafting submissions', 'Court attendance', 'Internal review'][$e % 4],
                ]);
            }
        }

        // One fully-billed case so the invoice screens have something real in them.
        $first = Matter::first();
        $entries = $first->timeEntries()->where('billable', true)->get();
        $subtotal = (int) $entries->sum(fn ($e) => $e->amountCents());

        $invoice = Invoice::create([
            'client_id' => $first->client_id,
            'matter_id' => $first->id,
            'number' => Invoice::nextNumber(),
            'issued_on' => now()->subDays(40),
            'due_on' => now()->subDays(10),
            'status' => 'sent',
            'subtotal_cents' => $subtotal,
            'tax_cents' => (int) round($subtotal * 0.08),
            'notes' => 'Payable within 30 days.',
        ]);

        TimeEntry::whereIn('id', $entries->pluck('id'))->update(['invoice_id' => $invoice->id]);

        Payment::create([
            'invoice_id' => $invoice->id,
            'paid_on' => now()->subDays(5),
            'amount_cents' => (int) round($invoice->totalCents() / 3),
            'method' => 'bank',
            'reference' => 'TRF-88120',
        ]);

        $invoice->refresh()->refreshPaidTotal();

        $this->call(ModuleSeeder::class);
    }
}
