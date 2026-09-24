export interface CurrencySettings {
    symbol: string;
    position: 'before' | 'after';
    space: boolean;
    decimals: number;
    decimalSeparator: string;
    thousandsSeparator: string;
}

const FALLBACK: CurrencySettings = {
    symbol: '$',
    position: 'before',
    space: false,
    decimals: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
};

/**
 * Set once from the Inertia shared props so money() stays a plain call at every
 * call site. Formatting is firm configuration, not a per-component concern.
 */
let currency: CurrencySettings = FALLBACK;

export function setCurrencySettings(settings?: Partial<CurrencySettings> | null): void {
    currency = { ...FALLBACK, ...(settings ?? {}) };
}

/** Money lives in the DB as integer cents; format only at the edge. */
export function money(cents: number | null | undefined): string {
    const amount = (cents ?? 0) / 100;
    const fixed = Math.abs(amount).toFixed(currency.decimals);
    const [whole, fraction] = fixed.split('.');

    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u0000').split('\u0000').join(currency.thousandsSeparator);
    const body = fraction ? `${grouped}${currency.decimalSeparator}${fraction}` : grouped;
    const gap = currency.space ? ' ' : '';
    const signed = amount < 0 ? '-' : '';

    return currency.position === 'before' ? `${signed}${currency.symbol}${gap}${body}` : `${signed}${body}${gap}${currency.symbol}`;
}

/** File sizes as the media library shows them. */
export function bytes(value: number | null | undefined): string {
    const size = value ?? 0;

    if (size < 1024) {
        return `${size} B`;
    }

    return size < 1024 * 1024 ? `${(size / 1024).toFixed(2)} KB` : `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function hours(minutes: number | null | undefined): string {
    const m = minutes ?? 0;
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

export function date(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
