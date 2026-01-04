import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface IndexPerformanceChartProps {
    data: Record<string, { date: string, value: number }[]>;
}

export const IndexPerformanceChart: React.FC<IndexPerformanceChartProps> = ({ data }) => {
    const chartData = useMemo(() => {
        const acwi = data['ACWI'] || [];
        const xiu = data['XIU.TO'] || [];

        if (acwi.length === 0 || xiu.length === 0) return [];

        // Create a map for quick lookup by date
        const dateMap = new Map<string, { date: string, ACWI?: number, XIU?: number }>();

        acwi.forEach(item => {
            dateMap.set(item.date, { date: item.date, ACWI: item.value });
        });

        xiu.forEach(item => {
            const existing = dateMap.get(item.date) || { date: item.date };
            dateMap.set(item.date, { ...existing, XIU: item.value });
        });

        // Convert map to array and sort by date
        const combined = Array.from(dateMap.values())
            .filter(item => item.ACWI !== undefined && item.XIU !== undefined) // Only keep overlapping dates
            .sort((a, b) => a.date.localeCompare(b.date));

        // Normalize to start at 0%
        if (combined.length > 0) {
            const startACWI = combined[0].ACWI!;
            const startXIU = combined[0].XIU!;

            return combined.map(item => ({
                date: item.date,
                ACWI: ((item.ACWI! - startACWI) / startACWI) * 100,
                XIU: ((item.XIU! - startXIU) / startXIU) * 100,
            }));
        }

        return [];
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-wallstreet-500 font-mono text-sm">
                Insufficient data for graph
            </div>
        );
    }

    // Date formatters
    const formatYear = (str: string) => {
        const date = new Date(str);
        return date.getFullYear().toString();
    };

    const formatTooltipDate = (str: string) => {
        const date = new Date(str);
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    };

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatYear}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={50}
                    />
                    <YAxis
                        tickFormatter={(val) => `${val > 0 ? '+' : ''}${val.toFixed(0)}%`}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: '#e2e8f0',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontFamily: 'monospace'
                        }}
                        formatter={(val: number) => [`${val > 0 ? '+' : ''}${val.toFixed(2)}%`]}
                        labelFormatter={formatTooltipDate}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <Line
                        type="monotone"
                        dataKey="ACWI"
                        name="Global (ACWI)"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                    />
                    <Line
                        type="monotone"
                        dataKey="XIU"
                        name="Canada (XIU)"
                        stroke="#dc2626"
                        strokeWidth={2}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
