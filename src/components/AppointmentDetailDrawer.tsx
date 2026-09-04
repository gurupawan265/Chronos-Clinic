import React, { useState } from "react";
import { format } from "date-fns";
import StatusBadge from "./StatusBadge";
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  History,
  UserPlus,
  Trash2,
  Lock,
  ArrowRight,
  Stethoscope,
  ShieldCheck,
  Send,
  UserCheck,
} from "lucide-react";

export interface AppointmentDetailData {
  id: string;
  patientName: string;
  patientContact: string;
  status: string;
  cancellationReason?: string | null;
  createdAt: string | Date;
  slot: {
    id: string;
    date: string | Date;
    startTime: string;
    durationMinutes: number;
  };
  schedulingProviderId: string;
  schedulingProvider: {
    id: string;
    name: string;
    email: string;
  };
  supportingProviders: Array<{
    id: string;
    providerId: string;
    assignedAt: string | Date;
    unassignedAt?: string | Date | null;
    provider: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  visitNotes: Array<{
    id: string;
    authorProviderId: string;
    content: string;
    createdAt: string | Date;
    authorProvider: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus?: string | null;
    toStatus: string;
    changedByUserId: string;
    reason?: string | null;
    changedAt: string | Date;
    changedByUser: {
      id: string;
      name: string;
      role: string;
    };
  }>;
}

interface AppointmentDetailDrawerProps {
  appointment: AppointmentDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  isFrontDesk: boolean;
  isProvider: boolean;
  currentUserId?: string;
  providers: Array<{ id: string; name: string; email: string }>;
  onUpdateStatus: (appointmentId: string, toStatus: string) => void;
  onOpenCancelModal: (appointment: AppointmentDetailData) => void;
  onOpenEditPatient: (appointment: AppointmentDetailData) => void;
  onOpenReassign: (appointment: AppointmentDetailData) => void;
  onAddSupportingProvider: (appointmentId: string, providerId: string) => void;
  onRemoveSupportingProvider: (assignmentId: string) => void;
  onCreateNote: (appointmentId: string, content: string) => void;
  isUpdatingStatus?: boolean;
  isAddingSupporting?: boolean;
  isRemovingSupporting?: boolean;
  isCreatingNote?: boolean;
}

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

export default function AppointmentDetailDrawer({
  appointment,
  isOpen,
  onClose,
  isFrontDesk,
  isProvider,
  currentUserId,
  providers,
  onUpdateStatus,
  onOpenCancelModal,
  onOpenEditPatient,
  onOpenReassign,
  onAddSupportingProvider,
  onRemoveSupportingProvider,
  onCreateNote,
  isUpdatingStatus = false,
  isAddingSupporting = false,
  isRemovingSupporting = false,
  isCreatingNote = false,
}: AppointmentDetailDrawerProps) {
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedSupportingId, setSelectedSupportingId] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "timeline">("overview");

  if (!isOpen || !appointment) return null;

  // Calculate if scheduled start time has passed for No-Show safety guard
  const [slotH, slotM] = appointment.slot.startTime.split(":").map(Number);
  const scheduledTime = new Date(appointment.slot.date);
  scheduledTime.setHours(slotH, slotM, 0, 0);
  const now = new Date();
  const isPastScheduled = now.getTime() > scheduledTime.getTime();

  // Active supporting providers (unassignedAt is null)
  const activeSupporting = appointment.supportingProviders.filter(
    (sp) => !sp.unassignedAt
  );

  const canManageCareTeam =
    isFrontDesk || appointment.schedulingProviderId === currentUserId;

  const handleSaveNote = () => {
    if (!newNoteText.trim()) return;
    onCreateNote(appointment.id, newNoteText.trim());
    setNewNoteText("");
  };

  const handleAddSupporting = () => {
    if (!selectedSupportingId) return;
    onAddSupportingProvider(appointment.id, selectedSupportingId);
    setSelectedSupportingId("");
  };

  return (
    <>
      {/* 1. Backdrop Overlay (allows seeing the day-view underneath) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
      />

      {/* 2. Side Panel / Drawer with spacious layout */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-slate-900/98 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col animate-slide-left">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/70">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-slate-400">
                APPT-{appointment.id.slice(-6).toUpperCase()}
              </span>
              <StatusBadge status={appointment.status} size="sm" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight truncate">
              {appointment.patientName}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {appointment.patientContact}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {appointment.slot.startTime} ({appointment.slot.durationMinutes}m)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onOpenEditPatient(appointment)}
              className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 hover:border-slate-600 transition-all active:scale-95 shadow-sm"
            >
              Edit Patient
            </button>
            {isFrontDesk && (
              <button
                onClick={() => onOpenReassign(appointment)}
                className="px-3 py-1.5 text-xs font-bold text-indigo-300 hover:text-white bg-indigo-950/90 hover:bg-indigo-900 rounded-xl border border-indigo-800/80 hover:border-indigo-600 transition-all active:scale-95 shadow-sm"
              >
                Reassign...
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-95"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* State Machine Action Bar */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Lifecycle Transition Action
            </span>
            <span className="text-xs text-slate-300">
              Strict one-way clinical state progression
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status: REQUESTED */}
            {appointment.status === "REQUESTED" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateStatus(appointment.id, "CONFIRMED")
                  }
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Appointment</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCancelModal(appointment)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 text-rose-300 text-xs font-semibold rounded-lg border border-rose-900/40 transition-all"
                >
                  Cancel...
                </button>
              </>
            )}

            {/* Status: CONFIRMED */}
            {appointment.status === "CONFIRMED" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateStatus(appointment.id, "CHECKED_IN")
                  }
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Check In Patient</span>
                </button>

                {/* Mark No Show: Guard enforced */}
                {isPastScheduled ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          "Mark this patient as No Show? This records a missed visit."
                        )
                      ) {
                        onUpdateStatus(appointment.id, "NO_SHOW");
                      }
                    }}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
                  >
                    Mark No Show
                  </button>
                ) : (
                  <div className="flex flex-col items-end">
                    <button
                      disabled
                      className="px-3 py-1.5 bg-slate-800 text-slate-500 text-xs font-semibold rounded-lg border border-slate-700/60 cursor-not-allowed flex items-center gap-1"
                      title={`Cannot mark No Show before scheduled time (${appointment.slot.startTime})`}
                    >
                      <Lock className="w-3 h-3" />
                      <span>Mark No Show (Locked)</span>
                    </button>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      Unlocks after {appointment.slot.startTime}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onOpenCancelModal(appointment)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 text-rose-300 text-xs font-semibold rounded-lg border border-rose-900/40 transition-all"
                >
                  Cancel...
                </button>
              </>
            )}

            {/* Status: CHECKED_IN */}
            {appointment.status === "CHECKED_IN" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateStatus(appointment.id, "COMPLETED")
                  }
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Visit</span>
                </button>
                <span className="text-[11px] text-slate-400">
                  (Patient in clinic — Cancellation blocked)
                </span>
              </div>
            )}

            {/* Terminal States: COMPLETED, NO_SHOW, CANCELLED */}
            {["COMPLETED", "NO_SHOW", "CANCELLED"].includes(
              appointment.status
            ) && (
              <span className="text-xs text-slate-400 italic font-medium px-2 py-1 rounded bg-slate-800/80 border border-slate-700/50">
                Terminal State — No further transitions allowed
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs inside Drawer */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Care Team & Details</span>
          </button>

          <button
            onClick={() => setActiveTab("notes")}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "notes"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Clinical Notes ({appointment.visitNotes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "timeline"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Timeline</span>
          </button>
        </div>

        {/* Drawer Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: OVERVIEW & CARE TEAM */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Cancellation Banner if cancelled */}
              {appointment.status === "CANCELLED" && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs">
                  <div className="font-bold flex items-center gap-1.5 text-rose-300 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Appointment Cancelled</span>
                  </div>
                  <p>
                    Reason:{" "}
                    <strong>
                      {appointment.cancellationReason || "No reason specified."}
                    </strong>
                  </p>
                </div>
              )}

              {/* Appointment Logistics Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Appointment Logistics
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Date</span>
                    <span className="text-slate-200 font-semibold">
                      {format(new Date(appointment.slot.date), "EEE, MMM d, yyyy")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Scheduled Time</span>
                    <span className="text-slate-200 font-semibold">
                      {appointment.slot.startTime} ({appointment.slot.durationMinutes} minutes)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Patient Name</span>
                    <span className="text-slate-200 font-semibold">
                      {appointment.patientName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Contact Phone/Email</span>
                    <span className="text-slate-200 font-semibold">
                      {appointment.patientContact}
                    </span>
                  </div>
                </div>
              </div>

              {/* Care Team Section */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Care Team Providers
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {activeSupporting.length + 1} clinician
                    {activeSupporting.length > 0 ? "s" : ""} assigned
                  </span>
                </div>

                {/* Primary Scheduling Provider */}
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                      {getInitials(appointment.schedulingProvider.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {appointment.schedulingProvider.name}
                      </div>
                      <div className="text-xs text-indigo-300/80 truncate">
                        {appointment.schedulingProvider.email}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-200 border border-indigo-700/60 uppercase">
                    Lead Provider
                  </span>
                </div>

                {/* Supporting Providers */}
                {activeSupporting.length > 0 ? (
                  <div className="space-y-2">
                    {activeSupporting.map((sp) => (
                      <div
                        key={sp.id}
                        className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/60 text-cyan-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {getInitials(sp.provider.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-200 truncate">
                              {sp.provider.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {sp.provider.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-900/60">
                            Supporting
                          </span>
                          {canManageCareTeam && (
                            <button
                              type="button"
                              onClick={() => onRemoveSupportingProvider(sp.id)}
                              disabled={isRemovingSupporting}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-all"
                              title="Remove supporting provider"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No supporting providers currently assigned.
                  </p>
                )}

                {/* Add Supporting Provider Form */}
                {canManageCareTeam && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    <select
                      value={selectedSupportingId}
                      onChange={(e) => setSelectedSupportingId(e.target.value)}
                      className="flex-1 bg-slate-900 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">+ Assign Supporting Clinician...</option>
                      {providers
                        .filter(
                          (p) =>
                            p.id !== appointment.schedulingProviderId &&
                            !activeSupporting.some((sp) => sp.providerId === p.id)
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddSupporting}
                      disabled={!selectedSupportingId || isAddingSupporting}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-all disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CLINICAL VISIT NOTES (Visually separated from status events) */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-cyan-400" />
                    <span>Clinical Visit Documentation</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Authored medical observations & treatment notes
                  </p>
                </div>
              </div>

              {/* Visit Notes List */}
              {appointment.visitNotes.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    No clinical visit notes recorded for this appointment yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointment.visitNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-slate-950/80 border-l-4 border-l-cyan-500 border-slate-800/80 space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {note.authorProvider.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                            Clinician
                          </span>
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Author New Note Form (For Providers) */}
              {isProvider && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    + Append New Clinical Note
                  </label>
                  <textarea
                    rows={3}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Enter examination findings, symptoms, diagnosis, or care instructions..."
                    className="w-full bg-slate-950 text-slate-200 text-xs p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 transition-all resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      disabled={!newNoteText.trim() || isCreatingNote}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-md shadow-cyan-600/20 transition-all disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isCreatingNote ? "Saving..." : "Save Note"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UNIFIED AUDIT TIMELINE (Vertical Event Feed) */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Audit Event Stream</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    🔒 Append-Only Immutable Lifecycle Audit History
                  </p>
                </div>
              </div>

              {/* Vertical Event Feed with Connected Line */}
              {(() => {
                interface TimelineItem {
                  id: string;
                  date: Date;
                  title: string;
                  actor: string;
                  type: "creation" | "status" | "careteam" | "cancellation";
                  badge: string;
                  badgeColor: string;
                  description?: string | null;
                }

                const feed: TimelineItem[] = [];

                // 1. Creation event
                feed.push({
                  id: "created",
                  date: new Date(appointment.createdAt),
                  title: "Appointment Created & Slot Reserved",
                  actor: `System / ${appointment.schedulingProvider.name}`,
                  type: "creation",
                  badge: "CREATED",
                  badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
                  description: `Booked for ${appointment.patientName} (${appointment.patientContact}). Initial status: REQUESTED.`,
                });

                // 2. Status transitions
                appointment.statusHistory.forEach((sh) => {
                  const isCancel = sh.toStatus === "CANCELLED";
                  feed.push({
                    id: `status-${sh.id}`,
                    date: new Date(sh.changedAt),
                    title: isCancel
                      ? "Appointment Cancelled"
                      : `Status Transition: ${sh.fromStatus || "START"} → ${sh.toStatus}`,
                    actor: `${sh.changedByUser.name} (${sh.changedByUser.role})`,
                    type: isCancel ? "cancellation" : "status",
                    badge: sh.toStatus,
                    badgeColor:
                      sh.toStatus === "CONFIRMED"
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                        : sh.toStatus === "CHECKED_IN"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : sh.toStatus === "COMPLETED"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        : sh.toStatus === "NO_SHOW"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        : sh.toStatus === "CANCELLED"
                        ? "bg-rose-900/40 text-rose-300 border-rose-700/50"
                        : "bg-slate-700/30 text-slate-300 border-slate-600/40",
                    description: sh.reason
                      ? `Reason: ${sh.reason}`
                      : `Transitioned state to ${sh.toStatus}.`,
                  });
                });

                // 3. Care team assignments
                appointment.supportingProviders.forEach((sp) => {
                  feed.push({
                    id: `sp-assign-${sp.id}`,
                    date: new Date(sp.assignedAt),
                    title: "Supporting Clinician Assigned",
                    actor: "Front Desk / Lead Clinician",
                    type: "careteam",
                    badge: "CARE TEAM",
                    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
                    description: `${sp.provider.name} added to care team.`,
                  });

                  if (sp.unassignedAt) {
                    feed.push({
                      id: `sp-unassign-${sp.id}`,
                      date: new Date(sp.unassignedAt),
                      title: "Supporting Clinician Removed",
                      actor: "Front Desk / Lead Clinician",
                      type: "careteam",
                      badge: "REMOVED",
                      badgeColor: "bg-slate-700/30 text-slate-400 border-slate-600/40",
                      description: `${sp.provider.name} unassigned from care team.`,
                    });
                  }
                });

                feed.sort((a, b) => a.date.getTime() - b.date.getTime());

                return (
                  <div className="relative pl-6 border-l-2 border-slate-800 space-y-6 ml-2 my-4">
                    {feed.map((item) => (
                      <div key={item.id} className="relative group">
                        {/* Event Node Dot on the vertical line */}
                        <div
                          className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                            item.type === "cancellation"
                              ? "bg-rose-500 shadow-glow-red"
                              : item.type === "creation"
                              ? "bg-blue-500"
                              : item.type === "careteam"
                              ? "bg-cyan-500"
                              : "bg-emerald-500"
                          }`}
                        />

                        {/* Event Body */}
                        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-1 hover:border-slate-700 transition-all">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white">
                              {item.title}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${item.badgeColor}`}
                            >
                              {item.badge}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center justify-between">
                            <span>By: {item.actor}</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {format(item.date, "MMM d, yyyy h:mm a")}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-300 pt-1 border-t border-slate-900">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
