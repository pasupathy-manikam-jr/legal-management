<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    use HasFactory;

    /** How far a document has got. Archived is not one of these — see state(). */
    public const STAGES = ['draft', 'review', 'final'];

    /** Who may see a document, least to most guarded. */
    public const LEVELS = ['public', 'internal', 'confidential', 'restricted'];

    /** What the library's tabs offer, archiving included. */
    public const STATES = ['draft', 'review', 'final', 'archived'];

    protected $fillable = ['client_id', 'matter_id', 'uploaded_by', 'title', 'description', 'tags', 'path', 'mime', 'type', 'stage', 'size', 'confidentiality', 'archived_at', 'current_version_id'];

    protected function casts(): array
    {
        return ['archived_at' => 'datetime', 'tags' => 'array'];
    }

    /**
     * Whichever way a document is created — client register, case screen or
     * seeder — its first file becomes version 1.
     */
    protected static function booted(): void
    {
        static::created(function (Document $document) {
            $version = $document->versions()->create([
                'sequence' => 1,
                'path' => $document->path,
                'mime' => $document->mime,
                'size' => $document->size,
                'uploaded_by' => $document->uploaded_by,
            ]);

            $document->forceFill(['current_version_id' => $version->id])->saveQuietly();
        });
    }

    /** A new file becomes the current version; the old ones stay in the history. */
    public function addVersion(string $path, ?string $mime, int $size, ?int $uploadedBy): DocumentVersion
    {
        $version = $this->versions()->create([
            'sequence' => (int) $this->versions()->max('sequence') + 1,
            'path' => $path,
            'mime' => $mime,
            'size' => $size,
            'uploaded_by' => $uploadedBy,
        ]);

        $this->makeCurrent($version);

        return $version;
    }

    /** Point the document at one of its versions; downloads and previews follow. */
    public function makeCurrent(DocumentVersion $version): void
    {
        $this->update([
            'current_version_id' => $version->id,
            'path' => $version->path,
            'mime' => $version->mime,
            'size' => $version->size,
        ]);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class)->orderByDesc('sequence');
    }

    /** An archived document reads as archived whatever stage it had reached. */
    public function state(): string
    {
        return $this->archived_at ? 'archived' : $this->stage;
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function matter(): BelongsTo
    {
        return $this->belongsTo(Matter::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
