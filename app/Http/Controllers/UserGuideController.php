<?php

namespace App\Http\Controllers;

use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The in-app user guide, written in resources/docs/user-guide.md. It is our own
 * file, but any raw HTML in it is still stripped rather than trusted.
 */
class UserGuideController extends Controller
{
    public function __invoke(): Response
    {
        $html = Str::markdown(file_get_contents(resource_path('docs/user-guide.md')), [
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
        ]);

        /** @var array<int, array{id: string, title: string}> $sections */
        $sections = [];

        // Give each section heading an anchor so the contents list can jump to it.
        $html = preg_replace_callback('/<h([23])>(.*?)<\/h\1>/', function (array $match) use (&$sections): string {
            $title = html_entity_decode(strip_tags($match[2]));
            $id = Str::slug($title);

            if ($match[1] === '2') {
                $sections[] = ['id' => $id, 'title' => $title];
            }

            return "<h{$match[1]} id=\"{$id}\">{$match[2]}</h{$match[1]}>";
        }, $html);

        return Inertia::render('user-guide', [
            'html' => $html,
            'sections' => $sections,
        ]);
    }
}
