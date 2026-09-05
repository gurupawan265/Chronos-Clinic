import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { X, Calendar, Clock, User, Phone, AlertTriangle } from "lucide-react";
import { Slot } from "./DayScheduleGrid";

/* =========================================================================
   1. BOOK SLOT MODAL
   ========================================================================= */
interface BookSlotModalProps {
  slot: Slot | null;
  isOpen: boolean;
  onClose: () => void;
  onBook: (slotId: string, patientName: string, patientContact: string) => void;
  isLoading?: boolean;
}

export function BookSlotModal({
  slot,
  isOpen,
  onClose,
  onBook,
  isLoading = false,
}: BookSlotModalProps) {
  const [patientName, setPatientName] = useState("");
  const [patientContact, setPatientContact] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPatientName("");
      setPatientContact("");
    }
  }, [isOpen]);

  if (!isOpen || !slot) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientContact.trim()) return;
    onBook(slot.id, patientName.trim(), patientContact.trim());
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">
            Book Appointment Slot
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Provider:</span>
            <strong className="text-white">{slot.provider.name}</strong>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Time & Date:</span>
            <strong className="text-white">
              {format(new Date(slot.date), "EEE, MMM d, yyyy")} @ {slot.startTime} ({slot.durationMinutes}m)
            </strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Patient Full Name
            </label>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Eleanor Vance"
              className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Contact Phone / Email
            </label>
            <input
              type="text"
              required
              value={patientContact}
              onChange={(e) => setPatientContact(e.target.value)}
              placeholder="e.g. 555-0143 or evance@clinic.org"
              className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {isLoading ? "Booking..." : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   2. CREATE SLOT MODAL
   ========================================================================= */
interface CreateSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Array<{ id: string; name: string }>;
  isFrontDesk: boolean;
  currentUserId?: string;
  defaultProviderId?: string;
  defaultDate?: string;
  defaultTime?: string;
  onCreateSlot: (data: {
    providerId: string;
    date: string;
    startTime: string;
    durationMinutes: number;
  }) => void;
  isLoading?: boolean;
}

export function CreateSlotModal({
  isOpen,
  onClose,
  providers,
  isFrontDesk,
  currentUserId,
  defaultProviderId,
  defaultDate,
  defaultTime,
  onCreateSlot,
  isLoading = false,
}: CreateSlotModalProps) {
  const [providerId, setProviderId] = useState(
    defaultProviderId ||
      (isFrontDesk ? providers[0]?.id || "" : currentUserId || "")
  );
  const [date, setDate] = useState(defaultDate || format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(defaultTime || "09:00");
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    if (isOpen) {
      setProviderId(
        defaultProviderId ||
          (isFrontDesk ? providers[0]?.id || "" : currentUserId || "")
      );
      setDate(defaultDate || format(new Date(), "yyyy-MM-dd"));
      setStartTime(defaultTime || "09:00");
      setDuration(30);
    }
  }, [
    isOpen,
    defaultProviderId,
    defaultDate,
    defaultTime,
    isFrontDesk,
    providers,
    currentUserId,
  ]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateSlot({
      providerId,
      date,
      startTime,
      durationMinutes: Number(duration),
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">
            Create Availability Slot
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isFrontDesk && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Provider
              </label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Start Time (HH:mm)
              </label>
              <input
                type="text"
                required
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Duration (Minutes)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Slot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   3. EDIT SLOT MODAL
   ========================================================================= */
interface EditSlotModalProps {
  slot: Slot | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    slotId: string;
    date: string;
    startTime: string;
    durationMinutes: number;
  }) => void;
  isLoading?: boolean;
}

export function EditSlotModal({
  slot,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}: EditSlotModalProps) {
  const [date, setDate] = useState(
    slot ? format(new Date(slot.date), "yyyy-MM-dd") : ""
  );
  const [startTime, setStartTime] = useState(slot?.startTime || "09:00");
  const [duration, setDuration] = useState(slot?.durationMinutes || 30);

  useEffect(() => {
    if (isOpen && slot) {
      setDate(format(new Date(slot.date), "yyyy-MM-dd"));
      setStartTime(slot.startTime || "09:00");
      setDuration(slot.durationMinutes || 30);
    }
  }, [isOpen, slot]);

  if (!isOpen || !slot) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      slotId: slot.id,
      date,
      startTime,
      durationMinutes: Number(duration),
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">
            Edit Availability Slot
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Start Time
              </label>
              <input
                type="text"
                required
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Duration (Minutes)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   4. EDIT PATIENT DETAILS MODAL
   ========================================================================= */
interface EditPatientModalProps {
  appointment: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointmentId: string, name: string, contact: string) => void;
  isLoading?: boolean;
}

export function EditPatientModal({
  appointment,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}: EditPatientModalProps) {
  const [name, setName] = useState(appointment?.patientName || "");
  const [contact, setContact] = useState(appointment?.patientContact || "");

  useEffect(() => {
    if (isOpen && appointment) {
      setName(appointment.patientName || "");
      setContact(appointment.patientContact || "");
    }
  }, [isOpen, appointment]);

  if (!isOpen || !appointment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    onSave(appointment.id, name.trim(), contact.trim());
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">
            Edit Patient Contact Details
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Patient Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Patient Contact (Phone/Email)
            </label>
            <input
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Update Patient Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   5. REASSIGN PROVIDER MODAL
   ========================================================================= */
interface ReassignProviderModalProps {
  appointment: any | null;
  isOpen: boolean;
  onClose: () => void;
  providers: Array<{ id: string; name: string }>;
  onReassign: (appointmentId: string, newProviderId: string) => void;
  isLoading?: boolean;
}

export function ReassignProviderModal({
  appointment,
  isOpen,
  onClose,
  providers,
  onReassign,
  isLoading = false,
}: ReassignProviderModalProps) {
  const [newProviderId, setNewProviderId] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNewProviderId("");
    }
  }, [isOpen]);

  if (!isOpen || !appointment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProviderId) return;
    onReassign(appointment.id, newProviderId);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">
            Reassign Scheduling Provider
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Patient:</span>
            <strong className="text-white">{appointment.patientName}</strong>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Current Lead Provider:</span>
            <strong className="text-indigo-400">
              {appointment.schedulingProvider.name}
            </strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Select New Lead Clinician
            </label>
            <select
              value={newProviderId}
              onChange={(e) => setNewProviderId(e.target.value)}
              required
              className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Choose New Provider --</option>
              {providers
                .filter((p) => p.id !== appointment.schedulingProviderId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newProviderId || isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {isLoading ? "Reassigning..." : "Confirm Reassignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   6. CANCEL APPOINTMENT MODAL (MANDATORY REASON)
   ========================================================================= */
interface CancelAppointmentModalProps {
  appointment: any | null;
  isOpen: boolean;
  onClose: () => void;
  onCancel: (appointmentId: string, reason: string) => void;
  isLoading?: boolean;
}

export function CancelAppointmentModal({
  appointment,
  isOpen,
  onClose,
  onCancel,
  isLoading = false,
}: CancelAppointmentModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !appointment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Cancellation reason is strictly mandatory.");
      return;
    }
    setError(null);
    onCancel(appointment.id, reason.trim());
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-rose-900/40 p-6 shadow-2xl space-y-5 bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-extrabold text-white">
              Cancel Appointment
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Cancelling this appointment for{" "}
          <strong className="text-white">{appointment.patientName}</strong> will release
          the reserved slot. An audit log entry will be permanently appended.
        </p>

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Cancellation Reason (Mandatory)
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Patient called to reschedule due to illness..."
              className="w-full bg-slate-950 text-slate-200 text-xs p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || isLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/30 disabled:opacity-50"
            >
              {isLoading ? "Cancelling..." : "Cancel Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
