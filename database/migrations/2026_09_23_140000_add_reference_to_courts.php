<?php

use App\Models\Court;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courts', function (Blueprint $table) {
            $table->string('reference')->nullable()->unique()->after('id');
            $table->string('jurisdiction')->nullable()->after('bench');
        });

        Court::whereNull('reference')->get()->each(fn (Court $court) => $court->update([
            'reference' => sprintf('CT%06d', $court->id),
        ]));
    }

    public function down(): void
    {
        Schema::table('courts', function (Blueprint $table) {
            $table->dropColumn(['reference', 'jurisdiction']);
        });
    }
};
