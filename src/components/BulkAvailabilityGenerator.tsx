import React, { useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
}

interface BulkGeneratorProps {
  providers: Provider[];
  isFrontDesk: boolean;
  currentUserId?: string;
  onGenerate: (data: {
    providerId: string;
    startDate: string;
    endDate: string;
    startTime: string;
    durationMinutes: number;
    daysOfWeek: number[];
  }) => void;
  isLoading?: boolean;
  result?: { createdCount: number; skippedCount: number } | null;
}

const DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

export default function BulkAvailabilityGenerator({
  providers,
  isFrontDesk,
  currentUserId,
  onGenerate,
  isLoading = false,
  result,
}: BulkGeneratorProps) {
  const [providerId, setProviderId] = useState(
    isFrontDesk ? providers[0]?.id || "" : currentUserId || ""
  );
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(
    format(new Date(Date.now() + 14 * 86400000), "yyyy-MM-dd")
  );
  const [startTime, setStartTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId) return;
    onGenerate({
      providerId,
      startDate,
      endDate,
      startTime,
      durationMinutes: Number(durationMinutes),
      daysOfWeek: selectedDays,
    });
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-6 shadow-xl max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>Bulk Availability Slot Generator</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Automatically schedule recurring open appointment blocks across a date range. Collisions with existing slots are automatically skipped to avoid double booking.
        </p>
      </div>

      {result && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold block">Bulk Generation Completed</span>
              <span>
                Created <strong>{result.createdCount}</strong> new slots. Skipped{" "}
                <strong>{result.skippedCount}</strong> colliding slots.
              </span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider Selector */}
        {isFrontDesk && (
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Target Provider
            </label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
              required
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        </div>

        {/* Time and Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Daily Slot Start Time (24h HH:mm)
            </label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="09:00"
              pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
              className="w-full bg-slate-900 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Slot Duration (Minutes)
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full bg-slate-900 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
        </div>

        {/* Days of Week */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            Active Days of Week
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const isSelected = selectedDays.includes(d.value);
              return (
                <button
                  type="button"
                  key={d.value}
                  onClick={() => toggleDay(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || selectedDays.length === 0}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isLoading ? "Generating Slots..." : "Generate Availability Slots"}</span>
        </button>
      </form>
    </div>
  );
}
