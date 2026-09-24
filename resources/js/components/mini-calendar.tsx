import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Six weeks from gridStart — covers every month layout. */
function buildGrid(gridStart: string): string[] {
    const start = new Date(gridStart + 'T00:00:00');
    return Array.from({ length: 42 }, (_, i) => {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        return day.toISOString().slice(0, 10);
    });
}

export function MiniCalendar({
    month,
    monthLabel,
    gridStart,
    selected,
    today,
    marked,
    onSelect,
    onMonth,
    prevMonth,
    nextMonth,
}: {
    month: string;
    monthLabel: string;
    gridStart: string;
    selected: string;
    today: string;
    marked: string[];
    onSelect: (date: string) => void;
    onMonth: (month: string) => void;
    prevMonth: string;
    nextMonth: string;
}) {
    const cells = buildGrid(gridStart);
    const markedSet = new Set(marked);
    const currentMonth = month.slice(0, 7);

    return (
        <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <button onClick={() => onMonth(prevMonth)} className="hover:bg-accent cursor-pointer rounded p-1.5" aria-label="Previous month">
                    <ChevronLeft className="text-muted-foreground size-4" />
                </button>
                <span className="text-sm font-semibold">{monthLabel}</span>
                <button onClick={() => onMonth(nextMonth)} className="hover:bg-accent cursor-pointer rounded p-1.5" aria-label="Next month">
                    <ChevronRight className="text-muted-foreground size-4" />
                </button>
            </div>

            <div className="grid grid-cols-7 border-b px-4 py-1 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div key={d} className="text-muted-foreground py-1 text-xs font-semibold">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 p-4 text-center">
                {cells.map((date) => {
                    if (!date.startsWith(currentMonth)) {
                        return <div key={date} className="size-8" />;
                    }

                    const isSelected = date === selected;
                    const isToday = date === today;

                    return (
                        <button
                            key={date}
                            onClick={() => onSelect(date)}
                            className={cn(
                                'relative mx-auto flex size-8 cursor-pointer items-center justify-center rounded-full text-xs font-medium transition-colors',
                                isSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : cn('hover:bg-accent', isToday ? 'text-primary ring-primary/40 ring-1' : 'text-foreground'),
                            )}
                        >
                            {Number(date.slice(8, 10))}
                            {markedSet.has(date) && !isSelected && (
                                <span className="bg-primary absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
