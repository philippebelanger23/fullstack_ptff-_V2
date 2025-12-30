import React, { useMemo } from 'react';
import { PortfolioItem } from '../types';
import { PortfolioTable } from '../components/PortfolioTable';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend, BarChart, Bar } from 'recharts';
import { KPICard } from '../components/KPICard';
import { Wallet, PieChart as PieChartIcon, TrendingUp, Layers, Target } from 'lucide-react';

interface DashboardViewProps {
  data: PortfolioItem[];
}

const COLORS = ['#2563eb', '#ea580c', '#16a34a', '#9333ea', '#dc2626', '#0891b2', '#ca8a04', '#db2777', '#4f46e5', '#0d9488'];

export const DashboardView: React.FC<DashboardViewProps> = ({ data }) => {
  const dates = Array.from(new Set(data.map(d => d.date))).sort() as string[];
  const latestDate = dates[dates.length - 1];
  const currentHoldings = data.filter(d => d.date === latestDate && d.weight > 0.001);
  const totalWeight = currentHoldings.reduce((acc, item) => acc + item.weight, 0);

  const topHoldings = [...currentHoldings]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10)
    .map(item => ({ name: item.ticker, value: item.weight }));

  const top10TotalWeight = topHoldings.reduce((sum, item) => sum + item.value, 0);
  const topTickers = topHoldings.map(t => t.name);
  const largestHolding = topHoldings.length > 0 ? topHoldings[0] : null;

  // Determine Region based on Ticker
  const getRegion = (ticker: string): 'US' | 'CA' | 'INTL' => {
    const t = ticker.toUpperCase();
    if (t.endsWith('.TO') || t.endsWith('.V') || t.startsWith('TDB') || t.startsWith('DYN')) return 'CA';
    if (t.endsWith('.PA') || t.endsWith('.L') || t.endsWith('.DE') || t.endsWith('.HK')) return 'INTL';
    return 'US';
  };

  const sunburstData = useMemo(() => {
    const regions: Record<string, number> = { 'US': 0, 'CA': 0, 'INTL': 0 };
    currentHoldings.forEach(h => {
      const r = getRegion(h.ticker);
      regions[r] += h.weight;
    });

    // Sort tickers by region for the outer ring to align colors/segments
    const sortedTickers = [...currentHoldings].sort((a, b) => {
      const rA = getRegion(a.ticker);
      const rB = getRegion(b.ticker);
      if (rA !== rB) return rA.localeCompare(rB);
      return b.weight - a.weight;
    }).map(h => ({ name: h.ticker, value: h.weight, region: getRegion(h.ticker) }));

    const regionData = Object.entries(regions)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({ name, value }));

    return { regionData, tickerData: sortedTickers };
  }, [currentHoldings]);

  const historyDataMap = new Map<string, any>();
  dates.forEach(date => historyDataMap.set(date, { date }));

  data.forEach((item: PortfolioItem) => {
    if (topTickers.includes(item.ticker)) {
      const entry = historyDataMap.get(item.date as string);
      if (entry) entry[item.ticker] = item.weight;
    }
  });

  const areaChartData = Array.from(historyDataMap.values()).map(entry => {
    const completeEntry = { ...entry };
    topTickers.forEach(ticker => {
      if (completeEntry[ticker] === undefined) completeEntry[ticker] = 0;
    });
    return completeEntry;
  });

  const formatDateTick = (dateStr: string) => {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + (outerRadius + 30) * Math.cos(-midAngle * RADIAN);
    const y = cy + (outerRadius + 30) * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? 'start' : 'end';

    return (
      <text x={x} y={y} fill={COLORS[index % COLORS.length]} textAnchor={textAnchor} dominantBaseline="central" className="font-mono text-xs font-bold">
        {`${name}`}
        <tspan x={x} y={y + 14} fill="#64748b" className="font-normal">{`${value.toFixed(2)}%`}</tspan>
      </text>
    );
  };

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const sortedPayload = [...payload].sort((a: any, b: any) => b.value - a.value);
      const currentTotal = sortedPayload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
      const labelStr = label as string;
      const currentIndex = dates.indexOf(labelStr);
      const prevDate = currentIndex > 0 ? dates[currentIndex - 1] : null;

      return (
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-2xl text-xs font-mono min-w-[280px] z-50">
          <div className="mb-3 border-b border-slate-200 pb-2 flex justify-between items-center gap-4">
            <span className="text-slate-500 font-bold uppercase tracking-wider">{formatDateTick(labelStr)} Breakdown</span>
            <span className="text-slate-700 font-bold">{currentTotal.toFixed(1)}% Top 10</span>
          </div>
          <div className="space-y-2">
            {sortedPayload.map((entry: any, index: number) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-4 items-center group">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-700 font-bold truncate max-w-[100px]">{entry.name}</span>
                </div>
                <div className="text-right text-slate-900 font-bold text-sm">{entry.value.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-[100vw] mx-auto p-4 md:p-6 space-y-6 overflow-x-hidden min-h-screen">
      <header className="border-b border-wallstreet-700 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold font-mono text-wallstreet-text">Portfolio Holdings</h2>
          <p className="text-wallstreet-500 mt-1 text-sm">Exposure analysis and allocation breakdown as of {latestDate}.</p>
        </div>
        <div className="flex items-center gap-2 bg-wallstreet-200 px-3 py-1 rounded text-xs font-mono text-wallstreet-500">
          <span>{dates.length} Snapshots</span>
        </div>
      </header>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2">
        <KPICard title="Total Exposure" value={`${totalWeight.toFixed(2)}%`} subtext="Gross Allocation" icon={Wallet} colorClass={totalWeight > 100 ? 'text-wallstreet-danger' : 'text-wallstreet-accent'} />
        <KPICard title="Positions" value={currentHoldings.length} subtext="Active Holdings" icon={Layers} colorClass="text-wallstreet-text" />
        <KPICard title="Top 10 Weight" value={`${top10TotalWeight.toFixed(2)}%`} subtext="Concentration" icon={PieChartIcon} colorClass="text-wallstreet-accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[450px]">
        {/* Concentration Pie */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-mono font-bold text-wallstreet-text uppercase tracking-wider text-sm flex items-center gap-2"><PieChartIcon size={16} className="text-wallstreet-500" /> Top 10 Concentration </h3>
          </div>
          <div className="flex-1 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topHoldings} cx="50%" cy="50%" innerRadius={80} outerRadius={120} fill="#8884d8" paddingAngle={3} dataKey="value" stroke="none" label={renderCustomizedLabel}
                >
                  {topHoldings.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio Evolution (Moved Up) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-mono font-bold text-wallstreet-text uppercase tracking-wider text-sm flex items-center gap-2"><TrendingUp size={16} className="text-wallstreet-500" /> Portfolio Evolution (Top 10) </h3>
            <p className="text-xs text-wallstreet-500 mt-1 text-slate-400">Historical absolute weight allocation of current top positions</p>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" tickFormatter={formatDateTick} tick={{ fontSize: 12, fontFamily: 'monospace' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} dy={10} minTickGap={30} />
                <YAxis stroke="#94a3b8" tickFormatter={(val) => `${val.toFixed(0)}%`} tick={{ fontSize: 12, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ paddingLeft: '20px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }} />
                {topTickers.map((ticker, index) => (
                  <Area key={ticker} type="monotone" dataKey={ticker} stackId="1" stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} strokeWidth={0} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Portfolio Evolution (Moved Down - Full Width) */}
      {/* Sunburst Chart (Moved Below) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[400px]">
        <div className="lg:col-start-2 bg-white p-6 rounded-xl border border-wallstreet-700 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-mono font-bold text-wallstreet-text uppercase tracking-wider text-sm flex items-center gap-2"><PieChartIcon size={16} className="text-wallstreet-500" /> Regional Allocation </h3>
            <p className="text-xs text-wallstreet-500 mt-1 text-slate-400">Inner: Region (US/CA/INTL) • Outer: Ticker</p>
          </div>
          <div className="flex-1 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* Inner Ring: Regions */}
                <Pie data={sunburstData.regionData} dataKey="value" cx="50%" cy="50%" outerRadius={70} fill="#8884d8" stroke="none">
                  {sunburstData.regionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.name === 'US' ? '#2563eb' : entry.name === 'CA' ? '#dc2626' : '#9333ea'} />)}
                </Pie>
                {/* Outer Ring: Tickers */}
                <Pie data={sunburstData.tickerData} dataKey="value" cx="50%" cy="50%" innerRadius={80} outerRadius={110} fill="#82ca9d" stroke="none" label={({ name, value }) => value > 3 ? name : ''}>
                  {sunburstData.tickerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.region === 'US' ? '#60a5fa' : entry.region === 'CA' ? '#f87171' : '#c084fc'} stroke="white" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white text-black text-xs p-2 rounded shadow-xl font-mono border border-wallstreet-200 z-50">
                        <div className="font-bold border-b border-wallstreet-200 pb-1 mb-1">{d.name}</div>
                        <div>Weight: {d.value.toFixed(2)}%</div>
                        {d.region && <div className="text-slate-400 mt-1">{d.region}</div>}
                      </div>
                    );
                  }
                  return null;
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Portfolio Evolution (Moved Up) */}

      <PortfolioTable currentHoldings={currentHoldings} allData={data} />
    </div>
  );
};
