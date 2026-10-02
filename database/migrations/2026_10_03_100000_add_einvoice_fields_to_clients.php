<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What LHDN MyInvois needs about a buyer: their TIN, an ID to match it, and a structured address.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('tin', 20)->nullable()->after('company');
            $table->string('id_type', 10)->nullable()->after('tin');
            $table->string('id_number', 30)->nullable()->after('id_type');
            $table->string('city', 100)->nullable()->after('address');
            $table->string('postcode', 20)->nullable()->after('city');
            $table->string('state', 100)->nullable()->after('postcode');
            $table->string('country', 100)->default('Malaysia')->after('state');
        });
    }

    public function down(): void
    {
        Schema::table('clients', fn (Blueprint $table) => $table->dropColumn(['tin', 'id_type', 'id_number', 'city', 'postcode', 'state', 'country']));
    }
};
