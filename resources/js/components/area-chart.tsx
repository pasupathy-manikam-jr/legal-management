import { useId, useState } from 'react';

interface Point {
    label: string;
    value: number;
}

/**
 * Smoothed area chart. Catmull-Rom control points give the soft curve without a
 * charting library — the whole thing is one <path> plus a gradient fill.
 */
export function AreaChart({
    series,
    format,
    height = 260,
    color = '#34a06f',
}: {
    series: Point[];
    format: (value: number) => string;
    height?: number;
    color?: string;
}) {
    const gradientId = useId();
    const [hover, setHover] = useState<number | null>(null);

    const W = 1000;
    const H = height;
    const padL = 78;
    const padR = 16;
    const padT = 18;
    const padB = 34;

    const peak = Math.max(...series.map((p) => p.value), 1);
    // Round the axis up to a clean number so the gridlines read well.
    const magnitude = 10 ** Math.floor(Math.log10(peak));
    const top = Math.ceil(peak / magnitude) * magnitude || 1;

    const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(series.length - 1, 1);
    const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);

    const pts = series.map((p, i) => [x(i), y(p.value)] as const);

    const curve = pts
        .map(([px, py], i) => {
            if (i === 0) return `M ${px} ${py}`;
            const [x0, y0] = pts[i - 1];
            const [xPrev, yPrev] = pts[i - 2] ?? pts[i - 1];
            const [xNext, yNext] = pts[i + 1] ?? pts[i];
            const c1x = x0 + (px - xPrev) / 6;
            const c1y = y0 + (py - yPrev) / 6;
            const c2x = px - (xNext - x0) / 6;
            const c2y = py - (yNext - y0) / 6;
            return `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${px} ${py}`;
        })
        .join(' ');

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly revenue">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>

            {ticks.map((t) => (
                <g key={t}>
                    <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.14" strokeDasharray="4 5" />
                    <text
                        x={padL - 10}
                        y={y(t) + 4}
                        textAnchor="end"
                        className="fill-current text-[19px] opacity-50"
                        fontFamily="ui-monospace, monospace"
                    >
                        {format(t)}
                    </text>
                </g>
            ))}

            <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="currentColor" strokeOpacity="0.2" />

            <path d={`${curve} L ${x(series.length - 1)} ${y(0)} L ${padL} ${y(0)} Z`} fill={`url(#${gradientId})`} />
            <path d={curve} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {series.map((p, i) => (
                <g key={p.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                    <rect x={x(i) - 28} y={padT} width={56} height={H - padT - padB} fill="transparent" />
                    <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 7 : 4.5} fill={color} stroke="white" strokeWidth="2" />
                    <text x={x(i)} y={H - 10} textAnchor="middle" className="fill-current text-[19px] opacity-60">
                        {p.label}
                    </text>
                    {hover === i && (
                        <text
                            x={x(i)}
                            y={y(p.value) - 16}
                            textAnchor="middle"
                            className="fill-current text-[21px] font-semibold"
                            fontFamily="ui-monospace, monospace"
                        >
                            {format(p.value)}
                        </text>
                    )}
                </g>
            ))}
        </svg>
    );
}
