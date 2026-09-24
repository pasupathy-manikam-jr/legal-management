import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Hex → the soft fill + inset ring treatment used across the tables. */
function tint(hex: string) {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);

    return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.125)`,
        color: `rgb(${r}, ${g}, ${b})`,
        boxShadow: `inset 0 0 0 1px rgba(${r}, ${g}, ${b}, 0.2)`,
    };
}

/** Colour-driven pill — used where the colour comes from data (case types, statuses). */
export function TonePill({ color, children, className }: { color: string; children: ReactNode; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium', className)} style={tint(color)}>
            {children}
        </span>
    );
}

const RING: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-400/20',
    high: 'bg-orange-50 text-orange-700 ring-orange-500/20 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-400/20',
    medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-950 dark:text-yellow-300 dark:ring-yellow-400/20',
    normal: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-950 dark:text-yellow-300 dark:ring-yellow-400/20',
    low: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950 dark:text-green-300 dark:ring-green-400/20',
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/20',
    inactive: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-400/20',
    cadence: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-950 dark:text-purple-300 dark:ring-purple-400/20',
    completed: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-400/20',

    // Invoice states. Overdue is derived, not stored; cancelled is the stored "void".
    draft: 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-400/20',
    sent: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-400/20',
    paid: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950 dark:text-green-300 dark:ring-green-400/20',
    overdue: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-400/20',
    void: 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-400/20',

    // Payment methods
    cash: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-400/20',
    cheque: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950 dark:text-green-300 dark:ring-green-400/20',
    card: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-400/20',
    bank: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-400/20',
    online: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-400/20',
};

/** Fixed-vocabulary pill — priority and active state. */
export function RingPill({ value, label, className }: { value: string; label?: string; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset',
                RING[value] ?? RING.low,
                className,
            )}
        >
            {label ?? value}
        </span>
    );
}
