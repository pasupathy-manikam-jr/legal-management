import { Dropdown } from '@/components/dropdown';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';

interface PageLink {
    url: string | null;
    label: string;
    active: boolean;
}

export function DataTableFooter({
    from,
    to,
    total,
    links,
    perPage,
    onPerPage,
    sizes = [10, 25, 50, 100],
}: {
    from: number | null;
    to: number | null;
    total: number;
    links: PageLink[];
    perPage: number;
    /** Omitted where the page has no size choice; the select is then hidden. */
    onPerPage?: (value: number) => void;
    /** Page sizes offered; a card grid pages in multiples of its columns. */
    sizes?: number[];
}) {
    // Laravel's link list is [previous, ...numbers, next]; the numbers render as buttons.
    const numbered = links.slice(1, -1);
    const previous = links[0];
    const next = links[links.length - 1];

    return (
        <div className="flex flex-wrap items-center justify-center gap-3 border-t p-4 lg:justify-between">
            <div className="text-muted-foreground text-sm">
                Showing <span className="text-foreground font-medium">{from ?? 0}</span> to{' '}
                <span className="text-foreground font-medium">{to ?? 0}</span> of <span className="text-foreground font-medium">{total}</span> results
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
                {onPerPage && (
                    <>
                        <label className="text-muted-foreground text-xs font-medium" htmlFor="per-page">
                            Rows per page:
                        </label>
                        <Dropdown
                            id="per-page"
                            value={perPage}
                            onChange={(v) => onPerPage(Number(v))}
                            options={sizes.map((n) => ({ value: n, label: String(n) }))}
                            className="h-8 w-16"
                        />
                    </>
                )}

                <div className="flex flex-wrap items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        disabled={!previous?.url}
                        onClick={() => previous?.url && router.visit(previous.url)}
                    >
                        « Previous
                    </Button>
                    {numbered.map((link, i) => (
                        <Button
                            key={`${link.label}-${i}`}
                            variant={link.active ? 'default' : 'outline'}
                            size="icon"
                            className="size-8"
                            disabled={!link.url}
                            onClick={() => link.url && router.visit(link.url)}
                        >
                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                        </Button>
                    ))}
                    <Button variant="outline" size="sm" className="h-8" disabled={!next?.url} onClick={() => next?.url && router.visit(next.url)}>
                        Next »
                    </Button>
                </div>
            </div>
        </div>
    );
}
