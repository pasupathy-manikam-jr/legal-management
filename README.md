# Legal Management

Advocate is a practice-management app for law firms. It covers cases, clients, court hearings, billing, documents and compliance for a single firm (it is not multi-tenant SaaS). It's built on Laravel 12, Inertia v2 and React 19, with Tailwind 4 and shadcn/ui.

## Features

- **Dashboard & calendar**: an overview of the practice, analytics and reports, and a calendar of hearings and deadlines.
- **Case management**: cases with hearings, plus configurable case types, statuses, event types and hearing types.
- **Court management**: courts, judges, a hearing diary and court types.
- **Clients**: a client register, client types, per-client documents and communication logs.
- **Billing & invoicing**: time sheets, expenses, invoices (overdue status is worked out from the due date, never stored) and payments, with expense categories.
- **Documents & media**: a document library organised in folders, with version history (preview, download, restore). There's also a media library.
- **Legal research**: research projects, knowledge articles and legal precedents, with configurable research types, practice areas, categories and sources.
- **Compliance & regulatory**: compliance requirements and audits, risk assessments, professional licences with expiry tracking, CLE tracking and regulatory bodies.
- **Tasks & workflow**: tasks with configurable types and statuses.
- **System control**: company profile, team members, roles with grouped permissions, notification templates (email, Slack, Twilio) and system settings.

## Getting started

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm run build
```

Seeding creates demo data. Sign in as `admin@advocate.test` with the password `password`.

## Tests

```bash
php artisan test
```

## Status

Roles and permissions can be edited, but only the admin check is enforced so far. Notification templates can be edited, but nothing sends them yet.
