"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const loginEmail = customEmail || email;
    const res = await signIn("credentials", {
      email: loginEmail,
      password: "password123",
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
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "480px", padding: "2.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", marginBottom: "1rem" }}>
            <div className="brand-logo-icon" style={{ width: "3.25rem", height: "3.25rem", fontSize: "1.5rem" }}>
              +
            </div>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
            Chronos Clinic
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Clinic Appointment Scheduling & Care Coordination
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--alert-red-bg)",
            border: "1px solid rgba(244, 63, 94, 0.4)",
            borderRadius: "var(--radius-sm)",
            padding: "0.75rem 1rem",
            color: "var(--alert-red)",
            fontSize: "0.875rem",
            marginBottom: "1.5rem"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleLogin(e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Email Address
            </label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alex.frontdesk@clinic.com"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Password
            </label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}
          >
            {loading ? "Signing in..." : "Sign In to Clinic Portal"}
          </button>
        </form>

        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-subtle)" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.75rem", textAlign: "center" }}>
            Quick Demo Sign-In
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillAndLogin("alex.frontdesk@clinic.com")}
              style={{ fontSize: "0.75rem" }}
            >
              Front Desk (Alex)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillAndLogin("jordan.frontdesk@clinic.com")}
              style={{ fontSize: "0.75rem" }}
            >
              Front Desk (Jordan)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillAndLogin("dr.smith@clinic.com")}
              style={{ fontSize: "0.75rem" }}
            >
              Dr. Smith (Provider)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillAndLogin("dr.jones@clinic.com")}
              style={{ fontSize: "0.75rem" }}
            >
              Dr. Jones (Provider)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
