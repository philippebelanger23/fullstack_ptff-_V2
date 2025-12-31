import React from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';

interface CountryTreemapProps {
    data: { name: string; value: number }[];
    width?: number | string;
    height?: number | string;
}

const CustomizedContent = (props: any) => {
    const { x, y, width, height, index, name, value, depth } = props;

    // Ignore root node to avoid rendering background
    if (depth === 0 || name === 'root') return null;

    // Safety check for rendering
    if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
        return null;
    }

    // Color Logic
    let fill = '#707882ff'; // Default: Slate 600 (Darker for better contrast)
    if (name === 'United States') {
        fill = '#457affff'; // Blue 600
    } else if (name === 'Canada') {
        fill = '#da3939ff'; // Red 600
    }

    // Gap and Radius logic
    const gap = 2; // Gap of 2px
    const radius = 6;

    // Adjusted dimensions for gap
    const adjX = x + gap;
    const adjY = y + gap;
    const adjW = width - (gap * 2);
    const adjH = height - (gap * 2);

    // Don't render if too small
    if (adjW <= 0 || adjH <= 0) return null;

    // --- SMART LABEL LOGIC ---
    let displayName = name;

    // Aggressive aliases for smaller boxes
    if (adjW < 120 || adjH < 50) {
        const aliases: Record<string, string> = {
            'United Kingdom': 'UK',
            'United States': 'USA',
            'Korea (South)': 'S. Korea',
            'Switzerland': 'Switz',
            'Australia': 'Aus',
            'Netherlands': 'Neth.',
            'Germany': 'DE', // Optional ISO codes if really small? Maybe keep full name if fits.
            'France': 'Fra',
            'Taiwan': 'Tai',
            'Japan': 'Jap',
            'China': 'Chi'
        };
        if (aliases[name]) displayName = aliases[name];
    }

    // Hide text if box is excessively small
    const showText = adjW > 28 && adjH > 28;

    // Font Sizing Calculation
    const charCount = displayName.length;
    // We want the text to fill about 85% (reduced from 90%) of the box width
    const targetWidth = adjW * 0.85;
    // Average char width factor (approx 0.6 for sans-serif)
    const fontSizeByWidth = targetWidth / (Math.max(charCount, 2) * 0.6);
    // We want content (2 lines) to fill about 70% of height
    const fontSizeByHeight = (adjH * 0.7) / 2.5; // 2.5 lines roughly

    // Clamp font size
    // For really small boxes (e.g. < 60px wide), go smaller.
    // For US/Canada, allow big text.
    let baseFontSize = Math.min(fontSizeByWidth, fontSizeByHeight);
    baseFontSize = Math.min(Math.max(baseFontSize, 10), 32); // Clamp between 10px and 32px

    // For tiny boxes, if the calculated font needs to be < 10, maybe just hide specifically or show initials?
    // Current logic: if it doesn't fit with size 9, it overlaps. 
    // Let's rely on showText trigger for tiny boxes.

    return (
        <g>
            <rect
                x={adjX}
                y={adjY}
                width={adjW}
                height={adjH}
                rx={radius}
                ry={radius}
                fill={fill}
                style={{
                    stroke: '#fff',
                    strokeWidth: 0,
                    filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.15))', // Stronger shadow for depth
                    cursor: 'pointer'
                }}
            />
            {showText && (
                <text
                    x={adjX + adjW / 2}
                    y={adjY + adjH / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#fff"
                    style={{ pointerEvents: 'none' }}
                >
                    <tspan
                        x={adjX + adjW / 2}
                        dy={`-${baseFontSize * 0.4}px`} // Move NAME up by ~40% of font size from center
                        style={{
                            fontSize: `${baseFontSize}px`,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            fontWeight: 500, // Reduced from 600 -> 500
                            // Removed textShadow for cleaner look on small text
                        }}
                    >
                        {displayName}
                    </tspan>
                    <tspan
                        x={adjX + adjW / 2}
                        dy={`${baseFontSize * 1.1}px`} // Move VALUE down. This is offset from the PREVIOUS sibling baseline.
                        // Previous baseline was approx @ center - 0.4em.
                        // New baseline = (center - 0.4em) + 1.1em = center + 0.7em.
                        // Visual check: Cap height ~0.7em. 
                        // Top text: bottom is ~ center - 0.4em.
                        // Bottom text: top is ~ center + 0.7em - 0.7em = center.
                        // This leaves a 0.4em gap between them.
                        style={{
                            fontSize: `${baseFontSize * 0.8}px`, // Value is 80% of name size
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            fontWeight: 400, // Kept at 400 (Regular)
                            opacity: 1, // Removed opacity to ensure thin lines render crisp
                        }}
                    >
                        {value.toFixed(1)}%
                    </tspan>
                </text>
            )}
        </g>
    );
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 rounded-lg shadow-lg">
                <p className="text-slate-800 font-bold text-sm mb-1">{data.name}</p>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500 text-xs text-nowrap">Weight</span>
                    <span className={`font-mono font-bold text-sm ${data.name === 'United States' ? 'text-blue-600' : data.name === 'Canada' ? 'text-red-600' : 'text-slate-600'}`}>
                        {data.value.toFixed(2)}%
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export const CountryTreemap: React.FC<CountryTreemapProps> = ({ data, width = "100%", height = "100%" }) => {
    return (
        <ResponsiveContainer width={width} height={height}>
            <Treemap
                data={data}
                dataKey="value"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#8884d8"
                content={<CustomizedContent />}
                animationDuration={800}
                animationEasing="ease-in-out"
                isAnimationActive={true}
            >
                <Tooltip content={<CustomTooltip />} cursor={false} />
            </Treemap>
        </ResponsiveContainer>
    );
};
