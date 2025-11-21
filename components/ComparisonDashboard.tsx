import React from 'react';
import { AggregatedStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowRight, TrendingUp, TrendingDown, Minus, FileDown } from 'lucide-react';
import { Button } from './ui/Button';
import { generateWordReport } from '../services/wordGenerator';

interface ComparisonDashboardProps {
  currentStats: AggregatedStats;
  currentMonth: string;
  prevStats: AggregatedStats;
  prevMonth: string;
  onReset: () => void;
}

export const ComparisonDashboard: React.FC<ComparisonDashboardProps> = ({
  currentStats,
  currentMonth,
  prevStats,
  prevMonth,
  onReset
}) => {

  const chartData = [
    {
      name: 'Idle',
      [prevMonth]: prevStats.totalIdle,
      [currentMonth]: currentStats.totalIdle,
    },
    {
      name: 'Busy',
      [prevMonth]: prevStats.totalBusy,
      [currentMonth]: currentStats.totalBusy,
    },
    {
      name: 'Fault',
      [prevMonth]: prevStats.totalFault,
      [currentMonth]: currentStats.totalFault,
    },
  ];

  const calculateChange = (current: number, prev: number) => {
    if (prev === 0) return current === 0 ? 0 : 100;
    return ((current - prev) / prev) * 100;
  };

  const MetricCard = ({ label, current, prev, isPercentage = false }: { label: string, current: number, prev: number, isPercentage?: boolean }) => {
    const change = isPercentage ? current - prev : calculateChange(current, prev);
    const isPositive = change > 0;
    const isNeutral = change === 0;
    
    // For faults, increase is bad (usually). But for generic visualization let's stick to math: Green = Up, Red = Down.
    // Or simply use Neutral colors for direction.
    
    return (
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h4 className="text-slate-500 text-sm font-medium mb-2">{label}</h4>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">
            {isPercentage ? `${current.toFixed(2)}%` : current.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">vs {prevMonth}</span>
        </div>
        <div className={`flex items-center mt-2 text-sm font-medium ${isNeutral ? 'text-slate-500' : isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isNeutral ? <Minus className="w-4 h-4 mr-1" /> : isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
          {Math.abs(change).toFixed(2)}{isPercentage ? 'pp' : '%'}
        </div>
      </div>
    );
  };

  const handleDownload = async () => {
    const serverCount = currentStats.serverBreakdown.length;
    await generateWordReport(currentStats, currentMonth, serverCount, [{ label: prevMonth, stats: prevStats }]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Comparison Report</h2>
          <p className="text-slate-500">Comparing <span className="font-semibold text-slate-700">{prevMonth}</span> vs <span className="font-semibold text-slate-700">{currentMonth}</span></p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onReset}>New Comparison</Button>
          <Button onClick={handleDownload} className="gap-2">
             <FileDown className="w-4 h-4" />
             Download Full Report
          </Button>
        </div>
      </div>

      {/* KPI Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Total Idle" current={currentStats.totalIdle} prev={prevStats.totalIdle} />
        <MetricCard label="Total Busy" current={currentStats.totalBusy} prev={prevStats.totalBusy} />
        <MetricCard label="Total Fault" current={currentStats.totalFault} prev={prevStats.totalFault} />
        <MetricCard label="Fault Utilization" current={currentStats.utilizationFault} prev={prevStats.utilizationFault} isPercentage />
      </div>

      {/* Charts */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Metric Comparison</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => value.toLocaleString()}
              />
              <Legend />
              <Bar dataKey={prevMonth} fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey={currentMonth} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Text */}
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
         <h3 className="text-blue-900 font-bold mb-2 flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            Analysis Summary
         </h3>
         <p className="text-blue-800 leading-relaxed">
            Comparing <strong>{currentMonth}</strong> to <strong>{prevMonth}</strong>, 
            total interactions have {currentStats.totalCalls >= prevStats.totalCalls ? 'increased' : 'decreased'} by <strong>{Math.abs(currentStats.totalCalls - prevStats.totalCalls).toLocaleString()}</strong> calls. 
            Fault utilization has shifted by <strong>{(currentStats.utilizationFault - prevStats.utilizationFault).toFixed(2)}%</strong> percentage points.
         </p>
      </div>
    </div>
  );
};