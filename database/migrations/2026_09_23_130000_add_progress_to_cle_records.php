<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cle_records', function (Blueprint $table) {
            // What the course is worth, against what the member has earned so far.
            $table->decimal('required_hours', 5, 2)->default(0)->after('credit_hours');
            $table->string('status')->default('completed')->after('required_hours');
            $table->string('certificate_url')->nullable()->after('notes');
        });

        // Everything on file was recorded as done, and counted for its full value.
        DB::table('cle_records')->update(['required_hours' => DB::raw('credit_hours')]);
    }

    public function down(): void
    {
        Schema::table('cle_records', function (Blueprint $table) {
            $table->dropColumn(['required_hours', 'status', 'certificate_url']);
        });
    }
};
