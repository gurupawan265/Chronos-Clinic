import React from "react";
import StatusBadge from "./StatusBadge";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  UserCheck,
  AlertCircle,
  Calendar,
} from "lucide-react";

interface WeeklyRate {
  weekLabel: string;
  rate: number;
  noShows: number;
  total: number;
}

interface ProviderStat {
  id: string;
  name: string;
  totalAppointments: number;
  completedAppointments: number;
}

interface AnalyticsData {
  byStatus: Record<string, number>;
  byProvider: ProviderStat[];
  weeklyNoShowRates: WeeklyRate[];
}

interface AnalyticsDashboardProps {
  stats: AnalyticsData | null | undefined;
}

export default function AnalyticsDashboard({ stats }: AnalyticsDashboardProps) {
  if (!stats) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
        <BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Analytics data is currently unavailable.</p>
      </div>
    );
  }

  const maxRate = Math.max(
    ...stats.weeklyNoShowRates.map((w) => w.rate),
    30
  );

  return (
    <div className="space-y-6">
      {/* 1. 8-Week No-Show Trend Chart */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Weekly No-Show Rate (Last 8 Weeks)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Percentage of resolved clinical visits that resulted in an unattended no-show
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
              <span>Normal (&lt;20%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-rose-300">
              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
              <span>Elevated (&gt;20%)</span>
            </span>
          </div>
        </div>

        {/* Bar Chart Grid */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4 items-end h-56">
            {stats.weeklyNoShowRates.map((wk) => {
              const heightPercent = Math.max(
                8,
                Math.round((wk.rate / maxRate) * 100)
              );
              const isHigh = wk.rate > 20;

              return (
                <div
                  key={wk.weekLabel}
                  className="flex flex-col items-center h-full justify-end group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 border border-slate-700 px-2 py-1 rounded-md text-[10px] text-white whitespace-nowrap shadow-xl z-20 pointer-events-none">
                    {wk.noShows} no-shows / {wk.total} resolved
                  </div>

                  {/* Percentage label */}
                  <div
                    className={`text-xs font-bold mb-1.5 transition-colors ${
                      isHigh ? "text-rose-400" : "text-indigo-400"
                    }`}
                  >
                    {wk.rate}%
                  </div>

                  {/* Bar */}
                  <div className="w-full max-w-[48px] bg-slate-800/80 rounded-t-xl overflow-hidden flex flex-col justify-end p-0.5 h-36">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isHigh
                          ? "bg-gradient-to-t from-rose-600 to-rose-400 shadow-glow-red"
                          : "bg-gradient-to-t from-indigo-600 to-cyan-400 shadow-glow"
                      }`}
                    />
                  </div>

                  {/* Week label */}
                  <div className="text-[11px] font-semibold text-slate-400 mt-2 text-center truncate max-w-full">
                    {wk.weekLabel}
                  </div>

                  {/* Fraction */}
                  <div className="text-[10px] text-slate-500 font-mono">
                    {wk.noShows}/{wk.total}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Status & Provider Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-cyan-400" />
            <span>Appointment Status Distribution</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(stats.byStatus).map(([st, count]) => (
              <div
                key={st}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1"
              >
                <StatusBadge status={st} size="xs" />
                <div className="text-xl font-extrabold text-white mt-1">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Workload */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-4">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Provider Appointment Volume</span>
          </h3>

          <div className="space-y-3">
            {stats.byProvider.map((p) => {
              const compPercent =
                p.totalAppointments > 0
                  ? Math.round(
                      (p.completedAppointments / p.totalAppointments) * 100
                    )
                  : 0;

              return (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{p.name}</span>
                    <span className="text-slate-400 font-mono">
                      {p.completedAppointments} / {p.totalAppointments} completed ({compPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${compPercent}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
