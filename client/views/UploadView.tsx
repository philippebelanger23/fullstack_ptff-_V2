import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, ArrowRight, Trash2, Database, FileSpreadsheet, Server, Play } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PortfolioItem } from '../types';
import { analyzePortfolio } from '../services/api';

interface UploadViewProps {
  onDataLoaded: (data: PortfolioItem[], fileInfo?: { name: string, count: number }) => void;
  onProceed: () => void;
  currentData: PortfolioItem[];
  fileHistory?: { name: string, count: number }[];
}

export const UploadView: React.FC<UploadViewProps> = ({ onDataLoaded, onProceed, currentData, fileHistory = [] }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // New state for Python backend flow
  const [weightsFile, setWeightsFile] = useState<File | null>(null);
  const [navFile, setNavFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const cleanNumber = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    let num = 0;
    if (typeof val === 'number') {
      num = val;
    } else if (typeof val === 'string') {
      let cleaned = val.replace(/[^0-9.\-()]/g, '');
      if (cleaned.includes('(') && cleaned.includes(')')) {
        cleaned = '-' + cleaned.replace(/[()]/g, '');
      }
      num = parseFloat(cleaned);
    }
    return isNaN(num) ? 0 : Math.round(num * 1000000) / 1000000;
  };

  const parseDate = (val: any): string => {
    if (val === undefined || val === null || val === '') return new Date().toISOString().split('T')[0];

    let numericVal = typeof val === 'number' ? val : parseFloat(val);
    const isNumeric = !isNaN(numericVal) && String(numericVal) === String(val).trim();

    if (isNumeric) {
      if (numericVal > 20000 && numericVal < 100000) {
        const date = new Date(Math.round((numericVal - 25569) * 86400 * 1000));
        return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      }
      if (numericVal > 1900 && numericVal < 2100) return `${Math.floor(numericVal)}-01-01`;
    }

    const strVal = String(val);
    const ddmmyyyy = strVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;

    const date = new Date(val);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  };

  const parseRangeDate = (val: any): string | null => {
    if (!val) return null;

    if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && Number(val) > 20000)) {
      const numericVal = Number(val);
      const date = new Date(Math.round((numericVal - 25569) * 86400 * 1000));
      return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : null;
    }

    const str = String(val).trim();
    const matches = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g);

    if (matches && matches.length > 0) {
      const lastDate = matches[matches.length - 1];
      const parts = lastDate.split(/[\/\-]/);
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    let parseStr = str;
    if (!str.match(/\d{4}/)) parseStr = str + " 1, " + new Date().getFullYear();
    else if (!str.match(/\d{1,2}[\/\-,\s]\d{1,2}/)) parseStr = str.includes("1,") ? str : "1 " + str;

    const simpleDate = new Date(parseStr);
    if (!isNaN(simpleDate.getTime())) return new Date(simpleDate.getFullYear(), simpleDate.getMonth(), 1).toISOString().split('T')[0];
    return null;
  };

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

      onDataLoaded(finalData, { name: "Python Analysis Result", count: results.length });

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

  const processFile = async (file: File) => {
    setError(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      if (!workbook.SheetNames.length) throw new Error("Excel file is empty");

      let sheetName = workbook.SheetNames[0];
      const preferredSheet = workbook.SheetNames.find(n =>
        n.toLowerCase().includes('period contrib') || n.toLowerCase().includes('monthly contrib')
      );
      if (preferredSheet) sheetName = preferredSheet;

      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (rawRows.length < 2) throw new Error("Sheet contains insufficient data.");

      let parsedItems: PortfolioItem[] = [];
      let complexHeaderIdx = -1;

      for (let r = 0; r < Math.min(20, rawRows.length); r++) {
        const rowStr = rawRows[r].map(c => String(c).toLowerCase()).join(' ');
        if (rowStr.includes('return') && rowStr.includes('contrib')) {
          complexHeaderIdx = r;
          break;
        }
      }

      if (complexHeaderIdx !== -1) {
        const subHeaderRow = rawRows[complexHeaderIdx];
        const dateRow = rawRows[complexHeaderIdx - 1];

        let tickerColIdx = subHeaderRow.findIndex((cell: any) =>
          ['ticker', 'symbol'].some(s => String(cell).toLowerCase().includes(s))
        );
        if (tickerColIdx === -1) tickerColIdx = 0;

        const colMap: Record<number, { date: string, type: 'weight' | 'return' | 'contribution' }> = {};
        let lastDate = new Date().toISOString().split('T')[0];
        let skipColumns = false;

        for (let c = 0; c < subHeaderRow.length; c++) {
          if (c === tickerColIdx) continue;

          const headerVal = String(subHeaderRow[c] || '').trim().toLowerCase();
          if (headerVal.match(/(total|ytd|year|sum|cum|bench|index)/)) continue;

          if (dateRow && dateRow[c]) {
            const dateHeaderRaw = String(dateRow[c]).toLowerCase();
            if (dateHeaderRaw.match(/(total|ytd|year|sum|bench|12m|since)/)) {
              skipColumns = true;
            } else {
              const extractedDate = parseRangeDate(dateRow[c]);
              if (extractedDate) {
                lastDate = extractedDate;
                skipColumns = false;
              }
            }
          }

          if (skipColumns) continue;

          if (headerVal.includes('weight') || headerVal === 'wgt') colMap[c] = { date: lastDate, type: 'weight' };
          else if (headerVal.includes('return') || headerVal === 'rtn') colMap[c] = { date: lastDate, type: 'return' };
          else if (headerVal.includes('contrib')) colMap[c] = { date: lastDate, type: 'contribution' };
        }

        for (let r = complexHeaderIdx + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          const ticker = row[tickerColIdx];
          if (!ticker || String(ticker).match(/(total|benchmark|sigma|sum)/i)) continue;

          const itemsByDate: Record<string, PortfolioItem> = {};

          Object.keys(colMap).forEach(colIdxStr => {
            const colIdx = parseInt(colIdxStr);
            const mapInfo = colMap[colIdx];
            const val = cleanNumber(row[colIdx]);

            if (!itemsByDate[mapInfo.date]) {
              itemsByDate[mapInfo.date] = { ticker: String(ticker), date: mapInfo.date, weight: 0 };
            }

            if (mapInfo.type === 'weight') itemsByDate[mapInfo.date].weight = val;
            if (mapInfo.type === 'return') itemsByDate[mapInfo.date].returnPct = val;
            if (mapInfo.type === 'contribution') itemsByDate[mapInfo.date].contribution = val;
          });

          Object.values(itemsByDate).forEach(item => {
            if (item.weight !== 0 || (item.returnPct !== undefined && item.returnPct !== 0) || (item.contribution !== undefined && item.contribution !== 0)) {
              parsedItems.push(item);
            }
          });
        }

      } else {
        const headerRow = rawRows[0].map(h => String(h).trim());
        const weightColIndex = headerRow.findIndex(h => ['weight', 'pct', '%'].some(k => h.toLowerCase().includes(k)));
        const firstHeader = headerRow[0].toLowerCase();
        const isTickerFirst = ['ticker', 'symbol', 'stock'].some(s => firstHeader.includes(s));

        if (isTickerFirst && (weightColIndex === -1 || headerRow.length > 3)) {
          const dateHeaders = headerRow.slice(1);
          for (let r = 1; r < rawRows.length; r++) {
            const row = rawRows[r];
            const ticker = row[0];
            if (!ticker) continue;
            for (let c = 1; c < row.length; c++) {
              const weightVal = cleanNumber(row[c]);
              if (weightVal === 0) continue;
              parsedItems.push({
                ticker: String(ticker),
                weight: weightVal,
                date: parseDate(dateHeaders[c - 1])
              });
            }
          }
        } else {
          const tickerIdx = headerRow.findIndex(h => ['ticker', 'symbol'].some(s => h.toLowerCase().includes(s)));
          const weightIdx = weightColIndex;
          const dateIdx = headerRow.findIndex(h => ['date', 'time'].some(s => h.toLowerCase().includes(s)));
          const returnIdx = headerRow.findIndex(h => ['return', 'perf'].some(s => h.toLowerCase().includes(s)));
          const contribIdx = headerRow.findIndex(h => ['contrib', 'impact'].some(s => h.toLowerCase().includes(s)));

          if (tickerIdx !== -1 && weightIdx !== -1) {
            for (let r = 1; r < rawRows.length; r++) {
              const row = rawRows[r];
              if (!row[tickerIdx]) continue;
              parsedItems.push({
                ticker: String(row[tickerIdx]).trim(),
                weight: cleanNumber(row[weightIdx]),
                date: dateIdx !== -1 ? parseDate(row[dateIdx]) : new Date().toISOString().split('T')[0],
                returnPct: returnIdx !== -1 ? cleanNumber(row[returnIdx]) : undefined,
                contribution: contribIdx !== -1 ? cleanNumber(row[contribIdx]) : undefined
              });
            }
          }
        }
      }

      if (parsedItems.length === 0) throw new Error("No valid portfolio data extracted.");

      const maxWeight = Math.max(...parsedItems.map(p => p.weight));
      const isPercentageScale = maxWeight > 1.5;

      const normalizedData: PortfolioItem[] = parsedItems.map(p => {
        let newWeight = p.weight;
        let newReturn = p.returnPct;
        let newContrib = p.contribution;

        if (!isPercentageScale) newWeight = p.weight * 100;
        if (newReturn !== undefined && Math.abs(newReturn) < 1.0 && newReturn !== 0) newReturn = newReturn * 100;
        if (newContrib !== undefined && Math.abs(newContrib) < 1.0 && newContrib !== 0) newContrib = newContrib * 100;

        return {
          ...p,
          weight: Math.round(newWeight * 10000) / 10000,
          returnPct: newReturn !== undefined ? Math.round(newReturn * 10000) / 10000 : undefined,
          contribution: newContrib !== undefined ? Math.round(newContrib * 10000) / 10000 : undefined
        };
      }).filter(p => Math.abs(p.weight) > 0.0001 || (p.contribution && Math.abs(p.contribution) > 0.0001));

      let finalData = normalizedData;
      if (currentData.length > 0) finalData = mergePortfolios(currentData, normalizedData);

      onDataLoaded(finalData, { name: file.name, count: parsedItems.length });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse file. Ensure format is valid.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const loadDemoData = () => {
    const today = new Date().toISOString().split('T')[0];
    const demo: PortfolioItem[] = [
      { ticker: 'NVDA', weight: 15.0, date: today, returnPct: 12.5, contribution: 1.87 },
      { ticker: 'MSFT', weight: 12.0, date: today, returnPct: 2.1, contribution: 0.25 },
      { ticker: 'AAPL', weight: 10.0, date: today, returnPct: -1.5, contribution: -0.15 },
      { ticker: 'AMZN', weight: 8.0, date: today, returnPct: 5.0, contribution: 0.40 },
    ];
    onDataLoaded(demo, { name: 'Demo Portfolio Data.xlsx', count: 4 });
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
              <p className="text-sm text-wallstreet-400">Compute returns & contributions from raw data</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-wallstreet-accent mb-1">1. Portfolio Weights (Required)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-wallstreet-text hover:file:bg-slate-200"
                onChange={(e) => setWeightsFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-wallstreet-accent mb-1">2. Mutual Fund NAV (Optional)</label>
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
                <> <Play size={18} /> Run Analysis Engine </>
              )}
            </button>
          </div>
        </div>

        {/* Method 2: Local Import */}
        <div className="bg-white rounded-xl border border-wallstreet-200 p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-wallstreet-900 p-3 rounded-lg text-wallstreet-accent">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-wallstreet-text">Quick Import</h3>
              <p className="text-sm text-wallstreet-400">Upload pre-calculated Excel tables</p>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[200px] ${isDragging ? 'border-wallstreet-accent bg-blue-50' : 'border-wallstreet-200 hover:border-wallstreet-400'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload size={32} className="text-wallstreet-300 mb-4" />
            <p className="text-wallstreet-500 mb-4 text-sm">
              Drag & Drop "Returns Contribution" report here
            </p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.csv" />
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-100 text-wallstreet-text font-semibold rounded-full hover:bg-slate-200 transition-colors text-sm">
                Browse
              </button>
              {currentData.length === 0 && (
                <button onClick={loadDemoData} className="px-4 py-2 bg-slate-100 text-wallstreet-500 font-medium rounded-lg hover:bg-slate-200 transition-colors text-sm">
                  Demo
                </button>
              )}
            </div>
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
    </div>
  );
};

