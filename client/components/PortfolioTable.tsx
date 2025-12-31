import React from 'react';
import { PortfolioItem } from '../types';

interface PortfolioTableProps {
  currentHoldings: PortfolioItem[];
  allData: PortfolioItem[];
}

export const PortfolioTable: React.FC<PortfolioTableProps> = ({ currentHoldings }) => {
  const sortedData = [...currentHoldings].sort((a, b) => b.weight - a.weight);

  // Helper to determine Region
  const getRegion = (ticker: string) => {
    const t = ticker.toUpperCase();
    if (t === '$CASH$' || t.includes('CASH')) return '';
    if (t.includes('BIP791') || t.includes('DJT03868')) return 'INTL';
    if (t.endsWith('.TO') || t.endsWith('.V') || t.startsWith('TDB') || t.startsWith('DYN')) return 'CA';
    if (t.endsWith('.PA') || t.endsWith('.L') || t.endsWith('.DE') || t.endsWith('.HK')) return 'INTL';
    return 'US';
  };

  // Helper to determine Sector (Heuristic)
  const getSector = (item: PortfolioItem) => {
    // If sector is explicitly provided in data, use it
    if (item.sector && item.sector.trim() !== '') return item.sector;

    const t = item.ticker.toUpperCase();
    // Specific overrides
    if (t.includes('BIP791') || t.includes('DJT03868')) return 'Mixed';

    // Heuristic for Funds/ETFs -> "Mixed"
    // TDB (TD Funds), DYN (Dynamic Funds), X*.TO/V*.TO (often ETFs), and generic cash checks
    if (t.startsWith('TDB') || t.startsWith('DYN') || t.startsWith('X') || t.startsWith('V') || t.includes('CASH') || t.includes('$')) {
      return 'Mixed';
    }

    // For single stocks, we default to a placeholder if unknown, or the user manually inputs it later
    // Since we can't truly know without data, we'll mark as '-' for now to avoid wrong guesses, 
    // or 'Equity' if we want to be generic. User requested "one of the 11 sectors".
    // Without API, we can't do this reliably. returning '-' as a safe fallback.
    return '-';
  };

  const getRegionColor = (region: string) => {
    switch (region) {
      case 'US': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'CA': return 'text-red-600 bg-red-50 border-red-200';
      case 'INTL': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-wallstreet-700 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-wallstreet-700 flex justify-between items-center bg-wallstreet-50">
        <h3 className="font-mono text-lg font-bold text-wallstreet-text">Holdings Breakdown</h3>
        <span className="text-xs font-mono text-wallstreet-500 font-bold">{currentHoldings.length} POSITIONS</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-wallstreet-500 font-mono">
          <thead className="bg-wallstreet-100 text-xs uppercase font-bold text-wallstreet-500 border-b border-wallstreet-200">
            <tr>
              <th className="px-6 py-3 w-16 text-center">#</th>
              <th className="px-6 py-3">Ticker</th>
              <th className="px-6 py-3 text-right">Weight</th>
              <th className="px-6 py-3 text-center">Location</th>
              <th className="px-6 py-3 text-center">Sector</th>
              <th className="px-6 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.map((item, index) => {
              const region = getRegion(item.ticker);
              const sector = getSector(item);

              return (
                <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 text-center text-wallstreet-400 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 font-bold text-wallstreet-text flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-wallstreet-100 text-wallstreet-600 flex items-center justify-center text-[10px] font-bold shadow-sm border border-wallstreet-200">
                      {item.ticker.substring(0, 2)}
                    </div>
                    {item.ticker}
                  </td>
                  <td className="px-6 py-4 text-right text-wallstreet-text font-bold">
                    {item.weight.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    {region && (
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getRegionColor(region)}`}>
                        {region}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-wallstreet-text">
                    {sector}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-[10px] uppercase tracking-wider font-bold border border-wallstreet-200 px-3 py-1.5 rounded-md text-wallstreet-500 hover:border-wallstreet-accent hover:text-white hover:bg-wallstreet-accent transition-all shadow-sm">
                      Analyze
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};