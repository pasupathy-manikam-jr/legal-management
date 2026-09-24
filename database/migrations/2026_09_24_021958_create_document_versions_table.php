<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A document keeps every file it has been, not just the latest. The document's
 * own path/mime/size stay as "the current file" so downloads and previews read
 * one place; the versions table holds the history, current one included.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            // 1, 2, 3 … shown as v1.0, v1.1, v1.2. Never reused, so deleting one leaves no clash.
            $table->unsignedInteger('sequence');
            $table->string('path');
            $table->string('mime')->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['document_id', 'sequence']);
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('current_version_id')->nullable()->after('archived_at')
                ->constrained('document_versions')->nullOnDelete();
            $table->text('description')->nullable()->after('title');
            $table->json('tags')->nullable()->after('description');
        });

        // Every existing document becomes version 1 of itself.
        foreach (DB::table('documents')->get() as $document) {
            $versionId = DB::table('document_versions')->insertGetId([
                'document_id' => $document->id,
                'sequence' => 1,
                'path' => $document->path,
                'mime' => $document->mime,
                'size' => $document->size,
                'uploaded_by' => $document->uploaded_by,
                'created_at' => $document->created_at,
                'updated_at' => $document->updated_at,
            ]);
            DB::table('documents')->where('id', $document->id)->update(['current_version_id' => $versionId]);
        }
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['current_version_id']);
            $table->dropColumn(['current_version_id', 'description', 'tags']);
        });
        Schema::dropIfExists('document_versions');
    }
};
