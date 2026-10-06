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
    /**
     * Seeded accounts by role. With DEMO_LOGINS=true the login page also offers them as
     * one-click logins, so never enable that flag on a live server.
     *
     * @var list<array{name: string, email: string, password: string}>
     */
    public const LOGINS = [
        ['name' => 'Admin', 'email' => 'admin@advocate.test', 'password' => 'Zx123456'],
    ];

    /**
     * The demo clients, every field filled. They carry LHDN's general buyer TIN, as Accounting's demo
     * customers do, so sandbox e-invoices can be sent; the IDs are made up.
     *
     * @var list<array<string, string|bool>>
     */
    public const CLIENTS = [
        [
            'name' => 'Tan Mei Ling', 'company' => 'Tan Logistics Sdn Bhd', 'type' => 'Corporate',
            'email' => 'meiling@tanlogistics.test', 'phone' => '+60 3-3101 4412',
            'address' => "Lot 12, Jalan Pelabuhan Utara\nKawasan Perindustrian Pulau Indah", 'postcode' => '42000', 'city' => 'Port Klang', 'state' => 'Selangor', 'country' => 'Malaysia',
            'tin' => 'EI00000000020', 'id_type' => 'BRN', 'id_number' => '201501012345',
            'notes' => 'Haulage and freight forwarding. Director: Tan Mei Ling. Retainer for contract disputes and employment matters.', 'active' => true,
        ],
        [
            'name' => 'Rajendran Family', 'company' => null, 'type' => 'Individual',
            'email' => 'rajendran@mail.test', 'phone' => '+60 12-388 7421',
            'address' => '21, Jalan SS 2/24', 'postcode' => '47300', 'city' => 'Petaling Jaya', 'state' => 'Selangor', 'country' => 'Malaysia',
            'tin' => 'EI00000000020', 'id_type' => 'NRIC', 'id_number' => '800412105523',
            'notes' => 'Family matter (custody). Contact: Mr. Rajendran a/l Subramaniam.', 'active' => true,
        ],
        [
            'name' => 'Seri Murni Foods', 'company' => 'Seri Murni Foods Sdn Bhd', 'type' => 'Small Business',
            'email' => 'legal@serimurni.test', 'phone' => '+60 3-5510 2290',
            'address' => "No. 8, Jalan Utas 15/7\nSeksyen 15", 'postcode' => '40200', 'city' => 'Shah Alam', 'state' => 'Selangor', 'country' => 'Malaysia',
            'tin' => 'EI00000000020', 'id_type' => 'BRN', 'id_number' => '201801034567',
            'notes' => 'Halal food manufacturer. Supplier arbitration ongoing; contact the legal manager first.', 'active' => true,
        ],
        [
            'name' => 'Ahmad Faizal bin Osman', 'company' => 'Faizal Properties Sdn Bhd', 'type' => 'Corporate',
            'email' => 'faizal@faizalprop.test', 'phone' => '+60 19-276 5508',
            'address' => "Suite 9-3, Menara Bangsar\nJalan Maarof", 'postcode' => '59000', 'city' => 'Kuala Lumpur', 'state' => 'Wilayah Persekutuan Kuala Lumpur', 'country' => 'Malaysia',
            'tin' => 'EI00000000020', 'id_type' => 'BRN', 'id_number' => '201201056789',
            'notes' => 'Property investment company. Lease rectification matter; prefers WhatsApp for scheduling.', 'active' => true,
        ],
    ];

    public function run(): void
    {
        // Users are validated against these, so they come first.
        $this->call(RoleSeeder::class);

        $admin = User::firstOrCreate(
            ['email' => self::LOGINS[0]['email']],
            ['name' => 'Nurul Aisyah binti Ahmad', 'password' => Hash::make(self::LOGINS[0]['password']), 'email_verified_at' => now()],
        );

        $team = collect(['Lim Wei Jie', 'Priya Nair', 'Muhammad Hafiz bin Rahman'])->map(fn ($name) => User::firstOrCreate(
            ['email' => strtolower(explode(' ', $name)[0]).'@advocate.test'],
            ['name' => $name, 'password' => Hash::make('password'), 'email_verified_at' => now()],
        ))->prepend($admin);

        $courts = collect([
            ['name' => 'Kuala Lumpur Sessions Court', 'type' => 'Sessions Court', 'bench' => 'Court 3'],
            ['name' => 'Kuala Lumpur High Court', 'type' => 'High Court', 'bench' => 'Civil Division (NCvC)'],
            ['name' => 'Industrial Court of Malaysia', 'type' => 'Industrial Court', 'bench' => null],
        ])->map(fn ($c) => Court::firstOrCreate(['name' => $c['name']], $c + ['phone' => '+60 3-2612 0100']));

        $clients = collect(self::CLIENTS)->map(fn ($c) => Client::firstOrCreate(['name' => $c['name']], $c));

        if (Matter::exists()) {
            $this->call(ModuleSeeder::class);

            return;
        }

        $specs = [
            ['Tan Logistics Sdn Bhd v. Kenderaan Maju Sdn Bhd', 'commercial contract dispute', 'civil', 'high', 0],
            ['Rajendran custody arrangement', 'family', 'family', 'medium', 1],
            ['Seri Murni Foods supplier arbitration', 'commercial', 'corporate', 'high', 2],
            ['Faizal Properties — lease rectification', 'property', 'property', 'low', 3],
            ['Tan Logistics — Industrial Court claim', 'labour', 'labour', 'medium', 0],
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
                'judge' => ["YA Dato' Ahmad Kamal bin Ismail", 'YA Puan Lim Mei Fong', 'YA Tuan Ravi Chandran'][$i % 3],
                'opposing_party' => ['Kenderaan Maju Sdn Bhd', '—', 'Delta Bekalan Sdn Bhd', 'Mutiara Estates Sdn Bhd', 'Former employee'][$i],
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
                    'title' => $h === 1 ? 'Directions' : 'Substantive arguments',
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
            'reference' => 'DuitNow 88120',
        ]);

        $invoice->refresh()->refreshPaidTotal();

        $this->call(ModuleSeeder::class);
    }
}
