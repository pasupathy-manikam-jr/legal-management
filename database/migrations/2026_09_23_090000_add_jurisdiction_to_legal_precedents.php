<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('legal_precedents', function (Blueprint $table) {
            $table->string('jurisdiction')->nullable()->after('court');
            $table->string('category')->nullable()->after('jurisdiction');
            $table->date('decided_on')->nullable()->after('category');
        });

        // The year was all we stored; keep it as the first of January.
        DB::table('legal_precedents')->whereNotNull('decided_year')
            ->update(['decided_on' => DB::raw("CONCAT(decided_year, '-01-01')")]);

        Schema::table('legal_precedents', function (Blueprint $table) {
            $table->dropColumn('decided_year');
        });
    }

    public function down(): void
    {
        Schema::table('legal_precedents', function (Blueprint $table) {
            $table->unsignedSmallInteger('decided_year')->nullable()->after('court');
        });

        DB::table('legal_precedents')->whereNotNull('decided_on')
            ->update(['decided_year' => DB::raw('YEAR(decided_on)')]);

        Schema::table('legal_precedents', function (Blueprint $table) {
            $table->dropColumn(['jurisdiction', 'category', 'decided_on']);
        });
    }
};
