import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'User Guide', href: '/user-guide' }];

/** Typography for the rendered guide, from the app's own theme tokens so dark mode follows. */
const ARTICLE = [
    'text-sm leading-6 text-foreground',
    '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-20 [&_h2]:border-b [&_h2]:pb-2 [&_h2]:text-lg [&_h2]:font-semibold first:[&_h2]:mt-0',
    '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:scroll-mt-20 [&_h3]:text-base [&_h3]:font-semibold',
    '[&_p]:my-3 [&_strong]:font-semibold',
    '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6',
    '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left',
    '[&_th]:bg-muted [&_th]:border [&_th]:px-3 [&_th]:py-2 [&_th]:font-medium [&_td]:border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
    '[&_a]:text-primary [&_a]:underline',
].join(' ');

export default function UserGuide({ html, sections }: { html: string; sections: { id: string; title: string }[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Guide" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div>
                    <h1 className="text-xl font-semibold">User Guide</h1>
                    <p className="text-muted-foreground text-xs">How to use each part of Advocate, in the order of the sidebar.</p>
                </div>

                <div className="flex items-start gap-6">
                    <nav aria-label="Contents" className="bg-card sticky top-4 hidden w-56 shrink-0 rounded-xl border p-4 lg:block">
                        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">Contents</p>
                        <ul className="space-y-1 text-sm">
                            {sections.map((section) => (
                                <li key={section.id}>
                                    <a
                                        href={`#${section.id}`}
                                        className="text-muted-foreground hover:text-foreground hover:bg-muted block rounded px-2 py-1"
                                    >
                                        {section.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Rendered server-side from our own Markdown file, with raw HTML stripped. */}
                    <article
                        className={`bg-card min-w-0 flex-1 rounded-xl border p-6 lg:p-8 ${ARTICLE}`}
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
