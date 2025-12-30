import React, { useMemo, useState } from 'react';
import { PortfolioItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine, ScatterChart, Scatter, ZAxis, ComposedChart, Line } from 'recharts';
import { KPICard } from '../components/KPICard';
import { TrendingUp, Target, AlertTriangle, Calendar, Grid, Activity, Percent, Layers, Zap, Scale } from 'lucide-react';

interface AttributionViewProps {
    data: PortfolioItem[];
}

const formatPct = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '-';
    // ... (keep existing formatters)
    const abs = Math.abs(val);
    const str = `${abs.toFixed(2)}%`;
    return val < 0 ? `(${str})` : str;
};

const formatBps = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '-';
    const bps = Math.round(val * 100);
    const abs = Math.abs(bps);
    return val < 0 ? `(${abs})` : `${bps}`;
};

// ... (KPICard, TornadoLabel, TableItem, AttributionTable remain the same but I need to be careful not to delete them if I'm replacing a chunk. 
// Actually I should just replace the imports and then the useMemo part. I'll split this into two edits if needed, or one big one if contiguous.)



// KPICard removed - imported from components

const TornadoLabel = (props: any) => {
    const { x, y, width, height, value, payload } = props;
    // value can be absolute in some Recharts versions, so we rely on payload.value
    const realValue = payload && payload.value !== undefined ? payload.value : value;
    const isPos = realValue >= 0;
    const offset = 5;

    // Calculate visual endpoints of the bar
    // Recharts might send negative width for negative bars, or shift x.
    // robust way is to find min/max x.
    const barEnd = isPos ? Math.max(x, x + width) : Math.min(x, x + width);

    return (
        <text
            x={isPos ? barEnd + offset : barEnd - offset}
            y={y + height / 2 + 1}
            fill={isPos ? '#16a34a' : '#dc2626'}
            textAnchor={isPos ? 'start' : 'end'}
            dominantBaseline="central"
            className="text-[10px] font-mono font-bold"
        >
            {realValue > 0 ? '+' : ''}{Number(realValue).toFixed(2)}%
        </text>
    );
};

interface TableItem {
    ticker: string;
    weight: number;
    returnPct?: number;
    contribution: number;
}

const AttributionTable = ({ title, items }: { title: string, items: TableItem[] }) => {
    const positives = items.filter(i => i.contribution >= 0).sort((a, b) => b.contribution - a.contribution);
    const negatives = items.filter(i => i.contribution < 0).sort((a, b) => a.contribution - b.contribution);
    const topContributors = positives.slice(0, 5);
    const topContribSum = topContributors.reduce((acc, i) => ({ weight: acc.weight + i.weight, contribution: acc.contribution + i.contribution }), { weight: 0, contribution: 0 });
    const topDisruptors = negatives.slice(0, 5);
    const topDisruptSum = topDisruptors.reduce((acc, i) => ({ weight: acc.weight + i.weight, contribution: acc.contribution + i.contribution }), { weight: 0, contribution: 0 });
    const topTickerSet = new Set([...topContributors, ...topDisruptors].map(i => i.ticker));
    const others = items.filter(i => !topTickerSet.has(i.ticker));
    const othersSum = others.reduce((acc, i) => ({ weight: acc.weight + i.weight, contribution: acc.contribution + i.contribution }), { weight: 0, contribution: 0 });
    const othersReturn = othersSum.weight > 0 ? (othersSum.contribution / othersSum.weight) * 100 : 0;
    const totalSum = items.reduce((acc, i) => ({ weight: acc.weight + i.weight, contribution: acc.contribution + i.contribution }), { weight: 0, contribution: 0 });

    const RenderRow = ({ item, isBold = false, isSum = false }: { item: TableItem | any, isBold?: boolean, isSum?: boolean }) => (
        <tr className={`border-b border-wallstreet-100 ${isSum ? 'bg-gray-50/50' : ''}`}>
            <td className={`p-1.5 pl-3 text-left font-mono ${isBold || isSum ? 'font-bold text-wallstreet-text' : 'font-medium text-wallstreet-500'}`}>{isSum ? 'Σ' : item.ticker}</td>
            <td className={`p-1.5 text-right font-mono ${isBold || isSum ? 'font-bold text-wallstreet-text' : 'text-wallstreet-500'}`}>{item.weight.toFixed(2)}%</td>
            <td className={`p-1.5 text-right font-mono ${isBold || isSum ? 'font-bold' : ''} ${item.returnPct !== undefined ? (item.returnPct >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>{item.returnPct !== undefined ? formatPct(item.returnPct) : '-'}</td>
            <td className={`p-1.5 pr-3 text-right font-mono font-bold ${item.contribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatBps(item.contribution)}</td>
        </tr>
    );

    return (
        <div className="bg-white border border-wallstreet-700 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
            <div className="bg-black text-white p-2 text-center font-mono font-bold uppercase tracking-widest text-sm">{title}</div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-xs font-mono">
                    <thead className="bg-wallstreet-900 border-b border-wallstreet-700 text-wallstreet-500">
                        <tr>
                            <th className="p-2 text-left w-1/4">Ticker</th>
                            <th className="p-2 text-right w-1/4">Weight</th>
                            <th className="p-2 text-right w-1/4">Performance</th>
                            <th className="p-2 text-right w-1/4">Contrib. (bps)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-gray-50"><td colSpan={4} className="p-1.5 text-center font-bold text-wallstreet-500 uppercase text-[10px] tracking-wider border-b border-wallstreet-100">Top Contributors</td></tr>
                        {topContributors.map((item, idx) => <RenderRow key={idx} item={item} />)}
                        <RenderRow item={{ ticker: '', weight: topContribSum.weight, returnPct: undefined, contribution: topContribSum.contribution }} isSum={true} />
                        <tr className="bg-gray-50"><td colSpan={4} className="p-1.5 text-center font-bold text-wallstreet-500 uppercase text-[10px] tracking-wider border-b border-wallstreet-100 border-t border-wallstreet-200">Top Disruptors</td></tr>
                        {topDisruptors.map((item, idx) => <RenderRow key={idx} item={item} />)}
                        <RenderRow item={{ ticker: '', weight: topDisruptSum.weight, returnPct: undefined, contribution: topDisruptSum.contribution }} isSum={true} />
                    </tbody>
                    <tfoot className="bg-wallstreet-100 border-t-2 border-wallstreet-700">
                        <tr className="border-b border-wallstreet-200">
                            <td className="p-2 pl-3 text-left font-mono font-bold text-wallstreet-500 text-[10px] uppercase">Other Holdings</td>
                            <td className="p-2 text-right font-mono font-medium">{othersSum.weight.toFixed(2)}%</td>
                            <td className={`p-2 text-right font-mono font-medium ${othersReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPct(othersReturn)}</td>
                            <td className={`p-2 pr-3 text-right font-mono font-bold ${othersSum.contribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatBps(othersSum.contribution)}</td>
                        </tr>
                        <tr className="bg-wallstreet-200/50">
                            <td className="p-2 pl-3 text-left font-mono font-extrabold text-wallstreet-text text-[10px] uppercase">Total Portfolio</td>
                            <td className="p-2 text-right font-mono font-bold text-wallstreet-text">{totalSum.weight.toFixed(2)}%</td>
                            <td className="p-2 text-right font-mono font-bold text-gray-400">-</td>
                            <td className={`p-2 pr-3 text-right font-mono font-extrabold ${totalSum.contribution >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatBps(totalSum.contribution)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export const AttributionView: React.FC<AttributionViewProps> = ({ data }) => {
    const [viewMode, setViewMode] = useState<'OVERVIEW' | 'MONTHLY' | 'QUARTERLY'>('OVERVIEW');
    const [timeRange, setTimeRange] = useState<'YTD' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('YTD');

    const cleanData = useMemo(() => data.filter(d => !d.ticker.toUpperCase().includes('CASH') && !d.ticker.includes('$')), [data]);

    const { allMonths, primaryYear } = useMemo(() => {
        if (cleanData.length === 0) return { allMonths: [], primaryYear: new Date().getFullYear() };
        const dates = cleanData.map(d => new Date(d.date).getTime());
        const maxDate = new Date(Math.max(...dates));
        const year = maxDate.getFullYear();
        const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
        return { allMonths: months, primaryYear: year };
    }, [cleanData]);

    const filteredOverviewData = useMemo(() => {
        if (timeRange === 'YTD') return cleanData;
        const quarters: Record<string, number[]> = { 'Q1': [0, 1, 2], 'Q2': [3, 4, 5], 'Q3': [6, 7, 8], 'Q4': [9, 10, 11] };
        const allowedMonths = quarters[timeRange];
        return cleanData.filter(d => allowedMonths.includes(new Date(d.date).getMonth()));
    }, [cleanData, timeRange]);

    const uniqueTickers = useMemo(() => Array.from(new Set(filteredOverviewData.map(d => d.ticker))), [filteredOverviewData]);

    const tickerStats = useMemo(() => {
        // 1. First, calculate Portfolio Monthly Returns for Beta calculation
        const portfolioMonthlyReturns: Record<string, number> = {};
        allMonths.forEach(m => {
            const key = `${m.getFullYear()}-${m.getMonth()}`;
            portfolioMonthlyReturns[key] = 0;
        });

        // We need to aggregate contributions by month across all tickers first to get the "Market/Portfolio" return series
        // Actually we can use heatmapTotals logic, but that is calculated AFTER. Let's pull it up or duplicate simple logic.
        const portRetSeries: number[] = [];

        allMonths.forEach(month => {
            const key = `${month.getFullYear()}-${month.getMonth()}`;
            // Filter data for this month
            const monthData = filteredOverviewData.filter(d => {
                const dDate = new Date(d.date);
                return dDate.getFullYear() === month.getFullYear() && dDate.getMonth() === month.getMonth();
            });
            const sumContrib = monthData.reduce((sum, d) => sum + (d.contribution || 0), 0);
            portfolioMonthlyReturns[key] = sumContrib;
            portRetSeries.push(sumContrib);
        });

        const portMean = portRetSeries.reduce((a, b) => a + b, 0) / (portRetSeries.length || 1);
        const portVariance = portRetSeries.reduce((a, b) => a + Math.pow(b - portMean, 2), 0) / (portRetSeries.length || 1);

        return uniqueTickers.map(ticker => {
            const history = filteredOverviewData.filter(d => d.ticker === ticker);
            const totalContrib = history.reduce((sum, item) => sum + (item.contribution || 0), 0);
            // Removed avgWeight calculation as per user request

            // Calculate StdDev of *Contribution* (Risk Contribution Proxy) and *Return* (Standalone Risk)
            // Ideally we need Returns for Beta.
            // Let's build the monthly return series for this ticker
            const tickerRetSeries: number[] = [];
            const tickerContribSeries: number[] = [];

            allMonths.forEach(month => {
                const key = `${month.getFullYear()}-${month.getMonth()}`;
                const entry = history.find(d => {
                    const dDate = new Date(d.date);
                    return dDate.getFullYear() === month.getFullYear() && dDate.getMonth() === month.getMonth();
                });
                tickerRetSeries.push(entry ? (entry.returnPct || 0) : 0);
                tickerContribSeries.push(entry ? (entry.contribution || 0) : 0);
            });

            // Volatility of Contribution (How much it shakes the boat)
            const meanContrib = tickerContribSeries.reduce((a, b) => a + b, 0) / (tickerContribSeries.length || 1);
            const varianceContrib = tickerContribSeries.reduce((a, b) => a + Math.pow(b - meanContrib, 2), 0) / (tickerContribSeries.length || 1);
            const stdDevContrib = Math.sqrt(varianceContrib);

            // Beta Calculation (Covariance(TickerContrib, PortContrib) / Var(PortContrib))
            // using Contribution series for Beta to see "contribution to portfolio swing"
            let covariance = 0;
            for (let i = 0; i < portRetSeries.length; i++) {
                covariance += (tickerContribSeries[i] - meanContrib) * (portRetSeries[i] - portMean);
            }
            covariance /= (portRetSeries.length || 1);

            const beta = portVariance !== 0 ? covariance / portVariance : 0;

            // Risk Contribution = Beta * Portfolio StdDev (Since we are using contribution series, this is direct)
            // Or simply use stdDevContrib as "Marginal Risk Contribution" proxy for display

            // Get latest weight for "Current Exposure" sorting logic
            // Find the entry with the max date in the history
            const latestEntry = history.reduce((latest, current) => {
                return new Date(current.date).getTime() > new Date(latest.date).getTime() ? current : latest;
            }, history[0]);
            const latestWeight = latestEntry ? latestEntry.weight : 0;

            return { ticker, totalContrib, history, latestWeight, stdDevContrib, beta, riskScore: stdDevContrib };
        });
    }, [uniqueTickers, filteredOverviewData, allMonths]);

    const sortedByContrib = useMemo(() => [...tickerStats].sort((a, b) => b.totalContrib - a.totalContrib), [tickerStats]);
    // Update: Sort by latestWeight instead of avgWeight to match Dashboard logic
    const sortedByWeight = useMemo(() => [...tickerStats].sort((a, b) => b.latestWeight - a.latestWeight), [tickerStats]);

    const capitalEfficiencyData = useMemo(() => {
        // Calculate Total Portfolio Contribution (Sum of all ticker total contributions)
        const totalPortfolioContrib = tickerStats.reduce((sum, t) => sum + t.totalContrib, 0);

        // Sort by Weight Descending and take Top 10
        const top10 = [...tickerStats]
            .sort((a, b) => b.latestWeight - a.latestWeight)
            .slice(0, 10);

        return top10.map(s => {
            const shareOfTotal = totalPortfolioContrib !== 0 ? (s.totalContrib / totalPortfolioContrib) : 0;
            return {
                ticker: s.ticker,
                x: s.latestWeight, // Use latestWeight explicitly for X-axis
                y: shareOfTotal * 100, // Share of Total Return %
                absoluteContrib: s.totalContrib,
                z: 1
            };
        });
    }, [tickerStats]);

    // Calculate max domain for consistent 1:1 line rendering
    // Calculate max domain for consistent 1:1 line rendering
    const { maxDomain, axisTicks } = useMemo(() => {
        if (capitalEfficiencyData.length === 0) return { maxDomain: 10, axisTicks: [0, 2, 4, 6, 8, 10] };

        const maxX = Math.max(...capitalEfficiencyData.map(d => d.x));
        const maxY = Math.max(...capitalEfficiencyData.map(d => d.y));
        const rawMax = Math.max(maxX, maxY) * 1.05; // Reduced buffering to 5%

        // Find nice step size to ensure constant integer steps
        // Try to target roughly 4-6 intervals
        let step = 1;
        if (rawMax > 40) step = 10;
        else if (rawMax > 20) step = 5;
        else if (rawMax > 8) step = 2; // e.g. max 14 -> steps of 2 -> 0, 2, 4... 14
        else step = 1;

        const niceMax = Math.ceil(rawMax / step) * step;

        // Generate ticks
        const ticks = [];
        for (let i = 0; i <= niceMax; i += step) {
            ticks.push(i);
        }

        return { maxDomain: niceMax, axisTicks: ticks };
    }, [capitalEfficiencyData]);

    const matrixData = sortedByContrib.map(stat => {
        const row: any = { ticker: stat.ticker, total: stat.totalContrib, latestWeight: stat.latestWeight }; // Use latestWeight explicitly
        allMonths.forEach(monthDate => {
            const m = monthDate.getMonth();
            const y = monthDate.getFullYear();
            const monthlyEntries = stat.history.filter(h => {
                const d = new Date(h.date);
                return d.getMonth() === m && d.getFullYear() === y;
            });
            const key = `${y}-${m}`;
            row[key] = monthlyEntries.length > 0 ? monthlyEntries.reduce((acc, curr) => acc + (curr.contribution || 0), 0) : null;
            // Capture max weight for this month to determine if 0.00% is due to strict 0 position
            row[`w-${key}`] = monthlyEntries.length > 0 ? Math.max(...monthlyEntries.map(e => e.weight)) : 0;
        });
        return row;
    });

    const heatmapTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        const hasDataMap: Record<string, boolean> = {};
        const monthlyReturns: number[] = [];
        let grandTotal = 0;

        allMonths.forEach(date => {
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            totals[key] = 0;
            hasDataMap[key] = false;
        });

        matrixData.forEach(row => {
            grandTotal += row.total;
            allMonths.forEach(date => {
                const key = `${date.getFullYear()}-${date.getMonth()}`;
                const val = row[key];
                if (val !== null && val !== undefined) {
                    totals[key] += val;
                    hasDataMap[key] = true;
                }
            });
        });

        allMonths.forEach(date => {
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            if (hasDataMap[key]) monthlyReturns.push(totals[key]);
        });

        return { totals, grandTotal, hasDataMap, monthlyReturns };
    }, [matrixData, allMonths]);

    const waterfallData = useMemo(() => {
        if (sortedByWeight.length === 0) return [];
        const top10 = sortedByWeight.slice(0, 10);
        const top10Tickers = new Set(top10.map(i => i.ticker));
        const others = sortedByWeight.filter(i => !top10Tickers.has(i.ticker));
        const othersSum = others.reduce((sum, i) => sum + i.totalContrib, 0);

        const dataPoints: any[] = [];
        let currentVal = 0;

        top10.forEach(item => {
            const start = currentVal;
            const end = currentVal + item.totalContrib;
            dataPoints.push({ name: item.ticker, value: [start < end ? start : end, start < end ? end : start], delta: item.totalContrib, isTotal: false, color: item.totalContrib >= 0 ? '#16a34a' : '#dc2626' });
            currentVal = end;
        });

        if (Math.abs(othersSum) > 0.001 || others.length > 0) {
            const start = currentVal;
            const end = currentVal + othersSum;
            dataPoints.push({ name: 'Others', value: [start < end ? start : end, start < end ? end : start], delta: othersSum, isTotal: false, color: othersSum >= 0 ? '#16a34a' : '#dc2626' });
            currentVal = end;
        }

        dataPoints.push({ name: 'Total', value: [0, currentVal], delta: currentVal, isTotal: true, color: '#0369a1' });
        return dataPoints;
    }, [sortedByWeight]);

    const waterfallDomain = useMemo(() => {
        if (waterfallData.length === 0) return [0, 10];
        let min = 0;
        let max = 0;
        waterfallData.forEach(d => {
            if (d.value[0] < min) min = d.value[0];
            if (d.value[1] < min) min = d.value[1];
            if (d.value[0] > max) max = d.value[0];
            if (d.value[1] > max) max = d.value[1];
        });

        // Add a tiny buffer (5%) so the top label doesn't get cut off, but keep it tight
        const range = max - min;
        const buffer = range * 0.05;

        return [min, max + buffer];
    }, [waterfallData]);

    const topMoversChartData = useMemo(() => {
        const topPos = sortedByContrib.filter(i => i.totalContrib > 0).slice(0, 5);
        const topNeg = sortedByContrib.filter(i => i.totalContrib < 0).slice(-5);
        const combined = [...topPos, ...topNeg].sort((a, b) => b.totalContrib - a.totalContrib);
        const maxAbs = combined.length > 0 ? Math.max(...combined.map(i => Math.abs(i.totalContrib))) : 1;
        const domainLimit = maxAbs * 1.6;
        const data = combined.map(i => ({ ticker: i.ticker, value: i.totalContrib, fill: i.totalContrib >= 0 ? '#16a34a' : '#dc2626' }));
        return { data, domain: [-domainLimit, domainLimit] };
    }, [sortedByContrib]);

    const activeReturn = heatmapTotals.grandTotal;
    const sharpeRatio = useMemo(() => {
        const returns = heatmapTotals.monthlyReturns;
        if (returns.length < 2) return 0;
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
        const stdDev = Math.sqrt(variance);
        if (stdDev === 0) return 0;
        return (mean / stdDev) * Math.sqrt(12);
    }, [heatmapTotals.monthlyReturns]);

    if (!cleanData.some(d => d.contribution !== undefined)) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <div className="bg-wallstreet-800 p-8 rounded-xl border border-wallstreet-700 shadow-sm max-w-lg">
                    <AlertTriangle size={48} className="text-wallstreet-accent mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-wallstreet-text mb-2">No Attribution Data Found</h2>
                    <p className="text-wallstreet-500 mb-6">Import a dataset with Return and Contribution columns.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[100vw] mx-auto p-4 md:p-6 space-y-6 overflow-x-hidden min-h-screen">
            <header className="border-b border-wallstreet-700 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold font-mono text-wallstreet-text">Performance Attribution</h2>
                    <p className="text-wallstreet-500 mt-1 text-sm">Allocation vs. Selection Effect Analysis (Excl. Cash)</p>
                </div>
                <div className="flex p-1 bg-wallstreet-200 rounded-lg">
                    <button onClick={() => setViewMode('OVERVIEW')} className={`px-4 py-2 rounded-md text-xs font-bold font-mono transition-all flex items-center gap-2 ${viewMode === 'OVERVIEW' ? 'bg-white text-wallstreet-accent shadow-sm' : 'text-wallstreet-500 hover:text-wallstreet-text'}`}><Grid size={14} /> Overview</button>
                    <button onClick={() => setViewMode('MONTHLY')} className={`px-4 py-2 rounded-md text-xs font-bold font-mono transition-all flex items-center gap-2 ${viewMode === 'MONTHLY' ? 'bg-white text-wallstreet-accent shadow-sm' : 'text-wallstreet-500 hover:text-wallstreet-text'}`}><Calendar size={14} /> Monthly</button>
                    <button onClick={() => setViewMode('QUARTERLY')} className={`px-4 py-2 rounded-md text-xs font-bold font-mono transition-all flex items-center gap-2 ${viewMode === 'QUARTERLY' ? 'bg-white text-wallstreet-accent shadow-sm' : 'text-wallstreet-500 hover:text-wallstreet-text'}`}><Layers size={14} /> Quarterly</button>
                </div>
            </header>

            {viewMode === 'OVERVIEW' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-end">
                        <div className="flex items-center bg-white border border-wallstreet-700 rounded-lg p-1 shadow-sm">
                            {['YTD', 'Q1', 'Q2', 'Q3', 'Q4'].map((period) => (
                                <button key={period} onClick={() => setTimeRange(period as any)} className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all ${timeRange === period ? 'bg-wallstreet-text text-white shadow-md' : 'text-wallstreet-500 hover:bg-slate-100'}`}>{period}</button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard title="Active Return" value={`${activeReturn > 0 ? '+' : ''}${activeReturn.toFixed(2)}%`} subtext="Total Portfolio Return" icon={null} colorClass={activeReturn >= 0 ? 'text-green-600' : 'text-red-600'} />
                        <KPICard title="Sharpe Ratio (Dummy)" value={sharpeRatio.toFixed(2)} subtext="Risk-Adjusted (Ann.)" icon={null} colorClass="text-wallstreet-accent" />
                        <KPICard title="Agg. Div Yield (Dummy)" value="1.45%" subtext="Est. 12M Trailing" icon={Percent} colorClass="text-wallstreet-text" />
                        <KPICard title="Beta vs Bench (Dummy)" value="1.00" subtext="Benchmark Correlation" icon={Target} colorClass="text-wallstreet-text" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[500px]">
                        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col">
                            <div className="mb-4">
                                <h3 className="font-mono font-bold text-wallstreet-text uppercase tracking-wider text-sm flex items-center gap-2"><TrendingUp size={16} className="text-wallstreet-500" /> Return Waterfall </h3>
                            </div>
                            <div className="flex-1 w-full min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#64748b' }} interval={0} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                        <YAxis domain={waterfallDomain} tickFormatter={(val) => `${val.toFixed(1)}%`} tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-white text-black text-xs p-2 rounded shadow-xl font-mono border border-wallstreet-200">
                                                        <div className="font-bold border-b border-wallstreet-200 pb-1 mb-1">{d.name}</div>
                                                        <div>Impact: <span className={d.delta >= 0 ? 'text-green-600' : 'text-red-600'}>{d.delta > 0 ? '+' : ''}{d.delta.toFixed(2)}%</span></div>
                                                        {!d.isTotal && <div className="text-slate-500 mt-1">Cumulative: {d.value[1].toFixed(2)}%</div>}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <ReferenceLine y={0} stroke="#94a3b8" />
                                        <Bar dataKey="value" radius={[2, 2, 2, 2]}>
                                            {waterfallData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            <LabelList dataKey="delta" position="top" formatter={(val: number) => Math.abs(val) > 0.001 ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : ''} style={{ fill: '#64748b', fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace' }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="lg:col-span-4 flex flex-col md:gap-4 gap-4 h-full">
                            <div className="bg-white p-4 rounded-xl border border-wallstreet-700 shadow-sm flex-1 flex flex-col min-h-[220px]">
                                <h3 className="font-mono font-bold text-wallstreet-text uppercase tracking-wider text-xs flex items-center gap-2 mb-2"><Scale size={14} className="text-wallstreet-500" /> Capital Efficiency (Top 10)</h3>
                                <div className="flex-1 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis type="number" dataKey="x" name="Weight" unit="%" tick={{ fontSize: 10 }} tickFormatter={(val: number) => `${val.toFixed(1)}`} label={{ value: 'Weight %', position: 'bottom', offset: 0, fontSize: 10 }} domain={[0, maxDomain]} allowDecimals={false} ticks={axisTicks} />
                                            <YAxis type="number" dataKey="y" name="Share of Return" unit="%" tick={{ fontSize: 10 }} tickFormatter={(val: number) => `${val.toFixed(1)}`} label={{ value: 'Share of Return %', angle: -90, position: 'insideLeft', fontSize: 10 }} domain={[0, maxDomain]} allowDecimals={false} ticks={axisTicks} />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-white text-black text-xs p-2 rounded shadow-xl font-mono border border-wallstreet-200 z-50 min-w-[140px]">
                                                            <div className="font-bold border-b border-wallstreet-200 pb-1 mb-2">{d.ticker}</div>
                                                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                                                                <span className="text-slate-500 font-medium text-left">Contrib:</span>
                                                                <span className="text-right font-bold text-slate-700">
                                                                    {d.absoluteContrib > 0 ? '+' : ''}{d.absoluteContrib.toFixed(2)}%
                                                                </span>

                                                                <span className="text-slate-500 font-medium text-left">Weight:</span>
                                                                <span className="text-right font-bold text-slate-700">{d.x.toFixed(2)}%</span>

                                                                <span className="text-slate-500 font-medium text-left">Share of Return %:</span>
                                                                <span className={`text-right font-bold ${d.y < d.x ? 'text-red-600' : 'text-green-600'}`}>
                                                                    {d.y.toFixed(2)}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }} />
                                            {/* Horizontal Reference Line at 0 */}
                                            <ReferenceLine y={0} stroke="#94a3b8" />
                                            {/* Dynamic Reference Line 0,0 to max,max to show 1:1 efficiency ratio */}
                                            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: maxDomain, y: maxDomain }]} stroke="#94a3b8" strokeDasharray="3 3" />
                                            <Scatter name="Tickers" data={capitalEfficiencyData} fill="#0369a1">
                                                {capitalEfficiencyData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.y > entry.x ? '#16a34a' : '#dc2626'} />
                                                ))}
                                                <LabelList dataKey="ticker" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace', fill: '#1e293b' }} offset={5} />
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-3 bg-white p-4 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col">
                            <div className="mb-2">
                                <h3 className="font-mono font-bold text-wallstreet-text uppercase tracking-wider text-xs flex items-center gap-2"><Activity size={14} className="text-wallstreet-500" /> Top Movers (%)</h3>
                            </div>
                            <div className="flex-1 w-full min-h-[200px] flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={topMoversChartData.data} margin={{ top: 0, right: 30, left: 30, bottom: 0 }} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" domain={topMoversChartData.domain} hide />
                                        <YAxis type="category" dataKey="ticker" width={45} tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#475569', fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={0} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-white text-black text-xs p-2 rounded shadow-xl font-mono border border-wallstreet-200 z-50">
                                                        <div className="font-bold border-b border-wallstreet-200 pb-1 mb-1 text-center">{d.ticker}</div>
                                                        <div className="text-center"><span className={d.value >= 0 ? 'text-green-600' : 'text-red-600'}>{d.value > 0 ? '+' : ''}{d.value.toFixed(2)}%</span></div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <ReferenceLine x={0} stroke="#94a3b8" />
                                        <Bar dataKey="value" radius={[2, 2, 2, 2]}>
                                            {topMoversChartData.data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                            <LabelList dataKey="value" content={TornadoLabel} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-wallstreet-700 shadow-lg overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b border-wallstreet-700 bg-wallstreet-50/50">
                            <div>
                                <h3 className="text-sm font-mono font-bold text-wallstreet-text uppercase tracking-wider">Contribution Heatmap</h3>
                                <p className="text-[10px] text-wallstreet-500 mt-1 font-mono">BPS contribution per ticker. Bottom row represents the aggregate portfolio return for the period.</p>
                            </div>
                        </div>
                        <div className="w-full">
                            <table className="w-full text-xs border-collapse table-fixed">
                                <thead>
                                    <tr>
                                        <th className="p-3 text-center font-mono font-bold uppercase text-wallstreet-500 bg-wallstreet-900 border-b border-wallstreet-700 w-32">Ticker</th>
                                        {allMonths.map(date => (
                                            <th key={date.toISOString()} className="py-3 text-center font-mono font-bold uppercase text-wallstreet-500 bg-wallstreet-900 border-b border-wallstreet-700">
                                                {date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                            </th>
                                        ))}
                                        <th className="p-3 text-center font-mono font-extrabold uppercase text-wallstreet-text bg-wallstreet-900 border-b border-wallstreet-700 border-l border-wallstreet-300 w-20">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrixData.map((row) => (
                                        <tr key={row.ticker} className="hover:bg-gray-50 transition-colors group">
                                            <td className="p-3 font-mono font-extrabold text-wallstreet-text border-b border-wallstreet-100 truncate text-sm">{row.ticker}</td>
                                            {allMonths.map(date => {
                                                const val = row[`${date.getFullYear()}-${date.getMonth()}`];
                                                const intensity = val !== null ? Math.min(Math.abs(val) / 2.0, 1) : 0;
                                                let bg = '#f8fafc';
                                                if (val !== null) bg = val >= 0 ? `rgba(22, 163, 74, ${0.1 + (intensity * 0.9)})` : `rgba(220, 38, 38, ${0.1 + (intensity * 0.9)})`;
                                                if (val !== null && Math.abs(val) < 0.0001) bg = '#ffffff';
                                                const color = (val !== null && intensity > 0.5) ? 'white' : (val !== null && val >= 0 ? '#14532d' : '#7f1d1d');

                                                return (
                                                    <td key={date.toISOString()} className="p-0 border-b border-white relative group/cell">
                                                        {(() => {
                                                            const maxW = row[`w-${date.getFullYear()}-${date.getMonth()}`];
                                                            const isZeroVal = val !== null && Math.abs(val) < 0.0001;
                                                            const isZeroWeight = maxW !== undefined && maxW < 0.0001;
                                                            const showHyphen = val === null || (isZeroVal && isZeroWeight);

                                                            // Adjust bg if showing hyphen to match "no data" style
                                                            const displayBg = showHyphen ? '#f8fafc' : bg;

                                                            return (
                                                                <div className="w-full h-10 flex items-center justify-center font-mono font-medium cursor-default transition-transform hover:scale-110 hover:z-20 hover:shadow-sm relative" style={{ backgroundColor: displayBg, color }}>
                                                                    {!showHyphen ? <span className="opacity-100">{val! > 0 ? '+' : ''}{val!.toFixed(2)}%</span> : <span className="text-gray-300">-</span>}
                                                                    {!showHyphen && val !== null && (
                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-3 py-2 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover/cell:opacity-100 pointer-events-none z-30 whitespace-nowrap shadow-xl flex flex-col items-center gap-1">
                                                                            <div className="font-bold border-b-0 pb-0 mb-0">{row.ticker} - {date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-3 text-right font-mono font-extrabold border-b border-wallstreet-100 border-l border-wallstreet-300 bg-gray-50/80 text-sm">
                                                {(() => {
                                                    const isZeroTotal = Math.abs(row.total) < 0.0001;
                                                    const isZeroLatestWeight = (row.latestWeight || 0) < 0.0001; // Use latestWeight
                                                    const showTotalHyphen = isZeroTotal && isZeroLatestWeight;

                                                    if (showTotalHyphen) {
                                                        return <span className="text-gray-300">-</span>;
                                                    }
                                                    return <span className={row.total >= 0 ? 'text-green-700' : 'text-red-700'}>{row.total > 0 ? '+' : ''}{row.total.toFixed(2)}%</span>;
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-wallstreet-100 border-t-2 border-wallstreet-700 shadow-inner">
                                        <td className="p-3 font-mono font-bold text-wallstreet-text text-xs uppercase">Total Portfolio</td>
                                        {allMonths.map(date => {
                                            const key = `${date.getFullYear()}-${date.getMonth()}`;
                                            const hasData = heatmapTotals.hasDataMap[key];
                                            const val = heatmapTotals.totals[key];
                                            return (
                                                <td key={date.toISOString()} className="p-3 text-center font-mono font-bold text-xs border-b border-wallstreet-100 border-l border-white">
                                                    {hasData ? <span className={val >= 0 ? 'text-green-700' : 'text-red-700'}>{val > 0 ? '+' : ''}{val.toFixed(2)}%</span> : <span className="text-gray-300">-</span>}
                                                </td>
                                            )
                                        })}
                                        <td className="p-3 text-center font-mono font-extrabold text-xs border-l border-wallstreet-300 bg-wallstreet-200 text-wallstreet-text">
                                            <span className={heatmapTotals.grandTotal >= 0 ? 'text-green-800' : 'text-red-800'}>{heatmapTotals.grandTotal > 0 ? '+' : ''}{heatmapTotals.grandTotal.toFixed(2)}%</span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'MONTHLY' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
                    {allMonths.map((date) => {
                        const monthlyData = data.filter(d => {
                            const dDate = new Date(d.date);
                            return dDate.getFullYear() === date.getFullYear() && dDate.getMonth() === date.getMonth() && !d.ticker.toUpperCase().includes('CASH');
                        });
                        if (monthlyData.length === 0) return null;
                        const items = monthlyData.map(d => ({ ticker: d.ticker, weight: d.weight, returnPct: d.returnPct, contribution: d.contribution || 0 }));
                        return <AttributionTable key={date.toISOString()} title={date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} items={items} />;
                    })}
                </div>
            )}

            {viewMode === 'QUARTERLY' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                    {[{ name: 'Q1', months: [0, 1, 2] }, { name: 'Q2', months: [3, 4, 5] }, { name: 'Q3', months: [6, 7, 8] }, { name: 'Q4', months: [9, 10, 11] }].map(q => {
                        const qData = cleanData.filter(d => {
                            const m = new Date(d.date).getMonth();
                            const y = new Date(d.date).getFullYear();
                            return q.months.includes(m) && y === primaryYear;
                        });
                        if (qData.length === 0) return null;

                        const tickerMap = new Map<string, { ticker: string, weight: number, contribution: number, count: number, returnSum: number }>();
                        qData.forEach(d => {
                            if (!tickerMap.has(d.ticker)) tickerMap.set(d.ticker, { ticker: d.ticker, weight: 0, contribution: 0, count: 0, returnSum: 0 });
                            const t = tickerMap.get(d.ticker)!;
                            t.weight += d.weight;
                            t.contribution += (d.contribution || 0);
                            t.returnSum += (d.returnPct || 0);
                            t.count += 1;
                        });
                        const aggregated: TableItem[] = Array.from(tickerMap.values()).map(t => ({ ticker: t.ticker, weight: t.weight / t.count, contribution: t.contribution, returnPct: t.returnSum }));
                        return <AttributionTable key={q.name} title={`${q.name} ${primaryYear}`} items={aggregated} />
                    })}
                </div>
            )}
        </div>
    );
};