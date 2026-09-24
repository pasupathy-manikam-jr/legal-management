<?php

namespace App\Http\Controllers;

use App\Models\Medium;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class MediaController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['per_page' => ['nullable', 'integer', 'in:12,24,48']]);

        $filters = $request->only('search');
        $perPage = (int) ($request->input('per_page') ?: 12);

        // Rebuilt per use so the totals describe the search, not the page.
        $matching = fn () => Medium::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where('title', 'like', "%$v%"));

        return Inertia::render('media/index', [
            'media' => $matching()
                ->with('uploader:id,name')
                ->latest()
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (Medium $medium) => [
                    'id' => $medium->id,
                    'title' => $medium->title,
                    'folder' => $medium->folder,
                    'extension' => strtoupper(pathinfo($medium->title, PATHINFO_EXTENSION)) ?: 'FILE',
                    'is_image' => str_starts_with((string) $medium->mime, 'image/'),
                    'size' => $medium->size,
                    'created_at' => $medium->created_at?->toDateString(),
                    'uploader' => $medium->uploader?->name,
                ]),
            'filters' => $filters,
            'perPage' => $perPage,
            'totals' => [
                'files' => $matching()->count(),
                'bytes' => (int) $matching()->sum('size'),
                'images' => $matching()->where('mime', 'like', 'image/%')->count(),
            ],
            'folders' => ['branding', 'templates', 'general'],
        ]);
    }

    /**
     * The thumbnail source: shown in the browser rather than saved. The content type
     * is read off the stored file, never off what the uploader claimed.
     */
    public function preview(Medium $medium)
    {
        abort_unless(Storage::disk('local')->exists($medium->path), 404);

        return Storage::disk('local')->response($medium->path, $medium->title, ['X-Content-Type-Options' => 'nosniff']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'folder' => ['required', 'in:branding,templates,general'],
            'file' => ['required', 'file', 'max:10240', 'mimes:png,jpg,jpeg,gif,webp,svg,pdf,doc,docx'],
        ]);

        $file = $request->file('file');

        Medium::create([
            'uploaded_by' => $request->user()->id,
            'title' => $data['title'],
            'folder' => $data['folder'],
            'path' => $file->store('media/'.$data['folder'], 'local'),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]);

        return back()->with('success', 'Uploaded.');
    }

    /** Served through the app, like case documents — nothing lands in a public directory. */
    public function download(Medium $medium)
    {
        abort_unless(Storage::disk('local')->exists($medium->path), 404);

        return Storage::disk('local')->download($medium->path, $medium->title);
    }

    public function destroy(Medium $medium)
    {
        Storage::disk('local')->delete($medium->path);
        $medium->delete();

        return back()->with('success', 'Removed.');
    }
}
