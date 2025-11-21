import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { ReportDashboard } from './components/ReportDashboard';
import { TrendDashboard } from './components/TrendDashboard';
import { parseExcelFiles, calculateAggregates } from './services/excelParser';
import { AggregatedStats, ProcessedFile, ComparisonPeriod } from './types';
import { Activity, ArrowRight, Info, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from './components/ui/Button';
import { cn } from './utils/cn';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'processing' | 'report'>('upload');
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [comparisonType, setComparisonType] = useState<'pairwise' | 'trend'>('pairwise');
  
  // Single Report State
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentDate.toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState<string>(currentDate.getFullYear().toString());

  // Comparison State (Dynamic)
  // Initialize with 2 periods for Pairwise default
  const [periods, setPeriods] = useState<ComparisonPeriod[]>([
    { id: '1', month: currentDate.toLocaleString('default', { month: 'long' }), year: (currentDate.getFullYear() - 1).toString(), files: [], stats: null },
    { id: '2', month: currentDate.toLocaleString('default', { month: 'long' }), year: currentDate.getFullYear().toString(), files: [], stats: null }
  ]);

  const [error, setError] = useState<string | null>(null);
  
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const monthYear = `${selectedMonth} ${selectedYear}`;

  // Helpers for Comparison State
  const addPeriod = () => {
    setPeriods(prev => [
        ...prev, 
        { 
            id: crypto.randomUUID(), 
            month: months[0], 
            year: new Date().getFullYear().toString(), 
            files: [], 
            stats: null 
        }
    ]);
  };

  const removePeriod = (id: string) => {
      if (periods.length <= 2) return; // Maintain min 2
      setPeriods(prev => prev.filter(p => p.id !== id));
  };

  const updatePeriod = (id: string, field: keyof ComparisonPeriod, value: any) => {
      setPeriods(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const processFiles = async (files: File[]): Promise<AggregatedStats> => {
      const processedData: ProcessedFile[] = await parseExcelFiles(files);
      const hasData = processedData.some(f => f.records.length > 0 || f.fileTotalRow);
      if (!hasData) {
        throw new Error("No valid data rows or TOTAL rows found in uploaded files.");
      }
      return calculateAggregates(processedData);
  };

  const handleGenerateReport = async () => {
    setStep('processing');
    setError(null);

    try {
      if (mode === 'single') {
        if (rawFiles.length === 0) throw new Error("Please upload files first.");
        const aggregated = await processFiles(rawFiles);
        setStats(aggregated);
      } else {
        // Validate periods
        const emptyPeriod = periods.find(p => p.files.length === 0);
        if (emptyPeriod) throw new Error("Please upload files for all selected periods.");
        
        const updatedPeriods = await Promise.all(periods.map(async (p) => {
            const agg = await processFiles(p.files);
            return { ...p, stats: agg };
        }));
        
        setPeriods(updatedPeriods);
      }
      setStep('report');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process files.");
      setStep('upload');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setStats(null);
    setRawFiles([]);
    setPeriods([
        { id: '1', month: months[currentDate.getMonth()], year: (currentDate.getFullYear() - 1).toString(), files: [], stats: null },
        { id: '2', month: months[currentDate.getMonth()], year: currentDate.getFullYear().toString(), files: [], stats: null }
    ]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Activity size={20} />
            </div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
              CallServer Insight
            </h1>
          </div>
          <div className="flex items-center gap-4">
              {step === 'upload' && (
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setMode('single')}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                            mode === 'single' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                          Single Report
                      </button>
                      <button 
                        onClick={() => setMode('compare')}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                            mode === 'compare' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                          Comparison
                      </button>
                  </div>
              )}
              <div className="text-xs font-medium text-slate-500 hidden sm:block">
                v1.2.0
              </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {error}
          </div>
        )}

        {step === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Left Column: Upload & Settings */}
            <div className="lg:col-span-2 space-y-8">
              <div className="text-left">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {mode === 'single' ? 'Generate Server Report' : 'Compare Utilization Data'}
                </h2>
                <p className="mt-2 text-lg text-slate-500">
                  {mode === 'single' 
                    ? "Configure the report period and upload your Excel data files to get started."
                    : "Analyze trends across multiple months or compare two specific periods."}
                </p>
              </div>

              <div className="space-y-6">
                
                {/* Single Mode Upload */}
                {mode === 'single' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Month</label>
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border border-slate-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-slate-900">
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Year</label>
                                <input type="text" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-slate-900" />
                            </div>
                        </div>
                        <div className="border-t border-slate-100 pt-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Upload Data Files</label>
                            <FileUploader onFilesSelected={setRawFiles} />
                        </div>
                    </div>
                )}

                {/* Comparison Mode Uploads */}
                {mode === 'compare' && (
                    <div className="space-y-6">
                        {/* Comparison Type Toggle */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-center">
                            <span className="text-sm font-medium text-slate-700">Comparison Type:</span>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => {
                                        setComparisonType('pairwise');
                                        // Reset to 2 periods
                                        if (periods.length !== 2) {
                                            setPeriods([
                                                { id: '1', month: months[currentDate.getMonth()], year: (currentDate.getFullYear() - 1).toString(), files: [], stats: null },
                                                { id: '2', month: months[currentDate.getMonth()], year: currentDate.getFullYear().toString(), files: [], stats: null }
                                            ]);
                                        }
                                    }}
                                    className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", comparisonType === 'pairwise' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
                                >
                                    With Last Month (2)
                                </button>
                                <button 
                                    onClick={() => setComparisonType('trend')}
                                    className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", comparisonType === 'trend' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
                                >
                                    Trend Series (Multi)
                                </button>
                            </div>
                        </div>

                        {/* Dynamic Periods List */}
                        <div className="space-y-4">
                            {periods.map((period, index) => (
                                <div key={period.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 relative overflow-hidden transition-all">
                                    <div className={cn("absolute top-0 left-0 w-1 h-full", index === periods.length - 1 ? "bg-blue-500" : "bg-slate-300")}></div>
                                    
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                            <span className={cn("text-xs px-2 py-1 rounded", index === periods.length - 1 ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600")}>
                                                {index === periods.length - 1 ? "Current Period" : `Period ${index + 1}`}
                                            </span>
                                        </h3>
                                        {comparisonType === 'trend' && periods.length > 2 && (
                                            <button onClick={() => removePeriod(period.id)} className="text-slate-400 hover:text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <select 
                                            value={period.month} 
                                            onChange={(e) => updatePeriod(period.id, 'month', e.target.value)} 
                                            className="block w-full text-sm border-slate-300 rounded-md bg-white"
                                        >
                                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <input 
                                            type="text" 
                                            value={period.year} 
                                            onChange={(e) => updatePeriod(period.id, 'year', e.target.value)} 
                                            className="block w-full text-sm border-slate-300 rounded-md bg-white" 
                                        />
                                    </div>
                                    <FileUploader onFilesSelected={(files) => updatePeriod(period.id, 'files', files)} />
                                </div>
                            ))}
                        </div>

                        {comparisonType === 'trend' && (
                            <Button variant="outline" onClick={addPeriod} className="w-full border-dashed border-2">
                                <Plus className="w-4 h-4 mr-2" /> Add Another Month
                            </Button>
                        )}
                    </div>
                )}
                
                <div className="mt-6 flex justify-end">
                  <Button 
                      disabled={mode === 'single' ? rawFiles.length === 0 : periods.some(p => p.files.length === 0)}
                      onClick={handleGenerateReport}
                      size="lg"
                      className="w-full sm:w-auto gap-2 shadow-blue-200 shadow-lg"
                  >
                      {mode === 'single' ? 'Generate Report' : 'Analyze Data'}
                      <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column: Guide */}
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-2 mb-4 text-blue-900">
                  <Info className="w-5 h-5" />
                  <h3 className="font-bold text-lg">How it works</h3>
                </div>
                <div className="space-y-4">
                   {mode === 'single' ? (
                       <>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold shadow-sm text-sm border border-blue-100">1</div>
                            <div><h4 className="font-medium text-blue-900 text-sm">Select Period</h4><p className="text-sm text-blue-700/80 mt-1">Choose Month/Year.</p></div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold shadow-sm text-sm border border-blue-100">2</div>
                            <div><h4 className="font-medium text-blue-900 text-sm">Upload Files</h4><p className="text-sm text-blue-700/80 mt-1">Drag & drop Excel files.</p></div>
                        </div>
                       </>
                   ) : (
                       <>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold shadow-sm text-sm border border-blue-100">1</div>
                            <div><h4 className="font-medium text-blue-900 text-sm">Choose Mode</h4><p className="text-sm text-blue-700/80 mt-1">"With Last Month" (2) or "Trend Series" (Multiple).</p></div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold shadow-sm text-sm border border-blue-100">2</div>
                            <div><h4 className="font-medium text-blue-900 text-sm">Define & Upload</h4><p className="text-sm text-blue-700/80 mt-1">Add periods and upload files for each respective month.</p></div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold shadow-sm text-sm border border-blue-100">3</div>
                            <div><h4 className="font-medium text-blue-900 text-sm">Visualize</h4><p className="text-sm text-blue-700/80 mt-1">See graphs and download a comprehensive Word report.</p></div>
                        </div>
                       </>
                   )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Supported Formats
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['.xlsx', '.xls', '.ods', '.csv'].map(ext => (
                      <span key={ext} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded font-medium border border-slate-200">{ext}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in duration-700">
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="mt-6 text-xl font-semibold text-slate-800">Processing Data...</h3>
            <p className="text-slate-500 mt-2">Parsing files and calculating {mode === 'compare' ? 'comparisons' : 'utilization'}.</p>
          </div>
        )}

        {step === 'report' && (
            <>
                {mode === 'single' && stats ? (
                    <ReportDashboard stats={stats} onReset={handleReset} monthYear={monthYear} />
                ) : (
                    // Unified dashboard for both Pairwise and Trend since Trend handles N periods
                    <TrendDashboard 
                        periods={periods}
                        onReset={handleReset} 
                    />
                )}
            </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} CallServer Insight. Internal Tool.
        </div>
      </footer>
    </div>
  );
};

export default App;