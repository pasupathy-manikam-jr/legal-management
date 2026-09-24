import { cn } from '@/lib/utils';

/** Minimal column chart — a div per bar. A charting library would be more code than this. */
export function BarChart({
    series,
    format,
    className,
}: {
    series: { label: string; value: number }[];
    format: (value: number) => string;
    className?: string;
}) {
    const peak = Math.max(...series.map((s) => s.value), 1);

    return (
        <div className={cn('flex h-44 items-end gap-1.5', className)}>
            {series.map((point, i) => (
                <div key={`${point.label}-${i}`} className="group flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        {format(point.value)}
                    </span>
                    <div
                        className="w-full rounded-t bg-sky-500/80 transition-colors group-hover:bg-sky-500"
                        style={{ height: `${Math.max((point.value / peak) * 100, point.value > 0 ? 3 : 1)}%` }}
                        title={`${point.label}: ${format(point.value)}`}
                    />
                    <span className="text-[10px] text-muted-foreground">{point.label}</span>
                </div>
            ))}
        </div>
    );
}
