<?php

namespace Database\Seeders;

use App\Models\CleRecord;
use App\Models\Client;
use App\Models\ComplianceAudit;
use App\Models\ComplianceRequirement;
use App\Models\Court;
use App\Models\Document;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Judge;
use App\Models\KnowledgeArticle;
use App\Models\LegalPrecedent;
use App\Models\Matter;
use App\Models\Medium;
use App\Models\Message;
use App\Models\NotificationTemplate;
use App\Models\Payment;
use App\Models\ProfessionalLicense;
use App\Models\RegulatoryBody;
use App\Models\ResearchProject;
use App\Models\RiskAssessment;
use App\Models\Setting;
use App\Models\Task;
use App\Models\Taxonomy;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RoleSeeder::class);
        $this->taxonomies();
        $this->templates();
        $this->expenses();
        $this->revenueHistory();
        $this->billingSpread();
        $this->mediaLibrary();
        $this->companyProfile();
        $this->todaysWork();

        $users = User::all();
        if ($users->isEmpty()) {
            return;
        }

        // The first seeded user runs the firm.
        User::query()->orderBy('id')->first()?->update(['role' => 'admin', 'title' => 'Managing Partner']);
        User::where('role', '!=', 'admin')->get()->each(fn ($u, $i) => $u->update([
            'role' => ['lawyer', 'paralegal', 'billing'][$u->id % 3],
            'title' => ['Associate', 'Paralegal', 'Billing Manager'][$u->id % 3],
        ]));

        if (ResearchProject::exists()) {
            return;
        }

        $matters = Matter::all();

        foreach ([
            ['Limitation period for carriage claims', 'statute', 'active', 'high'],
            ['Custody precedent survey, 2020-2025', 'case law', 'completed', 'medium'],
            ['Arbitration clause enforceability', 'case law', 'active', 'high'],
            ['Lease rectification remedies', 'doctrine', 'on_hold', 'low'],
        ] as $i => [$title, $type, $status, $priority]) {
            ResearchProject::create([
                'matter_id' => $matters[$i % max($matters->count(), 1)]->id ?? null,
                'lead_id' => $users[$i % $users->count()]->id,
                'title' => $title,
                'type' => $type,
                'category' => ['procedure', 'substantive'][$i % 2],
                'priority' => $priority,
                'status' => $status,
                'question' => 'What is the governing authority and how does it apply to our facts?',
                'started_on' => now()->subDays(30 - $i * 5),
                'due_on' => now()->addDays(10 + $i * 4),
            ]);
        }

        foreach ([
            ['Opening a litigation file: the checklist', 'procedure', 'published'],
            ['Drafting enforceable arbitration clauses', 'substantive', 'published'],
            ['Client funds: what must be reconciled monthly', 'procedure', 'draft'],
            ['Costs recovery after discontinuance', 'substantive', 'archived'],
        ] as $i => [$title, $category, $status]) {
            KnowledgeArticle::create([
                'author_id' => $users[$i % $users->count()]->id,
                'title' => $title,
                'slug' => Str::slug($title),
                'category' => $category,
                'summary' => 'Internal guidance for the team.',
                'body' => "## Summary\n\nFirm guidance on $title.\n\n## Steps\n\n1. Confirm the engagement scope.\n2. Record the key dates.\n3. File the signed retainer.",
                'status' => $status,
                'published_at' => $status === 'published' ? now()->subDays($i * 3) : null,
            ]);
        }

        foreach ([
            ['Corvus Freight v. Meridian Haulage', '[2021] HC 447', 'State High Court', 2021, 88, 'active'],
            ['Re Oyelaran (Minors)', '[2019] FC 12', 'Family Court', 2019, 74, 'active'],
            ['Delta Supplies v. Northwind', '[2017] CT 3', 'Commercial Tribunal', 2017, 61, 'questioned'],
            ['Marrow Estates v. Cheng', '[2015] DC 220', 'Central District Court', 2015, 42, 'overruled'],
        ] as $i => [$name, $citation, $court, $year, $relevance, $status]) {
            LegalPrecedent::create([
                'matter_id' => $matters[$i % max($matters->count(), 1)]->id ?? null,
                'case_name' => $name,
                'citation' => $citation,
                'court' => $court,
                'decided_year' => $year,
                'holding' => 'Summary of the holding relied upon.',
                'relevance' => $relevance,
                'status' => $status,
            ]);
        }

        foreach ([
            ['Annual CLE hours per fee earner', 'Continuing Education', 'Annually', 'high', 'in_progress'],
            ['Client account monthly reconciliation', 'Trust Account', 'Monthly', 'high', 'compliant'],
            ['Conflict checks before engagement', 'Ethics', 'One Time', 'high', 'compliant'],
            ['Data retention schedule review', 'Data Protection', 'Quarterly', 'medium', 'pending'],
            ['Professional indemnity renewal', 'Insurance', 'Annually', 'high', 'non_compliant'],
        ] as $i => [$title, $category, $frequency, $priority, $status]) {
            ComplianceRequirement::create([
                'owner_id' => $users[$i % $users->count()]->id,
                'title' => $title,
                'category' => $category,
                'frequency' => $frequency,
                'priority' => $priority,
                'status' => $status,
                'requirement' => 'Maintained under the firm compliance policy.',
                'due_on' => now()->addDays($i * 9 - 10),
                'last_reviewed_on' => now()->subDays(40 + $i),
            ]);
        }

        foreach ([
            ['Q3 client account audit', 'Operational', 'medium', 'completed', 'Internal Audit Team'],
            ['Regulatory file inspection', 'Compliance', 'high', 'planned', 'Regulatory Compliance Partners'],
            ['Data protection review', 'Performance', 'low', 'in_progress', 'Internal Audit Team'],
            ['Annual compliance review', 'Compliance', 'medium', 'planned', 'External Compliance Consultants'],
            ['Quality assurance review', 'Quality', 'high', 'in_progress', 'External Auditing Firm'],
            ['Financial controls review', 'Financial', 'critical', 'completed', 'External Auditing Firm'],
            ['Operational procedures audit', 'Operational', 'low', 'cancelled', 'Regulatory Compliance Partners'],
            ['Internal controls evaluation', 'Risk Management', 'medium', 'planned', 'Internal Audit Team'],
        ] as $i => [$title, $type, $risk, $status, $firm]) {
            ComplianceAudit::create([
                'auditor_id' => $users[$i % $users->count()]->id,
                'auditor_firm' => $firm,
                'title' => $title,
                'type' => $type,
                'risk_level' => $risk,
                'status' => $status,
                'scheduled_on' => now()->addDays($i * 14 - 20),
                'completed_on' => $status === 'completed' ? now()->subDays(12) : null,
                'findings' => $status === 'completed' ? 'No material findings. Two minor observations logged.' : null,
            ]);
        }

        foreach ([
            ['Limitation deadline missed on a dormant file', 'Legal Risk', 4, 5, 'mitigated'],
            ['Undetected conflict on a group client', 'Client Risk', 2, 5, 'identified'],
            ['Client account shortfall', 'Compliance Risk', 1, 5, 'monitored'],
            ['Laptop loss with case files', 'Cybersecurity Risk', 3, 3, 'mitigated'],
            ['Ransomware attack on the file server', 'Cybersecurity Risk', 1, 3, 'mitigated'],
            ['Regulatory non-compliance on client money', 'Compliance Risk', 2, 2, 'assessed'],
            ['Negative online reviews after a lost appeal', 'Reputational Risk', 1, 3, 'monitored'],
            ['Key fee earner resignation', 'Human Resources Risk', 2, 5, 'closed'],
        ] as $i => [$title, $category, $likelihood, $impact, $status]) {
            RiskAssessment::create([
                'owner_id' => $users[$i % $users->count()]->id,
                'matter_id' => $i === 0 ? ($matters->first()->id ?? null) : null,
                'title' => $title,
                'category' => $category,
                'likelihood' => $likelihood,
                'impact' => $impact,
                'identified_on' => now()->subDays(90 - $i * 7),
                'status' => $status,
                'mitigation' => 'Diary checks and supervisor sign-off.',
                'review_on' => now()->addDays(30 + $i * 10),
            ]);
        }

        $this->registers($users);
        $this->bench();
        $this->documents($users);

        foreach (Client::all() as $i => $client) {
            foreach ([['outbound', 'email', 'Engagement letter sent'], ['inbound', 'phone', 'Client called about next hearing']] as $j => [$direction, $channel, $subject]) {
                Message::create([
                    'client_id' => $client->id,
                    'matter_id' => $matters->firstWhere('client_id', $client->id)?->id,
                    'user_id' => $users[($i + $j) % $users->count()]->id,
                    'direction' => $direction,
                    'channel' => $channel,
                    'subject' => $subject,
                    'body' => 'Logged for the file.',
                    'occurred_at' => now()->subDays($i * 2 + $j),
                ]);
            }
        }
    }

    /** What the firm must keep proving, grouped, with the colour each group wears. */
    private const COMPLIANCE_CATEGORIES = [
        'Court Rules' => ['Court rules and procedural compliance', '#be123c'],
        'Professional' => ['Professional licensing and certification requirements', '#3b82f6'],
        'Financial' => ['Financial compliance and reporting requirements', '#10b981'],
        'Data Protection' => ['Data privacy and protection compliance', '#f59e0b'],
        'Client Confidentiality' => ['Client confidentiality and privilege requirements', '#ef4444'],
        'Trust Account' => ['Client trust account management and compliance', '#8b5cf6'],
        'Continuing Education' => ['Continuing legal education requirements', '#06b6d4'],
        'Ethics' => ['Professional ethics and conduct requirements', '#059669'],
        'Insurance' => ['Professional liability and malpractice insurance', '#7c2d12'],
        'Technology' => ['Technology security and data management compliance', '#1e40af'],
    ];

    /** The benches a case can land in front of, with the colour each one wears. */
    /** How a disbursement is classified on the expense screen. */
    private const EXPENSE_CATEGORIES = [
        'Court Fees' => 'Filing fees and court-related expenses',
        'Travel' => 'Travel expenses for client meetings and court appearances',
        'Office Supplies' => 'General office supplies and materials',
        'Expert Witnesses' => 'Expert witness fees and related costs',
        'Document Production' => 'Printing, copying, and document preparation costs',
        'Research' => 'Legal research and database access costs',
        'Postage' => 'Mailing and shipping costs',
        'Technology' => 'Software licenses and technology expenses',
        'Professional Services' => 'External professional service fees',
        'Entertainment' => 'Client entertainment and business meals',
    ];

    /** What a client is, as the client screen's dropdown offers it. */
    private const CLIENT_TYPES = [
        'Individual' => 'Individual clients and personal customers',
        'Small Business' => 'Small business clients and startups',
        'Corporate' => 'Large corporate clients and enterprises',
        'Government' => 'Government agencies and public sector',
        'Non-Profit' => 'Non-profit organizations and charities',
    ];

    /** The document register's types, with the colour each pill carries. */
    private const DOCUMENT_TYPES = [
        'Contract' => ['Legal contracts and agreements', '#10b981'],
        'Evidence' => ['Evidence documents', '#f59e0b'],
        'Correspondence' => ['Letters and communications', '#3b82f6'],
        'Court Filing' => ['Court filed documents', '#ef4444'],
        'Legal Brief' => ['Legal briefs and memorandums', '#dc2626'],
        'Other' => ['Other document types', '#6b7280'],
        'Invoice' => ['Billing and invoice documents', '#f97316'],
        'Affidavit' => ['Sworn statements and affidavits', '#84cc16'],
        'Pleading' => ['Statements of case', '#8b5cf6'],
        'Court Order' => ['Orders and judgments received', '#6366f1'],
        'Identification' => ['Client identity documents', '#14b8a6'],
    ];

    private const COURT_TYPES = [
        'High Court' => ['High court jurisdiction', '#ef4444'],
        'Supreme Court' => ['Supreme court level', '#8b5cf6'],
        'Criminal Court' => ['Criminal cases court', '#dc2626'],
        'Commercial Court' => ['Commercial disputes court', '#059669'],
        'Appellate Court' => ['Appeals court jurisdiction', '#f97316'],
        'Magistrate Court' => ['Magistrate level court', '#84cc16'],
        'Labor Court' => ['Employment disputes court', '#06b6d4'],
        'Tax Court' => ['Tax matters court', '#6b7280'],
    ];

    /** The kinds of audit the firm runs, with the colour each one wears. */
    private const AUDIT_TYPES = [
        'Performance' => ['Performance and efficiency audit', '#1e40af'],
        'Environmental' => ['Environmental compliance and sustainability audit', '#16a34a'],
        'External' => ['External audit conducted by third-party auditors', '#3b82f6'],
        'Compliance' => ['General compliance audit', '#8b5cf6'],
        'Financial' => ['Financial audit and controls review', '#ef4444'],
        'Operational' => ['Operational processes and procedures audit', '#06b6d4'],
        'Quality' => ['Quality assurance and process improvement audit', '#dc2626'],
        'Risk Management' => ['Risk management and assessment audit', '#7c2d12'],
    ];

    /** How the register groups what can go wrong, with the colour each group wears. */
    private const RISK_CATEGORIES = [
        'Legal Risk' => ['Risks related to legal compliance', '#8b5cf6'],
        'Technology Risk' => ['Risks related to technology systems', '#3b82f6'],
        'Reputational Risk' => ['Risks related to company reputation and image', '#dc2626'],
        'Compliance Risk' => ['Risks related to regulatory and legal compliance', '#059669'],
        'Market Risk' => ['Risks related to market conditions and competition', '#7c2d12'],
        'Human Resources Risk' => ['Risks related to personnel and staffing', '#1e40af'],
        'Cybersecurity Risk' => ['Risks related to data breaches and cyber threats', '#be123c'],
        'Client Risk' => ['Risks related to client relationships and conflicts', '#0891b2'],
    ];

    /** How often each obligation comes round, in days — null when it is one-off. */
    private const COMPLIANCE_FREQUENCIES = [
        'One Time' => ['One-time compliance requirement', null],
        'Daily' => ['Daily compliance requirement', 1],
        'Weekly' => ['Weekly compliance requirement', 7],
        'Bi-Weekly' => ['Bi-weekly compliance requirement', 14],
        'Monthly' => ['Monthly compliance requirement', 30],
        'Quarterly' => ['Quarterly compliance requirement', 90],
        'Tri-Annually' => ['Three times per year compliance requirement', 120],
        'Semi-Annually' => ['Semi-annual compliance requirement', 180],
        'Annually' => ['Annual compliance requirement', 365],
        'Bi-Annually' => ['Bi-annual compliance requirement', 730],
    ];

    /** Where the firm looks things up, and what each one is. */
    private const RESEARCH_SOURCES = [
        'Westlaw' => ['type' => 'database', 'url' => 'https://westlaw.com'],
        'LexisNexis' => ['type' => 'database', 'url' => 'https://lexisnexis.com'],
        'Google Scholar' => ['type' => 'case law', 'url' => 'https://scholar.google.com'],
        'Justia' => ['type' => 'case law', 'url' => 'https://justia.com'],
        'Legal Information Institute' => ['type' => 'statutory', 'url' => 'https://law.cornell.edu'],
        'Bloomberg Law' => ['type' => 'database', 'url' => 'https://bloomberglaw.com'],
        'HeinOnline' => ['type' => 'secondary', 'url' => 'https://heinonline.org'],
        'Fastcase' => ['type' => 'case law', 'url' => 'https://fastcase.com'],
        'Casetext' => ['type' => 'database', 'url' => 'https://casetext.com'],
        'Law Library' => ['type' => 'secondary', 'url' => null],
    ];

    /** Who sits at each court the firm appears before. */
    private function bench(): void
    {
        $designations = ['Chief Justice', 'Senior Judge', 'District Judge', 'Magistrate'];

        foreach (Court::orderBy('id')->get() as $i => $court) {
            Judge::firstOrCreate(
                ['court_id' => $court->id, 'name' => 'Hon. '.['Miriam Adeyemi', 'Charles Okonkwo', 'Nadia Faruqi', 'Peter Lindqvist', 'Grace Mbeki'][$i % 5]],
                [
                    'designation' => $designations[$i % count($designations)],
                    'email' => 'chambers'.($i + 1).'@'.Str::slug($court->name).'.gov',
                    'phone' => sprintf('+1-555-%04d', 60 + $i),
                    'appointed_on' => now()->subYears(3 + $i)->startOfYear(),
                    'active' => true,
                ],
            );
        }
    }

    /** The bodies the firm answers to, the licences it holds, and its CLE credits. */
    private function registers(Collection $users): void
    {
        $bodies = collect([
            ['State Bar Association', 'SBA', 'bar association', 'State', 'info@statebar.gov', '+1-555-0100'],
            ['Federal Bar Association', 'FBA', 'bar association', 'Federal', 'contact@federalbar.gov', '+1-555-0200'],
            ['Data Protection Authority', 'DPA', 'regulator', 'Federal', 'privacy@dpa.gov', '+1-555-0300'],
            ['Professional Standards Board', 'PSB', 'regulator', 'State', 'standards@psb.gov', '+1-555-0500'],
            ['Legal Ethics Commission', 'LEC', 'regulator', 'State', 'ethics@lec.gov', '+1-555-0600'],
            ['Court Administration Office', 'CAO', 'court', 'State', 'admin@courts.gov', '+1-555-0700'],
            ['Insurance Regulatory Board', 'IRB', 'government', 'State', 'insurance@irb.gov', '+1-555-0800'],
            ['Environmental Protection Agency', 'EPA', 'government', 'Federal', 'legal@epa.gov', '+1-555-1000'],
        ])->map(fn ($row) => RegulatoryBody::firstOrCreate(
            ['name' => $row[0]],
            [
                'short_name' => $row[1], 'type' => $row[2], 'jurisdiction' => $row[3],
                'website' => 'https://'.Str::after($row[4], '@'), 'contact_email' => $row[4],
                'phone' => $row[5], 'active' => true,
            ],
        ));

        // Staggered so the grid shows a live licence, one due for renewal, one
        // expired, and one of each status the register recognises.
        $licences = [
            ['Bar License', 'BAR', 'California', 'active', -300, 320],
            ['Notary Public License', 'NOT', 'Local', 'suspended', -700, 400],
            ['Patent Attorney License', 'PAT', 'Federal', 'active', -800, -60],
            ['Mediator License', 'MED', 'Multi-State', 'active', -180, 185],
            ['Tax Attorney License', 'TAX', 'California', 'revoked', -200, 280],
            ['Supreme Court License', 'SUP', 'New York', 'active', -45, 320],
            ['Immigration Attorney License', 'IMM', 'Multi-State', 'active', -600, 390],
            ['Federal Court License', 'FED', 'Multi-State', 'suspended', -760, 330],
        ];

        foreach ($licences as $i => [$type, $prefix, $jurisdiction, $status, $issued, $expires]) {
            $user = $users[$i % $users->count()];

            ProfessionalLicense::firstOrCreate(
                ['user_id' => $user->id, 'type' => $type],
                [
                    'regulatory_body_id' => $bodies[$i % $bodies->count()]->id,
                    'number' => $prefix.'-'.now()->year.'-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT),
                    'jurisdiction' => $jurisdiction,
                    'issued_on' => now()->addDays($issued),
                    'expires_on' => now()->addDays($expires),
                    'status' => $status,
                ],
            );
        }

        foreach ($users as $i => $user) {

            $courses = [
                ['Legal Ethics and Professional Responsibility', 'Legal Education Institute', 'Ethics', 4.7, 4.7, 'completed'],
                ['Contract Law Updates', 'State Bar Association', 'Continuing Education', 2.1, 4.2, 'in_progress'],
                ['Technology in Legal Practice', 'Digital Law Academy', 'Technology', 3.8, 3.5, 'in_progress'],
                ['Family Law Practice', 'Law Practice Institute', 'Continuing Education', 3.3, 2.8, 'expired'],
            ];

            foreach ([$courses[$i % 4], $courses[($i + 1) % 4]] as $j => [$title, $provider, $category, $earned, $required, $status]) {
                CleRecord::firstOrCreate(
                    ['user_id' => $user->id, 'title' => $title],
                    [
                        'provider' => $provider, 'category' => $category,
                        'credit_hours' => $earned, 'required_hours' => $required, 'status' => $status,
                        'completed_on' => now()->subMonths($j * 3 + 1),
                        'compliance_year' => now()->subMonths($j * 3 + 1)->year,
                    ],
                );
            }
        }
    }

    /** A handful of client files, with a real placeholder on disk so downloads work. */
    private function documents(Collection $users): void
    {
        if (Document::exists()) {
            return;
        }

        $files = [
            ['Engagement_Letter.pdf', 'Contract', 'confidential', 'final'],
            ['Financial_Statement.xlsx', 'Evidence', 'confidential', 'final'],
            ['Bank_Statements.pdf', 'Correspondence', 'internal', 'final'],
            ['ID_Copy.jpg', 'Identification', 'confidential', 'final'],
            ['Witness_Statement.pdf', 'Evidence', 'confidential', 'review'],
            ['Notice_Of_Motion.pdf', 'Court Filing', 'internal', 'review'],
            ['Insurance_Policy.pdf', 'Contract', 'internal', 'final'],
            ['Tax_Documents.pdf', 'Evidence', 'confidential', 'review'],
            ['Medical_Records.pdf', 'Correspondence', 'confidential', 'final'],
            ['Settlement_Draft.docx', 'Contract', 'confidential', 'draft'],
            ['Costs_Order.pdf', 'Court Order', 'public', 'final'],
            ['Old_Retainer_2021.pdf', 'Contract', 'internal', 'final'],
        ];

        // Work product the firm holds in its own right, not filed against a client.
        $workProduct = [
            ['Affidavit of Service', 'Affidavit', 'final'],
            ['Mediation Statement', 'Legal Brief', 'review'],
            ['Summary Judgment Brief', 'Legal Brief', 'final'],
            ['Retainer Agreement', 'Contract', 'draft'],
            ['Cease and Desist Letter', 'Correspondence', 'review'],
            ['Trial Preparation Checklist', 'Other', 'draft'],
            ['Expert Witness Report', 'Evidence', 'final'],
            ['Subpoena Notice', 'Court Filing', 'review'],
            ['Deposition Transcript', 'Evidence', 'final'],
            ['Power of Attorney', 'Contract', 'final'],
            ['Non-Disclosure Agreement', 'Contract', 'review'],
            ['Case Strategy Memorandum', 'Legal Brief', 'draft'],
        ];

        $clients = Client::orderBy('id')->get();
        if ($clients->isEmpty()) {
            return;
        }

        foreach ($files as $i => [$title, $type, $confidentiality, $stage]) {
            $client = $clients[$i % $clients->count()];
            // Stored under the extension its bytes really have, whatever the title says.
            $extension = in_array(Str::lower(pathinfo($title, PATHINFO_EXTENSION)), ['pdf', 'jpg', 'jpeg', 'png'], true) ? '' : '.pdf';
            $path = "clients/{$client->id}/".Str::random(20).'-'.$title.$extension;
            Storage::disk('local')->put($path, $this->placeholderFile($title, pathinfo($title, PATHINFO_FILENAME)));

            $document = Document::create([
                'client_id' => $client->id,
                'matter_id' => Matter::where('client_id', $client->id)->value('id'),
                'uploaded_by' => $users[$i % $users->count()]->id,
                'title' => $title,
                'path' => $path,
                'mime' => Storage::disk('local')->mimeType($path),
                'type' => $type,
                'stage' => $stage,
                'size' => Storage::disk('local')->size($path),
                'confidentiality' => $confidentiality,
                // The last one is the archived example.
                'archived_at' => $i === count($files) - 1 ? now()->subMonths(8) : null,
            ]);

            // created_at is guarded, so the demo spread is forced on after the insert.
            $document->forceFill(['created_at' => now()->subDays(40 - $i * 3)])->save();
        }

        foreach ($workProduct as $i => [$title, $type, $stage]) {
            $path = 'library/'.Str::random(20).'-'.Str::slug($title).'.pdf';
            Storage::disk('local')->put($path, $this->placeholderPdf($title, 'v1.0'));

            $document = Document::create([
                'title' => $title,
                'description' => "{$title}, held on the firm's own file.",
                'tags' => ['document', 'legal', Str::lower($type)],
                'path' => $path,
                'mime' => Storage::disk('local')->mimeType($path),
                'type' => $type,
                'stage' => $stage,
                'size' => Storage::disk('local')->size($path),
                'confidentiality' => ['internal', 'confidential', 'public'][$i % 3],
                'uploaded_by' => $users[$i % $users->count()]->id,
            ]);

            // Some documents have been revised, so their history has more than one file.
            foreach (range(1, [2, 0, 1][$i % 3]) as $revision) {
                if ($revision === 0) {
                    break;
                }
                $label = 'v1.'.$revision;
                $next = 'library/'.Str::random(20).'-'.Str::slug($title)."-{$label}.pdf";
                Storage::disk('local')->put($next, $this->placeholderPdf($title, $label));
                $document->addVersion($next, 'application/pdf', Storage::disk('local')->size($next), $users[$i % $users->count()]->id);
            }
        }
    }

    /** Bytes a browser can actually open for the given file name. */
    private function placeholderFile(string $name, string $label): string
    {
        return match (Str::lower(pathinfo($name, PATHINFO_EXTENSION))) {
            'pdf' => $this->placeholderPdf($label, 'v1.0'),
            'jpg', 'jpeg' => $this->placeholderPng($label.'.jpg', '#334155', 640, 'jpeg'),
            'png' => $this->placeholderPng($label.'.png', '#334155', 640),
            // A Word or Excel file can't be faked with text; demo documents are PDFs.
            default => $this->placeholderPdf($label, 'v1.0'),
        };
    }

    /**
     * A valid one-page PDF naming the document and version, written by hand so the
     * demo needs no PDF library. Offsets in the xref table are computed, not guessed.
     */
    private function placeholderPdf(string $title, string $version): string
    {
        $escape = fn (string $text) => str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text);
        $stream = 'BT /F1 22 Tf 72 720 Td ('.$escape($title).') Tj ET'."\n"
            .'BT /F1 12 Tf 72 692 Td ('.$escape("Version {$version} - demo placeholder").') Tj ET';

        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length '.strlen($stream)." >>\nstream\n{$stream}\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $index => $body) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1)." 0 obj\n{$body}\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        return $pdf.'trailer'."\n<< /Size ".(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF\n";
    }

    private function taxonomies(): void
    {
        $lists = [
            'case_type' => ['civil', 'criminal', 'family', 'corporate', 'labour', 'tax', 'property'],
            'client_type' => array_keys(self::CLIENT_TYPES),
            'case_status' => ['open', 'pending', 'closed'],
            'event_type' => ['filing', 'meeting', 'call', 'deadline', 'note'],
            'hearing_type' => ['first hearing', 'arguments', 'evidence', 'cross examination', 'judgement'],
            'court_type' => array_keys(self::COURT_TYPES),
            'document_type' => array_keys(self::DOCUMENT_TYPES),
            'practice_area' => ['litigation', 'corporate', 'family', 'property', 'employment', 'tax'],
            'research_type' => ['case law', 'statute', 'doctrine', 'comparative'],
            'research_category' => ['procedure', 'substantive', 'evidence', 'remedies'],
            'research_source' => array_keys(self::RESEARCH_SOURCES),
            'compliance_category' => array_keys(self::COMPLIANCE_CATEGORIES),
            'compliance_frequency' => array_keys(self::COMPLIANCE_FREQUENCIES),
            'risk_category' => array_keys(self::RISK_CATEGORIES),
            'audit_type' => array_keys(self::AUDIT_TYPES),
            'expense_category' => array_keys(self::EXPENSE_CATEGORIES),
            'task_type' => ['Drafting', 'Filing', 'Meeting', 'Review', 'Negotiation', 'Investigation', 'Administrative'],
            'task_status' => array_column(Task::STATUSES, 'label'),
        ];

        $colors = [
            'civil' => '#6b7280', 'criminal' => '#ef4444', 'family' => '#f59e0b',
            'corporate' => '#059669', 'labour' => '#06b6d4', 'tax' => '#84cc16', 'property' => '#f97316',
            'Drafting' => '#8b5cf6', 'Filing' => '#ef4444', 'Meeting' => '#10b981', 'Review' => '#f59e0b',
            'Negotiation' => '#84cc16', 'Investigation' => '#06b6d4', 'Administrative' => '#6b7280',
        ];

        foreach ($lists as $kind => $names) {
            foreach ($names as $sort => $name) {
                $category = $kind === 'compliance_category' ? self::COMPLIANCE_CATEGORIES[$name] : null;
                $frequency = $kind === 'compliance_frequency' ? self::COMPLIANCE_FREQUENCIES[$name] : null;
                $risk = $kind === 'risk_category' ? self::RISK_CATEGORIES[$name] : null;
                $audit = $kind === 'audit_type' ? self::AUDIT_TYPES[$name] : null;
                $court = $kind === 'court_type' ? self::COURT_TYPES[$name] : null;
                $document = $kind === 'document_type' ? self::DOCUMENT_TYPES[$name] : null;
                $clientType = $kind === 'client_type' ? self::CLIENT_TYPES[$name] : null;
                $expense = $kind === 'expense_category' ? self::EXPENSE_CATEGORIES[$name] : null;
                $taskStatus = $kind === 'task_status' ? Task::STATUSES[Str::snake($name)] : null;
                $meta = match (true) {
                    $kind === 'case_status' && $name === 'open' => ['is_default' => true],
                    $kind === 'case_status' && $name === 'closed' => ['is_closed' => true],
                    $kind === 'research_source' => self::RESEARCH_SOURCES[$name],
                    $kind === 'compliance_frequency' && $frequency[1] !== null => ['days' => $frequency[1]],
                    default => null,
                };

                Taxonomy::firstOrCreate(
                    ['kind' => $kind, 'name' => $name],
                    [
                        'sort' => $sort, 'active' => true, 'meta' => $meta,
                        'description' => $category[0] ?? $frequency[0] ?? $risk[0] ?? $audit[0] ?? $court[0] ?? $document[0] ?? $clientType ?? $expense ?? null,
                        'color' => $category[1] ?? $risk[1] ?? $audit[1] ?? $court[1] ?? $document[1] ?? $taskStatus['color'] ?? $colors[$name] ?? null,
                    ],
                );
            }
        }
    }

    private function templates(): void
    {
        foreach ([
            ['hearing_reminder', 'Hearing reminder', 'Hearing on {{date}} — {{reference}}', "Dear {{client}},\n\nA hearing in {{case}} is listed for {{date}}.\n\n{{firm}}"],
            ['invoice_issued', 'Invoice issued', 'Invoice {{reference}} from {{firm}}', "Dear {{client}},\n\nInvoice {{reference}} for {{amount}} is attached and due on {{date}}.\n\n{{firm}}"],
            ['invoice_overdue', 'Invoice overdue', 'Overdue: invoice {{reference}}', "Dear {{client}},\n\nInvoice {{reference}} for {{amount}} fell due on {{date}} and remains unpaid.\n\n{{firm}}"],
            ['task_assigned', 'Task assigned', 'Task assigned on {{reference}}', 'A task on {{case}} has been assigned to you, due {{date}}.'],
            ['case_closed', 'Case closed', '{{reference}} has been closed', "Dear {{client}},\n\n{{case}} was closed on {{date}}. Our file will be archived.\n\n{{firm}}"],
        ] as [$key, $name, $subject, $body]) {
            NotificationTemplate::firstOrCreate(['key' => $key, 'channel' => 'email'], [
                'name' => $name,
                'subject' => $subject,
                'body' => $body,
                'active' => true,
            ]);
        }

        // The same events announced to the team in Slack and by text message.
        // Short, subject-less wording: a chat post and an SMS have no subject line.
        $events = [
            'team_member_created' => ['Team Member Created', '{{name}} has joined {{firm}}.'],
            'new_case' => ['New Case', 'New case opened: {{reference}} — {{case}} for {{client}}.'],
            'new_client' => ['New Client', '{{client}} is now a client of {{firm}}.'],
            'new_cle_record' => ['New CLE Record', '{{name}} logged a CLE activity on {{date}}.'],
            'new_regulatory_body' => ['New Regulatory Body', '{{name}} was added as a regulatory body.'],
            'new_license' => ['New License', 'A professional licence for {{name}} was recorded, expiring {{date}}.'],
            'new_judge' => ['New Judge', '{{name}} was added to the bench register.'],
            'new_court' => ['New Court', '{{name}} was added to the court register.'],
            'invoice_sent' => ['Invoice Sent', 'Invoice {{reference}} for {{amount}} was sent to {{client}}.'],
            'new_invoice' => ['New Invoice', 'Invoice {{reference}} for {{amount}} was raised for {{client}}.'],
            'new_hearing' => ['New Hearing', 'Hearing in {{case}} listed for {{date}}.'],
            'new_task' => ['New Task', 'New task on {{case}}, due {{date}}.'],
        ];

        foreach (['slack', 'twilio'] as $channel) {
            foreach ($events as $key => [$name, $body]) {
                NotificationTemplate::firstOrCreate(['key' => $key, 'channel' => $channel], [
                    'name' => $name,
                    'subject' => null,
                    'body' => $body,
                    'active' => true,
                ]);
            }
        }
    }

    private function expenses(): void
    {
        if (Expense::exists()) {
            return;
        }

        $users = User::all();
        $matters = Matter::all();

        if ($users->isEmpty() || $matters->isEmpty()) {
            return;
        }

        $descriptions = [
            ['Court filing fee', 'Court Fees'],
            ['Travel to hearing', 'Travel'],
            ['Expert report', 'Expert Witnesses'],
            ['Courier to registry', 'Postage'],
            ['Document copying and printing', 'Document Production'],
        ];

        foreach ($matters as $m => $matter) {
            foreach (range(0, 5) as $k) {
                [$description, $category] = $descriptions[($m + $k) % count($descriptions)];

                Expense::create([
                    'matter_id' => $matter->id,
                    'user_id' => $users[($m + $k) % $users->count()]->id,
                    'description' => $description,
                    'category' => $category,
                    'amount_cents' => [4220, 6700, 49000, 12500, 8900, 31500][$k],
                    'billable' => $k !== 3,
                    // The first two land today so the dashboard's "Today" card is never empty.
                    'status' => ['approved', 'pending', 'approved', 'approved', 'rejected', 'pending'][$k],
                    'incurred_on' => $k < 2 ? now() : now()->subDays($k * 11 + $m),
                ]);
            }
        }
    }

    /** A year of settled invoices so the revenue chart has a curve to draw. */
    private function revenueHistory(): void
    {
        if (Invoice::where('status', 'paid')->exists()) {
            return;
        }

        $matters = Matter::all();
        if ($matters->isEmpty()) {
            return;
        }

        $shape = [1250, 2100, 1800, 3200, 2800, 4100, 3600, 4800, 3900, 5200, 4700, 6100];

        foreach ($shape as $back => $amount) {
            $month = now()->subMonths(11 - $back);
            $matter = $matters[$back % $matters->count()];
            $cents = $amount * 100;

            $invoice = Invoice::create([
                'client_id' => $matter->client_id,
                'matter_id' => $matter->id,
                'number' => sprintf('INV-%d-%04d', $month->year, 9000 + $back),
                'issued_on' => $month->copy()->startOfMonth()->addDays(2),
                'due_on' => $month->copy()->startOfMonth()->addDays(32),
                'status' => 'paid',
                'subtotal_cents' => $cents,
                'tax_cents' => 0,
                'notes' => 'Historic invoice, settled.',
            ]);

            Payment::create([
                'invoice_id' => $invoice->id,
                'paid_on' => $month->copy()->startOfMonth()->addDays(20),
                'amount_cents' => $cents,
                'method' => 'bank',
                'reference' => 'TRF-'.$month->format('Ym'),
            ]);

            $invoice->refresh()->refreshPaidTotal();
        }
    }

    /**
     * Recent invoices across every state the register shows, so Draft, Sent,
     * Overdue and Cancelled are not empty next to the settled revenue history.
     */
    private function billingSpread(): void
    {
        if (Invoice::whereIn('status', ['draft', 'void'])->exists()) {
            return;
        }

        $matters = Matter::all();
        if ($matters->isEmpty()) {
            return;
        }

        // [amount, status, issued days ago, term in days]
        $spread = [
            [1286, 'draft', 24, 30],
            [2553, 'draft', 33, 30],
            [1761, 'draft', 41, 30],
            [3652, 'draft', 42, 30],
            [1178, 'sent', 24, 45],
            [1983, 'sent', 35, 40],
            [2504, 'void', 28, 30],
        ];

        foreach ($spread as $i => [$amount, $status, $issuedAgo, $term]) {
            $matter = $matters[$i % $matters->count()];
            $issued = now()->subDays($issuedAgo);

            Invoice::create([
                'client_id' => $matter->client_id,
                'matter_id' => $matter->id,
                'number' => Invoice::nextNumber(),
                'issued_on' => $issued,
                'due_on' => $issued->copy()->addDays($term),
                'status' => $status,
                'subtotal_cents' => $amount * 100,
                'tax_cents' => 0,
                'notes' => $status === 'void' ? 'Cancelled at the client\'s request.' : null,
            ]);
        }
    }

    /**
     * Brand and template assets for the media library. The images are drawn here
     * rather than shipped, so the repository carries no binaries.
     */
    private function mediaLibrary(): void
    {
        if (Medium::exists()) {
            return;
        }

        $assets = [
            ['firm-logo-dark.png', 'branding', '#1f2937'],
            ['firm-logo-light.png', 'branding', '#f9fafb'],
            ['firm-monogram.png', 'branding', '#4f46e5'],
            ['letterhead-header.png', 'branding', '#0f766e'],
            ['email-signature.png', 'branding', '#b91c1c'],
            ['invoice-watermark.png', 'templates', '#64748b'],
            ['engagement-letter-cover.png', 'templates', '#a16207'],
            ['pleading-cover-sheet.png', 'templates', '#15803d'],
            ['court-bundle-divider.png', 'templates', '#7c3aed'],
            ['witness-statement-cover.png', 'templates', '#0369a1'],
            ['reception-photo.png', 'general', '#be185d'],
            ['boardroom-photo.png', 'general', '#ca8a04'],
            ['team-photo-2026.png', 'general', '#0891b2'],
            ['office-exterior.png', 'general', '#4d7c0f'],
            ['conference-banner.png', 'general', '#c2410c'],
        ];

        $uploader = User::query()->orderBy('id')->first();

        foreach ($assets as $i => [$title, $folder, $hex]) {
            $path = "media/{$folder}/".Str::random(20).'-'.$title;
            Storage::disk('local')->put($path, $this->placeholderPng($title, $hex, 480 + $i * 24));

            Medium::create([
                'uploaded_by' => $uploader?->id,
                'title' => $title,
                'folder' => $folder,
                'path' => $path,
                'mime' => 'image/png',
                'size' => Storage::disk('local')->size($path),
            ]);
        }
    }

    /** A flat tile carrying the asset's name, so thumbnails are real images. */
    private function placeholderPng(string $title, string $hex, int $width, string $format = 'png'): string
    {
        $height = (int) round($width * 0.625);
        $image = imagecreatetruecolor($width, $height);

        [$r, $g, $b] = sscanf($hex, '#%02x%02x%02x');
        imagefill($image, 0, 0, imagecolorallocate($image, $r, $g, $b));

        // White on a dark tile, near-black on a light one.
        $ink = ($r * 299 + $g * 587 + $b * 114) / 1000 > 150
            ? imagecolorallocate($image, 17, 24, 39)
            : imagecolorallocate($image, 255, 255, 255);

        $label = pathinfo($title, PATHINFO_FILENAME);
        imagestring($image, 5, (int) (($width - strlen($label) * 9) / 2), (int) ($height / 2 - 8), $label, $ink);

        ob_start();
        $format === 'jpeg' ? imagejpeg($image, null, 85) : imagepng($image);
        imagedestroy($image);

        return (string) ob_get_clean();
    }

    /** The firm's own details, so the Company Profile screen is not all dashes. */
    private function companyProfile(): void
    {
        $profile = [
            'firm_name' => 'Whitmore & Co.',
            'business_type' => 'law firm',
            'years_experience' => '18',
            'practice_size' => 'medium',
            'bar_registration_no' => 'BAR/2008/04417',
            'registration_no' => 'LLP/2008/000417',
            'established_on' => '2008-03-17',
            'advocate_name' => 'Eleanor Whitmore',
            'firm_email' => 'clerks@whitmore.test',
            'firm_phone' => '+44 20 7946 0417',
            'firm_website' => 'https://whitmore.test',
            'consultation_fee' => '250.00',
            'office_hours' => 'Monday to Friday: 9:00 AM - 6:00 PM, Saturday: 10:00 AM - 1:00 PM',
            'firm_address' => '4 Gray\'s Inn Square, Holborn, London WC1R 5AY',
            'law_degree' => 'LLB (Hons), LLM (Commercial Litigation)',
            'university' => 'University of London',
            'languages_spoken' => 'English, French, Yoruba',
            'success_rate' => '87',
            'specialization' => 'Commercial Litigation, Corporate Advisory, Employment Law',
            'court_jurisdictions' => 'High Court, Court of Appeal, Employment Tribunal',
            'services_offered' => 'Legal Consultation, Contract Drafting, Commercial Litigation, Corporate Advisory, Court Representation, Compliance Audits',
            'notable_cases' => 'Acted in leading carriage-of-goods and shareholder-dispute matters between 2014 and 2024.',
            'firm_description' => 'Whitmore & Co. is a commercial practice advising owner-managed businesses and their directors. With 18 years of experience we handle contentious and advisory work end to end.',
        ];

        foreach ($profile as $key => $value) {
            Setting::firstOrCreate(['key' => $key], ['value' => $value]);
        }
    }

    /** A day's work on the board, so the dashboard's "today" cards are never empty. */
    private function todaysWork(): void
    {
        if (TimeEntry::whereDate('worked_on', today())->exists()) {
            return;
        }

        $users = User::all();
        $matters = Matter::all();

        if ($users->isEmpty() || $matters->isEmpty()) {
            return;
        }

        $work = [
            ['Client consultation and case review', 240, false],
            ['Administrative tasks and filing', 90, true],
            ['Court appearance and hearing', 120, true],
            ['Document preparation and filing', 240, true],
            ['Legal research on case precedents', 150, true],
            ['Settlement negotiations', 30, true],
        ];

        foreach ($work as $i => [$description, $minutes, $billable]) {
            $matter = $matters[$i % $matters->count()];

            TimeEntry::create([
                'matter_id' => $matter->id,
                'user_id' => $users[$i % $users->count()]->id,
                'worked_on' => today(),
                'minutes' => $minutes,
                'rate_cents' => $matter->hourly_rate_cents,
                'billable' => $billable,
                'description' => $description,
            ]);
        }
    }
}
