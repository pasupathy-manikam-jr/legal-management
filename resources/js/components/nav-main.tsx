import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import type { NavGroup, NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

/** Whether a link covers the page: the page is it, or sits underneath it. */
function covers(url: string, page: string): boolean {
    return page === url || page.startsWith(url + '/') || page.startsWith(url + '?') || (url.includes('?') && page.startsWith(url + '&'));
}

/**
 * The one link the page belongs to. Several can cover a page — "/documents" and
 * "/documents/library" both cover "/documents/library/33" — and the most specific wins.
 */
function currentLink(groups: NavGroup[], page: string): string {
    const urls: string[] = [];
    const collect = (items: NavItem[]) => items.forEach((item) => (urls.push(item.url), item.items && collect(item.items)));
    groups.forEach((group) => collect(group.items));

    return urls.filter((url) => covers(url, page)).sort((a, b) => b.length - a.length)[0] ?? page;
}

/** An entry is active when it is the link the page belongs to. */
function isActive(url: string, current: string): boolean {
    return url === current;
}

/** An entry matches when it or anything below it matches, at any depth. */
function matches(item: NavItem, term: string): boolean {
    if (!term) return true;

    return item.title.toLowerCase().includes(term) || (item.items?.some((child) => matches(child, term)) ?? false);
}

/**
 * A nested branch opens when the page moves into it, and closes on a click —
 * an active child opens the branch but must never hold it open.
 */
function useOpenBranch(childActive: boolean): [boolean, (open: boolean) => void] {
    const [open, setOpen] = useState(childActive);

    useEffect(() => {
        if (childActive) {
            setOpen(true);
        }
    }, [childActive]);

    return [open, setOpen];
}

/**
 * Opening a branch closes the one above it, which would slide the clicked entry up
 * from under the pointer. Hold it where it was by scrolling the sidebar by however
 * far it moves, frame by frame, until the closing branch has finished.
 */
function keepInPlace(entry: HTMLElement) {
    const scroller = entry.closest<HTMLElement>('[data-sidebar="content"]');
    if (!scroller) {
        return;
    }

    const anchor = entry.getBoundingClientRect().top;
    const until = performance.now() + 400;
    const hold = () => {
        scroller.scrollTop += entry.getBoundingClientRect().top - anchor;
        if (performance.now() < until) {
            requestAnimationFrame(hold);
        }
    };
    requestAnimationFrame(hold);
}

/**
 * The menu a link was last clicked in. Two menus can hold the same page — Case
 * Management › Hearings and Court Management › Hearing Diary both open /hearings —
 * and the page belongs to the one you came through. Kept in the module so it
 * outlives the sidebar being rebuilt on every visit, like its scroll position.
 */
let clickedBranch: string | null = null;

/** True when this entry or any descendant points at the current URL. */
function branchActive(item: NavItem, current: string): boolean {
    return item.items?.some((child) => isActive(child.url, current) || branchActive(child, current)) ?? false;
}

export function NavMain({ groups = [], search = '' }: { groups: NavGroup[]; search?: string }) {
    const page = usePage();
    // Resolved against every link, not just the visible ones, so searching the menu doesn't move it.
    const current = useMemo(() => currentLink(groups, page.url), [groups, page.url]);
    const term = search.trim().toLowerCase();

    const visible = useMemo(
        () =>
            groups.map((group) => ({ ...group, items: group.items.filter((item) => matches(item, term)) })).filter((group) => group.items.length > 0),
        [groups, term],
    );

    // One branch open at a time: the one holding the current page, until a click says otherwise.
    // When several hold it, the one the link was clicked in wins.
    const branchOnThisPage = useMemo(() => {
        const holding = visible
            .flatMap((group) => group.items.map((item) => ({ key: `${group.title}/${item.title}`, item })))
            .filter(({ item }) => branchActive(item, current));

        return (holding.find(({ key }) => key === clickedBranch) ?? holding[0])?.key ?? null;
    }, [visible, current]);

    const [openBranch, setOpenBranch] = useState<string | null>(branchOnThisPage);

    useEffect(() => {
        if (branchOnThisPage) {
            setOpenBranch(branchOnThisPage);
        }
    }, [branchOnThisPage]);

    if (visible.length === 0) {
        return <p className="text-sidebar-foreground/60 px-4 py-6 text-center text-xs">No menu items match.</p>;
    }

    return (
        <>
            {visible.map((group) => (
                <SidebarGroup key={group.title} className="px-1.5 py-0">
                    <SidebarGroupLabel className="px-2 pt-2 pb-1.5 text-[13px] font-bold tracking-wide capitalize">{group.title}</SidebarGroupLabel>
                    <SidebarMenu>
                        {group.items.map((item) =>
                            item.items?.length ? (
                                <CollapsibleEntry
                                    key={item.title}
                                    item={item}
                                    branch={`${group.title}/${item.title}`}
                                    active={branchOnThisPage === `${group.title}/${item.title}`}
                                    current={current}
                                    forceOpen={!!term}
                                    open={openBranch === `${group.title}/${item.title}`}
                                    onOpenChange={(next) => setOpenBranch(next ? `${group.title}/${item.title}` : null)}
                                />
                            ) : (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={isActive(item.url, current)} tooltip={item.title}>
                                        <Link href={item.url} prefetch>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ),
                        )}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}

function CollapsibleEntry({
    item,
    branch,
    active,
    current,
    forceOpen,
    open,
    onOpenChange,
}: {
    item: NavItem;
    /** This menu's key, recorded when one of its links is clicked. */
    branch: string;
    /** Whether the current page belongs to this menu (only one can). */
    active: boolean;
    current: string;
    forceOpen: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const entryRef = useRef<HTMLLIElement>(null);

    return (
        <Collapsible
            asChild
            open={forceOpen || open}
            onOpenChange={(next) => {
                if (next && entryRef.current) {
                    keepInPlace(entryRef.current);
                }
                onOpenChange(next);
            }}
            className="group/collapsible"
        >
            <SidebarMenuItem ref={entryRef}>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={active} tooltip={item.title}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto size-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {item.items!.map((child) =>
                            child.items?.length ? (
                                <NestedEntry key={child.title} item={child} branch={branch} current={current} forceOpen={forceOpen} />
                            ) : (
                                <SidebarMenuSubItem key={child.title}>
                                    <SidebarMenuSubButton asChild isActive={isActive(child.url, current)}>
                                        <Link href={child.url} prefetch onClick={() => (clickedBranch = branch)}>
                                            {child.icon && <child.icon />}
                                            <span>{child.title}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ),
                        )}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}

/** A third level: a collapsible sitting inside an already-nested submenu. */
function NestedEntry({ item, branch, current, forceOpen }: { item: NavItem; branch: string; current: string; forceOpen: boolean }) {
    const childActive = branchActive(item, current);
    const [open, setOpen] = useOpenBranch(childActive);

    return (
        <Collapsible asChild open={forceOpen || open} onOpenChange={setOpen} className="group/nested">
            <SidebarMenuSubItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuSubButton isActive={childActive} className="cursor-pointer">
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto size-3 transition-transform duration-200 group-data-[state=open]/nested:rotate-90" />
                    </SidebarMenuSubButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub className="mr-0 pr-0">
                        {item.items!.map((child) => (
                            <SidebarMenuSubItem key={child.title}>
                                <SidebarMenuSubButton asChild isActive={isActive(child.url, current)} size="sm">
                                    <Link href={child.url} prefetch onClick={() => (clickedBranch = branch)}>
                                        <span>{child.title}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuSubItem>
        </Collapsible>
    );
}
