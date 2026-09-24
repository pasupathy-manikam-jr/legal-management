import { useState } from 'react';

export interface Series {
    key: string;
    label: string;
    color: string;
}

type Row = Record<string, string | number>;

/** Shared geometry: a rounded top for the axis plus the gridline values. */
function scale(rows: Row[], series: Series[]) {
    const peak = Math.max(...rows.flatMap((r) => series.map((s) => Number(r[s.key]) || 0)), 1);
    const magnitude = 10 ** Math.floor(Math.log10(peak));
    const top = Math.ceil(peak / magnitude) * magnitude || 1;

    return { top, ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f)) };
}

function Legend({ series }: { series: Series[] }) {
    return (
        <ul className="mt-2 flex flex-wrap justify-center gap-4">
            {series.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5 text-xs" style={{ color: s.color }}>
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                </li>
            ))}
        </ul>
    );
}

/** Multi-line chart with dots on every point, drawn as one path per series. */
export function LineChart({ rows, series, height = 300 }: { rows: Row[]; series: Series[]; height?: number }) {
    const [hover, setHover] = useState<number | null>(null);
    const { top, ticks } = scale(rows, series);

    const W = 1000;
    const padL = 60;
    const padR = 16;
    const padT = 10;
    const padB = 30;

    const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(rows.length - 1, 1);
    const y = (v: number) => padT + (1 - v / top) * (height - padT - padB);

    return (
        <div>
            <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ height }} role="img">
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="currentColor" strokeDasharray="3 3" className="text-border" />
                        <text x={padL - 10} y={y(t)} dy="0.35em" textAnchor="end" className="fill-muted-foreground text-[11px]">
                            {t}
                        </text>
                    </g>
                ))}

                {rows.map((r, i) => (
                    <text key={String(r.label)} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                        {r.label}
                    </text>
                ))}

                {series.map((s) => (
                    <g key={s.key}>
                        <path
                            d={rows.map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(Number(r[s.key]) || 0)}`).join(' ')}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={3}
                            strokeLinejoin="round"
                        />
                        {rows.map((r, i) => (
                            <circle key={String(r.label)} cx={x(i)} cy={y(Number(r[s.key]) || 0)} r={4} fill={s.color} stroke={s.color} strokeWidth={2} />
                        ))}
                    </g>
                ))}

                {rows.map((r, i) => (
                    <rect
                        key={String(r.label)}
                        x={x(i) - 14}
                        y={padT}
                        width={28}
                        height={height - padT - padB}
                        fill="transparent"
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                    />
                ))}
            </svg>

            {hover !== null && (
                <p className="text-center text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{rows[hover].label}</span>
                    {series.map((s) => (
                        <span key={s.key} className="ml-3" style={{ color: s.color }}>
                            {s.label} {rows[hover][s.key] ?? 0}
                        </span>
                    ))}
                </p>
            )}

            <Legend series={series} />
        </div>
    );
}

/** Grouped bars: one slim rounded bar per series, per month. */
export function BarChart({ rows, series, height = 250 }: { rows: Row[]; series: Series[]; height?: number }) {
    const { top, ticks } = scale(rows, series);

    const W = 1000;
    const padL = 60;
    const padR = 16;
    const padT = 10;
    const padB = 30;

    const band = (W - padL - padR) / rows.length;
    const barWidth = Math.min(10, (band * 0.6) / series.length);
    const y = (v: number) => padT + (1 - v / top) * (height - padT - padB);
    const base = y(0);

    return (
        <div>
            <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ height }} role="img">
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="currentColor" strokeDasharray="3 3" className="text-border" />
                        <text x={padL - 10} y={y(t)} dy="0.35em" textAnchor="end" className="fill-muted-foreground text-[11px]">
                            {t}
                        </text>
                    </g>
                ))}

                {rows.map((r, i) => {
                    const centre = padL + band * i + band / 2;
                    const groupWidth = barWidth * series.length + 2 * (series.length - 1);

                    return (
                        <g key={String(r.label)}>
                            {series.map((s, j) => {
                                const value = Number(r[s.key]) || 0;
                                const barX = centre - groupWidth / 2 + j * (barWidth + 2);

                                return (
                                    <rect
                                        key={s.key}
                                        x={barX}
                                        y={y(value)}
                                        width={barWidth}
                                        height={Math.max(base - y(value), 0)}
                                        rx={barWidth / 2}
                                        fill={s.color}
                                    >
                                        <title>{`${r.label} · ${s.label}: ${value}`}</title>
                                    </rect>
                                );
                            })}
                            <text x={centre} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                                {r.label}
                            </text>
                        </g>
                    );
                })}
            </svg>

            <Legend series={series} />
        </div>
    );
}
