<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Staff role — drives who may reach setup, team and billing configuration.
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('lawyer')->after('email'); // admin, lawyer, paralegal, billing
            $table->string('title')->nullable()->after('role');
            $table->boolean('active')->default(true)->after('title');
        });

        /**
         * Every configurable list in the app: case types, case statuses, event types,
         * hearing types, document types, research types, research categories, research
         * sources, practice areas, expense categories. They share one shape, so they
         * share one table and one screen instead of ten near-identical CRUDs.
         */
        Schema::create('taxonomies', function (Blueprint $table) {
            $table->id();
            $table->string('kind');
            $table->string('name');
            $table->string('color')->nullable();
            $table->unsignedSmallInteger('sort')->default(0);
            $table->boolean('active')->default(true);
            $table->json('meta')->nullable(); // per-kind extras: is_default, is_closed, url, expertise
            $table->timestamps();
            $table->unique(['kind', 'name']);
        });

        Schema::create('research_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matter_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('type')->nullable();
            $table->string('category')->nullable();
            $table->string('priority')->default('medium');
            $table->string('status')->default('active'); // active, completed, on_hold, cancelled
            $table->text('question')->nullable();
            $table->text('findings')->nullable();
            $table->date('started_on');
            $table->date('due_on')->nullable();
            $table->timestamps();
        });

        Schema::create('knowledge_articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('category')->nullable();
            $table->text('summary')->nullable();
            $table->longText('body');
            $table->string('status')->default('draft'); // draft, published, archived
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('legal_precedents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matter_id')->nullable()->constrained()->nullOnDelete();
            $table->string('case_name');
            $table->string('citation');
            $table->string('court')->nullable();
            $table->unsignedSmallInteger('decided_year')->nullable();
            $table->text('holding')->nullable();
            $table->unsignedTinyInteger('relevance')->default(50); // 0-100
            $table->string('status')->default('active'); // active, overruled, questioned, archived
            $table->timestamps();
        });

        Schema::create('compliance_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('category')->nullable();
            $table->string('priority')->default('medium');
            $table->string('status')->default('pending'); // compliant, in_progress, non_compliant, pending
            $table->text('requirement')->nullable();
            $table->date('due_on')->nullable();
            $table->date('last_reviewed_on')->nullable();
            $table->timestamps();
        });

        Schema::create('compliance_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auditor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('type')->nullable();
            $table->string('risk_level')->default('medium'); // low, medium, high
            $table->string('status')->default('planned');    // planned, in_progress, completed, cancelled
            $table->date('scheduled_on');
            $table->date('completed_on')->nullable();
            $table->text('findings')->nullable();
            $table->timestamps();
        });

        Schema::create('risk_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('matter_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('category')->nullable();
            $table->unsignedTinyInteger('likelihood')->default(3); // 1-5
            $table->unsignedTinyInteger('impact')->default(3);     // 1-5
            $table->string('status')->default('open');             // open, mitigating, accepted, closed
            $table->text('mitigation')->nullable();
            $table->date('review_on')->nullable();
            $table->timestamps();
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('matter_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('direction')->default('outbound'); // inbound, outbound
            $table->string('channel')->default('email');      // email, phone, meeting, letter, portal
            $table->string('subject');
            $table->text('body');
            $table->dateTime('occurred_at');
            $table->timestamps();
        });

        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('folder')->default('general'); // branding, templates, general
            $table->string('path');
            $table->string('mime')->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamps();
        });

        Schema::create('notification_templates', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('channel')->default('email');
            $table->string('subject');
            $table->text('body');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // Firm-wide configuration: invoice prefix, payment terms, default tax rate, etc.
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('notification_templates');
        Schema::dropIfExists('media');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('risk_assessments');
        Schema::dropIfExists('compliance_audits');
        Schema::dropIfExists('compliance_requirements');
        Schema::dropIfExists('legal_precedents');
        Schema::dropIfExists('knowledge_articles');
        Schema::dropIfExists('research_projects');
        Schema::dropIfExists('taxonomies');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'title', 'active']);
        });
    }
};
