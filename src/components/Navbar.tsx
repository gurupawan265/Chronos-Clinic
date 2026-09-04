import React from "react";
import { signOut } from "next-auth/react";
import { LogOut, Stethoscope, Shield, Sparkles } from "lucide-react";

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
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">
            +
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white tracking-tight">
                Chronos Clinic
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-800/60 uppercase tracking-wider">
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
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shadow-sm">
                {getInitials(user.name)}
              </div>
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-white leading-tight">
                  {user.name}
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                      isFrontDesk
                        ? "bg-cyan-950 text-cyan-300 border border-cyan-800/60"
                        : "bg-indigo-950 text-indigo-300 border border-indigo-800/60"
                    }`}
                  >
                    {isFrontDesk ? "Front Desk" : "Provider"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
