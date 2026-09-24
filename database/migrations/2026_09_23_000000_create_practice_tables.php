<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('company')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('courts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->default('district'); // district, high, supreme, tribunal
            $table->string('bench')->nullable();
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('matters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lead_lawyer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('court_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference')->unique();
            $table->string('title');
            $table->string('practice_area')->nullable();
            $table->string('case_type')->nullable();     // civil, criminal, family, corporate...
            $table->string('priority')->default('medium'); // low, medium, high
            $table->string('judge')->nullable();
            $table->string('opposing_party')->nullable();
            $table->string('opposing_counsel')->nullable();
            $table->string('status')->default('open');   // open, pending, closed
            $table->date('opened_on');
            $table->date('expected_completion')->nullable();
            $table->date('closed_on')->nullable();
            // hourly rate in minor units (cents) — never store money as float
            $table->unsignedInteger('hourly_rate_cents')->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('hearings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matter_id')->constrained()->cascadeOnDelete();
            $table->dateTime('scheduled_at');
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->string('type')->nullable();   // first hearing, arguments, evidence, judgement
            $table->string('status')->default('scheduled'); // scheduled, in_progress, completed, postponed, cancelled
            $table->foreignId('court_id')->nullable()->constrained()->nullOnDelete();
            $table->string('judge')->nullable();
            $table->string('purpose')->nullable();
            $table->text('outcome')->nullable();
            $table->timestamps();
        });

        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matter_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('notes')->nullable();
            $table->string('priority')->default('normal'); // low, normal, high
            $table->date('due_on')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('matter_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matter_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind')->default('note'); // note, timeline
            $table->string('title');
            $table->text('body')->nullable();
            $table->dateTime('occurred_at');
            $table->timestamps();
        });

        Schema::create('matter_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matter_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role')->default('associate'); // lead, associate, paralegal
            $table->unique(['matter_id', 'user_id']);
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matter_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('path');
            $table->string('mime')->nullable();
            $table->string('confidentiality')->default('internal'); // public, internal, confidential
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('matter_id')->nullable()->constrained()->nullOnDelete();
            $table->string('number')->unique();
            $table->date('issued_on');
            $table->date('due_on');
            $table->string('status')->default('draft'); // draft, sent, paid, void
            $table->unsignedInteger('subtotal_cents')->default(0);
            $table->unsignedInteger('tax_cents')->default(0);
            $table->unsignedInteger('paid_cents')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matter_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('worked_on');
            $table->unsignedInteger('minutes');
            $table->unsignedInteger('rate_cents');
            $table->boolean('billable')->default(true);
            $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description');
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->date('paid_on');
            $table->unsignedInteger('amount_cents');
            $table->string('method')->default('bank'); // bank, card, cash, cheque
            $table->string('reference')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('matter_user');
        Schema::dropIfExists('matter_events');
        Schema::dropIfExists('time_entries');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('hearings');
        Schema::dropIfExists('matters');
        Schema::dropIfExists('clients');
        Schema::dropIfExists('courts');
    }
};
