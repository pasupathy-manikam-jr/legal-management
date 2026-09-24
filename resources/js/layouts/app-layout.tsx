import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { setCurrencySettings, type CurrencySettings } from '@/lib/format';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface AppLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {
    // Re-applied on every visit so saving currency settings takes effect at once.
    const { settings } = usePage<SharedData & { settings?: { currency?: CurrencySettings } }>().props;
    setCurrencySettings(settings?.currency);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
            {children}
        </AppLayoutTemplate>
    );
};
