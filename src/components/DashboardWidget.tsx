import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import {
  Timer,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { TestRun } from '../types/qa.ts';

interface DashboardWidgetProps {
  testRuns: TestRun[];
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({ testRuns }) => {
  const [envFilter, setEnvFilter] = useState<'all' | 'Staging' | 'Production' | 'QA'>('all');
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30);

  // Process test runs for the last 30 days
  const chartData = useMemo(() => {
    const cutoffTime = Date.now() - timeRangeDays * 24 * 60 * 60 * 1000;

    const filtered = testRuns
      .filter((run) => {
        const runTime = new Date(run.createdAt).getTime();
        const matchesTime = runTime >= cutoffTime;
        const matchesEnv = envFilter === 'all' || run.environment === envFilter;
        return matchesTime && matchesEnv;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return filtered.map((run) => {
      const durationSec = run.durationSeconds ?? (run.status === 'completed' ? 120 : 60);
      const dateObj = new Date(run.createdAt);
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      return {
        id: run.id,
        title: run.title,
        environment: run.environment,
        date: formattedDate,
        rawTimestamp: dateObj.getTime(),
        durationSeconds: durationSec,
        durationMinutes: Number((durationSec / 60).toFixed(2)),
        formattedDuration: run.formattedDuration || `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`,
        status: run.status,
      };
    });
  }, [testRuns, envFilter, timeRangeDays]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        avgSec: 0,
        avgFormatted: '0s',
        minSec: 0,
        minFormatted: '0s',
        maxSec: 0,
        maxFormatted: '0s',
        maxRun: null,
        trendPercent: 0,
        hasRegression: false,
      };
    }

    const durations = chartData.map((d) => d.durationSeconds);
    const sum = durations.reduce((acc, curr) => acc + curr, 0);
    const avg = Math.round(sum / durations.length);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const maxRun = chartData.find((d) => d.durationSeconds === max) || null;

    // Trend comparison: compare first half to second half
    const midpoint = Math.floor(durations.length / 2);
    let trendPercent = 0;
    if (midpoint > 0) {
      const firstHalf = durations.slice(0, midpoint);
      const secondHalf = durations.slice(midpoint);
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      trendPercent = Math.round(((avgSecond - avgFirst) / avgFirst) * 100);
    }

    const formatSec = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      if (m > 0) return `${m}m ${sec}s`;
      return `${sec}s`;
    };

    return {
      avgSec: avg,
      avgFormatted: formatSec(avg),
      minSec: min,
      minFormatted: formatSec(min),
      maxSec: max,
      maxFormatted: formatSec(max),
      maxRun,
      trendPercent,
      hasRegression: max > avg * 1.4, // Spikes 40% above baseline
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isOutlier = data.durationSeconds > stats.avgSec * 1.35;

      return (
        <div className="bg-white border border-zinc-200 shadow-xl rounded-xl p-3.5 text-xs text-zinc-800 min-w-[200px] z-50">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2 mb-2">
            <span className="font-semibold text-zinc-900 truncate max-w-[150px]">{data.title}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
              {data.environment}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-500">
              <span>Date:</span>
              <span className="font-medium text-zinc-800">{data.date}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-500">
              <span>Duration:</span>
              <span className="font-mono font-bold text-zinc-900 text-sm">
                {data.formattedDuration}
              </span>
            </div>
            {isOutlier && (
              <div className="mt-2 pt-1.5 border-t border-rose-100 flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Performance anomaly (+{Math.round(((data.durationSeconds - stats.avgSec) / stats.avgSec) * 100)}% over baseline)</span>
              </div>
            )}
          </div>
        </div>
      );
    };
    return null;
  };

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-7 shadow-xs text-zinc-900 transition-all">
      {/* Header & Controls - Minimalist White Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                Test Run Duration Trend
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                30-day execution performance & latency regression detection
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Environment filter */}
          <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 border border-zinc-200/80 text-xs">
            {(['all', 'Staging', 'Production', 'QA'] as const).map((env) => (
              <button
                key={env}
                onClick={() => setEnvFilter(env)}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                  envFilter === env
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {env === 'all' ? 'All Envs' : env}
              </button>
            ))}
          </div>

          {/* Time range */}
          <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 border border-zinc-200/80 text-xs">
            {[14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRangeDays(days)}
                className={`px-2 py-1 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                  timeRangeDays === days
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Minimalist KPI Snapshot Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-5">
        {/* Baseline Average */}
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
          <span className="text-[11px] font-medium text-zinc-500 block">Baseline Average</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-zinc-900">{stats.avgFormatted}</span>
            <span className="text-[10px] text-zinc-400">per cycle</span>
          </div>
        </div>

        {/* Fastest Execution */}
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
          <span className="text-[11px] font-medium text-zinc-500 block">Fastest Run</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-emerald-600">{stats.minFormatted}</span>
            <span className="text-[10px] text-emerald-700 font-medium">optimal</span>
          </div>
        </div>

        {/* Slowest / Peak Regression */}
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
          <span className="text-[11px] font-medium text-zinc-500 block">Peak Duration</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-xl font-bold font-mono ${
                stats.hasRegression ? 'text-rose-600' : 'text-zinc-900'
              }`}
            >
              {stats.maxFormatted}
            </span>
            {stats.hasRegression && (
              <span className="text-[10px] font-medium text-rose-600 flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" />
                Spike
              </span>
            )}
          </div>
        </div>

        {/* 30-Day Trend Delta */}
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
          <span className="text-[11px] font-medium text-zinc-500 block">30d Velocity Delta</span>
          <div className="mt-1 flex items-center gap-1.5">
            {stats.trendPercent > 0 ? (
              <div className="flex items-center gap-1 text-rose-600 text-sm font-bold font-mono">
                <TrendingUp className="w-4 h-4" />
                <span>+{stats.trendPercent}%</span>
              </div>
            ) : stats.trendPercent < 0 ? (
              <div className="flex items-center gap-1 text-emerald-600 text-sm font-bold font-mono">
                <TrendingDown className="w-4 h-4" />
                <span>{stats.trendPercent}%</span>
              </div>
            ) : (
              <span className="text-sm font-bold font-mono text-zinc-600">Stable</span>
            )}
            <span className="text-[10px] text-zinc-400">
              {stats.trendPercent > 0 ? 'slower' : 'faster'}
            </span>
          </div>
        </div>
      </div>

      {/* Regression Alert Banner if an anomaly is detected */}
      {stats.hasRegression && stats.maxRun && (
        <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Performance Regression Alert:</strong> Test run <em>"{stats.maxRun.title}"</em> recorded a duration of <strong>{stats.maxRun.formattedDuration}</strong>, exceeding the 30-day baseline by {Math.round(((stats.maxRun.durationSeconds - stats.avgSec) / stats.avgSec) * 100)}%.
            </span>
          </div>
          <span className="text-[10px] font-mono text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded shrink-0">
            {stats.maxRun.date}
          </span>
        </div>
      )}

      {/* Recharts Line Chart Container - White & Minimalist Styling */}
      <div className="w-full h-64 pt-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181b" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />

              <XAxis
                dataKey="date"
                stroke="#a1a1aa"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#e4e4e7' }}
              />

              <YAxis
                stroke="#a1a1aa"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}s`}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Baseline Reference Line */}
              <ReferenceLine
                y={stats.avgSec}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: `Baseline: ${stats.avgFormatted}`,
                  position: 'insideTopRight',
                  fill: '#64748b',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              {/* Subtle Area Fill underneath */}
              <Area
                type="monotone"
                dataKey="durationSeconds"
                fill="url(#durationGradient)"
                stroke="none"
              />

              {/* Main Minimalist Line */}
              <Line
                type="monotone"
                dataKey="durationSeconds"
                stroke="#18181b"
                strokeWidth={2.2}
                dot={{
                  r: 3.5,
                  fill: '#ffffff',
                  stroke: '#18181b',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: '#18181b',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs">
            <Clock className="w-8 h-8 text-zinc-300 mb-2 stroke-[1.5]" />
            <span>No test runs recorded within the selected period.</span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-0.5 bg-zinc-900 inline-block" />
          <span>Execution Duration Trend (Seconds)</span>
          <span className="mx-1.5 text-zinc-300">•</span>
          <span className="w-2 h-0.5 border-b border-dashed border-slate-400 inline-block" />
          <span>30-Day Mean Baseline</span>
        </span>
        <span className="font-mono text-zinc-600">
          {chartData.length} runs evaluated
        </span>
      </div>
    </div>
  );
};
