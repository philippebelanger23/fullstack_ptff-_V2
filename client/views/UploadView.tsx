import React, { useState, useRef } from 'react';
import { AlertCircle, ArrowRight, Trash2, Database, Server, Play, Edit, FileSpreadsheet } from 'lucide-react';
import { PortfolioItem } from '../types';
import { analyzePortfolio, analyzeManualPortfolio } from '../services/api';
import { ManualEntryModal } from '../components/ManualEntryModal';

interface UploadViewProps {
  onDataLoaded: (data: PortfolioItem[], fileInfo?: { name: string, count: number }, files?: { weightsFile: File | null, navFile: File | null }) => void;
  onProceed: () => void;
  currentData: PortfolioItem[];
  fileHistory?: { name: string, count: number }[];
}

export const UploadView: React.FC<UploadViewProps> = ({ onDataLoaded, onProceed, currentData, fileHistory = [] }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New state for Python backend flow
  const [weightsFile, setWeightsFile] = useState<File | null>(null);
  const [navFile, setNavFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Manual Entry State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);





  const mergePortfolios = (current: PortfolioItem[], incoming: PortfolioItem[]): PortfolioItem[] => {
    const mergedMap = new Map<string, PortfolioItem>();
    const getKey = (item: PortfolioItem) => `${item.ticker.toUpperCase()}|${item.date}`;

    current.forEach(item => mergedMap.set(getKey(item), { ...item }));
    incoming.forEach(item => {
      const key = getKey(item);
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)!;
        mergedMap.set(key, {
          ...existing,
          ...item,
          weight: (item.weight !== 0) ? item.weight : existing.weight,
          contribution: (item.contribution !== undefined) ? item.contribution : existing.contribution,
          returnPct: (item.returnPct !== undefined) ? item.returnPct : existing.returnPct,
        });
      } else {
        mergedMap.set(key, item);
      }
    });

    return Array.from(mergedMap.values());
  };

  const handlePythonAnalysis = async () => {
    if (!weightsFile) {
      setError("Please select a weights file first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    try {
      const results = await analyzePortfolio(weightsFile, navFile || undefined);

      // Normalize data from API (backend returns decimals, frontend expects whole numbers for %)
      const maxWeight = Math.max(...results.map(p => p.weight));
      const isDecimalScale = maxWeight <= 1.5; // If max weight is small (e.g. 1.0), it's likely decimal

      let normalizedResults = results;
      if (isDecimalScale) {
        normalizedResults = results.map(p => ({
          ...p,
          weight: p.weight * 100,
          returnPct: (p.returnPct !== undefined && Math.abs(p.returnPct) < 2.0) ? p.returnPct * 100 : p.returnPct,
          contribution: (p.contribution !== undefined && Math.abs(p.contribution) < 2.0) ? p.contribution * 100 : p.contribution
        }));
      }

      let finalData = normalizedResults;
      if (currentData.length > 0) finalData = mergePortfolios(currentData, normalizedResults);

      onDataLoaded(finalData, { name: "Analysis Result", count: results.length }, { weightsFile, navFile });

      // Clear files after success
      setWeightsFile(null);
      setNavFile(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Analysis failed. Please check the server.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSubmit = async (items: PortfolioItem[]) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const results = await analyzeManualPortfolio(items);

      // Normalize data (similar to python analysis)
      const maxWeight = Math.max(...results.map(p => p.weight));
      const isDecimalScale = maxWeight <= 1.5;

      let normalizedResults = results;
      if (isDecimalScale) {
        normalizedResults = results.map(p => ({
          ...p,
          weight: p.weight * 100,
          returnPct: (p.returnPct !== undefined && Math.abs(p.returnPct) < 2.0) ? p.returnPct * 100 : p.returnPct,
          contribution: (p.contribution !== undefined && Math.abs(p.contribution) < 2.0) ? p.contribution * 100 : p.contribution
        }));
      }

      let finalData = normalizedResults;
      if (currentData.length > 0) finalData = mergePortfolios(currentData, normalizedResults);

      onDataLoaded(finalData, { name: "Manual Entry", count: results.length });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Manual analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };





  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-mono text-wallstreet-text mb-2">Import Portfolio</h2>
        <p className="text-wallstreet-500">Choose your analysis method below.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Method 1: Python Engine Analysis (Remote) */}
        <div className="bg-white rounded-xl border border-wallstreet-200 p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-wallstreet-900 p-3 rounded-lg text-wallstreet-accent">
              <Server size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-wallstreet-text">Full Analysis</h3>
              <p className="text-sm text-wallstreet-400">Compute returns from raw files</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-wallstreet-accent mb-1">1. Weights (Required)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-wallstreet-text hover:file:bg-slate-200"
                onChange={(e) => setWeightsFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-wallstreet-accent mb-1">2. NAV (Optional)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-wallstreet-text hover:file:bg-slate-200"
                onChange={(e) => setNavFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>

            <button
              onClick={handlePythonAnalysis}
              disabled={!weightsFile || isAnalyzing}
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 mt-4 transition-all
                            ${!weightsFile || isAnalyzing ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-wallstreet-900 text-wallstreet-accent hover:bg-[#0a2351] hover:text-white'}
                        `}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">Processing... <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div></span>
              ) : (
                <> <Play size={18} /> Run Analysis </>
              )}
            </button>
          </div>
        </div>

        {/* Method 2: Manual Entry */}
        <div className="bg-white rounded-xl border border-wallstreet-200 p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-wallstreet-900 p-3 rounded-lg text-wallstreet-accent">
              <Edit size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-wallstreet-text">Manual Entry</h3>
              <p className="text-sm text-wallstreet-400">Type in weights & periods</p>
            </div>
          </div>

          <div className="h-40 flex flex-col items-center justify-center text-center space-y-4">
            <p className="text-sm text-wallstreet-500">
              Manually configure tickers, weights, and rebalancing dates in a grid editor.
            </p>
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-6 py-2 bg-slate-100 text-wallstreet-text font-bold rounded-full hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <Edit size={16} /> Open Editor
            </button>
          </div>
        </div>


      </div>

      {error && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2 text-left">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {currentData.length > 0 && (
        <div className="mt-8 bg-white p-6 rounded-xl border border-wallstreet-accent shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-3 rounded-full text-green-700 mt-1">
                <Database size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-wallstreet-text">Data Staged Successfully</h3>
                <div className="text-sm text-wallstreet-500 mb-2 mt-1">
                  <p className="font-semibold mb-2">{currentData.length} records loaded total.</p>
                  {fileHistory.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <ul className="space-y-2">
                        {fileHistory.map((file, idx) => (
                          <li key={idx} className="text-xs font-mono flex items-center gap-2">
                            <FileSpreadsheet size={14} className="text-wallstreet-accent" />
                            <span className="font-bold text-wallstreet-text truncate max-w-[200px] md:max-w-xs" title={file.name}>{file.name}</span>
                            <span className="text-wallstreet-400">({file.count} items)</span>
                            {idx === fileHistory.length - 1 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">New</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <p className="text-xs text-wallstreet-500 font-mono mt-2">
                  Ready to analyze. You can proceed to the dashboard or upload another file to enrich this dataset.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <button onClick={onProceed} className="flex items-center gap-2 px-6 py-3 bg-wallstreet-accent text-white font-bold rounded-lg hover:bg-sky-600 transition-colors shadow-md whitespace-nowrap">
                Proceed to Dashboard <ArrowRight size={18} />
              </button>
              <button onClick={() => onDataLoaded([])} className="flex items-center justify-center gap-2 px-4 py-2 text-xs text-red-500 hover:text-red-700 transition-colors">
                <Trash2 size={12} /> Clear Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={handleManualSubmit}
        existingData={currentData}
      />

    </div>
  );
};

