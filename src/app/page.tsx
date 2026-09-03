"use client";

import { useState } from "react";
import { trpc } from "./_trpc/client";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { format } from "date-fns";

export default function HomePage() {
  const { data: session, isLoading: sessionLoading } = trpc.auth.getSession.useQuery();
  const { data: providers } = trpc.auth.getProviders.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const [activeTab, setActiveTab] = useState<"appointments" | "slots" | "bulk" | "analytics">("appointments");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  // Filters for Appointments
  const [search, setSearch] = useState("");
  const [filterProviderId, setFilterProviderId] = useState("");
  const [filterStatus, setFilterStatus] = useState<any>("");
  const [page, setPage] = useState(1);

  // Queries
  const { data: stats, refetch: refetchStats } = trpc.dashboard.getStats.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const { data: alertsData, refetch: refetchAlerts } = trpc.alert.getUnconfirmedAlerts.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const {
    data: appointmentsData,
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = trpc.appointment.list.useQuery(
    {
      search: search || undefined,
      providerId: filterProviderId || undefined,
      status: filterStatus || undefined,
      page,
      pageSize: 8,
    },
    { enabled: !!session?.user }
  );

  const { data: slotsData, refetch: refetchSlots } = trpc.slot.getAll.useQuery(
    {},
    { enabled: !!session?.user && activeTab === "slots" }
  );

  const { data: appointmentDetail, refetch: refetchDetail } = trpc.appointment.getById.useQuery(
    { id: selectedAppointmentId! },
    { enabled: !!selectedAppointmentId }
  );

  // Mutations
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const dismissAlertMutation = trpc.alert.dismiss.useMutation({
    onSuccess: () => {
      refetchAlerts();
      setActionSuccess("Alert dismissed.");
    },
    onError: (err) => setActionError(err.message),
  });

  const updateStatusMutation = trpc.appointment.updateStatus.useMutation({
    onSuccess: () => {
      refetchAppointments();
      refetchStats();
      if (selectedAppointmentId) refetchDetail();
      setActionSuccess("Status updated successfully.");
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err.message);
      setActionSuccess(null);
    },
  });

  const archiveSlotMutation = trpc.slot.archive.useMutation({
    onSuccess: () => {
      refetchSlots();
      setActionSuccess("Slot archived.");
    },
  });

  const restoreSlotMutation = trpc.slot.restore.useMutation({
    onSuccess: () => {
      refetchSlots();
      setActionSuccess("Slot restored to active schedule.");
    },
  });

  // Note creation
  const [newNoteContent, setNewNoteContent] = useState("");
  const createNoteMutation = trpc.visitNote.create.useMutation({
    onSuccess: () => {
      setNewNoteContent("");
      refetchDetail();
      setActionSuccess("Visit note appended.");
    },
    onError: (err) => setActionError(err.message),
  });

  // Bulk Generator State
  const [bulkProviderId, setBulkProviderId] = useState("");
  const [bulkStartDate, setBulkStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bulkEndDate, setBulkEndDate] = useState(format(new Date(Date.now() + 14 * 86400000), "yyyy-MM-dd"));
  const [bulkDays, setBulkDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [bulkResult, setBulkResult] = useState<any>(null);

  const bulkMutation = trpc.slot.bulkGenerate.useMutation({
    onSuccess: (data) => {
      setBulkResult(data);
      refetchSlots();
    },
    onError: (err) => setActionError(err.message),
  });

  if (sessionLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading Chronos Clinic Portal...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "440px", padding: "2.5rem", textAlign: "center" }}>
          <div className="brand-logo-icon" style={{ margin: "0 auto 1.5rem auto" }}>+</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Chronos Clinic</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
            Please authenticate to access the clinic scheduling portal.
          </p>
          <Link href="/login" className="btn btn-primary" style={{ width: "100%" }}>
            Sign In with Demo Accounts
          </Link>
        </div>
      </div>
    );
  }

  const isFrontDesk = session.user.role === "FRONT_DESK";

  return (
    <div style={{ paddingBottom: "4rem" }}>
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="container nav-content">
          <div className="brand-badge">
            <div className="brand-logo-icon">+</div>
            <div className="brand-title">
              Chronos Clinic
              <span className="brand-pill">{session.user.role}</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{session.user.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{session.user.email}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn btn-secondary btn-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="container" style={{ marginTop: "2rem" }}>
        {/* Flash Notifications */}
        {actionError && (
          <div style={{
            background: "var(--alert-red-bg)",
            border: "1px solid rgba(244, 63, 94, 0.4)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1.25rem",
            color: "var(--alert-red)",
            fontSize: "0.875rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span><strong>Server Rejected Action:</strong> {actionError}</span>
            <button onClick={() => setActionError(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}>✕</button>
          </div>
        )}

        {actionSuccess && (
          <div style={{
            background: "var(--status-checkedin-bg)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1.25rem",
            color: "var(--status-checkedin)",
            fontSize: "0.875rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span>✓ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* Goal 10: Unconfirmed Alerts Banner for Front Desk */}
        {isFrontDesk && alertsData && alertsData.alerts.length > 0 && (
          <section className="alert-banner animate-fade-in">
            <div className="alert-banner-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                  Unconfirmed Appointment Alerts (&lt;24h)
                </h3>
                <span className="alert-count-pill">{alertsData.count} Action Needed</span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Dismissals automatically reappear when within 1h of appointment
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
              {alertsData.alerts.map((al) => (
                <div
                  key={al.appointment.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    background: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "var(--radius-sm)",
                    border: al.isWithinOneHour ? "1px solid rgba(244, 63, 94, 0.6)" : "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{al.appointment.patientName}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Scheduled: {format(new Date(al.scheduledTime), "MMM d, h:mm a")} ({al.hoursUntilScheduled > 0 ? `in ${Math.round(al.hoursUntilScheduled * 60)} mins` : "past due"}) • Provider: {al.appointment.schedulingProvider.name}
                      </div>
                    </div>

                    {al.isWithinOneHour && al.wasDismissedEarlier && (
                      <span style={{
                        fontSize: "0.7rem",
                        padding: "0.2rem 0.5rem",
                        background: "var(--alert-red-bg)",
                        color: "var(--alert-red)",
                        borderRadius: "var(--radius-full)",
                        border: "1px solid rgba(244, 63, 94, 0.4)",
                        fontWeight: 700
                      }}>
                        REAPPEARED (&lt;1h rule)
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => setSelectedAppointmentId(al.appointment.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      View
                    </button>
                    {!al.isWithinOneHour && (
                      <button
                        onClick={() => dismissAlertMutation.mutate({ appointmentId: al.appointment.id })}
                        className="btn btn-sm btn-secondary"
                        disabled={dismissAlertMutation.isLoading}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Headline Numbers Cards (Goal 8) */}
        {stats && (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Appointments Today</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", color: "#fff" }}>
                {stats.headline.appointmentsToday}
              </div>
            </div>

            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Checked In Right Now</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--status-checkedin)" }}>
                {stats.headline.checkedInRightNow}
              </div>
            </div>

            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>No-Shows This Week</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--status-noshow)" }}>
                {stats.headline.noShowsThisWeek}
              </div>
            </div>

            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Confirmed Upcoming</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--status-confirmed)" }}>
                {stats.headline.confirmedUpcoming}
              </div>
            </div>
          </section>
        )}

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem", marginBottom: "1.5rem" }}>
          <button
            onClick={() => setActiveTab("appointments")}
            className={`btn btn-sm ${activeTab === "appointments" ? "btn-primary" : "btn-secondary"}`}
          >
            Appointments Directory
          </button>
          <button
            onClick={() => setActiveTab("slots")}
            className={`btn btn-sm ${activeTab === "slots" ? "btn-primary" : "btn-secondary"}`}
          >
            Availability Slots
          </button>
          {isFrontDesk && (
            <button
              onClick={() => setActiveTab("bulk")}
              className={`btn btn-sm ${activeTab === "bulk" ? "btn-primary" : "btn-secondary"}`}
            >
              Bulk Availability Generator
            </button>
          )}
          <button
            onClick={() => setActiveTab("analytics")}
            className={`btn btn-sm ${activeTab === "analytics" ? "btn-primary" : "btn-secondary"}`}
          >
            Dashboard Analytics
          </button>
        </div>

        {/* TAB 1: Appointments List */}
        {activeTab === "appointments" && (
          <section className="glass-card" style={{ padding: "1.5rem" }}>
            {/* Filter controls */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search patient name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />

              {isFrontDesk && (
                <select
                  className="select-field"
                  value={filterProviderId}
                  onChange={(e) => {
                    setFilterProviderId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Providers</option>
                  {providers?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                className="select-field"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="REQUESTED">Requested</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="COMPLETED">Completed</option>
                <option value="NO_SHOW">No Show</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Appointments Table */}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date & Time</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Care Team</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointmentsLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                        Loading appointments...
                      </td>
                    </tr>
                  ) : appointmentsData?.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                        No appointments found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    appointmentsData?.items.map((app) => (
                      <tr key={app.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{app.patientName}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{app.patientContact}</div>
                        </td>
                        <td>
                          <div>{format(new Date(app.slot.date), "EEE, MMM d, yyyy")}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{app.slot.startTime} ({app.slot.durationMinutes}m)</div>
                        </td>
                        <td>{app.schedulingProvider.name}</td>
                        <td>
                          <span className={`badge badge-${app.status.toLowerCase()}`}>
                            <span className="badge-dot" />
                            {app.status.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          {app.supportingProviders.length > 0 ? (
                            <span style={{ fontSize: "0.8rem", color: "var(--brand-primary-light)" }}>
                              +{app.supportingProviders.length} supporting
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Solo</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedAppointmentId(app.id)}
                            className="btn btn-secondary btn-sm"
                          >
                            Details & History
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {appointmentsData && appointmentsData.totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Showing page {appointmentsData.page} of {appointmentsData.totalPages} ({appointmentsData.totalCount} total)
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page >= appointmentsData.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: Availability Slots */}
        {activeTab === "slots" && (
          <section className="glass-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Provider Availability Slots</h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Unbooked slots become appointments when reserved
              </span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Booking Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slotsData?.map((slot) => (
                    <tr key={slot.id}>
                      <td>{slot.provider.name}</td>
                      <td>{format(new Date(slot.date), "EEE, MMM d, yyyy")}</td>
                      <td>{slot.startTime}</td>
                      <td>{slot.durationMinutes} min</td>
                      <td>
                        <span className={`badge ${slot.status === "ACTIVE" ? "badge-checked_in" : "badge-cancelled"}`}>
                          {slot.status}
                        </span>
                      </td>
                      <td>
                        {slot.appointment ? (
                          <span style={{ color: "var(--status-confirmed)", fontWeight: 600, fontSize: "0.85rem" }}>
                            Booked ({slot.appointment.patientName})
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Available</span>
                        )}
                      </td>
                      <td>
                        {slot.status === "ACTIVE" ? (
                          <button
                            onClick={() => archiveSlotMutation.mutate({ id: slot.id })}
                            className="btn btn-secondary btn-sm"
                          >
                            Archive
                          </button>
                        ) : (
                          <button
                            onClick={() => restoreSlotMutation.mutate({ id: slot.id })}
                            className="btn btn-secondary btn-sm"
                          >
                            Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: Bulk Availability Generation (Goal 7) */}
        {activeTab === "bulk" && isFrontDesk && (
          <section className="glass-card" style={{ padding: "1.75rem", maxWidth: "700px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Bulk Recurring Availability Generator
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Generate recurring weekly availability blocks across a date range. Collisions with existing slots or appointments will be skipped and reported.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                bulkMutation.mutate({
                  providerId: bulkProviderId,
                  startDate: bulkStartDate,
                  endDate: bulkEndDate,
                  daysOfWeek: bulkDays,
                  timeBlocks: [
                    { startTime: "09:00", durationMinutes: 30 },
                    { startTime: "10:00", durationMinutes: 30 },
                    { startTime: "11:00", durationMinutes: 30 },
                    { startTime: "14:00", durationMinutes: 30 },
                    { startTime: "15:00", durationMinutes: 30 },
                  ],
                });
              }}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Provider</label>
                <select
                  className="select-field"
                  value={bulkProviderId}
                  onChange={(e) => setBulkProviderId(e.target.value)}
                  required
                >
                  <option value="">Select Provider...</option>
                  {providers?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Start Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>End Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Days of the Week</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {[
                    { label: "Mon", val: 1 },
                    { label: "Tue", val: 2 },
                    { label: "Wed", val: 3 },
                    { label: "Thu", val: 4 },
                    { label: "Fri", val: 5 },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => {
                        setBulkDays((prev) =>
                          prev.includes(d.val) ? prev.filter((x) => x !== d.val) : [...prev, d.val]
                        );
                      }}
                      className={`btn btn-sm ${bulkDays.includes(d.val) ? "btn-primary" : "btn-secondary"}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={bulkMutation.isLoading || !bulkProviderId}
                style={{ marginTop: "0.5rem" }}
              >
                {bulkMutation.isLoading ? "Generating..." : "Generate Availability Slots"}
              </button>
            </form>

            {/* Bulk Result Report */}
            {bulkResult && (
              <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "var(--radius-sm)" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>Generation Report</h4>
                <p style={{ fontSize: "0.875rem", color: "var(--status-checkedin)" }}>
                  ✓ Created: {bulkResult.createdCount} slots
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--status-requested)" }}>
                  ⚠️ Skipped (Collisions): {bulkResult.skippedCount} slots
                </p>
                {bulkResult.skipped.length > 0 && (
                  <ul style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)", maxHeight: "120px", overflowY: "auto" }}>
                    {bulkResult.skipped.slice(0, 5).map((s: any, idx: number) => (
                      <li key={idx}>
                        {s.date} at {s.startTime} — {s.reason}
                      </li>
                    ))}
                    {bulkResult.skipped.length > 5 && <li>...and {bulkResult.skipped.length - 5} more</li>}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {/* TAB 4: Dashboard Analytics (Goal 8) */}
        {activeTab === "analytics" && stats && (
          <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Status Breakdown */}
              <div className="glass-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Appointments by Status</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={`badge badge-${status.toLowerCase()}`}>
                        <span className="badge-dot" />
                        {status}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: "1rem" }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Provider Breakdown */}
              <div className="glass-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Appointments by Provider</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {stats.byProvider.map((p) => (
                    <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{p.name}</span>
                      <span style={{ fontWeight: 700, fontSize: "1rem" }}>{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 8-Week No-Show Trend Chart */}
            <div className="glass-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Weekly No-Show Rate (Last 8 Weeks)
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "1.5rem" }}>
                Percentage of resolved appointments that resulted in a no-show
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "0.75rem", alignItems: "flex-end", height: "180px", paddingTop: "20px" }}>
                {stats.weeklyNoShowRates.map((wk) => (
                  <div key={wk.weekLabel} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.25rem", color: wk.rate > 20 ? "var(--status-noshow)" : "var(--brand-primary-light)" }}>
                      {wk.rate}%
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: `${Math.max(8, wk.rate * 1.5)}px`,
                        background: wk.rate > 20 ? "var(--status-noshow)" : "var(--brand-gradient)",
                        borderRadius: "4px 4px 0 0",
                        transition: "height 0.3s ease",
                      }}
                    />
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.5rem", textAlign: "center" }}>
                      {wk.weekLabel}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                      {wk.noShows}/{wk.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Modal Drawer: Appointment Details, Status Progression & Immutable Timeline (Goals 3, 4, 9) */}
        {selectedAppointmentId && appointmentDetail && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(6px)",
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1.5rem",
            }}
          >
            <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "780px", maxHeight: "90vh", overflowY: "auto", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{appointmentDetail.patientName}</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    Contact: {appointmentDetail.patientContact} • Scheduling Provider: {appointmentDetail.schedulingProvider.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAppointmentId(null)}
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: "50%", width: "2rem", height: "2rem", padding: 0 }}
                >
                  ✕
                </button>
              </div>

              {/* Current Status and Action Triggers */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Current Status</span>
                  <span className={`badge badge-${appointmentDetail.status.toLowerCase()}`} style={{ marginTop: "0.25rem" }}>
                    <span className="badge-dot" />
                    {appointmentDetail.status}
                  </span>
                </div>

                {/* State Machine Transition Actions (Goal 4 Rules) */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {appointmentDetail.status === "REQUESTED" && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ appointmentId: appointmentDetail.id, toStatus: "CONFIRMED" })}
                      className="btn btn-primary btn-sm"
                    >
                      Confirm
                    </button>
                  )}

                  {appointmentDetail.status === "CONFIRMED" && (
                    <>
                      <button
                        onClick={() => updateStatusMutation.mutate({ appointmentId: appointmentDetail.id, toStatus: "CHECKED_IN" })}
                        className="btn btn-primary btn-sm"
                      >
                        Check In
                      </button>
                      <button
                        onClick={() => updateStatusMutation.mutate({ appointmentId: appointmentDetail.id, toStatus: "NO_SHOW" })}
                        className="btn btn-danger btn-sm"
                      >
                        Mark No Show
                      </button>
                    </>
                  )}

                  {appointmentDetail.status === "CHECKED_IN" && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ appointmentId: appointmentDetail.id, toStatus: "COMPLETED" })}
                      className="btn btn-primary btn-sm"
                    >
                      Complete Visit
                    </button>
                  )}

                  {/* Cancel allowed only before check-in and requires reason */}
                  {appointmentDetail.status !== "CHECKED_IN" && appointmentDetail.status !== "COMPLETED" && appointmentDetail.status !== "NO_SHOW" && appointmentDetail.status !== "CANCELLED" && (
                    <button
                      onClick={() => {
                        const reason = prompt("Please provide a reason for cancellation (required):");
                        if (reason) {
                          updateStatusMutation.mutate({
                            appointmentId: appointmentDetail.id,
                            toStatus: "CANCELLED",
                            cancellationReason: reason,
                          });
                        }
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ color: "var(--alert-red)" }}
                    >
                      Cancel...
                    </button>
                  )}
                </div>
              </div>

              {/* Goal 3: Visit Notes Section */}
              <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Clinical Visit Notes</h3>
                {appointmentDetail.visitNotes.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No visit notes logged yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {appointmentDetail.visitNotes.map((note) => (
                      <div key={note.id} style={{ padding: "0.85rem", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                          <span>By: {note.authorProvider.name}</span>
                          <span>{format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}</span>
                        </div>
                        <p style={{ fontSize: "0.875rem", whiteSpace: "pre-wrap" }}>{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Note form for Providers */}
                {session.user.role === "PROVIDER" && (
                  <div style={{ marginTop: "1rem" }}>
                    <textarea
                      className="input-field"
                      rows={2}
                      placeholder="Add observation or clinical visit note..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                    />
                    <button
                      onClick={() => createNoteMutation.mutate({ appointmentId: appointmentDetail.id, content: newNoteContent })}
                      className="btn btn-secondary btn-sm"
                      disabled={!newNoteContent.trim() || createNoteMutation.isLoading}
                      style={{ marginTop: "0.5rem" }}
                    >
                      Save Visit Note
                    </button>
                  </div>
                )}
              </div>

              {/* Goal 9: Immutable Audit Timeline */}
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                  Immutable Audit History Timeline
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderLeft: "2px solid var(--brand-primary)", paddingLeft: "1rem" }}>
                  {appointmentDetail.statusHistory.map((h) => (
                    <div key={h.id} style={{ fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>
                        {format(new Date(h.changedAt), "MMM d, h:mm a")}
                      </span>{" "}
                      — <strong>{h.changedByUser.name}</strong> moved status from{" "}
                      <code>{h.fromStatus || "START"}</code> to <code>{h.toStatus}</code>
                      {h.reason && <span style={{ color: "var(--text-secondary)" }}> ({h.reason})</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
