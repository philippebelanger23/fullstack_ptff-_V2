import React, { useMemo } from 'react';
import { PortfolioItem } from '../types';
import { PortfolioTable } from '../components/PortfolioTable';
import { KPICard } from '../components/KPICard';
import { ConcentrationPieChart } from '../components/ConcentrationPieChart';
import { PortfolioEvolutionChart } from '../components/PortfolioEvolutionChart';
import { Wallet, Layers, PieChart as PieChartIcon } from 'lucide-react';

interface DashboardViewProps {
  data: PortfolioItem[];
}

const COLORS = ['#2563eb', '#ea580c', '#16a34a', '#9333ea', '#dc2626', '#0891b2', '#ca8a04', '#db2777', '#4f46e5', '#0d9488'];

export const DashboardView: React.FC<DashboardViewProps> = ({ data }) => {
  const { dates, latestDate, currentHoldings, totalWeight } = useMemo(() => {
    const dates = Array.from(new Set(data.map(d => d.date))).sort() as string[];
    const latestDate = dates[dates.length - 1];
    const currentHoldings = data.filter(d => d.date === latestDate && d.weight > 0.001);
    const totalWeight = currentHoldings.reduce((acc, item) => acc + item.weight, 0);
    return { dates, latestDate, currentHoldings, totalWeight };
  }, [data]);

  const { topHoldings, top10TotalWeight, topTickers } = useMemo(() => {
    const topHoldings = [...currentHoldings]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10)
      .map(item => ({ name: item.ticker, value: item.weight }));

    const top10TotalWeight = topHoldings.reduce((sum, item) => sum + item.value, 0);
    const topTickers = topHoldings.map(t => t.name);
    return { topHoldings, top10TotalWeight, topTickers };
  }, [currentHoldings]);

  const areaChartData = useMemo(() => {
    const historyDataMap = new Map<string, any>();
    dates.forEach(date => historyDataMap.set(date, { date }));

    data.forEach((item: PortfolioItem) => {
      if (topTickers.includes(item.ticker)) {
        const entry = historyDataMap.get(item.date as string);
        if (entry) entry[item.ticker] = item.weight;
      }
    });

    return Array.from(historyDataMap.values()).map(entry => {
      const completeEntry = { ...entry };
      topTickers.forEach(ticker => {
        if (completeEntry[ticker] === undefined) completeEntry[ticker] = 0;
      });
      return completeEntry;
    });
  }, [dates, data, topTickers]);

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
        <ConcentrationPieChart data={topHoldings} colors={COLORS} />
        <PortfolioEvolutionChart data={areaChartData} topTickers={topTickers} dates={dates} colors={COLORS} />
      </div>

      <PortfolioTable currentHoldings={enrichedCurrentHoldings} allData={data} />
    </div>
  );
};
