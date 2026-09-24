import { Dropdown } from '@/components/dropdown';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FormEvent, ReactNode } from 'react';

export function FormDialog({
    open,
    onOpenChange,
    title,
    onSubmit,
    processing,
    submitLabel = 'Save',
    children,
    wide,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    onSubmit: (e: FormEvent) => void;
    processing: boolean;
    submitLabel?: string;
    children: ReactNode;
    wide?: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn('max-h-[90vh] overflow-y-auto', wide && 'sm:max-w-2xl')}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <div className={cn('grid gap-4', wide && 'sm:grid-cols-2')}>{children}</div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/** One labelled field + its validation message. */
export function Field({
    label,
    error,
    children,
    className,
}: {
    label: string;
    error?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <Label className="text-xs">{label}</Label>
            {children}
            {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
    );
}

export function TextField({
    label,
    value,
    onChange,
    error,
    type = 'text',
    className,
    ...rest
}: {
    label: string;
    value: string | number;
    onChange: (v: string) => void;
    error?: string;
    type?: string;
    className?: string;
} & Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'>) {
    return (
        <Field label={label} error={error} className={className}>
            <Input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
        </Field>
    );
}

/** Native select — a styled dropdown is not worth a dependency here. */
export function SelectField({
    label,
    value,
    onChange,
    options,
    error,
    placeholder,
    className,
}: {
    label: string;
    value: string | number | null;
    onChange: (v: string) => void;
    options: { value: string | number; label: string }[];
    error?: string;
    placeholder?: string;
    className?: string;
}) {
    return (
        <Field label={label} error={error} className={className}>
            <Dropdown value={value} onChange={onChange} options={options} placeholder={placeholder || undefined} aria-label={label} />
        </Field>
    );
}

export function TextareaField({
    label,
    value,
    onChange,
    error,
    rows = 3,
    className,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    rows?: number;
    className?: string;
    placeholder?: string;
}) {
    return (
        <Field label={label} error={error} className={className}>
            <textarea
                rows={rows}
                placeholder={placeholder}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
            />
        </Field>
    );
}
