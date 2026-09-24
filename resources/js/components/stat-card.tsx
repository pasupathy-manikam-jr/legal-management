import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    className,
}: {
    label: string;
    value: string | number;
    hint?: string;
    icon?: LucideIcon;
    className?: string;
}) {
    return (
        <Card className={cn('gap-0 p-4', className)}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
                {Icon && <Icon className="size-4 text-muted-foreground" />}
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </Card>
    );
}
