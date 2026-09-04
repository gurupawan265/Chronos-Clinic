import React from "react";

export type AppointmentStatusType =
  | "REQUESTED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";

interface StatusBadgeProps {
  status: AppointmentStatusType | string;
  size?: "xs" | "sm" | "md";
  showDot?: boolean;
  className?: string;
}

export const statusConfig: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    pulseDot?: boolean;
  }
> = {
  REQUESTED: {
    label: "Requested",
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
    pulseDot: true,
  },
  CONFIRMED: {
    label: "Confirmed",
    bg: "bg-blue-500/15",
    text: "text-blue-300",
    border: "border-blue-500/30",
    dot: "bg-blue-400",
    pulseDot: false,
  },
  CHECKED_IN: {
    label: "Checked In",
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
    pulseDot: true,
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-purple-500/15",
    text: "text-purple-300",
    border: "border-purple-500/30",
    dot: "bg-purple-400",
    pulseDot: false,
  },
  NO_SHOW: {
    label: "No Show",
    bg: "bg-rose-500/15",
    text: "text-rose-300",
    border: "border-rose-500/30",
    dot: "bg-rose-400",
    pulseDot: false,
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-slate-500/15",
    text: "text-slate-400",
    border: "border-slate-500/30",
    dot: "bg-slate-400",
    pulseDot: false,
  },
  ACTIVE: {
    label: "Available",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    border: "border-emerald-500/25",
    dot: "bg-emerald-400",
    pulseDot: false,
  },
  ARCHIVED: {
    label: "Archived",
    bg: "bg-slate-800/40",
    text: "text-slate-500",
    border: "border-slate-700/50",
    dot: "bg-slate-600",
    pulseDot: false,
  },
};

export default function StatusBadge({
  status,
  size = "sm",
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  const normKey = (status || "").toUpperCase();
  const config = statusConfig[normKey] || {
    label: status?.replace("_", " ") || "Unknown",
    bg: "bg-slate-500/15",
    text: "text-slate-300",
    border: "border-slate-500/30",
    dot: "bg-slate-400",
    pulseDot: false,
  };

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1",
    sm: "text-xs px-2 py-0.5 gap-1.5 font-medium",
    md: "text-sm px-2.5 py-1 gap-2 font-semibold",
  };

  const dotSizes = {
    xs: "w-1 h-1",
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border tracking-wide uppercase ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]} ${className}`}
    >
      {showDot && (
        <span
          className={`rounded-full ${dotSizes[size]} ${config.dot} ${
            config.pulseDot ? "animate-pulse" : ""
          }`}
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}
