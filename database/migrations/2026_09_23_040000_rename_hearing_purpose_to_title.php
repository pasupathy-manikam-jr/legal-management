<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A hearing has both a title ("Initial Hearing") and a type ("Status Conference").
        Schema::table('hearings', function (Blueprint $table) {
            $table->renameColumn('purpose', 'title');
        });
    }

    public function down(): void
    {
        Schema::table('hearings', function (Blueprint $table) {
            $table->renameColumn('title', 'purpose');
        });
    }
};
