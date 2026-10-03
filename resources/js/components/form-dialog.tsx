import { Dropdown } from '@/components/dropdown';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2, Plus, SquarePen } from 'lucide-react';
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
    description,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    onSubmit: (e: FormEvent) => void;
    processing: boolean;
    submitLabel?: string;
    children: ReactNode;
    wide?: boolean;
    /** One line under the title; defaults to what the form is for. */
    description?: string;
}) {
    const editing = /^edit\b/i.test(title);
    const Icon = editing ? SquarePen : Plus;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Header and footer stay put; only the fields scroll. */}
            <DialogContent className={cn('flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0', wide && 'sm:max-w-2xl')}>
                <DialogHeader className="m-0 flex-row items-center gap-3 space-y-0 rounded-none">
                    <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                        <DialogTitle className="text-base">{title}</DialogTitle>
                        <DialogDescription className="text-xs">
                            {description ?? (editing ? 'Update the details below, then save.' : 'Fill in the details below, then save.')}
                        </DialogDescription>
                    </div>
                </DialogHeader>
                <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className={cn('grid gap-4 overflow-y-auto px-6 py-5', wide && 'sm:grid-cols-2')}>{children}</div>
                    <DialogFooter className="bg-muted/40 gap-2 border-t px-6 py-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing} className="min-w-24">
                            {processing && <Loader2 className="size-4 animate-spin" />}
                            {submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/** One labelled field + its validation message. */
export function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <Label className="text-muted-foreground text-xs font-medium">{label}</Label>
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
            <Dropdown
                value={value}
                onChange={onChange}
                options={options}
                placeholder={placeholder || undefined}
                aria-label={label}
                className="h-10"
            />
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
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            />
        </Field>
    );
}
