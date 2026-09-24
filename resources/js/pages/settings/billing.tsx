import { Field, TextField } from '@/components/form-dialog';
import { PageToolbar } from '@/components/page-toolbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Billing Setup', href: '/settings/billing' }];

export default function BillingSettings({ values }: { values: Record<string, string> }) {
    const form = useForm({
        firm_name: values.firm_name ?? '',
        invoice_prefix: values.invoice_prefix ?? 'INV',
        payment_terms_days: values.payment_terms_days ?? '30',
        default_tax_percent: values.default_tax_percent ?? '0',
        default_hourly_rate: values.default_hourly_rate ?? '250',
        currency: values.currency ?? 'USD',
        invoice_footer: values.invoice_footer ?? '',
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Billing Setup" />
            <div className="flex flex-col gap-4 p-4">
                <PageToolbar title="Billing Setup" subtitle="Defaults applied to new invoices and rates" />

                <Card className="max-w-3xl p-6">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.put('/settings/billing', { preserveScroll: true });
                        }}
                        className="flex flex-col gap-5"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField label="Firm name" value={form.data.firm_name} onChange={(v) => form.setData('firm_name', v)} error={form.errors.firm_name} />
                            <TextField
                                label="Invoice prefix"
                                value={form.data.invoice_prefix}
                                onChange={(v) => form.setData('invoice_prefix', v.toUpperCase())}
                                error={form.errors.invoice_prefix}
                            />
                            <TextField
                                label="Payment terms (days)"
                                type="number"
                                value={form.data.payment_terms_days}
                                onChange={(v) => form.setData('payment_terms_days', v)}
                                error={form.errors.payment_terms_days}
                            />
                            <TextField
                                label="Default tax %"
                                type="number"
                                step="0.01"
                                value={form.data.default_tax_percent}
                                onChange={(v) => form.setData('default_tax_percent', v)}
                                error={form.errors.default_tax_percent}
                            />
                            <TextField
                                label="Default hourly rate"
                                type="number"
                                step="0.01"
                                value={form.data.default_hourly_rate}
                                onChange={(v) => form.setData('default_hourly_rate', v)}
                                error={form.errors.default_hourly_rate}
                            />
                            <TextField
                                label="Currency code"
                                value={form.data.currency}
                                onChange={(v) => form.setData('currency', v.toUpperCase())}
                                error={form.errors.currency}
                            />
                        </div>

                        <Field label="Invoice footer" error={form.errors.invoice_footer}>
                            <textarea
                                rows={3}
                                value={form.data.invoice_footer}
                                onChange={(e) => form.setData('invoice_footer', e.target.value)}
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                            />
                        </Field>

                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={form.processing}>
                                Save settings
                            </Button>
                            {form.recentlySuccessful && <span className="text-sm text-emerald-600">Saved.</span>}
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
