import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function ListCard({
    title,
    subtitle,
    viewAll,
    children,
    className,
}: {
    title: string;
    subtitle?: string;
    viewAll?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('bg-card flex flex-col overflow-hidden rounded-2xl border', className)}>
            <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
                <div>
                    <h2 className="font-semibold">{title}</h2>
                    {subtitle && <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>}
                </div>
                {viewAll && (
                    <Link href={viewAll} className="text-primary flex shrink-0 items-center gap-0.5 text-sm font-medium hover:underline">
                        View all <ChevronRight className="size-4" />
                    </Link>
                )}
            </header>
            <div className="flex-1">{children}</div>
        </section>
    );
}

/** One row: tinted circular icon, title, muted meta, right-aligned value and pill. */
export function ListRow({
    icon: Icon,
    tone = 'emerald',
    title,
    meta,
    value,
    pill,
    pillTone,
    href,
}: {
    icon: LucideIcon;
    tone?: 'emerald' | 'rose' | 'sky' | 'amber';
    title: string;
    meta?: string;
    value?: string;
    pill?: string;
    pillTone?: string;
    href?: string;
}) {
    const chip = {
        emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
        rose: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
        sky: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
        amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
    }[tone];

    const body = (
        <div className="flex items-center gap-3 border-b px-5 py-3.5 last:border-b-0">
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', chip)}>
                <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{title}</div>
                {meta && <div className="text-muted-foreground truncate text-sm">{meta}</div>}
            </div>
            <div className="shrink-0 text-right">
                {value && <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>}
                {pill && (
                    <span
                        className={cn(
                            'mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
                            pillTone ?? 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300',
                        )}
                    >
                        {pill}
                    </span>
                )}
            </div>
        </div>
    );

    return href ? (
        <Link href={href} className="hover:bg-accent/50 block transition-colors">
            {body}
        </Link>
    ) : (
        body
    );
}

export function EmptyRow({ children }: { children: ReactNode }) {
    return <p className="text-muted-foreground px-5 py-10 text-center text-sm">{children}</p>;
}
