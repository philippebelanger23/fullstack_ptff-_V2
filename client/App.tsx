import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { UploadView } from './views/UploadView';
import { DashboardView } from './views/DashboardView';
import { AnalysisView } from './views/AnalysisView';
import { CorrelationView } from './views/CorrelationView';
import { AttributionView } from './views/AttributionView';
import { IndexView } from './views/IndexView';
import { PortfolioItem, ViewState } from './types';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.UPLOAD);
  const [portfolioData, setPortfolioData] = useState<PortfolioItem[]>([]);
  const [fileHistory, setFileHistory] = useState<{ name: string, count: number }[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ weightsFile: File | null, navFile: File | null }>({ weightsFile: null, navFile: null });

  // Lifted state for Correlation Analysis to prevent regeneration
  const [correlationResult, setCorrelationResult] = useState<any>(null);
  const [correlationStatus, setCorrelationStatus] = useState<'idle' | 'analyzing' | 'complete' | 'error'>('idle');

  const handleDataLoaded = (data: PortfolioItem[], fileInfo?: { name: string, count: number }, files?: { weightsFile: File | null, navFile: File | null }) => {
    setPortfolioData(data);
    setCorrelationResult(null);
    setCorrelationStatus('idle');

    if (files) {
      setUploadedFiles(files);
    }

    if (data.length === 0) {
      setFileHistory([]);
      setUploadedFiles({ weightsFile: null, navFile: null });
    } else if (fileInfo) {
      setFileHistory(prev => [...prev, fileInfo]);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.UPLOAD:
        return (
          <UploadView
            onDataLoaded={handleDataLoaded}
            onProceed={() => setCurrentView(ViewState.DASHBOARD)}
            currentData={portfolioData}
            fileHistory={fileHistory}
          />
        );
      case ViewState.DASHBOARD:
        return <DashboardView data={portfolioData} />;
      case ViewState.INDEX:
        return <IndexView />;
      case ViewState.ANALYSIS:
        return <AnalysisView data={portfolioData} />;
      case ViewState.ATTRIBUTION:
        return <AttributionView data={portfolioData} uploadedFiles={uploadedFiles} />;
      case ViewState.CORRELATION:
        return (
          <CorrelationView
            data={portfolioData}
            result={correlationResult}
            status={correlationStatus}
            setResult={setCorrelationResult}
            setStatus={setCorrelationStatus}
          />
        );
      default:
        return (
          <UploadView
            onDataLoaded={handleDataLoaded}
            onProceed={() => setCurrentView(ViewState.DASHBOARD)}
            currentData={portfolioData}
            fileHistory={fileHistory}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-wallstreet-900 text-wallstreet-text font-sans">
      <Sidebar
        currentView={currentView}
        setView={setCurrentView}
        hasData={portfolioData.length > 0}
      />

      <main className="flex-1 overflow-y-auto max-h-screen relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-wallstreet-100 via-white to-white -z-10 pointer-events-none"></div>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;