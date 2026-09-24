import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';

export interface ConfirmOptions {
    title: string;
    description?: string;
    confirmLabel?: string;
}

type Request = ConfirmOptions & { resolve: (confirmed: boolean) => void };

/** Set by the one mounted host; every confirmAction() call goes through it. */
let show: ((request: Request) => void) | null = null;

/**
 * Ask before a destructive action, in the app's own dialog rather than the browser's.
 * Resolves true only when the red button is pressed; cancel, Escape or closing resolve false.
 */
export function confirmAction(options: ConfirmOptions | string): Promise<boolean> {
    const request = typeof options === 'string' ? { title: options } : options;

    return new Promise((resolve) => {
        if (!show) {
            // No host mounted (a page outside the app layout): fall back rather than silently proceed.
            resolve(window.confirm(request.title));

            return;
        }
        show({ ...request, resolve });
    });
}

/**
 * The single confirm dialog, mounted once in the app layout. It behaves like the
 * shadcn AlertDialog: role="alertdialog", no close button, clicking outside does
 * not dismiss it, and focus starts on Cancel so Enter never deletes by accident.
 */
export function ConfirmDialogHost() {
    const [request, setRequest] = useState<Request | null>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        show = setRequest;

        return () => {
            show = null;
        };
    }, []);

    function settle(confirmed: boolean) {
        request?.resolve(confirmed);
        setRequest(null);
    }

    return (
        <DialogPrimitive.Root open={request !== null} onOpenChange={(open) => !open && settle(false)}>
            <DialogPortal>
                <DialogOverlay />
                <DialogPrimitive.Content
                    role="alertdialog"
                    onInteractOutside={(e) => e.preventDefault()}
                    onOpenAutoFocus={(e) => {
                        e.preventDefault();
                        cancelRef.current?.focus();
                    }}
                    className="bg-background data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg"
                >
                    <DialogHeader>
                        <DialogTitle>{request?.title}</DialogTitle>
                        <DialogDescription>{request?.description ?? "This can't be undone."}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button ref={cancelRef} variant="outline" onClick={() => settle(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => settle(true)}>
                            {request?.confirmLabel ?? 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogPrimitive.Content>
            </DialogPortal>
        </DialogPrimitive.Root>
    );
}
