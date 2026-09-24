<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** The register's own statuses, and what the old ones become. */
    private const MOVED = ['open' => 'identified', 'mitigating' => 'mitigated', 'accepted' => 'monitored'];

    public function up(): void
    {
        Schema::table('risk_assessments', function (Blueprint $table) {
            $table->date('identified_on')->nullable()->after('impact');
        });

        DB::table('risk_assessments')->update(['identified_on' => DB::raw('date(created_at)')]);

        foreach (self::MOVED as $old => $new) {
            DB::table('risk_assessments')->where('status', $old)->update(['status' => $new]);
        }
    }

    public function down(): void
    {
        foreach (self::MOVED as $old => $new) {
            DB::table('risk_assessments')->where('status', $new)->update(['status' => $old]);
        }

        Schema::table('risk_assessments', function (Blueprint $table) {
            $table->dropColumn('identified_on');
        });
    }
};
