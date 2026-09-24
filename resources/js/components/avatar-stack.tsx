import { cn } from '@/lib/utils';

/** Deterministic tint per person, so the same name always gets the same colour. */
const TINTS = [
    'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
    'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200',
    'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
    'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
];

export function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

export function tintFor(name: string): string {
    let hash = 0;
    for (const char of name) hash = (hash + char.charCodeAt(0)) % TINTS.length;
    return TINTS[hash];
}

export function InitialsAvatar({ name, className }: { name: string; className?: string }) {
    return (
        <span
            title={name}
            className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold', tintFor(name), className)}
        >
            {initials(name)}
        </span>
    );
}

/** Overlapping team avatars with a +N overflow chip. */
export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
    if (names.length === 0) {
        return <span className="text-sm text-muted-foreground">—</span>;
    }

    const shown = names.slice(0, max);
    const extra = names.length - shown.length;

    return (
        <div className="flex items-center">
            <div className="flex -space-x-2">
                {shown.map((name) => (
                    <InitialsAvatar key={name} name={name} className="size-7 ring-2 ring-card" />
                ))}
                {extra > 0 && (
                    <span
                        title={names.slice(max).join(', ')}
                        className="ml-1 flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card"
                    >
                        +{extra}
                    </span>
                )}
            </div>
        </div>
    );
}
