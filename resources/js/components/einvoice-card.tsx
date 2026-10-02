import { FormDialog, TextField } from '@/components/form-dialog';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { date } from '@/lib/format';
import { router, useForm, usePage } from '@inertiajs/react';
import { Ban, ExternalLink, RefreshCw, Send } from 'lucide-react';
import { useState } from 'react';

export type EInvoiceSummary = {
    id: number;
    status: 'pending' | 'submitted' | 'valid' | 'invalid' | 'cancelled' | 'failed';
    environment: 'sandbox' | 'production';
    uuid: string | null;
    validation_url: string | null;
    qr: string | null;
    validated_at: string | null;
    cancel_until: string | null;
    errors: string[];
} | null;

const RETRYABLE = ['pending', 'invalid', 'failed'];

/**
 * LHDN MyInvois status for an issued invoice: send / retry, the validation QR (printed with the invoice),
 * and cancel within 72 hours of validation.
 */
export function EInvoiceCard({ einvoice, invoiceId, issued }: { einvoice: EInvoiceSummary; invoiceId: number; issued: boolean }) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [cancelling, setCancelling] = useState(false);
    const [sending, setSending] = useState(false);
    const cancel = useForm({ reason: '' });
    const status = einvoice?.status;
    const canSend = issued && (!status || RETRYABLE.includes(status));

    if (!einvoice && !issued) {
        return null;
    }

    return (
        <Card className="gap-0 p-4 print:border-0 print:p-0 print:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold">LHDN e-Invoice</h2>
                        {einvoice && <StatusBadge value={einvoice.status} className="print:hidden" />}
                        {einvoice?.environment === 'sandbox' && <StatusBadge value="sandbox" className="print:hidden" />}
                    </div>
                    {!einvoice && <p className="text-muted-foreground">Not sent to LHDN yet.</p>}
                    {status === 'submitted' && <p className="text-muted-foreground">Waiting for LHDN to validate. Check again in a few seconds.</p>}
                    {einvoice?.uuid && (
                        <p className="break-all">
                            <span className="text-muted-foreground">UUID: </span>
                            <span className="font-mono text-xs">{einvoice.uuid}</span>
                        </p>
                    )}
                    {einvoice?.validated_at && <p className="text-muted-foreground">Validated {date(einvoice.validated_at)}</p>}
                    {[...(einvoice?.errors ?? []), ...(errors.einvoice ? [errors.einvoice] : [])].length > 0 && (
                        <ul className="list-disc space-y-1 rounded-md border border-rose-200 bg-rose-50 py-2 ps-6 pe-3 text-xs text-rose-700 print:hidden">
                            {[...(einvoice?.errors ?? []), ...(errors.einvoice ? [errors.einvoice] : [])].map((error) => (
                                <li key={error}>{error}</li>
                            ))}
                        </ul>
                    )}
                    <div className="flex flex-wrap gap-2 print:hidden">
                        {canSend && (
                            <Button
                                size="sm"
                                disabled={sending}
                                onClick={() =>
                                    router.post(
                                        `/invoices/${invoiceId}/einvoice`,
                                        {},
                                        { preserveScroll: true, onStart: () => setSending(true), onFinish: () => setSending(false) },
                                    )
                                }
                            >
                                <Send className="size-4" /> {status ? 'Send to LHDN again' : 'Send to LHDN'}
                            </Button>
                        )}
                        {status === 'submitted' && einvoice && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.put(`/einvoices/${einvoice.id}/poll`, {}, { preserveScroll: true })}
                            >
                                <RefreshCw className="size-4" /> Check status
                            </Button>
                        )}
                        {einvoice?.validation_url && (
                            <Button size="sm" variant="outline" asChild>
                                <a href={einvoice.validation_url} target="_blank" rel="noreferrer">
                                    <ExternalLink className="size-4" /> View on MyInvois
                                </a>
                            </Button>
                        )}
                        {einvoice?.cancel_until && (
                            <Button size="sm" variant="outline" onClick={() => setCancelling(true)}>
                                <Ban className="size-4" /> Cancel e-Invoice
                            </Button>
                        )}
                    </div>
                    {einvoice?.cancel_until && (
                        <p className="text-muted-foreground text-xs print:hidden">Can be cancelled until {date(einvoice.cancel_until)}</p>
                    )}
                </div>
                {einvoice?.qr && (
                    <div className="text-center">
                        <img src={einvoice.qr} alt="LHDN validation QR code" className="size-28" />
                        <p className="text-muted-foreground mt-1 text-[10px]">Scan to verify with LHDN</p>
                    </div>
                )}
            </div>

            {einvoice && (
                <FormDialog
                    open={cancelling}
                    onOpenChange={setCancelling}
                    title="Cancel e-Invoice"
                    submitLabel="Cancel e-Invoice"
                    processing={cancel.processing}
                    onSubmit={(e) => {
                        e.preventDefault();
                        cancel.put(`/einvoices/${einvoice.id}/cancel`, { preserveScroll: true, onSuccess: () => setCancelling(false) });
                    }}
                >
                    <p className="text-muted-foreground text-sm">
                        LHDN allows cancelling within 72 hours of validation. After that, issue a credit note.
                    </p>
                    <TextField label="Reason" value={cancel.data.reason} onChange={(v) => cancel.setData('reason', v)} error={cancel.errors.reason} />
                </FormDialog>
            )}
        </Card>
    );
}
