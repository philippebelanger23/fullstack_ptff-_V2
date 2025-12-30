import React from 'react';
import { PortfolioItem } from '../types';

interface PortfolioTableProps {
  currentHoldings: PortfolioItem[];
  allData: PortfolioItem[];
}

export const PortfolioTable: React.FC<PortfolioTableProps> = ({ currentHoldings }) => {
  const sortedData = [...currentHoldings].sort((a, b) => b.weight - a.weight);

  return (
    <div className="bg-wallstreet-800 rounded-xl border border-wallstreet-700 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-wallstreet-700 flex justify-between items-center">
        <h3 className="font-mono text-lg font-semibold text-wallstreet-text">Holdings Breakdown</h3>
        <span className="text-xs font-mono text-wallstreet-500">{currentHoldings.length} POSITIONS</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-wallstreet-500">
          <thead className="bg-wallstreet-900 text-xs uppercase font-medium text-wallstreet-500 font-mono">
            <tr>
              <th className="px-6 py-4">Ticker</th>
              <th className="px-6 py-4 text-right">Weight</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-wallstreet-700 font-mono">
            {sortedData.map((item, index) => {
              return (
                <tr key={index} className="hover:bg-wallstreet-900 transition-colors">
                  <td className="px-6 py-4 font-bold text-wallstreet-text flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-wallstreet-700 text-wallstreet-text flex items-center justify-center text-xs">
                      {item.ticker.slice(0, 2)}
                    </div>
                    {item.ticker}
                  </td>
                  <td className="px-6 py-4 text-right text-wallstreet-text font-bold">
                    {item.weight.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-xs border border-wallstreet-600 px-3 py-1 rounded text-wallstreet-500 hover:border-wallstreet-accent hover:text-wallstreet-accent hover:bg-wallstreet-700 transition-all">
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