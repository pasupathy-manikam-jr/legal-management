import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import type { NavGroup } from '@/types';
import { Link } from '@inertiajs/react';
import {
    BookOpen,
    Briefcase,
    Building2,
    Calendar,
    CalendarDays,
    ChartColumn,
    DollarSign,
    FileText,
    Image,
    LayoutGrid,
    Mail,
    Scale,
    Search,
    Settings,
    SlidersHorizontal,
    SquareCheckBig,
    UserCheck,
    Users,
} from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';

const navGroups: NavGroup[] = [
    {
        title: 'Overview',
        items: [
            { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
            { title: 'Analytics & Reports', url: '/analytics', icon: ChartColumn },
            { title: 'Calendar', url: '/calendar', icon: CalendarDays },
            { title: 'User Guide', url: '/user-guide', icon: BookOpen },
        ],
    },
    {
        title: 'Case & Legal Operations',
        items: [
            {
                title: 'Case Management',
                url: '/matters',
                icon: Briefcase,
                items: [
                    { title: 'Cases', url: '/matters' },
                    { title: 'Hearings', url: '/hearings' },
                    {
                        title: 'Case Setup',
                        url: '/setup',
                        items: [
                            { title: 'Case Types', url: '/setup?kind=case_type' },
                            { title: 'Case Status', url: '/setup?kind=case_status' },
                            { title: 'Event Types', url: '/setup?kind=event_type' },
                            { title: 'Hearing Types', url: '/setup?kind=hearing_type' },
                        ],
                    },
                ],
            },
            {
                title: 'Legal Research',
                url: '/research-projects',
                icon: BookOpen,
                items: [
                    { title: 'Research Projects', url: '/research-projects' },
                    { title: 'Knowledge Articles', url: '/articles' },
                    { title: 'Legal Precedents', url: '/precedents' },
                    {
                        title: 'Research Setup',
                        url: '/setup',
                        items: [
                            { title: 'Research Types', url: '/setup?kind=research_type' },
                            { title: 'Practice Areas', url: '/setup?kind=practice_area' },
                            { title: 'Research Categories', url: '/setup?kind=research_category' },
                            { title: 'Research Sources', url: '/setup?kind=research_source' },
                        ],
                    },
                ],
            },
            {
                title: 'Compliance & Regulatory',
                url: '/compliance/requirements',
                icon: SquareCheckBig,
                items: [
                    { title: 'Compliance Requirements', url: '/compliance/requirements' },
                    { title: 'Compliance Audits', url: '/compliance/audits' },
                    { title: 'Risk Assessments', url: '/compliance/risk-assessments' },
                    { title: 'Professional Licenses', url: '/compliance/professional-licenses' },
                    { title: 'CLE Tracking', url: '/compliance/cle-tracking' },
                    { title: 'Regulatory Bodies', url: '/compliance/regulatory-bodies' },
                    {
                        title: 'Compliance Setup',
                        url: '/setup',
                        items: [
                            { title: 'Compliance Categories', url: '/setup?kind=compliance_category' },
                            { title: 'Compliance Frequencies', url: '/setup?kind=compliance_frequency' },
                            { title: 'Risk Categories', url: '/setup?kind=risk_category' },
                            { title: 'Compliance Audit Types', url: '/setup?kind=audit_type' },
                        ],
                    },
                ],
            },
            {
                title: 'Task & Workflow',
                url: '/tasks',
                icon: SquareCheckBig,
                items: [
                    { title: 'Tasks', url: '/tasks' },
                    {
                        title: 'Task Setup',
                        url: '/setup',
                        items: [
                            { title: 'Task Types', url: '/setup?kind=task_type' },
                            { title: 'Task Status', url: '/setup?kind=task_status' },
                        ],
                    },
                ],
            },
            {
                title: 'Court Management',
                url: '/courts',
                icon: Calendar,
                items: [
                    { title: 'Courts', url: '/courts' },
                    { title: 'Judges', url: '/judges' },
                    { title: 'Hearing Diary', url: '/hearings' },
                    {
                        title: 'Court Setup',
                        url: '/setup',
                        items: [{ title: 'Court Types', url: '/setup?kind=court_type' }],
                    },
                ],
            },
        ],
    },
    {
        title: 'Client & Communication',
        items: [
            {
                title: 'Client Management',
                url: '/clients',
                icon: UserCheck,
                items: [
                    { title: 'Clients', url: '/clients' },
                    { title: 'Documents', url: '/documents' },
                    {
                        title: 'Client Setup',
                        url: '/setup',
                        items: [
                            { title: 'Client Types', url: '/setup?kind=client_type' },
                            { title: 'Document Types', url: '/setup?kind=document_type' },
                        ],
                    },
                ],
            },
            { title: 'Communication', url: '/messages', icon: Mail },
        ],
    },
    {
        title: 'Billing',
        items: [
            {
                title: 'Billing & Invoicing',
                url: '/invoices',
                icon: DollarSign,
                items: [
                    { title: 'Time Sheet', url: '/billing/time-entries' },
                    { title: 'Expenses', url: '/expenses' },
                    { title: 'Invoices', url: '/invoices' },
                    { title: 'Payments', url: '/payments' },
                    {
                        title: 'Billing Setup',
                        url: '/settings/billing',
                        items: [{ title: 'Expense Categories', url: '/setup?kind=expense_category' }],
                    },
                ],
            },
        ],
    },
    {
        title: 'Documents & Media',
        items: [
            {
                title: 'Document Management',
                url: '/documents/library',
                icon: FileText,
                items: [
                    { title: 'Documents', url: '/documents/library' },
                    {
                        title: 'Document Setup',
                        url: '/setup',
                        // The same list the client screen calls Document Types.
                        items: [{ title: 'Categories', url: '/setup?kind=document_type' }],
                    },
                ],
            },
            { title: 'Media Library', url: '/media', icon: Image },
        ],
    },
    {
        title: 'System Control',
        items: [
            {
                title: 'Advocate',
                url: '/company-profile',
                icon: Scale,
                items: [{ title: 'Company Profile', url: '/company-profile' }],
            },
            {
                title: 'Team Members',
                url: '/users',
                icon: Users,
                items: [
                    { title: 'Members', url: '/users' },
                    { title: 'Roles', url: '/roles' },
                ],
            },
            { title: 'Notification Templates', url: '/settings/templates', icon: Mail },
            { title: 'Settings', url: '/system-settings', icon: SlidersHorizontal },
            {
                // Laravel's own account settings, kept separate from firm configuration.
                title: 'My Account',
                url: '/settings/profile',
                icon: Settings,
                items: [
                    { title: 'Profile', url: '/settings/profile' },
                    { title: 'Password', url: '/settings/password' },
                    { title: 'Appearance', url: '/settings/appearance' },
                ],
            },
        ],
    },
];

/**
 * Every page renders its own layout, so the sidebar is rebuilt on each visit and
 * would snap back to the top. Its scroll position is kept here, in the module,
 * which stays loaded across Inertia visits.
 */
let sidebarScroll = 0;

export function AppSidebar() {
    const [search, setSearch] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    // Restored before paint, so the menu never visibly jumps.
    useLayoutEffect(() => {
        const content = contentRef.current;
        if (!content) {
            return;
        }

        content.scrollTop = sidebarScroll;

        // Arriving from a link on the page rather than the menu, the current entry may be
        // out of sight. The deepest active entry is the page's own link (a parent is marked
        // active too); it is scrolled to only when wholly hidden, so a menu click never moves it.
        const current = [...content.querySelectorAll<HTMLElement>('[data-active="true"]')].pop();
        if (current) {
            const entry = current.getBoundingClientRect();
            const view = content.getBoundingClientRect();
            if (entry.bottom <= view.top || entry.top >= view.bottom) {
                current.scrollIntoView({ block: 'nearest' });
            }
        }

        const remember = () => {
            sidebarScroll = content.scrollTop;
        };
        content.addEventListener('scroll', remember, { passive: true });

        return () => content.removeEventListener('scroll', remember);
    }, []);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <Scale className="size-5" />
                                <span className="text-base font-semibold">Advocate</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                <div className="relative px-2 pb-2 group-data-[collapsible=icon]:hidden">
                    <Search className="text-muted-foreground absolute top-1/2 left-4.5 size-3.5 -translate-y-1/2" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search menu…"
                        aria-label="Search menu"
                        className="border-sidebar-border bg-sidebar-accent/40 placeholder:text-muted-foreground focus:border-ring focus:ring-ring w-full rounded-md border py-1.5 pr-2 pl-7 text-sm outline-none focus:ring-1"
                    />
                </div>
            </SidebarHeader>

            <SidebarContent ref={contentRef} className="gap-3">
                <NavMain groups={navGroups} search={search} />
            </SidebarContent>

            <SidebarFooter>
                <div className="group-data-[collapsible=icon]:hidden">
                    <div className="bg-sidebar-accent/60 flex items-center gap-3 rounded-xl px-3 py-2.5">
                        <div className="bg-sidebar-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
                            <Building2 className="text-sidebar-foreground/70 size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">Whitmore &amp; Co.</p>
                            <p className="text-sidebar-foreground/60 truncate text-xs">Legal practice management</p>
                        </div>
                    </div>
                </div>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
