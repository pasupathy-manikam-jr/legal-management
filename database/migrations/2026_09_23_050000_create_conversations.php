<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /**
         * One thread per firm-member ↔ contact pair. The contact is either another
         * staff member or a client, so it is stored as a small polymorphic pair
         * rather than two nullable foreign keys.
         */
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('contact_type'); // user, client
            $table->unsignedBigInteger('contact_id');
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
            $table->unique(['owner_id', 'contact_type', 'contact_id']);
            $table->index(['owner_id', 'last_message_at']);
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->foreignId('conversation_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->string('sender')->default('firm')->after('user_id'); // firm, contact
            $table->timestamp('read_at')->nullable()->after('occurred_at');
            $table->string('subject')->nullable()->change();
        });

        // Fold the existing communication log into threads so no history is lost.
        $owner = DB::table('users')->orderBy('id')->value('id');

        if (! $owner) {
            return;
        }

        foreach (DB::table('messages')->select('client_id')->distinct()->pluck('client_id') as $clientId) {
            $conversationId = DB::table('conversations')->insertGetId([
                'owner_id' => $owner,
                'contact_type' => 'client',
                'contact_id' => $clientId,
                'last_message_at' => DB::table('messages')->where('client_id', $clientId)->max('occurred_at'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('messages')->where('client_id', $clientId)->update(['conversation_id' => $conversationId]);
        }

        // An inbound log entry came from the contact; everything else went out from the firm.
        DB::table('messages')->where('direction', 'inbound')->update(['sender' => 'contact']);
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('conversation_id');
            $table->dropColumn(['sender', 'read_at']);
        });

        Schema::dropIfExists('conversations');
    }
};
