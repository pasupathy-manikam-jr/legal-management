<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The document register is kept by client: a file belongs to a client, and only
 * sometimes to one of their cases. Documents also carry a type from Firm Setup
 * and can be archived without being deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->string('type')->nullable()->after('mime');
            $table->timestamp('archived_at')->nullable()->after('confidentiality');
        });

        // A file filed against a case belongs to that case's client.
        DB::table('documents')->whereNotNull('matter_id')->update([
            'client_id' => DB::raw('(select client_id from matters where matters.id = documents.matter_id)'),
        ]);

        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('matter_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['client_id']);
            $table->dropColumn(['client_id', 'type', 'archived_at']);
        });
    }
};
