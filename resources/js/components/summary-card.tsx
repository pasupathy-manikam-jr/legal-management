import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type Tone = 'gray' | 'blue' | 'amber' | 'red' | 'emerald' | 'green' | 'purple' | 'indigo';

const WEDGE: Record<Tone, string> = {
    gray: 'bg-gray-100 dark:bg-gray-700/40',
    blue: 'bg-blue-50 dark:bg-blue-900/30',
    amber: 'bg-amber-50 dark:bg-amber-900/30',
    red: 'bg-red-50 dark:bg-red-900/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30',
    green: 'bg-green-50 dark:bg-green-900/30',
    purple: 'bg-purple-50 dark:bg-purple-900/30',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30',
};

const ICON: Record<Tone, string> = {
    gray: 'text-gray-600 dark:text-gray-300',
    blue: 'text-blue-600 dark:text-blue-300',
    amber: 'text-amber-600 dark:text-amber-300',
    red: 'text-red-600 dark:text-red-300',
    emerald: 'text-emerald-600 dark:text-emerald-300',
    green: 'text-green-500 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-300',
    indigo: 'text-indigo-600 dark:text-indigo-300',
};

/** KPI tile with the quarter-circle wedge in the top-right corner. */
export function SummaryCard({
    label,
    value,
    icon: Icon,
    tone = 'gray',
    mono = true,
}: {
    label: string;
    value: string | number;
    icon: LucideIcon;
    tone?: Tone;
    /** Money lines up better in mono; percentages and durations read better without it. */
    mono?: boolean;
}) {
    return (
        <div className="relative overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className={cn('absolute top-0 right-0 size-20 rounded-bl-full', WEDGE[tone])} />
            <div className="relative flex items-start justify-between p-4">
                <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">{label}</p>
                    <p className={cn('text-2xl font-bold tabular-nums', mono && 'font-mono')}>{value}</p>
                </div>
                <div className={cn('relative z-10 mt-0.5 rounded-xl p-2.5', WEDGE[tone])}>
                    <Icon className={cn('size-5', ICON[tone])} />
                </div>
            </div>
        </div>
    );
}
