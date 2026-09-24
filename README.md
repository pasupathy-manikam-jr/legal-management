# Legal Management

Advocate is a practice-management app for law firms. It covers cases, clients, court hearings, time and billing, documents, legal research and compliance. It's built for a single firm rather than as multi-tenant SaaS.

It's a server-driven single-page app: Laravel handles routing, validation and data, and Inertia renders React pages without a separate API.

## Features

### Overview
- **Dashboard**: key figures, revenue and collections, upcoming hearings and time logged.
- **Analytics & reports**: summaries of the practice's workload and billing.
- **Calendar**: hearings, deadlines and events in one place.

### Case & legal operations
- **Cases**: a register of cases with parties, court, status, events and hearings.
- **Hearings**: scheduled hearings linked to cases and courts.
- **Case setup**: configurable case types, case statuses, event types and hearing types.

### Legal research
- **Research projects** to track research work against cases.
- **Knowledge articles** for internal know-how, and **legal precedents** for case law.
- **Research setup**: research types, practice areas, research categories and sources.

### Compliance & regulatory
- **Compliance requirements** and **compliance audits**.
- **Risk assessments**.
- **Professional licences**: expiry is worked out from the dates, never stored as a flag.
- **CLE tracking** for continuing legal education.
- **Regulatory bodies**.
- **Compliance setup**: categories, frequencies, risk categories and audit types.

### Tasks & workflow
- **Tasks** with assignees and due dates, plus configurable task types and statuses.

### Court management
- **Courts**, **judges** and a **hearing diary**, plus configurable court types.

### Clients & communication
- **Clients**: a client register with client types.
- **Client documents**: documents filed against each client, with document types.
- **Communication**: conversations and messages with clients.

### Billing & invoicing
- **Time sheet**: billable time entries.
- **Expenses**, with expense categories.
- **Invoices**: draft, send and track them. Overdue is worked out from the due date.
- **Payments** recorded against invoices.

### Documents & media
- **Document library**, organised in folders. Each document has a version history where you can add a version, preview, download, restore or delete it.
- Documents carry a stage, a confidentiality level and tags, and can be archived.
- **Media library** for images and files.

### System control
- **Company profile** for the firm's details.
- **Team members**: add, edit, activate or deactivate users, and reset their passwords.
- **Roles**: grouped permissions per role, with built-in system roles.
- **Notification templates** for email, Slack and Twilio.
- **Settings**: system-wide settings. Personal account settings (profile, password, appearance) are kept separate.

### Interface
- Collapsible sidebar with a menu search. The menu stays put while you navigate.
- Tab counts that follow the current search. Filters, sortable tables and pagination on one line.
- shadcn/ui throughout: dropdowns, modals and confirm dialogs, with no native browser prompts.
- Light and dark themes.

## Tech stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Backend  | PHP 8.2+, Laravel 12                         |
| Frontend | React 19, TypeScript, Inertia v2, Ziggy      |
| UI       | Tailwind CSS 4, shadcn/ui (Radix), Lucide icons |
| Database | SQLite by default; MySQL/MariaDB/Postgres supported |
| Tooling  | Vite, PHPUnit, Pint, ESLint, Prettier        |

Money is stored as integer cents throughout.

## Requirements

- PHP 8.2 or later, with the `gd`, `pdo` and `fileinfo` extensions
- Composer 2
- Node.js 20 or later, with npm

## Getting started

```bash
git clone https://github.com/pasupathy-manikam-jr/legal-management.git
cd legal-management

composer install
npm install

cp .env.example .env
php artisan key:generate

touch database/database.sqlite   # or set DB_* in .env for MySQL
php artisan migrate --seed
php artisan storage:link

npm run build
```

Then start everything with the dev server:

```bash
composer run dev
```

That runs the Laravel server, queue worker, log viewer and Vite together.

### Demo data

`php artisan migrate --seed` creates a demo firm: clients, cases, hearings, invoices, documents with sample files, roles and settings. Sign in with:

- Email: `admin@advocate.test`
- Password: `password`

Change this password before deploying anywhere public.

## Development

```bash
php artisan test         # PHPUnit feature tests
vendor/bin/pint          # format PHP
npm run lint             # ESLint
npm run format           # Prettier
npx tsc --noEmit         # type-check the React code
```

## Project structure

```
app/Http/Controllers   one controller per module
app/Models             Eloquent models (Matter = case, Taxonomy = configurable lists)
database/migrations    schema
database/seeders       demo data
resources/js/pages     Inertia React pages, one folder per module
resources/js/components shared UI (sidebar, dropdown, dialogs, tables)
routes/web.php         application routes
tests/Feature          feature tests
```

## Status

- Roles and permissions can be edited, but only the admin check is enforced so far.
- Notification templates can be edited, but nothing sends them yet.
