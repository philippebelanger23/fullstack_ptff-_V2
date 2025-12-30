import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Globe, TrendingUp, DollarSign, Activity, Map as MapIcon, Zap } from 'lucide-react';

const generateSimulatedData = () => {
    const data = [];
    const days = 365 * 3;

    let price_HXT = 100;
    let price_ACWI = 100;
    let rate_CADX = 1.35;

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);

    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const vol_HXT = 0.008;
        const drift_HXT = 0.00025;
        const change_HXT = drift_HXT + (Math.random() - 0.5) * vol_HXT * 2;
        price_HXT = price_HXT * (1 + change_HXT);

        const vol_ACWI = 0.007;
        const drift_ACWI = 0.0003;
        const change_ACWI = drift_ACWI + (Math.random() - 0.5) * vol_ACWI * 2;
        price_ACWI = price_ACWI * (1 + change_ACWI);

        const change_FX = (Math.random() - 0.5) * 0.005;
        rate_CADX = rate_CADX * (1 + change_FX);
        if (rate_CADX < 1.20) rate_CADX += 0.002;
        if (rate_CADX > 1.46) rate_CADX -= 0.002;

        const start_rate = 1.35;
        const compositeValue = (75 * (price_ACWI / 100) * (rate_CADX / start_rate)) + (25 * (price_HXT / 100));

        data.push({
            date: date.toISOString().split('T')[0],
            "HXT.TO": price_HXT,
            "ACWI": price_ACWI,
            "CAD=X": rate_CADX,
            Composite: compositeValue
        });
    }
    return data;
};

const SECTOR_DATA = [
    { sector: 'Technology', ACWI: 24.0, TSX: 8.5, Index: 20.1 },
    { sector: 'Financials', ACWI: 15.9, TSX: 30.5, Index: 19.5 },
    { sector: 'Energy', ACWI: 4.5, TSX: 17.5, Index: 7.8 },
    { sector: 'Healthcare', ACWI: 11.2, TSX: 0.5, Index: 8.5 },
    { sector: 'Industrials', ACWI: 10.5, TSX: 12.0, Index: 10.9 },
    { sector: 'Cons. Disc.', ACWI: 10.8, TSX: 3.5, Index: 9.0 },
    { sector: 'Materials', ACWI: 4.2, TSX: 11.5, Index: 6.0 },
    { sector: 'Comm. Svcs', ACWI: 7.5, TSX: 4.5, Index: 6.8 },
    { sector: 'Utilities', ACWI: 2.5, TSX: 4.5, Index: 3.0 },
    { sector: 'Real Estate', ACWI: 2.2, TSX: 2.0, Index: 2.1 },
];

export const IndexView: React.FC = () => {
    const [data] = useState(generateSimulatedData());

    const stats = useMemo(() => {
        const start = data[0];
        const end = data[data.length - 1];

        const calcReturn = (startVal: number, endVal: number) => ((endVal - startVal) / startVal) * 100;

        const returns = [];
        for (let i = 1; i < data.length; i++) {
            returns.push((data[i].Composite - data[i - 1].Composite) / data[i - 1].Composite);
        }
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        const annualizedVol = stdDev * Math.sqrt(252) * 100;

        return {
            hxtReturn: calcReturn(start["HXT.TO"], end["HXT.TO"]),
            acwiReturn: calcReturn(start["ACWI"], end["ACWI"]),
            compositeReturn: calcReturn(start.Composite, end.Composite),
            currentFX: end["CAD=X"],
            volatility: annualizedVol,
            sharpe: (calcReturn(start.Composite, end.Composite) / 3) / annualizedVol
        };
    }, [data]);

    const compositionData = [
        { name: 'ACWI (Global USD)', value: 75, color: '#004dea' },
        { name: 'HXT.TO (TSX 60 CAD)', value: 25, color: '#dc2626' },
    ];

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-8 animate-in fade-in duration-500 pb-20">

            <div className="border-b border-wallstreet-700 pb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold font-mono text-wallstreet-text flex items-center gap-3"><Globe className="text-wallstreet-accent" /> Global 75/25 Index</h2>
                        <p className="text-wallstreet-500 mt-2 max-w-2xl">A custom synthetic benchmark. <span className="font-bold text-wallstreet-text ml-2">75% ACWI (USD) + 25% HXT.TO (CAD)</span></p>
                    </div>
                    <div className="text-right bg-white p-3 rounded-lg border border-wallstreet-700 shadow-sm">
                        <div className="text-xs text-wallstreet-500 font-mono uppercase">USD/CAD (CAD=X)</div>
                        <div className="text-xl font-bold font-mono text-green-700">${stats.currentFX.toFixed(4)}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-wallstreet-800 p-6 rounded-xl border border-wallstreet-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={48} /></div>
                    <h3 className="text-xs font-bold font-mono text-wallstreet-500 uppercase tracking-wider">3Y Return</h3>
                    <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-bold font-mono text-wallstreet-text">{stats.compositeReturn.toFixed(2)}%</span></div>
                    <div className="mt-2 text-[10px] font-mono text-wallstreet-500">CAGR: ~{(stats.compositeReturn / 3).toFixed(2)}%</div>
                </div>
                <div className="bg-wallstreet-800 p-6 rounded-xl border border-wallstreet-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={48} /></div>
                    <h3 className="text-xs font-bold font-mono text-wallstreet-500 uppercase tracking-wider">Risk Profile</h3>
                    <div className="mt-2">
                        <span className="text-2xl font-bold font-mono text-wallstreet-text">{stats.volatility.toFixed(1)}%</span>
                        <span className="text-xs ml-1 text-wallstreet-500">Vol</span>
                    </div>
                    <div className="mt-2 text-[10px] font-mono text-wallstreet-500 flex flex-col gap-1"><span>Sharpe Ratio: {stats.sharpe.toFixed(2)}</span></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold font-mono text-wallstreet-text mb-4">Performance Simulation (Rebased to 100)</h3>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickFormatter={(str) => new Date(str).getFullYear().toString()} tick={{ fontSize: 12, fontFamily: 'monospace' }} axisLine={false} tickLine={false} minTickGap={50} />
                                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#000' }} itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }} labelStyle={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b', marginBottom: '8px' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontFamily: 'monospace' }} />
                                <Line type="monotone" dataKey="Composite" name="75/25 Index (CAD)" stroke="#0f172a" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="ACWI" name="ACWI (USD Raw)" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                                <Line type="monotone" dataKey="HXT.TO" name="HXT.TO (TSX60)" stroke="#dc2626" strokeWidth={1} dot={false} opacity={0.6} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold font-mono text-wallstreet-text mb-2">Structure</h3>
                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={compositionData} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                                    {compositionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#000' }} itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontFamily: 'monospace', fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-12">
                            <div className="text-center">
                                <div className="text-3xl font-bold font-mono text-wallstreet-text">100%</div>
                                <div className="text-xs text-wallstreet-500 uppercase">Equity</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-bold font-mono text-wallstreet-text border-b border-wallstreet-700 pb-2 flex items-center gap-2"><Zap size={20} className="text-wallstreet-accent" /> Quantitative Deep Dive</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold font-mono text-wallstreet-text">Sector & Factor Exposure</h3>
                                <p className="text-xs text-wallstreet-500">The 75/25 split corrects the TSX's massive tech underweight.</p>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={SECTOR_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="sector" width={80} tick={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold', fill: '#475569' }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ backgroundColor: '#fff', color: '#000', border: '1px solid #e2e8f0', fontSize: '12px', fontFamily: 'monospace' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                                    <Bar dataKey="ACWI" name="ACWI" fill="#94a3b8" stackId="a" barSize={8} />
                                    <Bar dataKey="TSX" name="TSX" fill="#dc2626" stackId="b" barSize={8} />
                                    <Bar dataKey="Index" name="75/25 Index" fill="#004dea" radius={[0, 4, 4, 0]} barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold font-mono text-wallstreet-text">Geographic & Currency Risk</h3>
                            <p className="text-xs text-wallstreet-500">Breakdown of the underlying currency exposure.</p>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-wallstreet-900 rounded-lg p-4">
                                <h4 className="font-mono text-xs font-bold text-wallstreet-500 uppercase mb-3 flex items-center gap-2"><MapIcon size={14} /> Regional Alloc.</h4>
                                <ul className="space-y-3 text-sm font-mono">
                                    <li className="flex justify-between items-center border-b border-wallstreet-700 pb-2"><span>United States</span><span className="font-bold">~46.5%</span></li>
                                    <li className="flex justify-between items-center border-b border-wallstreet-700 pb-2"><span className="text-red-700 font-bold">Canada</span><span className="font-bold">~28.0%</span></li>
                                    <li className="flex justify-between items-center border-b border-wallstreet-700 pb-2"><span>EAFE (Europe/Asia)</span><span className="font-bold">~14.5%</span></li>
                                    <li className="flex justify-between items-center"><span>Emerging Mkts</span><span className="font-bold">~11.0%</span></li>
                                </ul>
                            </div>

                            <div className="bg-wallstreet-900 rounded-lg p-4">
                                <h4 className="font-mono text-xs font-bold text-wallstreet-500 uppercase mb-3 flex items-center gap-2"><DollarSign size={14} /> Currency Exp.</h4>
                                <ul className="space-y-3 text-sm font-mono">
                                    <li className="flex justify-between items-center border-b border-wallstreet-700 pb-2"><span>USD Exposure</span><span className="font-bold text-blue-700">62.0%</span></li>
                                    <li className="flex justify-between items-center border-b border-wallstreet-700 pb-2"><span>CAD Exposure</span><span className="font-bold text-red-700">25.0%</span></li>
                                    <li className="flex justify-between items-center"><span>Other (EUR/JPY/GBP)</span><span className="font-bold text-gray-600">13.0%</span></li>
                                </ul>
                                <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-yellow-800 leading-tight"><strong>Note:</strong> ACWI is ~62% US. The 75% ACWI weight means ~46% of total portfolio is direct USD.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-wallstreet-700 shadow-sm overflow-hidden">
                    <div className="p-4 bg-wallstreet-900 border-b border-wallstreet-700"><h3 className="text-sm font-bold font-mono text-wallstreet-text uppercase">Historical Stress Test (Simulated)</h3></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono text-left">
                            <thead className="bg-white text-wallstreet-500 border-b border-wallstreet-200">
                                <tr>
                                    <th className="p-3">Scenario</th>
                                    <th className="p-3 text-right">Estimated ACWI Impact</th>
                                    <th className="p-3 text-right">Estimated TSX Impact</th>
                                    <th className="p-3 text-right">FX Impact (CAD)</th>
                                    <th className="p-3 text-right font-bold text-wallstreet-text bg-blue-50">75/25 Index Impact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-wallstreet-100">
                                <tr><td className="p-3 font-medium">Tech Crash (2000 Style)</td><td className="p-3 text-right text-red-600">-35.0%</td><td className="p-3 text-right text-red-400">-12.0%</td><td className="p-3 text-right text-green-600">+8.0% (Flight to USD)</td><td className="p-3 text-right font-bold text-red-600 bg-blue-50/50">-23.4%</td></tr>
                                <tr><td className="p-3 font-medium">Commodity Supercycle</td><td className="p-3 text-right text-green-500">+12.0%</td><td className="p-3 text-right text-green-700">+45.0%</td><td className="p-3 text-right text-red-500">-15.0% (CAD Strengthens)</td><td className="p-3 text-right font-bold text-green-700 bg-blue-50/50">+18.3%</td></tr>
                                <tr><td className="p-3 font-medium">Global Recession</td><td className="p-3 text-right text-red-600">-20.0%</td><td className="p-3 text-right text-red-600">-25.0%</td><td className="p-3 text-right text-green-600">+10.0% (USD Safety)</td><td className="p-3 text-right font-bold text-red-600 bg-blue-50/50">-16.5%</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};