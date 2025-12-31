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
        if (exposure.geography.length === 0) return { USD: 0, CAD: 0, EUR: 0, JPY: 0, GBP: 0, Other: 0 };

        let usd = 0;
        let cad = 0;
        let eur = 0;
        let jpy = 0;
        let gbp = 0;
        let other = 0;

        // List of Eurozone countries for simple mapping
        const eurozone = ['France', 'Germany', 'Netherlands', 'Spain', 'Italy', 'Ireland', 'Belgium', 'Finland'];

        exposure.geography.forEach(g => {
            const region = g.region;
            if (region === 'United States') {
                usd += g.weight;
            } else if (region === 'Canada') {
                cad += g.weight;
            } else if (region === 'Japan') {
                jpy += g.weight;
            } else if (region === 'United Kingdom') {
                gbp += g.weight;
            } else if (eurozone.includes(region)) {
                eur += g.weight;
            } else {
                other += g.weight;
            }
        });

        return { USD: usd, CAD: cad, EUR: eur, JPY: jpy, GBP: gbp, Other: other };
    }, [exposure.geography]);

    // Check if total matches 100 roughly
    const totalCurrency = Object.values(currencyExposure).reduce((a, b) => a + b, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-wallstreet-500 font-mono">Loading index data...</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[98vw] mx-auto p-6 space-y-6 animate-in fade-in duration-500 pb-20">

            <div className="border-b border-wallstreet-700 pb-6 mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold font-mono text-wallstreet-text flex items-center gap-3"><Globe className="text-wallstreet-accent" /> Global 75/25 Index</h2>
                        <p className="text-wallstreet-500 mt-2 max-w-2xl">A custom synthetic benchmark. <span className="font-bold text-wallstreet-text ml-2">75% ACWI (USD) + 25% XIU.TO (CAD)</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                {/* Sector Chart - Takes 7/12 width */}
                <div className="xl:col-span-8 bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <div>
                            <h3 className="text-lg font-bold font-mono text-wallstreet-text">Sector & Factor Exposure</h3>
                            <p className="text-xs text-wallstreet-500">Real allocation data scraped from iShares/BlackRock (as of Dec 30, 2025).</p>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ClevelandDotPlot data={exposure.sectors} />
                    </div>
                </div>

                {/* Sunburst Chart - Takes 5/12 width */}
                <div className="xl:col-span-4 bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col h-[600px]">
                    <h3 className="text-lg font-bold font-mono text-wallstreet-text mb-2 flex-shrink-0">Geographic Breakdown</h3>
                    <div className="flex-1 w-full relative min-h-0">
                        <SunburstChart data={sunburstData} />
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-bold font-mono text-wallstreet-text border-b border-wallstreet-700 pb-2 flex items-center gap-2 mt-8"><Zap size={20} className="text-wallstreet-accent" /> Geographic & Currency Breakdown</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold font-mono text-wallstreet-text flex items-center gap-2"><MapIcon size={18} /> Regional Allocation</h3>
                            <p className="text-xs text-wallstreet-500">Composite geographic exposure from underlying ETFs.</p>
                        </div>
                        <div className="flex-1 overflow-auto max-h-[500px]">
                            <table className="w-full text-sm font-mono">
                                <thead className="bg-wallstreet-100 text-wallstreet-500 text-xs uppercase sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left bg-wallstreet-100">Region</th>
                                        <th className="p-2 text-right bg-wallstreet-100">Weight</th>
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
                            <p className="text-xs text-wallstreet-500">Derived from geographic allocation. (Sum: {totalCurrency.toFixed(2)}%)</p>
                        </div>
                        <div className="flex-1">
                            <ul className="space-y-4 text-sm font-mono">
                                <li className="flex justify-between items-center border-b border-wallstreet-200 pb-3">
                                    <div className="flex items-center gap-2"><Globe size={14} className="text-blue-700" /><span className="font-medium">USD (United States)</span></div>
                                    <span className="font-bold text-blue-700 text-lg">{currencyExposure.USD.toFixed(2)}%</span>
                                </li>
                                <li className="flex justify-between items-center border-b border-wallstreet-200 pb-3">
                                    <div className="flex items-center gap-2"><Globe size={14} className="text-red-700" /><span className="font-medium">CAD (Canada)</span></div>
                                    <span className="font-bold text-red-700 text-lg">{currencyExposure.CAD.toFixed(2)}%</span>
                                </li>
                                <li className="flex justify-between items-center border-b border-wallstreet-200 pb-3">
                                    <div className="flex items-center gap-2"><Globe size={14} className="text-indigo-600" /><span className="font-medium">EUR (Eurozone)</span></div>
                                    <span className="font-bold text-indigo-600 text-lg">{currencyExposure.EUR.toFixed(2)}%</span>
                                </li>
                                <li className="flex justify-between items-center border-b border-wallstreet-200 pb-3">
                                    <div className="flex items-center gap-2"><Globe size={14} className="text-rose-600" /><span className="font-medium">JPY (Japan)</span></div>
                                    <span className="font-bold text-rose-600 text-lg">{currencyExposure.JPY.toFixed(2)}%</span>
                                </li>
                                <li className="flex justify-between items-center border-b border-wallstreet-200 pb-3">
                                    <div className="flex items-center gap-2"><Globe size={14} className="text-purple-600" /><span className="font-medium">GBP (United Kingdom)</span></div>
                                    <span className="font-bold text-purple-600 text-lg">{currencyExposure.GBP.toFixed(2)}%</span>
                                </li>
                                <li className="flex justify-between items-center">
                                    <span className="font-medium text-slate-500">Other (Emerging / Pacific)</span>
                                    <span className="font-bold text-slate-600 text-lg">{currencyExposure.Other.toFixed(2)}%</span>
                                </li>
                            </ul>
                            <div className="mt-8 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 leading-relaxed">
                                <strong>Methodology:</strong> Currency exposure is approximated by mapping geographic regions to their primary currency.
                                "Other" includes China (CNY), Switzerland (CHF), India (INR), Taiwan (TWD) and remaining global markets.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};