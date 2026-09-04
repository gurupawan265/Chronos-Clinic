import React from "react";
import { signOut } from "next-auth/react";
import { LogOut, Sparkles, Shield, Stethoscope } from "lucide-react";

interface NavbarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null | undefined;
}

function getInitials(name?: string | null): string {
  if (!name) return "CC";
  return name
    .replace(/^Dr\.\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Navbar({ user }: NavbarProps) {
  const isFrontDesk = user?.role === "FRONT_DESK";

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/60 flex items-center justify-center shadow-lg shadow-indigo-600/25 group-hover:scale-105 group-hover:border-indigo-500/60 transition-all flex-shrink-0">
            <img
              src="/logo.png"
              alt="Chronos Clinic Logo"
              className="w-full h-full object-contain"
              style={{ transform: "scale(1.2)" }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                Chronos Clinic
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-800/60 uppercase tracking-wider shadow-sm">
                Clinical OS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Multi-Provider Scheduling & Care Coordination
            </p>
          </div>
        </div>

        {/* User Info & Actions */}
        {user && (
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600/50 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {getInitials(user.name)}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-white leading-tight">
                  {user.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                      isFrontDesk
                        ? "bg-cyan-950/80 text-cyan-300 border border-cyan-800/60"
                        : "bg-indigo-950/80 text-indigo-300 border border-indigo-800/60"
                    }`}
                  >
                    {isFrontDesk ? "Front Desk" : "Clinician"}
                  </span>
                </div>
              </div>
            </div>

            {/* Red Sign Out Button with rich hover effects */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 hover:border-rose-500 text-xs font-bold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-lg hover:shadow-rose-600/25 active:scale-95 group"
              title="Sign Out from Clinic Portal"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:text-white transition-colors" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
