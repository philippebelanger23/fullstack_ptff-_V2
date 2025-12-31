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

  // Separate state for sector map - persists independently of data changes
  const [sectorMap, setSectorMap] = React.useState<Record<string, string>>({});

  // Fetch Sectors effect - only fetches, doesn't modify data
  React.useEffect(() => {
    const fetchSectorData = async () => {
      // Get unique tickers that don't already have sector in our map
      const tickersToFetch = Array.from(
        new Set(
          data
            .filter(d => d.ticker && !d.ticker.includes('$') && !sectorMap[d.ticker.trim()])
            .map(d => d.ticker.trim())
        )
      );

      if (tickersToFetch.length === 0) return;

      try {
        const { fetchSectors } = await import('../services/api');
        const sectors = await fetchSectors(tickersToFetch);

        if (Object.keys(sectors).length > 0) {
          setSectorMap(prev => ({ ...prev, ...sectors }));
        }
      } catch (error) {
        console.error("Error fetching sectors:", error);
      }
    };

    if (data.length > 0) {
      fetchSectorData();
    }
  }, [data]);

  // Derive enrichedCurrentHoldings by merging sectorMap at render time
  const enrichedCurrentHoldings = useMemo(() => {
    return currentHoldings.map(item => {
      const cleanTicker = item.ticker.trim();
      const sector = sectorMap[cleanTicker] || sectorMap[item.ticker] || item.sector;
      return sector ? { ...item, sector } : item;
    });
  }, [currentHoldings, sectorMap]);


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
          <div className="flex-1 w-full flex h-full">
            <div className="flex-1 h-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" tickFormatter={formatDateTick} tick={{ fontSize: 12, fontFamily: 'monospace' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} dy={10} minTickGap={30} />
                  <YAxis stroke="#94a3b8" tickFormatter={(val) => `${val.toFixed(0)}%`} tick={{ fontSize: 12, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomAreaTooltip />} />
                  {topTickers.map((ticker, index) => (
                    <Area key={ticker} type="monotone" dataKey={ticker} stackId="1" stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} strokeWidth={0} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Vertical Distributed Legend */}
            <div className="w-[120px] flex flex-col justify-between py-4 pl-2 h-full">
              {[...topTickers].reverse().map((ticker, i) => {
                const originalIndex = topTickers.length - 1 - i;
                return (
                  <div key={ticker} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[originalIndex % COLORS.length] }}
                    />
                    <span
                      className="text-[11px] font-mono text-slate-500 font-bold truncate"
                      title={ticker}
                    >
                      {ticker}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>


      <PortfolioTable currentHoldings={enrichedCurrentHoldings} allData={data} />
    </div>
  );
};
