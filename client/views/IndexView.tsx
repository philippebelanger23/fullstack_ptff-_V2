import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Globe, DollarSign, Map as MapIcon, Zap } from 'lucide-react';
import { fetchIndexExposure } from '../services/api';
import { CountryTreemap } from '../components/CountryTreemap';
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold font-mono text-wallstreet-text">Sector Exposure</h3>
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
                        <CountryTreemap data={(() => {
                            const data = exposure.geography.map(g => ({ name: g.region, value: g.weight }));
                            const total = data.reduce((sum, item) => sum + item.value, 0);
                            if (total < 99.9) {
                                data.push({ name: 'Others', value: 100 - total });
                            }
                            return data;
                        })()} />
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
                                    {(() => {
                                        const geoData = [...exposure.geography];
                                        const total = geoData.reduce((sum, item) => sum + item.weight, 0);
                                        if (total < 99.9) {
                                            geoData.push({ region: 'Others', weight: 100 - total });
                                        }
                                        return geoData.map((g, i) => (
                                            <tr key={i} className={`border-b border-wallstreet-100 hover:bg-wallstreet-50 ${g.region === 'Others' ? 'text-slate-400' : ''}`}>
                                                <td className="p-2 font-medium">{g.region}</td>
                                                <td className={`p-2 text-right ${g.region === 'Others' ? 'font-normal' : 'font-bold'}`}>{g.weight.toFixed(1)}%</td>
                                            </tr>
                                        ));
                                    })()}
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
                                {(() => {
                                    // Ensure currency adds up to 100%
                                    const totalCurrency = currencyExposure.reduce((sum, c) => sum + c.weight, 0);
                                    let finalCurrency = [...currencyExposure];

                                    if (totalCurrency < 99.9) {
                                        const diff = 100 - totalCurrency;
                                        // Check if 'Other' already exists
                                        const otherIndex = finalCurrency.findIndex(c => c.code === 'Other');
                                        if (otherIndex >= 0) {
                                            finalCurrency[otherIndex].weight += diff;
                                        } else {
                                            finalCurrency.push({ code: 'Other', weight: diff });
                                        }
                                    }

                                    return finalCurrency.map((c) => (
                                        <li key={c.code} className={`flex justify-between items-center border-b border-wallstreet-200 pb-3 last:border-0 ${c.code === 'Other' ? 'text-slate-400' : ''}`}>
                                            <span className="font-medium">{c.code} Exposure</span>
                                            <span className={`font-bold text-lg ${c.code === 'Other' ? 'text-slate-400 font-normal' : c.code === 'USD' ? 'text-blue-700' : c.code === 'CAD' ? 'text-red-700' : 'text-slate-700'}`}>
                                                {c.weight.toFixed(1)}%
                                            </span>
                                        </li>
                                    ));
                                })()}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};