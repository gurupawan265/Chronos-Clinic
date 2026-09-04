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

// Generate default time slots for standard clinical clinic day: 08:00 to 18:00 in 30m steps
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
  // Collect all unique time slots from existing data merged with default hours
  const allTimeSlots = useMemo(() => {
    const slotTimes = new Set<string>(DEFAULT_TIME_SLOTS);
    slots.forEach((s) => {
      if (s.startTime) slotTimes.add(s.startTime);
    });
    return Array.from(slotTimes).sort();
  }, [slots]);

  // Determine active providers to display as columns
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

  // Quick lookup map: providerId -> startTime -> Slot
  const slotMap = useMemo(() => {
    const map = new Map<string, Slot>();
    slots.forEach((s) => {
      const key = `${s.providerId}_${s.startTime}`;
      map.set(key, s);
    });
    return map;
  }, [slots]);

  // Metrics calculation
  const totalSlotsCount = slots.length;
  const bookedSlotsCount = slots.filter((s) => !!s.appointment).length;
  const availableSlotsCount = slots.filter(
    (s) => !s.appointment && s.status === "ACTIVE"
  ).length;
  const occupancyRate =
    totalSlotsCount > 0
      ? Math.round((bookedSlotsCount / totalSlotsCount) * 100)
      : 0;

  // Date manipulation helpers
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
    <div className="flex flex-col gap-4">
      {/* 1. Schedule Header Toolbar & Controls */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800 shadow-xl">
        {/* Left: Date Navigator */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-slate-900/80 rounded-xl p-1 border border-slate-800">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                isCurrentDateToday
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Today
            </button>

            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="relative flex items-center">
            <CalendarIcon className="w-4 h-4 text-indigo-400 absolute left-3 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-slate-900/90 text-white text-sm font-medium pl-9 pr-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 hover:border-slate-700 transition-all"
            />
          </div>

          <span className="text-sm font-semibold text-slate-200 hidden sm:inline-block">
            {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
          </span>
        </div>

        {/* Right: Provider Filter, CSV Export & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Provider Select dropdown (for Front Desk or viewing options) */}
          {isFrontDesk && (
            <div className="flex items-center">
              <select
                value={selectedProviderId}
                onChange={(e) => onProviderChange(e.target.value)}
                className="bg-slate-900/90 text-slate-200 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 hover:border-slate-700 transition-all"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-medium rounded-xl border border-slate-700/60 transition-all disabled:opacity-50"
            title="Download Day Schedule as CSV"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>

          {/* Refresh Grid */}
          <button
            onClick={onRefresh}
            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-all"
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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Slot</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Schedule Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Slots
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {totalSlotsCount}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Booked
            </div>
            <div className="text-xl font-extrabold text-indigo-400 mt-0.5">
              {bookedSlotsCount}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Available
            </div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
              {availableSlotsCount}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Occupancy
            </div>
            <div className="text-xl font-extrabold text-cyan-400 mt-0.5">
              {occupancyRate}%
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. The Centerpiece: Day-View Time-Grid */}
      {totalSlotsCount === 0 ? (
        /* Sensible Empty State when no slots exist for the date */
        <div className="glass-panel rounded-2xl p-10 text-center flex flex-col items-center justify-center border border-dashed border-slate-800 my-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-800/30 flex items-center justify-center text-indigo-400 mb-4">
            <CalendarIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            No Schedule Configured for this Date
          </h3>
          <p className="text-slate-400 text-sm max-w-md mb-5">
            There are no provider availability slots created for{" "}
            <strong className="text-slate-200">
              {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
            </strong>
            . You can add individual slots or generate recurring availability in bulk.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                onCreateSlotAtTime(
                  selectedProviderId || providers[0]?.id || "",
                  "09:00"
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Availability Slot</span>
            </button>
          </div>
        </div>
      ) : (
        /* The Vertical Time-Grid Container */
        <div className="glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <div
              className="min-w-[680px]"
              style={{
                display: "grid",
                gridTemplateColumns: `80px repeat(${displayProviders.length}, minmax(240px, 1fr))`,
              }}
            >
              {/* Header: Top-Left Time Corner */}
              <div className="sticky top-0 left-0 z-30 bg-slate-950/95 backdrop-blur-md p-3.5 border-b border-r border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 mr-1 text-indigo-400" />
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
                    className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md p-3.5 border-b border-r border-slate-800 last:border-r-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/20">
                        {getInitials(provider.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {provider.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                          <span>{provider.email.split("@")[0]}</span>
                          {provider.id === currentUserId && (
                            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/80 px-1 rounded">
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
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                        {bookedCount}/{totalCount} booked
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Grid Rows: Time Gutter & Provider Slot Cells */}
              {allTimeSlots.map((time) => (
                <React.Fragment key={time}>
                  {/* Left Time Gutter Cell (Sticky horizontally) */}
                  <div className="sticky left-0 z-10 bg-slate-950/90 backdrop-blur-sm px-2.5 py-3 border-b border-r border-slate-800/80 flex items-start justify-center">
                    <span className="font-mono text-xs font-semibold text-slate-400 tracking-tight">
                      {time}
                    </span>
                  </div>

                  {/* Provider Cells for this Time */}
                  {displayProviders.map((provider) => {
                    const slot = slotMap.get(`${provider.id}_${time}`);

                    return (
                      <div
                        key={`${provider.id}_${time}`}
                        className="p-1.5 border-b border-r border-slate-800/60 last:border-r-0 min-h-[96px] bg-slate-950/20 transition-colors"
                      >
                        {slot ? (
                          slot.appointment ? (
                            /* ==================== A: BOOKED APPOINTMENT BLOCK ==================== */
                            <div
                              onClick={() =>
                                onSelectAppointment(slot.appointment!.id)
                              }
                              className={`group relative h-full rounded-xl p-3 cursor-pointer transition-all duration-200 border bg-slate-900/90 hover:bg-slate-850 hover:shadow-xl hover:scale-[1.01] flex flex-col justify-between ${
                                slot.appointment.status === "CONFIRMED"
                                  ? "border-l-4 border-l-blue-500 border-slate-800 hover:border-blue-500/50"
                                  : slot.appointment.status === "CHECKED_IN"
                                  ? "border-l-4 border-l-emerald-500 border-slate-800 hover:border-emerald-500/50"
                                  : slot.appointment.status === "REQUESTED"
                                  ? "border-l-4 border-l-amber-500 border-slate-800 hover:border-amber-500/50"
                                  : slot.appointment.status === "COMPLETED"
                                  ? "border-l-4 border-l-purple-500 border-slate-800 hover:border-purple-500/50"
                                  : slot.appointment.status === "NO_SHOW"
                                  ? "border-l-4 border-l-rose-500 border-slate-800 hover:border-rose-500/50"
                                  : "border-l-4 border-l-slate-500 border-slate-800 hover:border-slate-500/50"
                              }`}
                            >
                              {/* Top Bar: Time & Direct Status Badge */}
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-mono text-[11px] font-bold text-slate-300">
                                  {slot.startTime} ({slot.durationMinutes}m)
                                </span>
                                <StatusBadge
                                  status={slot.appointment.status}
                                  size="xs"
                                />
                              </div>

                              {/* Patient Details */}
                              <div className="my-1">
                                <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors leading-tight">
                                  {slot.appointment.patientName}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                                  <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                  <span className="truncate">
                                    {slot.appointment.patientContact}
                                  </span>
                                </div>
                              </div>

                              {/* Bottom Footer / Action Prompt */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 mt-1">
                                <span className="text-[10px] text-indigo-400 group-hover:text-indigo-300 font-medium">
                                  Open Detail →
                                </span>
                              </div>
                            </div>
                          ) : slot.status === "ACTIVE" ? (
                            /* ==================== B: AVAILABLE / EMPTY SLOT BLOCK ==================== */
                            /* Visually distinct: Dashed borders, translucent slate, prominent Book trigger */
                            <div className="group h-full rounded-xl border-2 border-dashed border-slate-800/90 hover:border-indigo-500/70 bg-slate-900/25 hover:bg-indigo-950/20 p-2.5 flex flex-col justify-between transition-all">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                                    Available
                                  </span>
                                </div>
                                <span className="font-mono text-[10px] text-slate-500">
                                  {slot.durationMinutes}m
                                </span>
                              </div>

                              <div className="my-1 text-center">
                                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
                                  Unreserved
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/40">
                                <button
                                  type="button"
                                  onClick={() => onBookSlot(slot)}
                                  className="w-full py-1 px-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Book</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onEditSlot(slot)}
                                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-all"
                                  title="Edit slot duration / time"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onArchiveSlot(slot.id)}
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-all"
                                  title="Archive slot"
                                >
                                  <Archive className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ==================== C: ARCHIVED SLOT BLOCK ==================== */
                            <div className="h-full rounded-xl border border-slate-800/60 bg-slate-900/10 p-2.5 flex flex-col justify-between opacity-60">
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>Archived Slot</span>
                                <span>{slot.startTime}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onRestoreSlot(slot.id)}
                                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline text-center"
                              >
                                Restore Slot
                              </button>
                            </div>
                          )
                        ) : (
                          /* ==================== D: EMPTY UNCONFIGURED TIME CELL ==================== */
                          /* Subtle grid cell with friendly + button on hover */
                          <div
                            onClick={() =>
                              onCreateSlotAtTime(provider.id, time)
                            }
                            className="group h-full min-h-[72px] rounded-xl border border-transparent hover:border-slate-800 hover:bg-slate-900/30 cursor-pointer flex items-center justify-center transition-all p-2"
                            title={`Click to add availability slot for ${provider.name} at ${time}`}
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-slate-500 group-hover:text-indigo-400 inline-flex items-center gap-1">
                              <Plus className="w-3.5 h-3.5" />
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
