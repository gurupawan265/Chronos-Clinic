import React from "react";
import {
  CalendarDays,
  UserCheck,
  UserX,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";

interface HeadlineStats {
  appointmentsToday: number;
  checkedInRightNow: number;
  noShowsThisWeek: number;
  confirmedUpcoming: number;
}

interface StatCardsProps {
  stats: HeadlineStats | null | undefined;
}

export default function StatCards({ stats }: StatCardsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Appointments Today */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Appointments Today
          </span>
          <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>
        <div className="text-3xl font-extrabold text-white mt-2">
          {stats.appointmentsToday}
        </div>
        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <span>Active schedule capacity</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600 opacity-60" />
      </div>

      {/* 2. Checked In Right Now */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Checked In Right Now
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="text-3xl font-extrabold text-emerald-400 mt-2 flex items-center gap-2">
          <span>{stats.checkedInRightNow}</span>
          {stats.checkedInRightNow > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          )}
        </div>
        <div className="text-xs text-emerald-300/70 mt-1">
          Patients currently in waiting clinic area
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-60" />
      </div>

      {/* 3. No-Shows This Week */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            No-Shows This Week
          </span>
          <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
            <UserX className="w-5 h-5" />
          </div>
        </div>
        <div className="text-3xl font-extrabold text-rose-400 mt-2">
          {stats.noShowsThisWeek}
        </div>
        <div className="text-xs text-rose-300/70 mt-1">
          Unattended confirmed visits
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-600 opacity-60" />
      </div>

      {/* 4. Confirmed Upcoming */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Confirmed Upcoming
          </span>
          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="text-3xl font-extrabold text-cyan-400 mt-2">
          {stats.confirmedUpcoming}
        </div>
        <div className="text-xs text-cyan-300/70 mt-1">
          Locked in clinic schedule
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-cyan-600 opacity-60" />
      </div>
    </div>
  );
}
