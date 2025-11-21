import React, { useMemo, useState, useEffect } from 'react';
import { AggregatedStats, ComparisonPeriod } from '../types';
import { 
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { FileDown, Activity } from 'lucide-react';
import { Button } from './ui/Button';
import { generateWordReport } from '../services/wordGenerator';

interface TrendDashboardProps {
  periods: ComparisonPeriod[]; // Assumed to be sorted by date/order
  onReset: () => void;
}

export const TrendDashboard: React.FC<TrendDashboardProps> = ({
  periods,
  onReset
}) => {
  
  const mainPeriod = periods[periods.length - 1];
  const mainLabel = mainPeriod ? `${mainPeriod.month} ${mainPeriod.year}` : '';

  // Local state for Editable Report
  const [reportTitle, setReportTitle] = useState('');
  const [executiveSummary, setExecutiveSummary] = useState('');

  // Initialize default text when mainPeriod changes
  useEffect(() => {
      if (mainPeriod && mainPeriod.stats) {
          setReportTitle(`Call Server Utilization Report for ${mainLabel}`);
          const rounded = Math.round(mainPeriod.stats.utilizationIdle);
          setExecutiveSummary(`This report provides a summary of ${rounded}% utilization for the call servers monitored for ${mainLabel}. The data includes user distribution across call servers, with segmentation into online (idle) and offline (fault) states. Key performance insights and utilization percentages are presented below.`);
      }
  }, [mainPeriod, mainLabel]);


  // Prepare data for charts
  const chartData = useMemo(() => {
    return periods.map(p => {
        if (!p.stats) return null;
        const label = `${p.month} ${p.year}`;
        return {
            name: label,
            Idle: p.stats.totalIdle,
            Busy: p.stats.totalBusy,
            Fault: p.stats.totalFault,
            Total: p.stats.totalCalls,
            'Fault %': parseFloat(p.stats.utilizationFault.toFixed(2)),
            'Idle %': parseFloat(p.stats.utilizationIdle.toFixed(2))
        };
    }).filter(Boolean);
  }, [periods]);

  // Find highest fault month
  const insights = useMemo(() => {
      if (chartData.length < 2) return null;
      
      // Fault Trend
      const first = chartData[0];
      const last = chartData[chartData.length - 1];
      const faultDiff = (last?.['Fault %'] || 0) - (first?.['Fault %'] || 0);
      
      // Peak
      const peakFault = [...chartData].sort((a, b) => (b?.['Fault %'] || 0) - (a?.['Fault %'] || 0))[0];

      return {
          direction: faultDiff > 0 ? 'increased' : 'decreased',
          diff: Math.abs(faultDiff).toFixed(2),
          peakMonth: peakFault?.name || '',
          peakValue: peakFault?.['Fault %'] || 0
      };
  }, [chartData]);

  const handleDownload = async () => {
    const history = periods.slice(0, periods.length - 1);

    if (mainPeriod.stats) {
        const historyFormatted = history.map(h => ({
            label: `${h.month} ${h.year}`,
            stats: h.stats!
        }));
        
        await generateWordReport(
            mainPeriod.stats, 
            mainLabel, 
            mainPeriod.stats.serverBreakdown.length,
            historyFormatted,
            reportTitle,
            executiveSummary
        );
    }
  };

  if (!mainPeriod || !mainPeriod.stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trend Analysis Report</h2>
          <p className="text-slate-500">Comparing performance across <span className="font-semibold text-slate-700">{periods.length} periods</span></p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onReset}>New Analysis</Button>
          <Button onClick={handleDownload} className="gap-2">
             <FileDown className="w-4 h-4" />
             Download Report
          </Button>
        </div>
      </div>

      {/* Chart Section: Composed Trend Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Trend Analysis: Faults vs Efficiency</h3>
        <p className="text-xs text-slate-500 mb-6">Correlating the absolute number of faults (Bars) with the percentage rate (Line).</p>
        <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData as any[]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} scale="point" padding={{ left: 30, right: 30 }} />
                    <YAxis yAxisId="left" orientation="left" label={{ value: 'Fault Count', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Fault %', angle: 90, position: 'insideRight' }} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="Fault" fill="#cbd5e1" barSize={40} name="Fault Count" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="Fault %" stroke="#ef4444" strokeWidth={3} dot={{ r: 6 }} name="Fault Rate (%)" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Insights Section */}
      {insights && (
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-800 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold">Performance Insights</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <p className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-1">Overall Trend</p>
                    <p className="text-lg">
                        Fault utilization has <span className={insights.direction === 'increased' ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{insights.direction}</span> by {insights.diff}% across the selected period.
                    </p>
                </div>
                <div>
                    <p className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-1">Critical Point</p>
                    <p className="text-lg">
                        Highest fault rate observed in <span className="text-white font-bold">{insights.peakMonth}</span> at {insights.peakValue}%.
                    </p>
                </div>
             </div>
          </div>
      )}

      {/* --- Document Editor / Preview --- */}
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-bold text-slate-900">Report Preview & Edit</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Editable</span>
        </div>
        <p className="text-slate-500 mb-6">Review and edit the content below. Your changes will be applied to the downloaded Word document.</p>
        
        {/* A4 Container Simulator */}
        <div className="w-full max-w-[21cm] mx-auto bg-white shadow-2xl border border-slate-200 p-[2.54cm] min-h-[29.7cm] text-slate-900">
            
            {/* Title Input */}
            <input 
                type="text" 
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full text-3xl font-bold text-slate-900 border-none focus:ring-2 focus:ring-blue-200 rounded p-2 mb-8 font-[Calibri]"
                placeholder="Report Title"
            />

            {/* Section 1 */}
            <h4 className="text-xl font-bold mb-4 font-[Calibri]">1. Executive Summary</h4>
            <textarea
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
                className="w-full h-48 text-lg leading-relaxed border-none resize-none focus:ring-2 focus:ring-blue-200 rounded p-2 mb-8 font-[Calibri]"
            />

            {/* Section 2 (Read Only Preview) */}
            <h4 className="text-xl font-bold mb-4 font-[Calibri]">2. Utilization Statistics</h4>
            <table className="w-full text-left mb-8 border-collapse">
                <thead>
                    <tr className="border-b border-black">
                        <th className="py-2 font-normal text-lg font-[Calibri]">SERVER</th>
                        <th className="py-2 text-right font-normal text-lg font-[Calibri]">IDLE</th>
                        <th className="py-2 text-right font-normal text-lg font-[Calibri]">BUSY</th>
                        <th className="py-2 text-right font-normal text-lg font-[Calibri]">FAULT</th>
                        <th className="py-2 text-right font-normal text-lg font-[Calibri]">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {mainPeriod.stats.serverBreakdown.map((s, i) => (
                        <tr key={i}>
                            <td className="py-2 font-[Calibri] text-lg">{s.serverIp}</td>
                            <td className="py-2 text-right font-[Calibri] text-lg">{s.idle}</td>
                            <td className="py-2 text-right font-[Calibri] text-lg">{s.busy}</td>
                            <td className="py-2 text-right font-[Calibri] text-lg">{s.fault}</td>
                            <td className="py-2 text-right font-[Calibri] text-lg">{s.total}</td>
                        </tr>
                    ))}
                    <tr className="border-t border-black">
                         <td className="py-2 font-[Calibri] text-lg">TOTAL</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{mainPeriod.stats.totalIdle}</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{mainPeriod.stats.totalBusy}</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{mainPeriod.stats.totalFault}</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{mainPeriod.stats.totalCalls}</td>
                    </tr>
                    <tr>
                         <td className="py-2 font-[Calibri] text-lg">UTILIZATION</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{mainPeriod.stats.utilizationIdle.toFixed(2)}%</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{mainPeriod.stats.utilizationBusy.toFixed(2)}%</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{mainPeriod.stats.utilizationFault.toFixed(2)}%</td>
                         <td className="py-2 text-right font-[Calibri] text-lg"></td>
                    </tr>
                </tbody>
            </table>

            {/* Section 3 (Comparison Preview) */}
            {periods.length > 1 && (
                <>
                     <h4 className="text-xl font-bold mb-4 font-[Calibri]">3. Comparative Trend Analysis</h4>
                     <p className="text-lg mb-4 font-[Calibri]">The table below outlines the performance trend across the selected periods, culminating in {mainLabel}.</p>
                     <div className="border-b border-slate-400 pb-2 mb-4">
                         <p className="text-sm text-slate-400 italic">[Comparative Table will be generated here in the final document containing {periods.length} columns]</p>
                     </div>
                </>
            )}
            
            {/* Footer Placeholder */}
            <div className="mt-12 pt-4 border-t border-slate-200 text-center text-slate-400 text-sm">
                Page 1
            </div>
        </div>
      </div>

    </div>
  );
};