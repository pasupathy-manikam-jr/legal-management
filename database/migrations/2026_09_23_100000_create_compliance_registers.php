<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regulatory_bodies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('short_name')->nullable();
            $table->string('type')->nullable();          // bar association, court, government, regulator
            $table->string('jurisdiction')->nullable();
            $table->string('website')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('phone')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('professional_licenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('regulatory_body_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type');                       // bar admission, notary, solicitor
            $table->string('number')->nullable();
            $table->string('jurisdiction')->nullable();
            $table->date('issued_on')->nullable();
            $table->date('expires_on')->nullable();
            $table->string('status')->default('active');  // active, suspended, lapsed
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('cle_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('provider')->nullable();
            $table->string('category')->nullable();
            $table->decimal('credit_hours', 5, 2)->default(0);
            $table->date('completed_on');
            $table->unsignedSmallInteger('compliance_year');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::table('compliance_requirements', function (Blueprint $table) {
            $table->string('frequency')->nullable()->after('category');
        });
    }

    public function down(): void
    {
        Schema::table('compliance_requirements', function (Blueprint $table) {
            $table->dropColumn('frequency');
        });

        Schema::dropIfExists('cle_records');
        Schema::dropIfExists('professional_licenses');
        Schema::dropIfExists('regulatory_bodies');
    }
};
