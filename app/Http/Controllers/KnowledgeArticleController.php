<?php

namespace App\Http\Controllers;

use App\Models\KnowledgeArticle;
use App\Models\Taxonomy;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class KnowledgeArticleController extends Controller
{
    /** Where an article sits in its lifecycle. */
    public const STATUSES = ['published', 'draft', 'archived'];

    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'per_page' => ['nullable', 'integer', 'in:12,24,48,96'],
        ]);

        $filters = $request->only('status', 'search', 'category');
        $perPage = (int) ($request->input('per_page') ?: 12);

        // Rebuilt per use so the tab counts are not narrowed by the tab itself.
        $matching = fn () => KnowledgeArticle::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%$v%")
                ->orWhere('summary', 'like', "%$v%")))
            ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v));

        return Inertia::render('research/articles', [
            'articles' => $matching()
                ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
                ->with('author:id,name')
                ->latest('updated_at')
                ->paginate($perPage)
                ->withQueryString(),
            'filters' => $filters,
            'perPage' => $perPage,
            'counts' => ['all' => $matching()->count()] + $matching()
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status')
                ->all(),
            // Categories carry their Firm Setup colour, which tints the pill on each card.
            'categories' => Taxonomy::kind('research_category')->get(['name', 'color']),
            'statuses' => self::STATUSES,
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['author_id'] = $request->user()->id;
        $data['slug'] = $this->uniqueSlug($data['title']);
        $data['published_at'] = $data['status'] === 'published' ? now() : null;

        KnowledgeArticle::create($data);

        return back()->with('success', 'Article created.');
    }

    public function update(Request $request, KnowledgeArticle $article)
    {
        $data = $this->validated($request);

        // Stamp the first publish; later edits keep the original date.
        if ($data['status'] === 'published' && ! $article->published_at) {
            $data['published_at'] = now();
        }

        $article->update($data);

        return back()->with('success', 'Article updated.');
    }

    public function destroy(KnowledgeArticle $article)
    {
        $article->delete();

        return back()->with('success', 'Article deleted.');
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'article';
        $slug = $base;
        $n = 2;
        while (KnowledgeArticle::where('slug', $slug)->exists()) {
            $slug = "$base-".$n++;
        }

        return $slug;
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'summary' => ['nullable', 'string', 'max:1000'],
            'tags' => ['nullable', 'array', 'max:12'],
            'tags.*' => ['string', 'max:40'],
            'body' => ['required', 'string', 'max:100000'],
            'status' => ['required', Rule::in(self::STATUSES)],
        ]);
    }
}
