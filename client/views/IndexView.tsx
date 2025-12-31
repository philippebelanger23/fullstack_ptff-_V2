import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Globe, DollarSign, Map as MapIcon, Zap } from 'lucide-react';
import { fetchIndexExposure } from '../services/api';
import { SunburstChart } from '../components/SunburstChart';
import { ClevelandDotPlot } from '../components/ClevelandDotPlot';

export const IndexView: React.FC = () => {
    const [exposure, setExposure] = useState<{ sectors: any[], geography: any[], raw?: any }>({ sectors: [], geography: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const res = await fetchIndexExposure();
            setExposure(res);
            setLoading(false);
        };
        load();
    }, []);

    const compositionData = [
        { name: 'ACWI', value: 75, color: '#4472C4' }, // Excel Blue inner
        { name: 'TSX', value: 25, color: '#ED7D31' }, // Excel Orange inner
    ];

    // Prepare sunburst data (Nested Pie) - GEOGRAPHY based
    const sunburstData = React.useMemo(() => {
        // @ts-ignore
        if (!exposure.raw || !exposure.raw.ACWI) return { inner: [], outer: [] };

        // Colors from Excel Screenshot
        const colorACWI = '#4472C4'; // Blue
        const colorTSX = '#ED7D31';  // Orange

        const inner = [
            { name: 'ACWI', value: 75, color: colorACWI },
            { name: 'TSX', value: 25, color: colorTSX },
        ];

        // Helper to convert dictionary to sorted array
        // @ts-ignore
        const getSortedRegions = (geoDict) => {
            return Object.entries(geoDict)
                // @ts-ignore
                .map(([region, weight]) => ({ name: region, value: weight }))
                // @ts-ignore
                .sort((a, b) => b.value - a.value);
        };

        // @ts-ignore
        const acwiRegions = getSortedRegions(exposure.raw.ACWI.Geography).map((r, i) => {
            // ACWI Children (Blue family)
            // We keep them all the same "Blue" but maybe slightly different shade if desired, 
            // OR strictly identical to create that "solid block with white lines" look from the screenshot.
            // visual inspection of screenshot suggests they are ALL the same blue, just separated by white lines.
            return {
                name: r.name,
                value: r.value * 0.75, // Scale by index weight
                color: '#5B9BD5', // Slightly lighter Excel blue for outer ring
            };
        });

        // @ts-ignore
        const tsxRegions = getSortedRegions(exposure.raw.TSX.Geography).map((r, i) => ({
            name: r.name,
            value: r.value * 0.25,
            color: '#F4B183', // Slightly lighter Excel orange for outer ring
        }));

        return {
            inner,
            outer: [...acwiRegions, ...tsxRegions]
        };
    }, [exposure]);

    // Calculate currency exposure from geography data
    const currencyExposure = React.useMemo(() => {
        if (exposure.geography.length === 0) return [];

        const currencyMap: Record<string, string> = {
            'United States': 'USD',
            'Canada': 'CAD',
            'Japan': 'JPY',
            'United Kingdom': 'GBP',
            'France': 'EUR',
            'Germany': 'EUR',
            'Netherlands': 'EUR',
            'Switzerland': 'CHF',
            'Australia': 'AUD',
            'China': 'CNY',
            'Taiwan': 'TWD',
            'India': 'INR'
        };

        const totals: Record<string, number> = {};

        exposure.geography.forEach(g => {
            const curr = currencyMap[g.region] || 'Other';
            totals[curr] = (totals[curr] || 0) + g.weight;
        });

        // Convert to array and sort
        const sorted = Object.entries(totals)
            .map(([code, weight]) => ({ code, weight }))
            .sort((a, b) => b.weight - a.weight);

        // Always keep USD and CAD at the top if they exist (or just rely on sort if they are big)
        // User asked to break out next top 2.
        // We will return top 4 currencies + Other

        const topCurrencies = sorted.filter(c => c.code !== 'Other').slice(0, 4);
        const otherWeight = sorted
            .filter(c => c.code === 'Other' || !topCurrencies.includes(c))
            .reduce((sum, c) => sum + c.weight, 0);

        if (otherWeight > 0.01) {
            topCurrencies.push({ code: 'Other', weight: otherWeight });
        }

        return topCurrencies;
    }, [exposure.geography]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-wallstreet-500 font-mono">Loading index data...</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[100vw] mx-auto p-6 space-y-8 animate-in fade-in duration-500 pb-20 overflow-x-hidden">

            <div className="border-b border-wallstreet-700 pb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold font-mono text-wallstreet-text flex items-center gap-3"><Globe className="text-wallstreet-accent" /> Global 75/25 Index</h2>
                        <p className="text-wallstreet-500 mt-2 max-w-2xl">A custom synthetic benchmark. <span className="font-bold text-wallstreet-text ml-2">75% ACWI (USD) + 25% XIU.TO (CAD)</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold font-mono text-wallstreet-text">Sector & Factor Exposure</h3>
                            <p className="text-xs text-wallstreet-500">Real allocation data scraped from iShares/BlackRock (as of Dec 30, 2025).</p>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ClevelandDotPlot data={exposure.sectors} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col h-[500px]">
                    <h3 className="text-lg font-bold font-mono text-wallstreet-text mb-2">Geographic Breakdown</h3>
                    <div className="flex-1 w-full relative min-h-0">
                        <SunburstChart data={sunburstData} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-12">
                            <div className="text-center">
                                {/* Center content now handled by inner labels */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-bold font-mono text-wallstreet-text border-b border-wallstreet-700 pb-2 flex items-center gap-2"><Zap size={20} className="text-wallstreet-accent" /> Geographic & Currency Breakdown</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold font-mono text-wallstreet-text flex items-center gap-2"><MapIcon size={18} /> Regional Allocation</h3>
                            <p className="text-xs text-wallstreet-500">Composite geographic exposure from underlying ETFs.</p>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm font-mono">
                                <thead className="bg-wallstreet-100 text-wallstreet-500 text-xs uppercase">
                                    <tr>
                                        <th className="p-2 text-left">Region</th>
                                        <th className="p-2 text-right">Weight</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exposure.geography.map((g, i) => (
                                        <tr key={i} className="border-b border-wallstreet-100 hover:bg-wallstreet-50">
                                            <td className="p-2 font-medium">{g.region}</td>
                                            <td className="p-2 text-right font-bold">{g.weight}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold font-mono text-wallstreet-text flex items-center gap-2"><DollarSign size={18} /> Currency Exposure</h3>
                            <p className="text-xs text-wallstreet-500">Derived from geographic allocation.</p>
                        </div>
                        <div className="flex-1">
                            <ul className="space-y-4 text-sm font-mono">
                                {currencyExposure.map((c) => (
                                    <li key={c.code} className="flex justify-between items-center border-b border-wallstreet-200 pb-3 last:border-0">
                                        <span className="font-medium">{c.code} Exposure</span>
                                        <span className={`font-bold text-lg ${c.code === 'USD' ? 'text-blue-700' : c.code === 'CAD' ? 'text-red-700' : 'text-slate-700'}`}>
                                            {c.weight.toFixed(2)}%
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 leading-relaxed">
                                <strong>Note:</strong> Currency exposure is derived from the geographic allocation. ACWI's ~64% US allocation combined with 75% ACWI weight means approximately {(0.75 * 64.06).toFixed(1)}% of the index is USD-denominated.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};