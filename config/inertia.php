<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Testing
    |--------------------------------------------------------------------------
    |
    | Pages live in resources/js/pages (lowercase). The package default is
    | js/Pages, which only resolves on case-insensitive filesystems like macOS.
    |
    */

    'testing' => [
        'ensure_pages_exist' => true,
        'page_paths' => [resource_path('js/pages')],
        'page_extensions' => ['js', 'jsx', 'svelte', 'ts', 'tsx', 'vue'],
    ],

];
