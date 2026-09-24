import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * Radix Select rejects an empty-string value, but "nothing chosen" is how every
 * filter ("All Clients") and optional field ("Unassigned") is stored. It travels
 * through the component as this sentinel and comes back out as ''.
 */
const NONE = '__none__';

export interface DropdownOption {
    value: string | number;
    label: string | number;
}

/** Every dropdown in the app: the shadcn Select, with "none" handled once. */
export function Dropdown({
    value,
    onChange,
    options,
    placeholder,
    className,
    capitalize,
    id,
    'aria-label': ariaLabel,
}: {
    value: string | number | null | undefined;
    onChange: (value: string) => void;
    options: DropdownOption[];
    /** The "nothing chosen" entry — "All Clients", "Unassigned". Omit when a choice is required. */
    placeholder?: string;
    className?: string;
    capitalize?: boolean;
    id?: string;
    'aria-label'?: string;
}) {
    const current = value === null || value === undefined || value === '' ? NONE : String(value);

    return (
        <Select value={current} onValueChange={(next) => onChange(next === NONE ? '' : next)}>
            <SelectTrigger id={id} aria-label={ariaLabel} className={cn('h-9', capitalize && 'capitalize', className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {placeholder !== undefined && <SelectItem value={NONE}>{placeholder}</SelectItem>}
                {options.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)} className={cn(capitalize && 'capitalize')}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
