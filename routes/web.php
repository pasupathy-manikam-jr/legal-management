<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\CleRecordController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\CompanyProfileController;
use App\Http\Controllers\ComplianceController;
use App\Http\Controllers\CourtController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\HearingController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\JudgeController;
use App\Http\Controllers\KnowledgeArticleController;
use App\Http\Controllers\LegalPrecedentController;
use App\Http\Controllers\MatterController;
use App\Http\Controllers\MatterEventController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProfessionalLicenseController;
use App\Http\Controllers\RegulatoryBodyController;
use App\Http\Controllers\ResearchProjectController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SystemSettingController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaxonomyController;
use App\Http\Controllers\TimeEntryController;
use App\Http\Controllers\TimesheetController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('welcome'))->name('home');

// Subscribable hearing feed. Authenticated by the secret token, not a session,
// because Google Calendar fetches it without a logged-in user.
Route::get('calendar/feed/{token}.ics', [CalendarController::class, 'feed'])
    ->where('token', '[A-Za-z0-9]+')
    ->name('calendar.feed');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::resource('clients', ClientController::class)->except('create', 'edit');
    Route::patch('clients/{client}/toggle-status', [ClientController::class, 'toggleStatus'])->name('clients.toggle-status');
    Route::get('judges', [JudgeController::class, 'index'])->name('judges.index');
    Route::post('judges', [JudgeController::class, 'store'])->name('judges.store');
    Route::put('judges/{judge}', [JudgeController::class, 'update'])->name('judges.update');
    Route::patch('judges/{judge}/toggle', [JudgeController::class, 'toggle'])->name('judges.toggle');
    Route::delete('judges/{judge}', [JudgeController::class, 'destroy'])->name('judges.destroy');
    Route::patch('courts/{court}/toggle', [CourtController::class, 'toggle'])->name('courts.toggle');
    Route::resource('courts', CourtController::class)->except('create', 'edit', 'show');
    Route::resource('hearings', HearingController::class)->except('create', 'edit', 'show');
    Route::get('billing/time-entries', TimesheetController::class)->name('timesheet');
    Route::resource('time-entries', TimeEntryController::class)->except('create', 'edit', 'show');

    Route::resource('tasks', TaskController::class)->except('create', 'edit', 'show');
    Route::patch('tasks/{task}/toggle', [TaskController::class, 'toggle'])->name('tasks.toggle');
    Route::patch('tasks/{task}/status', [TaskController::class, 'moveStatus'])->name('tasks.status');

    Route::resource('matters', MatterController::class)->except('create', 'edit');
    Route::patch('matters/{matter}/toggle-status', [MatterController::class, 'toggleStatus'])->name('matters.toggle-status');
    Route::post('matters/{matter}/team', [MatterController::class, 'syncTeam'])->name('matters.team.store');
    Route::delete('matters/{matter}/team/{user}', [MatterController::class, 'removeTeam'])->name('matters.team.destroy');
    Route::post('matters/{matter}/events', [MatterEventController::class, 'store'])->name('matters.events.store');
    Route::delete('matter-events/{event}', [MatterEventController::class, 'destroy'])->name('matter-events.destroy');
    Route::post('matters/{matter}/documents', [DocumentController::class, 'storeForMatter'])->name('matters.documents.store');

    Route::get('documents', [DocumentController::class, 'index'])->name('documents.index');
    Route::get('documents/library', [DocumentController::class, 'library'])->name('documents.library');
    Route::post('documents', [DocumentController::class, 'store'])->name('documents.store');
    Route::put('documents/{document}', [DocumentController::class, 'update'])->name('documents.update');
    Route::patch('documents/{document}/archive', [DocumentController::class, 'toggleArchive'])->name('documents.archive');
    Route::get('documents/{document}/preview', [DocumentController::class, 'preview'])->name('documents.preview');
    Route::whereNumber('document')->scopeBindings()->group(function () {
        Route::get('documents/library/{document}', [DocumentController::class, 'show'])->name('documents.show');
        Route::post('documents/{document}/versions', [DocumentController::class, 'addVersion'])->name('documents.versions.store');
        Route::patch('documents/{document}/versions/{version}/restore', [DocumentController::class, 'restoreVersion'])->name('documents.versions.restore');
        Route::delete('documents/{document}/versions/{version}', [DocumentController::class, 'destroyVersion'])->name('documents.versions.destroy');
        Route::get('documents/{document}/versions/{version}/preview', [DocumentController::class, 'previewVersion'])->name('documents.versions.preview');
        Route::get('documents/{document}/versions/{version}/download', [DocumentController::class, 'downloadVersion'])->name('documents.versions.download');
    });
    Route::get('documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');
    Route::delete('documents/{document}', [DocumentController::class, 'destroy'])->name('documents.destroy');

    Route::get('analytics', AnalyticsController::class)->name('analytics');
    Route::get('calendar', CalendarController::class)->name('calendar');

    // Legal research
    Route::patch('research-projects/{researchProject}/status', [ResearchProjectController::class, 'cycleStatus'])->name('research-projects.status');
    Route::resource('research-projects', ResearchProjectController::class)->except('create', 'edit', 'show');
    Route::resource('articles', KnowledgeArticleController::class)->except('create', 'edit', 'show')
        ->parameters(['articles' => 'article']);
    Route::patch('precedents/{precedent}/status', [LegalPrecedentController::class, 'cycleStatus'])->name('precedents.status');
    Route::resource('precedents', LegalPrecedentController::class)->except('create', 'edit', 'show')
        ->parameters(['precedents' => 'precedent']);

    // Compliance & regulatory
    Route::get('compliance/requirements', [ComplianceController::class, 'requirements'])->name('compliance.requirements');
    Route::post('compliance/requirements', [ComplianceController::class, 'storeRequirement'])->name('compliance.requirements.store');
    Route::put('compliance/requirements/{requirement}', [ComplianceController::class, 'updateRequirement'])->name('compliance.requirements.update');
    Route::delete('compliance/requirements/{requirement}', [ComplianceController::class, 'destroyRequirement'])->name('compliance.requirements.destroy');
    Route::patch('compliance/requirements/{requirement}/status', [ComplianceController::class, 'cycleRequirement'])->name('compliance.requirements.cycle');
    Route::get('compliance/audits', [ComplianceController::class, 'audits'])->name('compliance.audits');
    Route::post('compliance/audits', [ComplianceController::class, 'storeAudit'])->name('compliance.audits.store');
    Route::put('compliance/audits/{audit}', [ComplianceController::class, 'updateAudit'])->name('compliance.audits.update');
    Route::delete('compliance/audits/{audit}', [ComplianceController::class, 'destroyAudit'])->name('compliance.audits.destroy');
    Route::get('compliance/risk-assessments', [ComplianceController::class, 'risks'])->name('compliance.risks');
    Route::post('compliance/risk-assessments', [ComplianceController::class, 'storeRisk'])->name('compliance.risks.store');
    Route::put('compliance/risk-assessments/{risk}', [ComplianceController::class, 'updateRisk'])->name('compliance.risks.update');
    Route::delete('compliance/risk-assessments/{risk}', [ComplianceController::class, 'destroyRisk'])->name('compliance.risks.destroy');
    Route::get('compliance/professional-licenses', [ProfessionalLicenseController::class, 'index'])->name('compliance.licenses');
    Route::post('compliance/professional-licenses', [ProfessionalLicenseController::class, 'store'])->name('compliance.licenses.store');
    Route::put('compliance/professional-licenses/{license}', [ProfessionalLicenseController::class, 'update'])->name('compliance.licenses.update');
    Route::patch('compliance/professional-licenses/{license}/renew', [ProfessionalLicenseController::class, 'renew'])->name('compliance.licenses.renew');
    Route::delete('compliance/professional-licenses/{license}', [ProfessionalLicenseController::class, 'destroy'])->name('compliance.licenses.destroy');
    Route::get('compliance/cle-tracking', [CleRecordController::class, 'index'])->name('compliance.cle');
    Route::post('compliance/cle-tracking', [CleRecordController::class, 'store'])->name('compliance.cle.store');
    Route::put('compliance/cle-tracking/{record}', [CleRecordController::class, 'update'])->name('compliance.cle.update');
    Route::delete('compliance/cle-tracking/{record}', [CleRecordController::class, 'destroy'])->name('compliance.cle.destroy');
    Route::get('compliance/regulatory-bodies', [RegulatoryBodyController::class, 'index'])->name('compliance.bodies');
    Route::post('compliance/regulatory-bodies', [RegulatoryBodyController::class, 'store'])->name('compliance.bodies.store');
    Route::put('compliance/regulatory-bodies/{body}', [RegulatoryBodyController::class, 'update'])->name('compliance.bodies.update');
    Route::patch('compliance/regulatory-bodies/{body}/toggle', [RegulatoryBodyController::class, 'toggle'])->name('compliance.bodies.toggle');
    Route::delete('compliance/regulatory-bodies/{body}', [RegulatoryBodyController::class, 'destroy'])->name('compliance.bodies.destroy');

    // Client communication log
    Route::get('messages', [MessageController::class, 'index'])->name('messages.index');
    Route::post('messages/start', [MessageController::class, 'start'])->name('messages.start');
    Route::post('messages/{conversation}', [MessageController::class, 'store'])->name('messages.store');
    Route::delete('messages/{conversation}', [MessageController::class, 'destroy'])->name('messages.destroy');

    // Media library
    Route::get('media', [MediaController::class, 'index'])->name('media.index');
    Route::post('media', [MediaController::class, 'store'])->name('media.store');
    Route::get('media/{medium}/preview', [MediaController::class, 'preview'])->name('media.preview');
    Route::get('media/{medium}/download', [MediaController::class, 'download'])->name('media.download');
    Route::delete('media/{medium}', [MediaController::class, 'destroy'])->name('media.destroy');

    // Firm configuration — admin only, enforced in the controllers
    Route::resource('setup', TaxonomyController::class)->except('create', 'edit', 'show')
        ->parameters(['setup' => 'taxonomy']);
    Route::patch('setup/{taxonomy}/toggle', [TaxonomyController::class, 'toggle'])->name('setup.toggle');
    Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
    Route::post('roles', [RoleController::class, 'store'])->name('roles.store');
    Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');
    Route::delete('roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');
    Route::patch('users/{user}/toggle', [UserController::class, 'toggle'])->name('users.toggle');
    Route::patch('users/{user}/password', [UserController::class, 'resetPassword'])->name('users.password');
    Route::resource('users', UserController::class)->except('create', 'edit', 'show');
    // Firm-wide configuration. Account settings stay in routes/settings.php.
    Route::get('company-profile', [CompanyProfileController::class, 'index'])->name('company-profile');
    Route::put('company-profile', [CompanyProfileController::class, 'update'])->name('company-profile.update');

    Route::get('system-settings', [SystemSettingController::class, 'index'])->name('system-settings');
    Route::put('system-settings/system', [SystemSettingController::class, 'updateSystem'])->name('system-settings.system');
    Route::put('system-settings/brand', [SystemSettingController::class, 'updateBrand'])->name('system-settings.brand');
    Route::put('system-settings/currency', [SystemSettingController::class, 'updateCurrency'])->name('system-settings.currency');
    Route::put('system-settings/email', [SystemSettingController::class, 'updateEmail'])->name('system-settings.email');
    Route::put('system-settings/slack', [SystemSettingController::class, 'updateSlack'])->name('system-settings.slack');
    Route::patch('system-settings/templates/{template}', [SystemSettingController::class, 'toggleTemplate'])->name('system-settings.templates.toggle');
    Route::post('system-settings/test-email', [SystemSettingController::class, 'testEmail'])->name('system-settings.test-email');
    Route::put('system-settings/twilio', [SystemSettingController::class, 'updateTwilio'])->name('system-settings.twilio');
    Route::put('system-settings/payments', [SystemSettingController::class, 'updatePayments'])->name('system-settings.payments');
    Route::put('system-settings/calendar', [SystemSettingController::class, 'updateCalendar'])->name('system-settings.calendar');
    Route::post('system-settings/calendar/regenerate', [SystemSettingController::class, 'regenerateCalendarFeed'])->name('system-settings.calendar.regenerate');
    Route::post('system-settings/test-slack', [SystemSettingController::class, 'testSlack'])->name('system-settings.test-slack');
    Route::post('system-settings/test-sms', [SystemSettingController::class, 'testSms'])->name('system-settings.test-sms');
    Route::post('system-settings/test-stripe', [SystemSettingController::class, 'testStripe'])->name('system-settings.test-stripe');

    Route::get('settings/billing', [SettingController::class, 'billing'])->name('settings.billing');
    Route::put('settings/billing', [SettingController::class, 'updateBilling'])->name('settings.billing.update');
    Route::get('settings/templates', [SettingController::class, 'templates'])->name('settings.templates');
    Route::put('settings/templates/{template}', [SettingController::class, 'updateTemplate'])->name('settings.templates.update');

    Route::resource('expenses', ExpenseController::class)->except('create', 'edit', 'show');
    Route::patch('expenses/{expense}/status', [ExpenseController::class, 'updateStatus'])->name('expenses.status');

    Route::patch('invoices/{invoice}/send', [InvoiceController::class, 'send'])->name('invoices.send');
    Route::resource('invoices', InvoiceController::class)->except('create', 'edit');
    Route::get('payments', [PaymentController::class, 'index'])->name('payments.index');
    Route::post('invoices/{invoice}/payments', [PaymentController::class, 'store'])->name('invoices.payments.store');
    Route::put('invoices/{invoice}/payments/{payment}', [PaymentController::class, 'update'])->name('invoices.payments.update');
    Route::delete('invoices/{invoice}/payments/{payment}', [PaymentController::class, 'destroy'])->name('invoices.payments.destroy');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
