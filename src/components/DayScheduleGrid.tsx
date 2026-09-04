import React, { useMemo } from "react";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import StatusBadge from "./StatusBadge";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  UserCheck,
  Phone,
  FileDown,
  RefreshCw,
  Sparkles,
  Users,
  AlertCircle,
  MoreVertical,
  Archive,
  Edit2,
  PanelRightOpen,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export interface Provider {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface SlotAppointment {
  id: string;
  patientName: string;
  patientContact: string;
  status: string;
}

export interface Slot {
  id: string;
  providerId: string;
  date: string | Date;
  startTime: string; // "HH:mm"
  durationMinutes: number;
  status: "ACTIVE" | "ARCHIVED";
  provider: Provider;
  appointment?: SlotAppointment | null;
}

interface DayScheduleGridProps {
  slots: Slot[];
  providers: Provider[];
  selectedDate: string; // "YYYY-MM-DD"
  onDateChange: (newDate: string) => void;
  selectedProviderId: string;
  onProviderChange: (providerId: string) => void;
  isFrontDesk: boolean;
  currentUserId?: string;
  onSelectAppointment: (appointmentId: string) => void;
  onBookSlot: (slot: Slot) => void;
  onEditSlot: (slot: Slot) => void;
  onArchiveSlot: (slotId: string) => void;
  onRestoreSlot: (slotId: string) => void;
  onCreateSlotAtTime: (providerId: string, time: string) => void;
  onExportCsv: () => void;
  onRefresh: () => void;
  isExporting?: boolean;
}

// Default clinical hours: 08:00 to 18:00 in 30m steps
const DEFAULT_TIME_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

function getInitials(name: string): string {
  if (!name) return "??";
  return name
    .replace(/^Dr\.\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function DayScheduleGrid({
  slots,
  providers,
  selectedDate,
  onDateChange,
  selectedProviderId,
  onProviderChange,
  isFrontDesk,
  currentUserId,
  onSelectAppointment,
  onBookSlot,
  onEditSlot,
  onArchiveSlot,
  onRestoreSlot,
  onCreateSlotAtTime,
  onExportCsv,
  onRefresh,
  isExporting = false,
}: DayScheduleGridProps) {
  // Merge all unique times from slots with default clinical hours
  const allTimeSlots = useMemo(() => {
    const slotTimes = new Set<string>(DEFAULT_TIME_SLOTS);
    slots.forEach((s) => {
      if (s.startTime) slotTimes.add(s.startTime);
    });
    return Array.from(slotTimes).sort();
  }, [slots]);

  // Active providers to display as columns
  const displayProviders = useMemo(() => {
    if (selectedProviderId) {
      return providers.filter((p) => p.id === selectedProviderId);
    }
    if (!isFrontDesk && currentUserId) {
      const userProv = providers.filter((p) => p.id === currentUserId);
      return userProv.length > 0 ? userProv : providers;
    }
    return providers;
  }, [providers, selectedProviderId, isFrontDesk, currentUserId]);

  // Quick lookup map: providerId_startTime -> Slot
  const slotMap = useMemo(() => {
    const map = new Map<string, Slot>();
    slots.forEach((s) => {
      const key = `${s.providerId}_${s.startTime}`;
      map.set(key, s);
    });
    return map;
  }, [slots]);

  // Metrics
  const totalSlotsCount = slots.length;
  const bookedSlotsCount = slots.filter((s) => !!s.appointment).length;
  const availableSlotsCount = slots.filter(
    (s) => !s.appointment && s.status === "ACTIVE"
  ).length;
  const occupancyRate =
    totalSlotsCount > 0
      ? Math.round((bookedSlotsCount / totalSlotsCount) * 100)
      : 0;

  // Date manipulation
  const handlePrevDay = () => {
    const current = parseISO(selectedDate);
    onDateChange(format(subDays(current, 1), "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const current = parseISO(selectedDate);
    onDateChange(format(addDays(current, 1), "yyyy-MM-dd"));
  };

  const handleToday = () => {
    onDateChange(format(new Date(), "yyyy-MM-dd"));
  };

  const isCurrentDateToday = isToday(parseISO(selectedDate));

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Schedule Header Toolbar & Controls */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800 shadow-xl">
        {/* Left: Date Navigator */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center bg-slate-900/90 rounded-xl p-1 border border-slate-800 shadow-sm">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 ${
                isCurrentDateToday
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Today
            </button>

            <button
              onClick={handleNextDay}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="relative flex items-center">
            <CalendarIcon className="w-4 h-4 text-indigo-400 absolute left-3.5 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-slate-900/90 text-white text-xs sm:text-sm font-semibold pl-10 pr-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 hover:border-slate-700 transition-all cursor-pointer shadow-sm"
            />
          </div>

          <span className="text-sm font-bold text-slate-200 hidden sm:inline-block px-1">
            {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
          </span>
        </div>

        {/* Right: Provider Filter, CSV Export & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Provider Select dropdown */}
          {isFrontDesk && (
            <div className="flex items-center">
              <select
                value={selectedProviderId}
                onChange={(e) => onProviderChange(e.target.value)}
                className="bg-slate-900/90 text-slate-200 text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 hover:border-slate-700 transition-all cursor-pointer shadow-sm"
              >
                <option value="">All Providers Grid</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export Day CSV */}
          <button
            onClick={onExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-750 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold rounded-xl border border-slate-700/60 hover:border-indigo-500/50 transition-all duration-200 shadow-sm active:scale-95 disabled:opacity-50"
            title="Download Day Schedule as CSV"
          >
            <FileDown className="w-4 h-4 text-cyan-400" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>

          {/* Refresh Grid */}
          <button
            onClick={onRefresh}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 hover:border-indigo-500/50 transition-all duration-200 active:scale-95"
            title="Refresh Schedule"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Create Slot Quick Action */}
          <button
            onClick={() =>
              onCreateSlotAtTime(
                selectedProviderId ||
                  (isFrontDesk ? providers[0]?.id || "" : currentUserId || ""),
                "09:00"
              )
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Slot</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Schedule Metrics Bar with Hover Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/70 hover:bg-slate-850/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between transition-all duration-200 shadow-sm">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Slots
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {totalSlotsCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/70 hover:bg-slate-850/80 border border-slate-800/80 hover:border-indigo-800/50 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between transition-all duration-200 shadow-sm">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Booked
            </div>
            <div className="text-2xl font-black text-indigo-400 mt-1">
              {bookedSlotsCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shadow-sm">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/70 hover:bg-slate-850/80 border border-slate-800/80 hover:border-emerald-800/50 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between transition-all duration-200 shadow-sm">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Available
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {availableSlotsCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/70 hover:bg-slate-850/80 border border-slate-800/80 hover:border-cyan-800/50 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between transition-all duration-200 shadow-sm">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Occupancy
            </div>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {occupancyRate}%
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. The Centerpiece: Day-View Time-Grid */}
      {totalSlotsCount === 0 ? (
        /* Sensible Empty State */
        <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center border border-dashed border-slate-800 my-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-800/30 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
            <CalendarIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1.5">
            No Schedule Configured for this Date
          </h3>
          <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
            There are no provider availability slots created for{" "}
            <strong className="text-slate-200">
              {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
            </strong>
            . You can add individual slots or generate recurring availability in bulk.
          </p>
          <button
            onClick={() =>
              onCreateSlotAtTime(
                selectedProviderId || providers[0]?.id || "",
                "09:00"
              )
            }
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Availability Slot</span>
          </button>
        </div>
      ) : (
        /* The Vertical Time-Grid Container with Generous Spacing */
        <div className="glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <div
              className="min-w-[760px]"
              style={{
                display: "grid",
                gridTemplateColumns: `88px repeat(${displayProviders.length}, minmax(280px, 1fr))`,
              }}
            >
              {/* Header: Top-Left Time Corner */}
              <div className="sticky top-0 left-0 z-30 bg-slate-950/98 backdrop-blur-md p-4 border-b border-r border-slate-800 flex items-center justify-center text-xs font-extrabold text-slate-400 uppercase tracking-wider shadow-sm">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Time
              </div>

              {/* Header: Provider Columns */}
              {displayProviders.map((provider) => {
                const providerSlots = slots.filter(
                  (s) => s.providerId === provider.id
                );
                const bookedCount = providerSlots.filter(
                  (s) => !!s.appointment
                ).length;
                const totalCount = providerSlots.length;

                return (
                  <div
                    key={provider.id}
                    className="sticky top-0 z-20 bg-slate-950/98 backdrop-blur-md p-4 border-b border-r border-slate-800 last:border-r-0 flex items-center justify-between gap-3 shadow-sm hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/25">
                        {getInitials(provider.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-white truncate">
                          {provider.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{provider.email.split("@")[0]}</span>
                          {provider.id === currentUserId && (
                            <span className="text-[9px] font-bold text-indigo-300 bg-indigo-950 border border-indigo-800/60 px-1.5 py-0.2 rounded-md">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Provider load pill */}
                    <div
                      className="text-right flex-shrink-0"
                      title={`${bookedCount} of ${totalCount} slots booked`}
                    >
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 shadow-sm">
                        {bookedCount}/{totalCount} booked
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Grid Rows: Time Gutter & Provider Slot Cells */}
              {allTimeSlots.map((time) => (
                <React.Fragment key={time}>
                  {/* Left Time Gutter Cell */}
                  <div className="sticky left-0 z-10 bg-slate-950/95 backdrop-blur-sm px-3 py-4 border-b border-r border-slate-800/80 flex items-start justify-center shadow-sm">
                    <span className="font-mono text-xs font-bold text-slate-400 tracking-tight">
                      {time}
                    </span>
                  </div>

                  {/* Provider Cells for this Time */}
                  {displayProviders.map((provider) => {
                    const slot = slotMap.get(`${provider.id}_${time}`);

                    return (
                      <div
                        key={`${provider.id}_${time}`}
                        className="p-2 border-b border-r border-slate-800/60 last:border-r-0 min-h-[125px] bg-slate-950/20 transition-colors"
                      >
                        {slot ? (
                          slot.appointment ? (
                            /* ==================== A: BOOKED APPOINTMENT BLOCK ==================== */
                            <div
                              onClick={() =>
                                onSelectAppointment(slot.appointment!.id)
                              }
                              className={`group relative h-full rounded-2xl p-3.5 sm:p-4 cursor-pointer transition-all duration-200 border bg-slate-900/95 hover:bg-slate-850 hover:shadow-2xl hover:-translate-y-0.5 flex flex-col justify-between ${
                                slot.appointment.status === "CONFIRMED"
                                  ? "border-l-4 border-l-blue-500 border-slate-800/90 hover:border-blue-400/80 hover:shadow-blue-900/20"
                                  : slot.appointment.status === "CHECKED_IN"
                                  ? "border-l-4 border-l-emerald-500 border-slate-800/90 hover:border-emerald-400/80 hover:shadow-emerald-900/20"
                                  : slot.appointment.status === "REQUESTED"
                                  ? "border-l-4 border-l-amber-500 border-slate-800/90 hover:border-amber-400/80 hover:shadow-amber-900/20"
                                  : slot.appointment.status === "COMPLETED"
                                  ? "border-l-4 border-l-purple-500 border-slate-800/90 hover:border-purple-400/80 hover:shadow-purple-900/20"
                                  : slot.appointment.status === "NO_SHOW"
                                  ? "border-l-4 border-l-rose-500 border-slate-800/90 hover:border-rose-400/80 hover:shadow-rose-900/20"
                                  : "border-l-4 border-l-slate-500 border-slate-800/90 hover:border-slate-400/80"
                              }`}
                            >
                              {/* Top Bar: Time & Direct Status Badge */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] font-bold">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{slot.startTime}</span>
                                  <span className="text-slate-500">({slot.durationMinutes}m)</span>
                                </div>
                                <StatusBadge
                                  status={slot.appointment.status}
                                  size="xs"
                                />
                              </div>

                              {/* Patient Information */}
                              <div className="my-1 space-y-1">
                                <div className="text-sm font-extrabold text-white group-hover:text-indigo-200 transition-colors tracking-tight leading-snug">
                                  {slot.appointment.patientName}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                                  <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                  <span className="truncate">
                                    {slot.appointment.patientContact}
                                  </span>
                                </div>
                              </div>

                              {/* Prominent, First-Class "Open Details" Action Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAppointment(slot.appointment!.id);
                                }}
                                className="w-full mt-2.5 py-1.5 px-3 rounded-xl bg-indigo-950/70 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-800/60 hover:border-indigo-400 text-xs font-bold flex items-center justify-between transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-indigo-600/30 group/btn"
                                title="Open appointment detail drawer on right side"
                              >
                                <span className="flex items-center gap-1.5">
                                  <PanelRightOpen className="w-3.5 h-3.5 text-indigo-400 group-hover/btn:text-white transition-colors" />
                                  <span>Open Details</span>
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-indigo-400 group-hover/btn:translate-x-0.5 group-hover/btn:text-white transition-all" />
                              </button>
                            </div>
                          ) : slot.status === "ACTIVE" ? (
                            /* ==================== B: AVAILABLE / EMPTY SLOT BLOCK ==================== */
                            /* Visually distinct: Dashed borders, comfortable spacing, interactive actions */
                            <div className="group h-full rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/80 bg-slate-900/30 hover:bg-indigo-950/20 p-3 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:shadow-indigo-950/30">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                                    Available
                                  </span>
                                </div>
                                <span className="font-mono text-xs font-semibold text-slate-400">
                                  {slot.durationMinutes}m
                                </span>
                              </div>

                              <div className="my-1.5 text-center">
                                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors font-medium">
                                  Unreserved Slot
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800/50">
                                <button
                                  type="button"
                                  onClick={() => onBookSlot(slot)}
                                  className="flex-1 py-1.5 px-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Book</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onEditSlot(slot)}
                                  className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-lg border border-transparent hover:border-amber-800/50 transition-all"
                                  title="Edit slot duration / time"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onArchiveSlot(slot.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-800/50 transition-all"
                                  title="Archive slot"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ==================== C: ARCHIVED SLOT BLOCK ==================== */
                            <div className="h-full rounded-2xl border border-slate-800/60 bg-slate-900/20 p-3 flex flex-col justify-between opacity-60">
                              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                                <span>Archived Slot</span>
                                <span>{slot.startTime}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onRestoreSlot(slot.id)}
                                className="w-full py-1 text-xs text-indigo-400 hover:text-indigo-300 font-bold underline text-center hover:bg-indigo-950/30 rounded-lg transition-all"
                              >
                                Restore Slot
                              </button>
                            </div>
                          )
                        ) : (
                          /* ==================== D: EMPTY UNCONFIGURED TIME CELL ==================== */
                          <div
                            onClick={() =>
                              onCreateSlotAtTime(provider.id, time)
                            }
                            className="group h-full min-h-[90px] rounded-2xl border border-transparent hover:border-indigo-500/40 hover:bg-slate-900/40 cursor-pointer flex items-center justify-center transition-all p-2.5"
                            title={`Click to add availability slot for ${provider.name} at ${time}`}
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-slate-400 group-hover:text-indigo-300 inline-flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 group-hover:border-indigo-500/40 shadow-sm">
                              <Plus className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Add Slot</span>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
