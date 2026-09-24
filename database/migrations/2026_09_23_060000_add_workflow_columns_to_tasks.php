<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('status')->default('not_started')->after('notes')->index();
            $table->string('type')->nullable()->after('status');
        });

        // Tasks already marked done belong in the Completed column.
        DB::table('tasks')->whereNotNull('completed_at')->update(['status' => 'completed']);

        // The priority vocabulary gained "critical" and renamed "normal" to "medium".
        DB::table('tasks')->where('priority', 'normal')->update(['priority' => 'medium']);
    }

    public function down(): void
    {
        DB::table('tasks')->where('priority', 'medium')->update(['priority' => 'normal']);
        DB::table('tasks')->where('priority', 'critical')->update(['priority' => 'high']);

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['status', 'type']);
        });
    }
};
