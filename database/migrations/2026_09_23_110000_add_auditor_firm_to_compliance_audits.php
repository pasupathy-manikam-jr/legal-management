<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('compliance_audits', function (Blueprint $table) {
            // Who the auditor is acting for — an internal team or an outside firm.
            $table->string('auditor_firm')->nullable()->after('auditor_id');
        });
    }

    public function down(): void
    {
        Schema::table('compliance_audits', function (Blueprint $table) {
            $table->dropColumn('auditor_firm');
        });
    }
};
