import { cn } from '@/lib/utils';

const TONES: Record<string, string> = {
    open: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    closed: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    in_progress: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    postponed: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    high: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    normal: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    low: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    draft: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    void: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    inactive: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    expiring: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    expired: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    suspended: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    lapsed: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                TONES[value] ?? TONES.low,
                className,
            )}
        >
            {value.replace('_', ' ')}
        </span>
    );
}
