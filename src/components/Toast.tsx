import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X, Sparkles } from "lucide-react";

interface ToastProps {
  message: string | null;
  type?: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = "success",
  onClose,
  duration = 4500,
}: ToastProps) {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const isSuccess = type === "success";

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-[100] max-w-sm w-full pointer-events-auto animate-slide-left">
      <div
        className={`rounded-2xl p-4 border backdrop-blur-2xl shadow-2xl flex items-start justify-between gap-3.5 transition-all duration-300 ${
          isSuccess
            ? "bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-950/40"
            : "bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-rose-950/40"
        }`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
              isSuccess
                ? "bg-emerald-950/80 border border-emerald-500/30 text-emerald-400"
                : "bg-rose-950/80 border border-rose-500/30 text-rose-400"
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div
              className={`text-[11px] font-extrabold uppercase tracking-wider ${
                isSuccess ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isSuccess ? "Action Succeeded" : "Action Rejected"}
            </div>
            <p className="text-xs font-semibold text-slate-200 mt-0.5 leading-snug break-words">
              {message}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all flex-shrink-0"
          title="Dismiss Toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
