<?php

use App\Models\Judge;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('judges', function (Blueprint $table) {
            $table->string('reference')->nullable()->unique()->after('id');
        });

        Judge::whereNull('reference')->get()->each(fn (Judge $judge) => $judge->update([
            'reference' => sprintf('JG%06d', $judge->id),
        ]));
    }

    public function down(): void
    {
        Schema::table('judges', function (Blueprint $table) {
            $table->dropColumn('reference');
        });
    }
};
