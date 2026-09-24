import { Link } from '@inertiajs/react';
import { Briefcase, Gavel, Mail, Scale, Settings, Users } from 'lucide-react';

const QUICK_LINKS = [
    { label: 'Cases', url: '/matters', icon: Scale, tone: 'text-sky-300' },
    { label: 'Clients', url: '/clients', icon: Users, tone: 'text-emerald-300' },
    { label: 'Hearings', url: '/hearings', icon: Gavel, tone: 'text-violet-300' },
    { label: 'Messages', url: '/messages', icon: Mail, tone: 'text-blue-300' },
    { label: 'Settings', url: '/system-settings', icon: Settings, tone: 'text-white/80' },
];

export function HeroBanner({
    greeting,
    firmName,
    activeCases,
    totalCases,
    growth,
}: {
    greeting: string;
    firmName: string;
    activeCases: number;
    totalCases: number;
    growth: number;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#16233a] px-7 py-7 text-white">
            {/* Soft wash plus the wave along the foot. */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 left-1/3 size-96 rounded-full bg-sky-500/10 blur-3xl" />
                <svg className="absolute inset-x-0 bottom-0" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden>
                    <path d="M0 62 C 220 18, 420 94, 660 56 C 880 22, 1040 70, 1200 44 L1200 90 L0 90 Z" fill="rgba(255,255,255,0.045)" />
                </svg>
            </div>

            <div className="relative flex flex-wrap items-center justify-between gap-6">
                <div>
                    <p className="text-sm text-white/65">{greeting},</p>
                    <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
                        {firmName} <span aria-hidden>👋</span>
                    </h1>
                    <p className="mt-1 text-sm text-white/65">Here's what's happening across your firm today.</p>
                    <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-300">
                        <span className="flex gap-1" aria-hidden>
                            <span className="size-1.5 rounded-full bg-emerald-400" />
                            <span className="size-1.5 rounded-full bg-emerald-400/70" />
                            <span className="size-1.5 rounded-full bg-emerald-400/40" />
                        </span>
                        {activeCases} active cases
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-xl bg-white/8 px-6 py-3 text-center">
                        <div className="font-mono text-xl font-bold tabular-nums">{totalCases}</div>
                        <div className="mt-0.5 text-xs text-white/60">Total Cases</div>
                    </div>
                    <div className="rounded-xl bg-white/12 px-6 py-3 text-center">
                        <div className="font-mono text-xl font-bold text-emerald-300 tabular-nums">
                            {growth >= 0 ? '+' : ''}
                            {growth}%
                        </div>
                        <div className="mt-0.5 text-xs text-white/60">Growth</div>
                    </div>

                    {QUICK_LINKS.map(({ label, url, icon: Icon, tone }) => (
                        <Link
                            key={label}
                            href={url}
                            className="group flex w-16 flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors hover:bg-white/8"
                        >
                            <Icon className={`size-5 ${tone}`} />
                            <span className="text-[11px] text-white/60 group-hover:text-white/90">{label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** The pastel KPI card: tinted panel, icon chip, decorative circles, monospace figure. */
export function TintedStat({
    label,
    value,
    hint,
    icon: Icon,
    tone,
    badge,
    href,
}: {
    label: string;
    value: string | number;
    hint?: string;
    icon: typeof Briefcase;
    tone: 'blue' | 'green' | 'emerald' | 'amber';
    badge?: string;
    href?: string;
}) {
    const tones = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300',
        green: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300',
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300',
        amber: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300',
    }[tone];

    const chip = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300',
        green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300',
        emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300',
        amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300',
    }[tone];

    const className = `relative block overflow-hidden rounded-2xl border p-5 transition-shadow hover:shadow-sm ${tones}`;

    const inner = (
        <>
            <span className="pointer-events-none absolute -top-6 -right-6 size-24 rounded-full bg-current opacity-[0.06]" />
            <span className="pointer-events-none absolute -right-4 -bottom-8 size-24 rounded-full bg-current opacity-[0.05]" />

            <div className="relative flex items-start justify-between">
                <span className={`flex size-11 items-center justify-center rounded-xl ${chip}`}>
                    <Icon className="size-5" />
                </span>
                {badge && <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium dark:bg-black/30">{badge}</span>}
            </div>

            <div className="relative mt-6">
                <div className="text-sm font-medium">{label}</div>
                <div className="text-foreground mt-1 font-mono text-3xl font-bold tracking-tight tabular-nums">{value}</div>
                {hint && <div className="mt-1 text-xs opacity-80">{hint}</div>}
            </div>
        </>
    );

    return href ? (
        <Link href={href} className={className}>
            {inner}
        </Link>
    ) : (
        <div className={className}>{inner}</div>
    );
}
