"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Lock,
  Mail,
  ArrowRight,
  UserCheck,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  UserPlus,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams?.get("registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const loginEmail = customEmail || email;
    const loginPassword = customEmail ? "password123" : password;

    const res = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const fillAndLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    handleLogin(undefined, demoEmail);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 py-8">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8 border border-slate-800 shadow-2xl space-y-6 animate-fade-in relative overflow-hidden">
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/60 items-center justify-center shadow-lg shadow-indigo-600/30 mb-2">
            <img
              src="/logo.png"
              alt="Chronos Clinic Logo"
              className="w-full h-full object-contain"
              style={{ transform: "scale(1.2)" }}
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Chronos Clinic
          </h1>
          <p className="text-xs text-slate-400">
            Multi-Provider Scheduling & Clinical Coordination OS
          </p>
        </div>

        {/* Success Banner if redirected from registration */}
        {justRegistered && !error && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Account created successfully! Please sign in with your credentials.</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex.frontdesk@clinic.com"
                required
                className="w-full bg-slate-900/90 text-slate-200 text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-900/90 text-slate-200 text-xs pl-10 pr-9 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
          >
            <span>{loading ? "Signing in..." : "Sign In to Clinic Portal"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Link to Sign Up */}
        <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-300 text-[11px]">New staff or clinician?</span>
          </div>
          <Link
            href="/signup"
            className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold rounded-lg text-[11px] transition-all"
          >
            Create Account
          </Link>
        </div>

        {/* Quick Demo Credentials */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
            One-Click Demo Access (Password: password123)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillAndLogin("alex.frontdesk@clinic.com")}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 text-left border border-slate-800 hover:border-indigo-500/50 transition-all"
            >
              <div className="text-[11px] font-bold text-white">Alex (Front Desk)</div>
              <div className="text-[9px] text-slate-400">All providers schedule</div>
            </button>

            <button
              type="button"
              onClick={() => fillAndLogin("jordan.frontdesk@clinic.com")}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 text-left border border-slate-800 hover:border-indigo-500/50 transition-all"
            >
              <div className="text-[11px] font-bold text-white">Jordan (Front Desk)</div>
              <div className="text-[9px] text-slate-400">Coordinator access</div>
            </button>

            <button
              type="button"
              onClick={() => fillAndLogin("dr.smith@clinic.com")}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 text-left border border-slate-800 hover:border-indigo-500/50 transition-all"
            >
              <div className="text-[11px] font-bold text-white">Dr. Smith</div>
              <div className="text-[9px] text-cyan-400">Physical Therapy</div>
            </button>

            <button
              type="button"
              onClick={() => fillAndLogin("dr.jones@clinic.com")}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 text-left border border-slate-800 hover:border-indigo-500/50 transition-all"
            >
              <div className="text-[11px] font-bold text-white">Dr. Jones</div>
              <div className="text-[9px] text-cyan-400">Sports Medicine</div>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

