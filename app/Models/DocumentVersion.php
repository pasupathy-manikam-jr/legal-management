<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentVersion extends Model
{
    protected $fillable = ['document_id', 'sequence', 'path', 'mime', 'size', 'uploaded_by'];

    /** v1.0 for the first file, v1.1 for the next, and so on. */
    public function label(): string
    {
        return 'v1.'.($this->sequence - 1);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
