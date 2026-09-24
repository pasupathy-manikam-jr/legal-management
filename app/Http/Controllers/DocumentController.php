<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\Matter;
use App\Models\Setting;
use App\Models\Taxonomy;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * The firm's document register. Files belong to a client and optionally to one
 * of their cases; the case screen uploads through the same store.
 */
class DocumentController extends Controller
{
    /** Case files only: no archives or executables, 20 MB ceiling. */
    private const FILE_RULES = ['file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg,txt,rtf,odt'];

    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(['active', 'archived'])],
            'client' => ['nullable', 'exists:clients,id'],
            'sort' => ['nullable', 'in:title,created_at'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $filters = $request->only('search', 'client', 'type', 'status');
        $perPage = (int) ($request->input('per_page') ?: 10);
        $sort = $request->string('sort')->toString() ?: 'created_at';
        $direction = $request->string('direction')->toString() ?: 'desc';

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => Document::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%$v%")
                ->orWhere('type', 'like', "%$v%")
                ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%$v%")->orWhere('email', 'like', "%$v%"))
                ->orWhereHas('matter', fn ($m) => $m->where('reference', 'like', "%$v%")->orWhere('title', 'like', "%$v%"))))
            ->when($filters['client'] ?? null, fn ($q, $v) => $q->where('client_id', $v))
            ->when($filters['type'] ?? null, fn ($q, $v) => $q->where('type', $v));

        return Inertia::render('documents/index', [
            'documents' => $matching()
                ->when(($filters['status'] ?? null) === 'active', fn ($q) => $q->whereNull('archived_at'))
                ->when(($filters['status'] ?? null) === 'archived', fn ($q) => $q->whereNotNull('archived_at'))
                ->with('client:id,name,email', 'matter:id,reference', 'uploader:id,name')
                ->orderBy($sort, $direction)
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (Document $document) => [
                    'id' => $document->id,
                    'title' => $document->title,
                    'type' => $document->type,
                    'stage' => $document->stage,
                    'confidentiality' => $document->confidentiality,
                    'size' => $document->size,
                    'archived' => $document->archived_at !== null,
                    'uploaded_on' => $document->created_at?->toDateString(),
                    'uploader' => $document->uploader?->name,
                    'client_id' => $document->client_id,
                    'client' => $document->client?->name,
                    'client_email' => $document->client?->email,
                    'matter_id' => $document->matter_id,
                    'matter' => $document->matter?->reference,
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'sort' => ['column' => $sort, 'direction' => $direction],
            'counts' => [
                'all' => $matching()->count(),
                'active' => $matching()->whereNull('archived_at')->count(),
                'archived' => $matching()->whereNotNull('archived_at')->count(),
            ],
            'typeColors' => Taxonomy::kind('document_type')->pluck('color', 'name'),
            'options' => [
                'clients' => Client::orderBy('name')->get(['id', 'name']),
                'matters' => Matter::orderBy('reference')->get(['id', 'client_id', 'reference', 'title']),
                'types' => Taxonomy::names('document_type'),
            ],
        ]);
    }

    /**
     * The firm's whole document library, drawn as folders and grouped by how far
     * each document has got rather than by which client it belongs to.
     */
    public function library(Request $request)
    {
        $request->validate([
            'stage' => ['nullable', Rule::in(Document::STATES)],
            'level' => ['nullable', Rule::in(Document::LEVELS)],
            'per_page' => ['nullable', 'integer', 'in:24,48,96'],
        ]);

        $filters = $request->only('search', 'category', 'level', 'stage');
        $perPage = (int) ($request->input('per_page') ?: 24);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => Document::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%$v%")
                ->orWhere('type', 'like', "%$v%")))
            ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('type', $v))
            ->when($filters['level'] ?? null, fn ($q, $v) => $q->where('confidentiality', $v));

        $stage = $filters['stage'] ?? null;
        $counts = ['all' => $matching()->count(), 'archived' => $matching()->whereNotNull('archived_at')->count()];

        foreach (Document::STAGES as $value) {
            // An archived document is counted once, on the Archived tab.
            $counts[$value] = $matching()->whereNull('archived_at')->where('stage', $value)->count();
        }

        return Inertia::render('documents/library', [
            'documents' => $matching()
                ->when($stage === 'archived', fn ($q) => $q->whereNotNull('archived_at'))
                ->when($stage && $stage !== 'archived', fn ($q) => $q->whereNull('archived_at')->where('stage', $stage))
                ->with('client:id,name')
                ->orderBy('title')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (Document $document) => [
                    'id' => $document->id,
                    'title' => $document->title,
                    'type' => $document->type,
                    'state' => $document->state(),
                    'confidentiality' => $document->confidentiality,
                    'client' => $document->client?->name,
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => $counts,
            'options' => [
                'categories' => Taxonomy::names('document_type'),
                'levels' => Document::LEVELS,
            ],
        ]);
    }

    /** A document and every version it has been — the page a library folder opens. */
    public function show(Document $document)
    {
        $document->load('client:id,name', 'matter:id,reference', 'versions.uploader:id,name');

        return Inertia::render('documents/show', [
            'document' => [
                'id' => $document->id,
                'title' => $document->title,
                'description' => $document->description,
                'tags' => $document->tags ?? [],
                'type' => $document->type,
                'typeColor' => $document->type ? Taxonomy::kind('document_type')->where('name', $document->type)->value('color') : null,
                'stage' => $document->stage,
                'state' => $document->state(),
                'confidentiality' => $document->confidentiality,
                'created_on' => $document->created_at?->toDateString(),
                // Firm work product has no client; it belongs to the firm itself.
                'owner' => $document->client?->name ?? Setting::get('firm_name'),
                'client_id' => $document->client_id,
                'matter_id' => $document->matter_id,
                'matter' => $document->matter?->reference,
            ],
            'versions' => $document->versions->map(fn (DocumentVersion $version) => [
                'id' => $version->id,
                'label' => $version->label(),
                'created_on' => $version->created_at?->toDateString(),
                'size' => $version->size,
                'mime' => $version->mime,
                'uploader' => $version->uploader?->name,
                'current' => $version->id === $document->current_version_id,
            ]),
            'options' => [
                'clients' => Client::orderBy('name')->get(['id', 'name']),
                'matters' => Matter::orderBy('reference')->get(['id', 'client_id', 'reference', 'title']),
                'types' => Taxonomy::names('document_type'),
                'stages' => Document::STAGES,
            ],
        ]);
    }

    /** "Add Version": a new file becomes current, the previous one stays in the history. */
    public function addVersion(Request $request, Document $document)
    {
        $request->validate(['file' => ['required', ...self::FILE_RULES]]);

        $stored = $this->stored($request, 'documents/'.$document->id);
        $version = $document->addVersion($stored['path'], $stored['mime'], $stored['size'], $request->user()->id);

        return back()->with('success', "Uploaded {$version->label()}.");
    }

    /** The rotate arrow on a version: make an older file the current one again. */
    public function restoreVersion(Document $document, DocumentVersion $version)
    {
        $document->makeCurrent($version);

        return back()->with('success', "{$version->label()} is now the current version.");
    }

    public function destroyVersion(Document $document, DocumentVersion $version)
    {
        // The current file is what downloads and previews serve; it cannot go.
        if ($version->id === $document->current_version_id) {
            return back()->withErrors(['version' => 'The current version cannot be deleted. Restore another version first.']);
        }

        Storage::disk('local')->delete($version->path);
        $version->delete();

        return back()->with('success', "{$version->label()} deleted.");
    }

    /** One version, shown in the browser. The content type is read off the stored file. */
    public function previewVersion(Document $document, DocumentVersion $version)
    {
        abort_unless(Storage::disk('local')->exists($version->path), 404);

        return Storage::disk('local')->response($version->path, $this->filename($document, $version), ['X-Content-Type-Options' => 'nosniff']);
    }

    public function downloadVersion(Document $document, DocumentVersion $version)
    {
        abort_unless(Storage::disk('local')->exists($version->path), 404);

        return Storage::disk('local')->download($version->path, $this->filename($document, $version));
    }

    /** "Deposition Transcript v1.1.pdf" — the title, the version and the stored file's extension. */
    private function filename(Document $document, DocumentVersion $version): string
    {
        // The file's real extension wins over any the title carries ("Brief.docx" stored as PDF).
        $extension = pathinfo($version->path, PATHINFO_EXTENSION);
        $name = pathinfo($document->title, PATHINFO_FILENAME);

        return "{$name} {$version->label()}".($extension ? ".{$extension}" : '');
    }

    /**
     * Upload from the client register (with a client) or the library (without one:
     * the firm's own work product). "Archived" may be chosen as the status up front.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'client_id' => ['nullable', 'exists:clients,id'],
            'matter_id' => ['nullable', 'exists:matters,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => ['nullable', 'string', 'max:120'],
            'stage' => ['required', Rule::in([...Document::STAGES, 'archived'])],
            'confidentiality' => ['required', Rule::in(Document::LEVELS)],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:40'],
            'file' => ['required', ...self::FILE_RULES],
        ]);

        // Archiving is its own fact; a document archived on upload keeps "final" as the stage it reached.
        $archived = $data['stage'] === 'archived';
        if ($archived) {
            $data['stage'] = 'final';
        }

        $folder = $data['client_id'] ?? null ? "clients/{$data['client_id']}" : 'library';

        Document::create(Arr::except($data, 'file') + $this->stored($request, $folder) + [
            'uploaded_by' => $request->user()->id,
            'archived_at' => $archived ? now() : null,
        ]);

        return back()->with('success', 'Document uploaded.');
    }

    /** The upload button on a case screen: the client comes from the case. */
    public function storeForMatter(Request $request, Matter $matter)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:120'],
            'stage' => ['required', Rule::in(Document::STAGES)],
            'confidentiality' => ['required', Rule::in(Document::LEVELS)],
            'file' => ['required', ...self::FILE_RULES],
        ]);

        $matter->documents()->create(Arr::except($data, 'file') + $this->stored($request, "matters/{$matter->id}") + [
            'client_id' => $matter->client_id,
            'uploaded_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Document uploaded.');
    }

    /** Details only — replacing the file means uploading a new document. */
    public function update(Request $request, Document $document)
    {
        $document->update($request->validate([
            // Firm work product has no client.
            'client_id' => ['nullable', 'exists:clients,id'],
            'matter_id' => ['nullable', 'exists:matters,id'],
            'title' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:120'],
            'stage' => ['required', Rule::in(Document::STAGES)],
            'confidentiality' => ['required', Rule::in(Document::LEVELS)],
            'description' => ['nullable', 'string', 'max:5000'],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:40'],
        ]));

        return back()->with('success', 'Document updated.');
    }

    /** Archive keeps the file and its history; only delete removes it. */
    public function toggleArchive(Document $document)
    {
        $document->update(['archived_at' => $document->archived_at ? null : now()]);

        return back()->with('success', $document->archived_at ? 'Document archived.' : 'Document restored.');
    }

    /**
     * The eye in a row: shown in the browser rather than saved. The content type
     * is read off the stored file, never off what the uploader claimed.
     */
    public function preview(Document $document)
    {
        abort_unless(Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->response($document->path, $document->title, ['X-Content-Type-Options' => 'nosniff']);
    }

    /** Served through the app, never from a public URL — case files are not world-readable. */
    public function download(Document $document)
    {
        abort_unless(Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->download($document->path, $document->title);
    }

    public function destroy(Document $document)
    {
        // Deleted from its own page, there is no page to go back to.
        $fromItsOwnPage = url()->previous() === route('documents.show', $document);

        Storage::disk('local')->delete($document->versions()->pluck('path')->push($document->path)->unique()->all());
        $document->delete();

        return ($fromItsOwnPage ? to_route('documents.library') : back())->with('success', 'Document deleted.');
    }

    /**
     * @return array{path: string, mime: string, size: int}
     */
    private function stored(Request $request, string $folder): array
    {
        $file = $request->file('file');

        return [
            'path' => $file->store($folder, 'local'),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ];
    }
}
