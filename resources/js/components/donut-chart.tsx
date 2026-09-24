interface Slice {
    label: string;
    value: number;
    color: string;
}

/** Donut built from stroked arcs on one circle — no library, no layout maths. */
export function DonutChart({ slices, size = 180, thickness = 26 }: { slices: Slice[]; size?: number; thickness?: number }) {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;

    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Breakdown">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth={thickness} />
            {total > 0 &&
                slices.map((slice) => {
                    const length = (slice.value / total) * circumference;
                    const dash = `${length} ${circumference - length}`;
                    const rotation = (offset / circumference) * 360 - 90;
                    offset += length;

                    return (
                        <circle
                            key={slice.label}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={slice.color}
                            strokeWidth={thickness}
                            strokeDasharray={dash}
                            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                        >
                            <title>{`${slice.label}: ${slice.value}`}</title>
                        </circle>
                    );
                })}
        </svg>
    );
}
