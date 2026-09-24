/**
 * Decorative panel for the auth screens: engraved scales-of-justice guilloche over a
 * deep navy field, with the faint ruled lines of a legal pad. Pure inline SVG — no
 * image asset to ship, and it stays crisp at any size.
 */
export function LegalBackdrop({ children }: { children?: React.ReactNode }) {
    return (
        <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-[#0b1f33] p-10 text-white lg:flex">
            <svg aria-hidden className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 1000">
                <defs>
                    <radialGradient id="glow" cx="50%" cy="34%" r="62%">
                        <stop offset="0%" stopColor="#1c4b78" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#0b1f33" stopOpacity="0" />
                    </radialGradient>
                    <pattern id="rule" width="800" height="34" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="33.5" x2="800" y2="33.5" stroke="#ffffff" strokeOpacity="0.045" strokeWidth="1" />
                    </pattern>
                    <pattern id="guilloche" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="#7fb2e5" strokeOpacity="0.07" strokeWidth="0.7" />
                        <circle cx="60" cy="60" r="34" fill="none" stroke="#7fb2e5" strokeOpacity="0.055" strokeWidth="0.7" />
                    </pattern>
                </defs>

                <rect width="800" height="1000" fill="#0b1f33" />
                <rect width="800" height="1000" fill="url(#guilloche)" />
                <rect width="800" height="1000" fill="url(#rule)" />
                <rect width="800" height="1000" fill="url(#glow)" />
                {/* red margin rule, as on a legal pad */}
                <line x1="96" y1="0" x2="96" y2="1000" stroke="#e2574c" strokeOpacity="0.28" strokeWidth="1.5" />

                {/* scales of justice, drawn as a single engraved line figure */}
                <g
                    transform="translate(400 430) scale(1.9)"
                    fill="none"
                    stroke="#dbeafe"
                    strokeOpacity="0.5"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M0 -96 v150" />
                    <path d="M-92 -80 H92" />
                    <circle cx="0" cy="-96" r="7" />
                    {/* left pan */}
                    <path d="M-92 -80 -124 -8 M-92 -80 -60 -8" />
                    <path d="M-132 -8 a40 26 0 0 0 80 0 z" strokeOpacity="0.62" />
                    {/* right pan */}
                    <path d="M92 -80 60 -8 M92 -80 124 -8" />
                    <path d="M52 -8 a40 26 0 0 0 80 0 z" strokeOpacity="0.62" />
                    {/* base */}
                    <path d="M-44 54 H44" />
                    <path d="M-62 70 q62 -22 124 0 z" strokeOpacity="0.62" />
                </g>

                {/* colonnade silhouette along the foot */}
                <g fill="#ffffff" fillOpacity="0.035">
                    <rect x="120" y="760" width="560" height="14" />
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <rect key={i} x={150 + i * 76} y="774" width="30" height="150" />
                    ))}
                    <rect x="110" y="924" width="580" height="18" />
                </g>
            </svg>

            <div className="relative z-10">{children}</div>
        </div>
    );
}
