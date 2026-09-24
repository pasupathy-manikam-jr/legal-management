import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import {
    defineConfig
} from 'vite';
import tailwindcss from "@tailwindcss/vite";

/**
 * Serves the app from a subfolder (staging runs it at /legal-management). The pages
 * link with root-relative literals like '/clients' and `/documents/${id}`, so when
 * the app doesn't sit at the domain root those need the folder in front of them.
 * Set APP_PATH_PREFIX at build time (APP_PATH_PREFIX=legal-management npm run build);
 * unset, this does nothing.
 *
 * ponytail: rewrites every string literal in resources/js that starts with "/" plus
 * a letter — today that is only app routes. If a non-URL string ever starts that
 * way, switch these literals to Ziggy's route() instead.
 */
function basePath() {
    const prefix = (process.env.APP_PATH_PREFIX ?? '').replace(/^\/|\/$/g, '');

    return {
        name: 'advocate:base-path',
        enforce: 'pre',
        transform(code, id) {
            if (prefix === '' || !/resources[\\/]js[\\/].*\.tsx?$/.test(id)) {
                return null;
            }

            // The lookahead keeps an already prefixed URL from gaining a second.
            return code.replace(new RegExp(`(['"\`])/(?!${prefix}[/'"\`?])(?=[a-z])`, 'g'), `$1/${prefix}/`);
        },
    };
}

export default defineConfig({
    plugins: [
        basePath(),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
});
