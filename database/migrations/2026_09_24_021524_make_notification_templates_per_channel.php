<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One event can now be announced on several channels — an email, a Slack post
 * and a text message each carry their own wording. The key is unique per channel,
 * and only email has a subject line.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notification_templates', function (Blueprint $table) {
            $table->dropUnique(['key']);
            $table->unique(['key', 'channel']);
            $table->string('subject')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('notification_templates', function (Blueprint $table) {
            $table->dropUnique(['key', 'channel']);
            $table->unique('key');
            $table->string('subject')->nullable(false)->change();
        });
    }
};
