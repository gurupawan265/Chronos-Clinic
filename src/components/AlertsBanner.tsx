import React, { useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  Bell,
  Sparkles,
  Flame,
} from "lucide-react";

export interface AlertItem {
  appointment: {
    id: string;
    patientName: string;
    schedulingProvider: {
      id: string;
      name: string;
    };
  };
  scheduledTime: Date | string;
  hoursUntilScheduled: number;
  isWithinOneHour: boolean;
  wasDismissedEarlier: boolean;
}

interface AlertsBannerProps {
  alerts: AlertItem[];
  count: number;
  onDismiss: (appointmentId: string) => void;
  onViewAppointment: (appointmentId: string) => void;
  isDismissing?: boolean;
}

export default function AlertsBanner({
  alerts,
  count,
  onDismiss,
  onViewAppointment,
  isDismissing = false,
}: AlertsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-amber-950/25 border border-amber-500/30 overflow-hidden shadow-lg shadow-amber-950/20 mb-6 animate-fade-in">
      {/* Banner Header */}
      <div className="p-4 bg-amber-950/40 border-b border-amber-500/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white">
                Unconfirmed Appointment Alerts (&lt;24h)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider">
                {count} Action Needed
              </span>
            </div>
            <p className="text-[11px] text-amber-200/70 mt-0.5">
              Appointments in Requested status approaching scheduled start time (sorted by urgency)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-amber-300 hover:text-white hover:bg-amber-900/40 rounded-lg transition-all text-xs font-semibold flex items-center gap-1"
          >
            <span>{isExpanded ? "Collapse" : "Expand"}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Alert List: Sorted strictly by urgency (closest first) */}
      {isExpanded && (
        <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
          {alerts.map((al) => {
            const mins = Math.round(al.hoursUntilScheduled * 60);
            const timeLabel =
              mins <= 0
                ? "Past Due"
                : mins < 60
                ? `in ${mins} mins`
                : `in ${(al.hoursUntilScheduled).toFixed(1)} hrs`;

            return (
              <div
                key={al.appointment.id}
                className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  al.isWithinOneHour
                    ? "bg-rose-950/40 border-rose-500/50 shadow-sm shadow-rose-950/30"
                    : "bg-slate-900/80 border-slate-800 hover:border-amber-500/30"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 sm:mt-0 ${
                      al.isWithinOneHour
                        ? "bg-rose-500 animate-ping"
                        : "bg-amber-400"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">
                        {al.appointment.patientName}
                      </span>
                      <span className="text-xs text-slate-400">
                        • Provider: <strong>{al.appointment.schedulingProvider.name}</strong>
                      </span>
                      {al.isWithinOneHour && al.wasDismissedEarlier && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <Flame className="w-3 h-3 text-rose-400" />
                          <span>REAPPEARED (&lt;1h rule)</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-amber-200/80 flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        Scheduled:{" "}
                        {format(
                          new Date(al.scheduledTime),
                          "MMM d, h:mm a"
                        )}{" "}
                        (
                        <strong
                          className={
                            al.isWithinOneHour
                              ? "text-rose-400 font-bold"
                              : "text-amber-300 font-bold"
                          }
                        >
                          {timeLabel}
                        </strong>
                        )
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onViewAppointment(al.appointment.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center gap-1"
                  >
                    <span>View & Act</span>
                    <ExternalLink className="w-3 h-3 text-indigo-400" />
                  </button>

                  {!al.isWithinOneHour && (
                    <button
                      type="button"
                      onClick={() => onDismiss(al.appointment.id)}
                      disabled={isDismissing}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg border border-slate-800 transition-all disabled:opacity-50"
                      title="Dismiss alert until 1h prior to appointment"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
