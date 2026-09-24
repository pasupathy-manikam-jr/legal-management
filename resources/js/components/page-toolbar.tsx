import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Filter, RefreshCcw } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

export function PageToolbar({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h1 className="text-xl font-semibold">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">{children}</div>
        </div>
    );
}

export function FilterTabs({
    value,
    options,
    onSelect,
}: {
    value: string;
    options: { value: string; label: string; count?: number }[];
    onSelect: (v: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    onClick={() => onSelect(o.value)}
                    className={
                        value === o.value
                            ? 'rounded-md bg-background px-3 py-1.5 text-xs font-medium shadow-sm'
                            : 'rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground'
                    }
                >
                    {o.label}
                    {o.count !== undefined && <span className="ml-1.5 tabular-nums opacity-60">{o.count}</span>}
                </button>
            ))}
        </div>
    );
}

/** Underlined tab strip with a count on each tab, used above the list tables. */
export function CountTabs({
    value,
    options,
    onSelect,
}: {
    value: string;
    options: { value: string; label: string; icon?: ComponentType<{ className?: string }>; count: number }[];
    onSelect: (v: string) => void;
}) {
    return (
        <div className="border-t px-3">
            <div className="flex gap-0 overflow-x-auto">
                {options.map((o) => {
                    const active = value === o.value;

                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => onSelect(o.value)}
                            className={cn(
                                'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                                active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground',
                            )}
                        >
                            {o.icon && <o.icon className="size-4" />}
                            {o.label}
                            <span
                                className={cn(
                                    'ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                                )}
                            >
                                {o.count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * The right-hand end of a filter bar: a clear-all that only appears once something
 * is filtered, and the row's own label.
 */
export function FilterActions({ active, onClear }: { active: boolean; onClear: () => void }) {
    return (
        <div className="flex shrink-0 items-center gap-2">
            {active && (
                <Button variant="ghost" className="h-9 text-muted-foreground hover:bg-transparent hover:text-muted-foreground" onClick={onClear}>
                    <RefreshCcw className="size-4" /> Clear Filters
                </Button>
            )}
            <span className="inline-flex h-8 cursor-default items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-sm font-medium shadow-xs">
                <Filter className="size-4" /> Filters
            </span>
        </div>
    );
}
