import React, { useMemo, useState, useEffect } from 'react';
import { AggregatedStats } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileDown, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from './ui/Button';
import { generateWordReport } from '../services/wordGenerator';

interface ReportDashboardProps {
  stats: AggregatedStats;
  onReset: () => void;
  monthYear: string;
}

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ stats, onReset, monthYear }) => {
  
  // Local state for Editable Report
  const [reportTitle, setReportTitle] = useState(`Call Server Utilization Report for ${monthYear}`);
  const [executiveSummary, setExecutiveSummary] = useState('');

  // Initialize default summary
  useEffect(() => {
      const rounded = Math.round(stats.utilizationIdle);
      setExecutiveSummary(`This report provides a summary of ${rounded}% utilization for the call servers monitored for ${monthYear}. The data includes user distribution across call servers, with segmentation into online (idle) and offline (fault) states. Key performance insights and utilization percentages are presented below.`);
  }, [stats, monthYear]);

  const pieData = useMemo(() => [
    { name: 'Idle', value: stats.totalIdle, color: '#3b82f6' }, // Blue
    { name: 'Busy', value: stats.totalBusy, color: '#f59e0b' }, // Amber
    { name: 'Fault', value: stats.totalFault, color: '#ef4444' }, // Red
  ], [stats]);

  const handleDownload = async () => {
    const serverCount = stats.serverBreakdown.length;
    // Pass the edited title and summary
    await generateWordReport(stats, monthYear, serverCount, [], reportTitle, executiveSummary);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Utilization Report</h2>
          <p className="text-slate-500">Analysis for <span className="font-semibold text-slate-700">{monthYear}</span></p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" onClick={onReset}>Upload New</Button>
            <Button onClick={handleDownload} className="gap-2">
                <FileDown className="w-4 h-4" />
                Download DOCX
            </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Total Idle</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalIdle.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">{stats.utilizationIdle.toFixed(2)}% of total</div>
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <CheckCircle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">Total Busy</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalBusy.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">{stats.utilizationBusy.toFixed(2)}% of total</div>
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium">Total Fault</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalFault.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">{stats.utilizationFault.toFixed(2)}% of total</div>
        </div>
        <div className="p-5 bg-slate-900 rounded-xl shadow-sm text-white">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <span className="text-sm font-medium">Total Interactions</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalCalls.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Aggregated from all files</div>
        </div>
      </div>

      {/* Charts & Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Charts */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribution Overview</h3>
            <div className="flex-grow min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value: number) => [value.toLocaleString(), 'Count']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Server Table (Preview of Data) */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Data Breakdown</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-700 uppercase border-b-2 border-slate-800">
                        <tr>
                            <th className="px-4 py-3">Server</th>
                            <th className="px-4 py-3 text-right">Idle</th>
                            <th className="px-4 py-3 text-right">Busy</th>
                            <th className="px-4 py-3 text-right">Fault</th>
                            <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-0">
                        {stats.serverBreakdown.map((server, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-900">{server.serverIp}</td>
                                <td className="px-4 py-3 text-right">{server.idle.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">{server.busy.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">{server.fault.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">{server.total.toLocaleString()}</td>
                            </tr>
                        ))}
                        <tr className="border-t-2 border-slate-800 font-semibold text-slate-900">
                            <td className="px-4 py-3">TOTAL</td>
                            <td className="px-4 py-3 text-right">{stats.totalIdle.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{stats.totalBusy.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{stats.totalFault.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{stats.totalCalls.toLocaleString()}</td>
                        </tr>
                        <tr className="bg-white font-semibold text-slate-900">
                            <td className="px-4 py-3">UTILIZATION</td>
                            <td className="px-4 py-3 text-right">{stats.utilizationIdle.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-right">{stats.utilizationBusy.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-right">{stats.utilizationFault.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-right"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      </div>

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
                    {stats.serverBreakdown.map((s, i) => (
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
                         <td className="py-2 text-right font-[Calibri] text-lg">{stats.totalIdle}</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{stats.totalBusy}</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{stats.totalFault}</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{stats.totalCalls}</td>
                    </tr>
                    <tr>
                         <td className="py-2 font-[Calibri] text-lg">UTILIZATION</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{stats.utilizationIdle.toFixed(2)}%</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{stats.utilizationBusy.toFixed(2)}%</td>
                         <td className="py-2 text-right font-[Calibri] text-lg">{stats.utilizationFault.toFixed(2)}%</td>
                         <td className="py-2 text-right font-[Calibri] text-lg"></td>
                    </tr>
                </tbody>
            </table>

            {/* Footer Placeholder */}
            <div className="mt-12 pt-4 border-t border-slate-200 text-center text-slate-400 text-sm">
                Page 1
            </div>
        </div>
      </div>
    </div>
  );
};