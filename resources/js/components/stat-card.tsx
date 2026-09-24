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
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</span>
                {Icon && <Icon className="text-muted-foreground size-4" />}
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
            {hint && <div className="text-muted-foreground mt-1 text-xs">{hint}</div>}
        </Card>
    );
}
