import { cn } from '@/lib/utils';
import { ChevronsUpDown } from 'lucide-react';

/** A table heading that flips the sort direction when the column is already sorted. */
export function SortableHead({
    label,
    column,
    sort,
    onSort,
    className,
}: {
    label: string;
    column: string;
    sort: { column: string; direction: string };
    onSort: (column: string) => void;
    className?: string;
}) {
    const active = sort.column === column;

    return (
        <th className={cn('text-muted-foreground px-4 py-2.5 text-left font-semibold', className)}>
            <button type="button" onClick={() => onSort(column)} className="hover:text-foreground flex cursor-pointer items-center select-none">
                {label}
                <ChevronsUpDown className={cn('ml-1 size-4', active ? 'opacity-100' : 'opacity-50')} />
            </button>
        </th>
    );
}
