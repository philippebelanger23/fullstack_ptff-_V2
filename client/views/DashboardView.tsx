import React from 'react';
import { PortfolioItem } from '../types';
import { PortfolioTable } from '../components/PortfolioTable';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend } from 'recharts';

interface DashboardViewProps {
  data: PortfolioItem[];
}

const COLORS = ['#2563eb', '#ea580c', '#16a34a', '#9333ea', '#dc2626', '#0891b2', '#ca8a04', '#db2777', '#4f46e5', '#0d9488'];

export const DashboardView: React.FC<DashboardViewProps> = ({ data }) => {
  const dates = Array.from(new Set(data.map(d => d.date))).sort() as string[];
  const latestDate = dates[dates.length - 1];
  const currentHoldings = data.filter(d => d.date === latestDate);
  const totalWeight = currentHoldings.reduce((acc, item) => acc + item.weight, 0);

  const topHoldings = [...currentHoldings]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10)
    .map(item => ({ name: item.ticker, value: item.weight }));

  const top10TotalWeight = topHoldings.reduce((sum, item) => sum + item.value, 0);
  const topTickers = topHoldings.map(t => t.name);

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
      const prevData = prevDate ? historyDataMap.get(prevDate) : null;

      return (
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-2xl text-xs font-mono min-w-[280px]">
          <div className="mb-3 border-b border-slate-200 pb-2 flex justify-between items-center gap-4">
            <span className="text-slate-500 font-bold uppercase tracking-wider">{formatDateTick(labelStr)} Breakdown</span>
            <span className="text-slate-700 font-bold">{currentTotal.toFixed(1)}% Total</span>
          </div>
          <div className="space-y-2">
            {sortedPayload.map((entry: any, index: number) => {
              const currentVal = entry.value;
              let prevVal = 0;
              if (prevData) prevVal = prevData[entry.name] || 0;
              const delta = currentVal - prevVal;
              const hasChange = prevDate && Math.abs(delta) >= 0.05;

              return (
                <div key={index} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center group">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full ring-1 ring-offset-1 ring-offset-white ring-transparent group-hover:ring-slate-200 transition-all" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-700 font-bold truncate max-w-[100px]">{entry.name}</span>
                  </div>
                  <div className="text-right text-slate-900 font-bold text-sm">{currentVal.toFixed(1)}%</div>
                  <div className={`text-right w-16 font-bold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {hasChange ? <>{delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%</> : <span className="opacity-20">-</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex justify-between items-end border-b border-wallstreet-700 pb-6">
        <div>
          <h2 className="text-3xl font-bold font-mono text-wallstreet-text">Exposure Map</h2>
          <p className="text-wallstreet-500 mt-1">Quantitative breakdown as of {latestDate}.</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-wallstreet-500">TOTAL ALLOCATION</div>
          <div className={`text-2xl font-mono font-bold ${totalWeight > 105 ? 'text-wallstreet-danger' : 'text-wallstreet-accent'}`}>
            {totalWeight.toFixed(2)}%
          </div>
        </div>
      </header>

      <div className="bg-wallstreet-800 p-8 rounded-xl border border-wallstreet-700 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 h-[400px]">
          <div className="flex flex-col items-start justify-center min-w-[200px]">
            <h3 className="font-mono text-wallstreet-500 text-sm uppercase tracking-wider mb-2">Top 10 Concentration</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold font-mono text-wallstreet-text">{top10TotalWeight.toFixed(2)}%</span>
              <span className="text-sm text-wallstreet-500 font-mono">of portfolio</span>
            </div>
          </div>
          <div className="flex-1 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topHoldings} cx="50%" cy="50%" innerRadius={100} outerRadius={140} fill="#8884d8" paddingAngle={3} dataKey="value" stroke="none" label={renderCustomizedLabel}
                >
                  {topHoldings.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {dates.length > 1 && (
        <div className="bg-wallstreet-800 p-6 rounded-xl border border-wallstreet-700 shadow-sm">
          <div className="mb-6">
            <h3 className="font-mono text-wallstreet-500 text-sm uppercase tracking-wider">Portfolio Evolution (Top 10)</h3>
            <p className="text-xs text-wallstreet-500 mt-1">Historical absolute weight allocation of current top holdings.</p>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" tickFormatter={formatDateTick} tick={{ fontSize: 12, fontFamily: 'monospace' }} axisLine={false} tickLine={false} dy={10} minTickGap={30} />
                <YAxis stroke="var(--text-muted)" tickFormatter={(val) => `${val.toFixed(0)}%`} tick={{ fontSize: 12, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Legend iconType="square" wrapperStyle={{ paddingTop: '20px', fontFamily: 'monospace', fontSize: '11px' }} />
                {topTickers.map((ticker, index) => (
                  <Area key={ticker} type="linear" dataKey={ticker} stackId="1" stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={1} strokeWidth={0} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <PortfolioTable currentHoldings={currentHoldings} allData={data} />
    </div>
  );
};