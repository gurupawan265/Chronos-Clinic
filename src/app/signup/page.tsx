"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "../_trpc/client";
import {
  AlertCircle,
  Lock,
  Mail,
  ArrowRight,
  User,
  Stethoscope,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const SUGGESTED_SPECIALTIES = [
  "Physical Therapy",
  "Sports Medicine",
  "Orthopedics",
  "Rehabilitation",
  "General Medicine",
  "Cardiology",
];

export default function SignUpPage() {
  const router = useRouter();

  const [role, setRole] = useState<"FRONT_DESK" | "PROVIDER">("FRONT_DESK");
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signUpMutation = trpc.auth.signUp.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create User in database via tRPC mutation
      await signUpMutation.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        specialty: role === "PROVIDER" && specialty.trim() ? specialty.trim() : undefined,
      });

      // 2. Automatically log in user with created credentials
      const signInRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        // Fallback: If sign-in fails unexpectedly, navigate to login page
        router.push("/login?registered=true");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || "Registration failed. Please try again.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 py-8">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-8 border border-slate-800 shadow-2xl space-y-6 animate-fade-in relative overflow-hidden">
        {/* Top Header with Brand Logo */}
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
            Create Clinic Account
          </h1>
          <p className="text-xs text-slate-400">
            Join Chronos Clinic™ Care Coordination & Scheduling Network
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Clinical Role Selection Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Select Your Role in Clinic
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("FRONT_DESK")}
                className={`p-3 rounded-2xl border text-left transition-all relative ${
                  role === "FRONT_DESK"
                    ? "bg-indigo-950/50 border-indigo-500 shadow-lg shadow-indigo-500/20 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      role === "FRONT_DESK" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold">Front Desk</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Scheduling coordinator, patient check-in & multi-provider grid
                </p>
                {role === "FRONT_DESK" && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 absolute top-3 right-3" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setRole("PROVIDER")}
                className={`p-3 rounded-2xl border text-left transition-all relative ${
                  role === "PROVIDER"
                    ? "bg-cyan-950/50 border-cyan-500 shadow-lg shadow-cyan-500/20 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      role === "PROVIDER" ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold">Provider</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Physician / clinician, personal patient agenda & visit notes
                </p>
                {role === "PROVIDER" && (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 absolute top-3 right-3" />
                )}
              </button>
            </div>
          </div>

          {/* Full Name Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Full Legal Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === "PROVIDER" ? "e.g. Dr. Jennifer Lawrence" : "e.g. Emma Watson"}
                required
                className="w-full bg-slate-900/90 text-slate-200 text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-all"
              />
            </div>
          </div>

          {/* Dynamic Specialty Field (for Providers) */}
          {role === "PROVIDER" && (
            <div className="space-y-2 p-3 bg-cyan-950/20 rounded-2xl border border-cyan-900/40">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-cyan-300">
                  Clinical Specialty / Department
                </label>
                <span className="text-[10px] text-cyan-400/80">Optional</span>
              </div>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Physical Therapy, Orthopedics, Sports Medicine"
                className="w-full bg-slate-900/90 text-slate-200 text-xs px-3.5 py-2 rounded-xl border border-cyan-800/60 focus:outline-none focus:border-cyan-400 placeholder:text-slate-600 transition-all"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTED_SPECIALTIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpecialty(s)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                      specialty === s
                        ? "bg-cyan-600 text-white border-cyan-500"
                        : "bg-slate-900/80 text-slate-400 border-slate-800 hover:border-cyan-600 hover:text-cyan-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Email Address Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. doctor@clinic.com"
                required
                className="w-full bg-slate-900/90 text-slate-200 text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-all"
              />
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  placeholder="Min 6 chars"
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

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  className="w-full bg-slate-900/90 text-slate-200 text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-3.5 w-3.5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating Clinic Account...
              </span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Create Account & Enter Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Existing Account Footer Link */}
        <div className="pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Already have a clinical account?{" "}
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline transition-colors"
            >
              Sign In to Clinic
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
