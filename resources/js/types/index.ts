import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Present on a parent entry: renders as a collapsible submenu. */
    items?: NavItem[];
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    settings?: {
        currency?: {
            symbol: string;
            position: 'before' | 'after';
            space: boolean;
            decimals: number;
            decimalSeparator: string;
            thousandsSeparator: string;
        };
        dateFormat?: string;
        firmName?: string;
    };
    flash?: { success?: string | null };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    per_page: number;
}

export interface Client {
    id: number;
    name: string;
    company: string | null;
    type?: string | null;
    active?: boolean;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    matters_count?: number;
}

export interface Court {
    id: number;
    name: string;
    type: string;
    bench: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    active: boolean;
    matters_count?: number;
}

export interface Matter {
    id: number;
    reference: string;
    title: string;
    client_id: number;
    client?: Client;
    lead_lawyer_id: number | null;
    lead_lawyer?: User | null;
    court_id: number | null;
    court?: Court | null;
    practice_area: string | null;
    case_type: string | null;
    priority: 'low' | 'medium' | 'high';
    judge: string | null;
    opposing_party: string | null;
    opposing_counsel: string | null;
    status: 'open' | 'pending' | 'closed';
    opened_on: string;
    expected_completion: string | null;
    closed_on: string | null;
    hourly_rate_cents: number;
    description: string | null;
    hearings_count?: number;
    tasks_count?: number;
    hearings?: Hearing[];
    tasks?: Task[];
    documents?: MatterDocument[];
    events?: MatterEvent[];
    time_entries?: TimeEntry[];
    team?: (User & { pivot: { role: string } })[];
}

export interface Hearing {
    id: number;
    matter_id: number;
    matter?: Matter;
    court_id: number | null;
    court?: Court | null;
    scheduled_at: string;
    duration_minutes: number;
    type: string | null;
    status: 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';
    judge: string | null;
    title: string | null;
    outcome: string | null;
}

export interface Task {
    id: number;
    matter_id: number | null;
    matter?: Matter | null;
    assigned_to: number | null;
    assignee?: User | null;
    title: string;
    notes: string | null;
    status: string;
    type: string | null;
    priority: string;
    due_on: string | null;
    completed_at: string | null;
}

export interface TimeEntry {
    id: number;
    matter_id: number;
    matter?: Matter;
    user_id: number;
    user?: User;
    worked_on: string;
    minutes: number;
    rate_cents: number;
    amount_cents?: number;
    billable: boolean;
    invoice_id: number | null;
    invoice?: Invoice | null;
    description: string;
}

export interface MatterDocument {
    id: number;
    matter_id: number;
    title: string;
    path: string;
    mime: string | null;
    size: number;
    confidentiality: 'public' | 'internal' | 'confidential';
    uploader?: User | null;
    created_at: string;
}

export interface MatterEvent {
    id: number;
    matter_id: number;
    kind: 'note' | 'timeline';
    title: string;
    body: string | null;
    occurred_at: string;
    user?: User | null;
}

export interface Payment {
    id: number;
    invoice_id: number;
    paid_on: string;
    amount_cents: number;
    method: 'bank' | 'card' | 'cash' | 'cheque';
    reference: string | null;
}

export interface Invoice {
    id: number;
    client_id: number;
    client?: Client;
    matter_id: number | null;
    matter?: Matter | null;
    number: string;
    issued_on: string;
    due_on: string;
    status: 'draft' | 'sent' | 'paid' | 'void';
    subtotal_cents: number;
    tax_cents: number;
    paid_cents: number;
    total_cents?: number;
    balance_cents?: number;
    notes: string | null;
    payments?: Payment[];
}
