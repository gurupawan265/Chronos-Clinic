"use client";

import { useState } from "react";
import { trpc } from "./_trpc/client";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { format } from "date-fns";

function getInitials(name: string): string {
  if (!name) return "??";
  return name
    .replace(/^Dr\.\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function HomePage() {
  const { data: session, isLoading: sessionLoading } = trpc.auth.getSession.useQuery();
  const { data: providers } = trpc.auth.getProviders.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const isFrontDesk = session?.user?.role === "FRONT_DESK";
  const isProvider = session?.user?.role === "PROVIDER";

  // Tab State
  const [activeTab, setActiveTab] = useState<"schedule" | "appointments" | "bulk" | "analytics">("schedule");

  // Selected entities for modals
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [bookingSlot, setBookingSlot] = useState<any | null>(null);
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
  const [editingPatientAppt, setEditingPatientAppt] = useState<any | null>(null);
  const [reassigningAppt, setReassigningAppt] = useState<any | null>(null);
  const [cancellingAppt, setCancellingAppt] = useState<any | null>(null);
  const [cancellationReasonInput, setCancellationReasonInput] = useState("");
  const [cancelModalError, setCancelModalError] = useState<string | null>(null);
  const [selectedNewSupportingProviderId, setSelectedNewSupportingProviderId] = useState("");

  // Filters for Schedule & Appointments
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [scheduleProviderFilter, setScheduleProviderFilter] = useState("");
  const [search, setSearch] = useState("");
  const [filterProviderId, setFilterProviderId] = useState("");
  const [filterStatus, setFilterStatus] = useState<any>("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [sortBy, setSortBy] = useState<"dateTime" | "status" | "provider">("dateTime");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
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
      startDate: startDateFilter || undefined,
      endDate: endDateFilter || undefined,
      sortBy,
      sortOrder,
      page,
      pageSize: 8,
    },
    { enabled: !!session?.user }
  );

  const { data: slotsData, refetch: refetchSlots } = trpc.slot.getAll.useQuery(
    {
      date: selectedScheduleDate || undefined,
      providerId: scheduleProviderFilter || undefined,
    },
    { enabled: !!session?.user }
  );

  const { data: appointmentDetail, refetch: refetchDetail } = trpc.appointment.getById.useQuery(
    { id: selectedAppointmentId! },
    { enabled: !!selectedAppointmentId }
  );

  // Status feedback
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Mutations
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
      refetchSlots();
      if (selectedAppointmentId) refetchDetail();
      setActionSuccess("Status updated successfully.");
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err.message);
      setActionSuccess(null);
    },
  });

  const updatePatientDetailsMutation = trpc.appointment.updatePatientDetails.useMutation({
    onSuccess: () => {
      refetchAppointments();
      refetchSlots();
      if (selectedAppointmentId) refetchDetail();
      setEditingPatientAppt(null);
      setActionSuccess("Patient details updated successfully.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const reassignMutation = trpc.appointment.reassign.useMutation({
    onSuccess: () => {
      refetchAppointments();
      refetchSlots();
      if (selectedAppointmentId) refetchDetail();
      setReassigningAppt(null);
      setActionSuccess("Appointment reassigned successfully.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const bookSlotMutation = trpc.appointment.bookSlot.useMutation({
    onSuccess: () => {
      refetchAppointments();
      refetchSlots();
      refetchStats();
      setBookingSlot(null);
      setActionSuccess("Slot successfully booked and converted to Appointment!");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const createSlotMutation = trpc.slot.create.useMutation({
    onSuccess: () => {
      refetchSlots();
      setShowCreateSlotModal(false);
      setActionSuccess("Availability slot created successfully.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const updateSlotMutation = trpc.slot.update.useMutation({
    onSuccess: () => {
      refetchSlots();
      setEditingSlot(null);
      setActionSuccess("Slot updated successfully.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const archiveSlotMutation = trpc.slot.archive.useMutation({
    onSuccess: () => {
      refetchSlots();
      setActionSuccess("Slot archived.");
    },
    onError: (err) => setActionError(err.message),
  });

  const restoreSlotMutation = trpc.slot.restore.useMutation({
    onSuccess: () => {
      refetchSlots();
      setActionSuccess("Slot restored to active schedule.");
    },
    onError: (err) => setActionError(err.message),
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

  const addSupportingProviderMutation = trpc.appointment.addSupportingProvider.useMutation({
    onSuccess: () => {
      refetchAppointments();
      if (selectedAppointmentId) refetchDetail();
      setSelectedNewSupportingProviderId("");
      setActionSuccess("Supporting provider assigned to care team.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const removeSupportingProviderMutation = trpc.appointment.removeSupportingProvider.useMutation({
    onSuccess: () => {
      refetchAppointments();
      if (selectedAppointmentId) refetchDetail();
      setActionSuccess("Supporting provider removed from care team.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  // Bulk Generator State
  const [bulkProviderId, setBulkProviderId] = useState("");
  const [bulkStartDate, setBulkStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bulkEndDate, setBulkEndDate] = useState(format(new Date(Date.now() + 14 * 86400000), "yyyy-MM-dd"));
  const [bulkStartTime, setBulkStartTime] = useState("09:00");
  const [bulkDuration, setBulkDuration] = useState(30);
  const [bulkDays, setBulkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const bulkMutation = trpc.slot.bulkGenerate.useMutation({
    onSuccess: (data) => {
      setBulkResult(data);
      refetchSlots();
      setActionSuccess(`Bulk generation completed: ${data.createdCount} created, ${data.skippedCount} skipped.`);
    },
    onError: (err) => setActionError(err.message),
  });

  const exportCsvMutation = trpc.slot.exportDayScheduleCsv.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", data.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setActionSuccess(`Exported ${data.totalRows} schedule records to ${data.filename}.`);
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  // Slot Form inputs
  const [newSlotProviderId, setNewSlotProviderId] = useState("");
  const [newSlotDate, setNewSlotDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newSlotStartTime, setNewSlotStartTime] = useState("09:00");
  const [newSlotDuration, setNewSlotDuration] = useState(30);

  // Edit Slot inputs
  const [editSlotDate, setEditSlotDate] = useState("");
  const [editSlotStartTime, setEditSlotStartTime] = useState("");
  const [editSlotDuration, setEditSlotDuration] = useState(30);

  // Booking Form inputs
  const [patientNameInput, setPatientNameInput] = useState("");
  const [patientContactInput, setPatientContactInput] = useState("");

  // Reassign inputs
  const [newReassignProviderId, setNewReassignProviderId] = useState("");

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
            {/* Goal 10: Persistent Alert Count Badge in Nav for Front Desk */}
            {isFrontDesk && alertsData && alertsData.count > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.35rem 0.75rem",
                  background: "rgba(244, 63, 94, 0.15)",
                  border: "1px solid rgba(244, 63, 94, 0.4)",
                  borderRadius: "var(--radius-full)",
                  color: "var(--alert-red)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  boxShadow: "0 0 10px rgba(244, 63, 94, 0.3)",
                }}
              >
                <span>⚠️</span>
                <span>{alertsData.count} Unconfirmed Alert{alertsData.count > 1 ? "s" : ""}</span>
              </div>
            )}

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

        {/* Headline Numbers Cards */}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`btn btn-sm ${activeTab === "schedule" ? "btn-primary" : "btn-secondary"}`}
            >
              {isFrontDesk ? "📅 All Providers Schedule View" : "🩺 My Schedule View"}
            </button>
            <button
              onClick={() => setActiveTab("appointments")}
              className={`btn btn-sm ${activeTab === "appointments" ? "btn-primary" : "btn-secondary"}`}
            >
              📋 Appointments Directory
            </button>
            <button
              onClick={() => setActiveTab("bulk")}
              className={`btn btn-sm ${activeTab === "bulk" ? "btn-primary" : "btn-secondary"}`}
            >
              ⚡ Generate Availability
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`btn btn-sm ${activeTab === "analytics" ? "btn-primary" : "btn-secondary"}`}
            >
              📊 Analytics & Trends
            </button>
          </div>

          {/* Quick Create Slot action button */}
          <button
            onClick={() => {
              setNewSlotProviderId(isProvider ? session.user.id : (providers?.[0]?.id || ""));
              setShowCreateSlotModal(true);
            }}
            className="btn btn-primary btn-sm"
          >
            + Create Availability Slot
          </button>
        </div>

        {/* TAB 1: SCHEDULE VIEW (Front Desk "All Providers" vs Provider "My Schedule") */}
        {activeTab === "schedule" && (
          <section className="glass-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                  {isFrontDesk ? "All Providers Daily Schedule" : `Schedule for ${session.user.name}`}
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  {isFrontDesk
                    ? "Manage slots and bookings across all clinic providers. Unbooked slots become appointments when reserved."
                    : "Your active agenda as Scheduling Provider or Supporting Care Team member."}
                </p>
              </div>

              {/* Schedule Filters & Day CSV Export */}
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="date"
                  className="input-field"
                  value={selectedScheduleDate}
                  onChange={(e) => setSelectedScheduleDate(e.target.value)}
                  style={{ width: "auto" }}
                />

                {isFrontDesk && (
                  <select
                    className="select-field"
                    value={scheduleProviderFilter}
                    onChange={(e) => setScheduleProviderFilter(e.target.value)}
                    style={{ width: "auto" }}
                  >
                    <option value="">All Providers</option>
                    {providers?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => {
                    exportCsvMutation.mutate({
                      date: selectedScheduleDate,
                      providerId: scheduleProviderFilter || undefined,
                    });
                  }}
                  className="btn btn-secondary btn-sm"
                  disabled={exportCsvMutation.isLoading}
                  title={`Download single day CSV schedule for ${selectedScheduleDate}`}
                >
                  {exportCsvMutation.isLoading ? "Exporting..." : "📥 Export Day CSV"}
                </button>

                <button
                  onClick={() => refetchSlots()}
                  className="btn btn-secondary btn-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Schedule Slots Table */}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Provider</th>
                    <th>Status / Mode</th>
                    <th>Patient / Booking Details</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slotsData?.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem" }}>
                        No slots scheduled for this date. Click "+ Create Availability Slot" to add time blocks.
                      </td>
                    </tr>
                  ) : (
                    slotsData?.map((slot) => {
                      const isBooked = !!slot.appointment;
                      const appt = slot.appointment;

                      return (
                        <tr key={slot.id}>
                          <td style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>
                            {slot.startTime}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{slot.provider.name}</div>
                            {isProvider && (
                              <span style={{ fontSize: "0.7rem", color: "var(--brand-primary-light)" }}>
                                Scheduling Provider
                              </span>
                            )}
                          </td>
                          <td>
                            {isBooked ? (
                              <span className={`badge badge-${appt?.status.toLowerCase()}`}>
                                <span className="badge-dot" />
                                {appt?.status.replace("_", " ")}
                              </span>
                            ) : (
                              <span className={`badge ${slot.status === "ACTIVE" ? "badge-checked_in" : "badge-cancelled"}`}>
                                {slot.status === "ACTIVE" ? "OPEN SLOT" : "ARCHIVED"}
                              </span>
                            )}
                          </td>
                          <td>
                            {isBooked ? (
                              <div>
                                <div style={{ fontWeight: 600, color: "#fff" }}>{appt?.patientName}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{appt?.patientContact}</div>
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                Available for Booking
                              </span>
                            )}
                          </td>
                          <td>{slot.durationMinutes} mins</td>
                          <td>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              {/* Book button for unbooked active slot */}
                              {!isBooked && slot.status === "ACTIVE" && (
                                <button
                                  onClick={() => {
                                    setBookingSlot(slot);
                                    setPatientNameInput("");
                                    setPatientContactInput("");
                                  }}
                                  className="btn btn-primary btn-sm"
                                >
                                  Book Slot
                                </button>
                              )}

                              {/* Edit unbooked slot */}
                              {!isBooked && (
                                <button
                                  onClick={() => {
                                    setEditingSlot(slot);
                                    setEditSlotDate(format(new Date(slot.date), "yyyy-MM-dd"));
                                    setEditSlotStartTime(slot.startTime);
                                    setEditSlotDuration(slot.durationMinutes);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Edit
                                </button>
                              )}

                              {/* View / Manage booked appointment */}
                              {isBooked && (
                                <button
                                  onClick={() => setSelectedAppointmentId(appt?.id!)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Manage Details
                                </button>
                              )}

                              {/* Archive/Restore unbooked slot */}
                              {!isBooked && (
                                slot.status === "ACTIVE" ? (
                                  <button
                                    onClick={() => archiveSlotMutation.mutate({ id: slot.id })}
                                    className="btn btn-secondary btn-sm"
                                    style={{ color: "var(--alert-red)" }}
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
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 2: APPOINTMENTS DIRECTORY */}
        {activeTab === "appointments" && (
          <section className="glass-card" style={{ padding: "1.5rem" }}>
            {/* Search & Filter Bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: isFrontDesk ? "2fr 1fr 1fr" : "2fr 1fr", gap: "1rem" }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="🔍 Search patient name (global search)..."
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

              {/* Date-Range Filter & Reset Row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Date Range:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>From</span>
                    <input
                      type="date"
                      className="input-field"
                      style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem", width: "auto" }}
                      value={startDateFilter}
                      onChange={(e) => {
                        setStartDateFilter(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>To</span>
                    <input
                      type="date"
                      className="input-field"
                      style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem", width: "auto" }}
                      value={endDateFilter}
                      onChange={(e) => {
                        setEndDateFilter(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </div>

                {(search || filterProviderId || filterStatus || startDateFilter || endDateFilter) && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilterProviderId("");
                      setFilterStatus("");
                      setStartDateFilter("");
                      setEndDateFilter("");
                      setPage(1);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.75rem" }}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>

            {/* Appointments Table with Sortable Columns */}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th
                      onClick={() => {
                        if (sortBy === "dateTime") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy("dateTime");
                          setSortOrder("asc");
                        }
                      }}
                      style={{ cursor: "pointer", userSelect: "none" }}
                      title="Click to toggle date/time sorting"
                    >
                      Date & Time {sortBy === "dateTime" ? (sortOrder === "asc" ? "▲" : "▼") : "⬍"}
                    </th>
                    <th
                      onClick={() => {
                        if (sortBy === "provider") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy("provider");
                          setSortOrder("asc");
                        }
                      }}
                      style={{ cursor: "pointer", userSelect: "none" }}
                      title="Click to toggle provider sorting"
                    >
                      Scheduling Provider {sortBy === "provider" ? (sortOrder === "asc" ? "▲" : "▼") : "⬍"}
                    </th>
                    <th
                      onClick={() => {
                        if (sortBy === "status") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy("status");
                          setSortOrder("asc");
                        }
                      }}
                      style={{ cursor: "pointer", userSelect: "none" }}
                      title="Click to toggle status sorting"
                    >
                      Status {sortBy === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "⬍"}
                    </th>
                    <th>Care Team (Supporting)</th>
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
                          <div style={{ fontWeight: 500 }}>{format(new Date(app.slot.date), "EEE, MMM d, yyyy")}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {app.slot.startTime} ({app.slot.durationMinutes}m)
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <div className="avatar-circle avatar-primary" title={`Scheduling Provider: ${app.schedulingProvider.name}`}>
                              {getInitials(app.schedulingProvider.name)}
                            </div>
                            <div>
                              <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{app.schedulingProvider.name}</div>
                              {isProvider && app.schedulingProviderId === session.user.id && (
                                <span style={{ fontSize: "0.65rem", color: "var(--brand-primary-light)", fontWeight: 700 }}>
                                  (Primary)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {/* Status Color Chips */}
                          <span className={`badge badge-${app.status.toLowerCase()}`}>
                            <span className="badge-dot" />
                            {app.status.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          {/* Care Team: Supporting Providers Avatars and Stack */}
                          {app.supportingProviders.length > 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div className="avatar-stack">
                                {app.supportingProviders.map((sp: any) => (
                                  <div
                                    key={sp.id}
                                    className="avatar-circle avatar-supporting"
                                    title={`Supporting Provider: ${sp.provider.name}`}
                                  >
                                    {getInitials(sp.provider.name)}
                                  </div>
                                ))}
                              </div>
                              <span style={{ fontSize: "0.75rem", color: "var(--brand-secondary)", fontWeight: 600 }}>
                                +{app.supportingProviders.length} supporting
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "0.2rem 0.5rem", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)" }}>
                              Solo Provider
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => setSelectedAppointmentId(app.id)}
                              className="btn btn-secondary btn-sm"
                            >
                              Timeline & Actions
                            </button>
                            <button
                              onClick={() => setEditingPatientAppt(app)}
                              className="btn btn-secondary btn-sm"
                            >
                              Edit Patient
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Prisma-Level Server Pagination */}
            {appointmentsData && appointmentsData.totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Showing page {appointmentsData.page} of {appointmentsData.totalPages} ({appointmentsData.totalCount} total appointments)
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

        {/* TAB 3: Generate Availability (Goal 7) */}
        {activeTab === "bulk" && (
          <section className="glass-card" style={{ padding: "1.75rem", maxWidth: "780px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Generate Recurring Availability
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Define a weekly recurrence pattern (days of the week, start time, duration) across a date range. Collisions with existing slots or booked appointments will be automatically skipped and reported with detailed reasons.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const targetProviderId = isProvider ? session.user.id : bulkProviderId;
                if (!targetProviderId) return;

                bulkMutation.mutate({
                  providerId: targetProviderId,
                  startDate: bulkStartDate,
                  endDate: bulkEndDate,
                  daysOfWeek: bulkDays,
                  startTime: bulkStartTime,
                  durationMinutes: Number(bulkDuration) || 30,
                });
              }}
              style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
            >
              {/* Provider Selection */}
              {isFrontDesk ? (
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Clinical Provider <span style={{ color: "var(--alert-red)" }}>*</span>
                  </label>
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
              ) : (
                <div style={{ padding: "0.6rem 0.85rem", background: "rgba(99,102,241,0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Generating availability for: </span>
                  <strong style={{ fontSize: "0.85rem", color: "var(--brand-primary-light)" }}>{session?.user?.name} (You)</strong>
                </div>
              )}

              {/* Date Range */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Start Date <span style={{ color: "var(--alert-red)" }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    End Date <span style={{ color: "var(--alert-red)" }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Day-of-Week Checkboxes */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  Recurring Days of Week <span style={{ color: "var(--alert-red)" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {[
                    { label: "Mon", val: 1 },
                    { label: "Tue", val: 2 },
                    { label: "Wed", val: 3 },
                    { label: "Thu", val: 4 },
                    { label: "Fri", val: 5 },
                    { label: "Sat", val: 6 },
                    { label: "Sun", val: 0 },
                  ].map((d) => {
                    const isChecked = bulkDays.includes(d.val);
                    return (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => {
                          setBulkDays((prev) =>
                            prev.includes(d.val) ? prev.filter((x) => x !== d.val) : [...prev, d.val]
                          );
                        }}
                        className={`btn btn-sm ${isChecked ? "btn-primary" : "btn-secondary"}`}
                        style={{ minWidth: "3rem" }}
                      >
                        {isChecked ? `✓ ${d.label}` : d.label}
                      </button>
                    );
                  })}
                </div>
                {bulkDays.length === 0 && (
                  <p style={{ color: "var(--alert-red)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                    Please select at least one day of the week.
                  </p>
                )}
              </div>

              {/* Time and Duration */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Slot Start Time <span style={{ color: "var(--alert-red)" }}>*</span>
                  </label>
                  <input
                    type="time"
                    className="input-field"
                    value={bulkStartTime}
                    onChange={(e) => setBulkStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Duration (Minutes) <span style={{ color: "var(--alert-red)" }}>*</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    className="input-field"
                    value={bulkDuration}
                    onChange={(e) => setBulkDuration(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={bulkMutation.isLoading || (isFrontDesk && !bulkProviderId) || bulkDays.length === 0}
                style={{ marginTop: "0.5rem" }}
              >
                {bulkMutation.isLoading ? "Generating Availability Slots..." : "⚡ Generate Availability Slots"}
              </button>
            </form>

            {/* Results Summary after run */}
            {bulkResult && (
              <div style={{ marginTop: "1.75rem", padding: "1.25rem", background: "rgba(0,0,0,0.35)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Generation Run Results</h4>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--status-checkedin)", fontWeight: 700, padding: "0.15rem 0.6rem", background: "rgba(16,185,129,0.15)", borderRadius: "var(--radius-full)" }}>
                      ✓ {bulkResult.createdCount} Created
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--status-requested)", fontWeight: 700, padding: "0.15rem 0.6rem", background: "rgba(245,158,11,0.15)", borderRadius: "var(--radius-full)" }}>
                      ⚠️ {bulkResult.skippedCount} Skipped
                    </span>
                  </div>
                </div>

                {/* Skipped Items Details */}
                {bulkResult.skipped && bulkResult.skipped.length > 0 ? (
                  <div style={{ marginTop: "1rem" }}>
                    <h5 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--status-requested)", marginBottom: "0.5rem" }}>
                      Skipped Slots ({bulkResult.skipped.length} collisions detected):
                    </h5>
                    <div style={{ maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {bulkResult.skipped.map((s: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: "0.8rem",
                            padding: "0.5rem 0.75rem",
                            background: "rgba(245, 158, 11, 0.08)",
                            border: "1px solid rgba(245, 158, 11, 0.25)",
                            borderRadius: "var(--radius-sm)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <strong>{s.date}</strong> at <strong>{s.startTime}</strong>
                          </div>
                          <div style={{ color: "var(--status-requested)", fontSize: "0.75rem", textAlign: "right" }}>
                            {s.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--status-checkedin)", marginTop: "0.5rem" }}>
                    Zero collisions encountered. All slots generated smoothly.
                  </p>
                )}

                {/* Created Items Preview */}
                {bulkResult.created && bulkResult.created.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <h5 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--status-checkedin)", marginBottom: "0.5rem" }}>
                      Created Slots ({bulkResult.created.length}):
                    </h5>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", fontSize: "0.75rem" }}>
                      {bulkResult.created.slice(0, 12).map((c: any, idx: number) => (
                        <span key={idx} style={{ padding: "0.2rem 0.5rem", background: "rgba(16,185,129,0.1)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16,185,129,0.25)", color: "var(--status-checkedin)" }}>
                          {c.date} {c.startTime}
                        </span>
                      ))}
                      {bulkResult.created.length > 12 && (
                        <span style={{ padding: "0.2rem 0.5rem", color: "var(--text-muted)", alignSelf: "center" }}>
                          +{bulkResult.created.length - 12} more...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* TAB 4: Dashboard Analytics */}
        {activeTab === "analytics" && stats && (
          <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
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

        {/* MODAL 1: CREATE AVAILABILITY SLOT */}
        {showCreateSlotModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(6px)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "480px", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Create Availability Slot</h3>
                <button onClick={() => setShowCreateSlotModal(false)} className="btn btn-secondary btn-sm">✕</button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createSlotMutation.mutate({
                    providerId: isProvider ? session.user.id : newSlotProviderId,
                    date: newSlotDate,
                    startTime: newSlotStartTime,
                    durationMinutes: Number(newSlotDuration),
                  });
                }}
                style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
              >
                {isFrontDesk ? (
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Provider</label>
                    <select
                      className="select-field"
                      value={newSlotProviderId}
                      onChange={(e) => setNewSlotProviderId(e.target.value)}
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
                ) : (
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Provider</label>
                    <input type="text" className="input-field" value={session.user.name} disabled />
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={newSlotDate}
                    onChange={(e) => setNewSlotDate(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Start Time (HH:mm)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="09:00"
                      value={newSlotStartTime}
                      onChange={(e) => setNewSlotStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Duration (Minutes)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={newSlotDuration}
                      onChange={(e) => setNewSlotDuration(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createSlotMutation.isLoading}
                  style={{ marginTop: "0.5rem" }}
                >
                  {createSlotMutation.isLoading ? "Creating..." : "Save Availability Slot"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDIT UNBOOKED SLOT */}
        {editingSlot && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(6px)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "480px", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Edit Unbooked Slot</h3>
                <button onClick={() => setEditingSlot(null)} className="btn btn-secondary btn-sm">✕</button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateSlotMutation.mutate({
                    id: editingSlot.id,
                    date: editSlotDate,
                    startTime: editSlotStartTime,
                    durationMinutes: Number(editSlotDuration),
                  });
                }}
                style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Provider</label>
                  <input type="text" className="input-field" value={editingSlot.provider?.name} disabled />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={editSlotDate}
                    onChange={(e) => setEditSlotDate(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Start Time (HH:mm)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={editSlotStartTime}
                      onChange={(e) => setEditSlotStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Duration (Minutes)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={editSlotDuration}
                      onChange={(e) => setEditSlotDuration(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updateSlotMutation.isLoading}
                  style={{ marginTop: "0.5rem" }}
                >
                  {updateSlotMutation.isLoading ? "Updating..." : "Update Slot"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: BOOK SLOT (CONVERT SLOT TO APPOINTMENT) */}
        {bookingSlot && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(6px)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "480px", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Book Appointment Slot</h3>
                <button onClick={() => setBookingSlot(null)} className="btn btn-secondary btn-sm">✕</button>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
                Booking this slot converts it directly into a tracked Appointment record for {bookingSlot.provider?.name} on {format(new Date(bookingSlot.date), "MMM d")} at {bookingSlot.startTime}.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  bookSlotMutation.mutate({
                    slotId: bookingSlot.id,
                    patientName: patientNameInput,
                    patientContact: patientContactInput,
                  });
                }}
                style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Patient Full Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Jane Doe"
                    value={patientNameInput}
                    onChange={(e) => setPatientNameInput(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Patient Contact (Phone or Email)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 555-0199 or jane@example.com"
                    value={patientContactInput}
                    onChange={(e) => setPatientContactInput(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={bookSlotMutation.isLoading}
                  style={{ marginTop: "0.5rem" }}
                >
                  {bookSlotMutation.isLoading ? "Reserving Slot..." : "Confirm & Book Slot"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: EDIT PATIENT DETAILS */}
        {editingPatientAppt && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(6px)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "480px", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Edit Patient Details</h3>
                <button onClick={() => setEditingPatientAppt(null)} className="btn btn-secondary btn-sm">✕</button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updatePatientDetailsMutation.mutate({
                    appointmentId: editingPatientAppt.id,
                    patientName: editingPatientAppt.patientName,
                    patientContact: editingPatientAppt.patientContact,
                  });
                }}
                style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Patient Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingPatientAppt.patientName}
                    onChange={(e) => setEditingPatientAppt({ ...editingPatientAppt, patientName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Patient Contact</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingPatientAppt.patientContact}
                    onChange={(e) => setEditingPatientAppt({ ...editingPatientAppt, patientContact: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updatePatientDetailsMutation.isLoading}
                  style={{ marginTop: "0.5rem" }}
                >
                  {updatePatientDetailsMutation.isLoading ? "Saving..." : "Save Patient Details"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 5: REASSIGN SCHEDULING PROVIDER (Front Desk Only) */}
        {reassigningAppt && isFrontDesk && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(6px)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "480px", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Reassign Appointment</h3>
                <button onClick={() => setReassigningAppt(null)} className="btn btn-secondary btn-sm">✕</button>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Reassign patient <strong>{reassigningAppt.patientName}</strong> to another physician or therapist.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  reassignMutation.mutate({
                    appointmentId: reassigningAppt.id,
                    newProviderId: newReassignProviderId,
                  });
                }}
                style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>New Scheduling Provider</label>
                  <select
                    className="select-field"
                    value={newReassignProviderId}
                    onChange={(e) => setNewReassignProviderId(e.target.value)}
                    required
                  >
                    <option value="">Select Target Provider...</option>
                    {providers
                      ?.filter((p) => p.id !== reassigningAppt.schedulingProviderId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={reassignMutation.isLoading || !newReassignProviderId}
                >
                  {reassignMutation.isLoading ? "Reassigning..." : "Reassign Provider"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 5B: REASON-REQUIRED CANCELLATION MODAL */}
        {cancellingAppt && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(6px)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "480px", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--alert-red)" }}>Cancel Appointment</h3>
                <button onClick={() => setCancellingAppt(null)} className="btn btn-secondary btn-sm">✕</button>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Cancelling appointment for <strong>{cancellingAppt.patientName}</strong> ({format(new Date(cancellingAppt.slot.date), "MMM d")} at {cancellingAppt.slot.startTime}).
                Cancellation is permitted only before check-in and requires an explicit, non-empty cancellation reason.
              </p>

              {cancelModalError && (
                <div style={{ background: "var(--alert-red-bg)", border: "1px solid rgba(244,63,94,0.4)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", color: "var(--alert-red)", fontSize: "0.8rem", marginBottom: "1rem" }}>
                  {cancelModalError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!cancellationReasonInput.trim()) {
                    setCancelModalError("A non-empty cancellation reason must be provided.");
                    return;
                  }
                  updateStatusMutation.mutate({
                    appointmentId: cancellingAppt.id,
                    toStatus: "CANCELLED",
                    cancellationReason: cancellationReasonInput.trim(),
                  });
                  setCancellingAppt(null);
                }}
                style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Cancellation Reason <span style={{ color: "var(--alert-red)" }}>*</span>
                  </label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="e.g. Patient called to cancel due to severe acute illness / schedule conflict..."
                    value={cancellationReasonInput}
                    onChange={(e) => {
                      setCancellationReasonInput(e.target.value);
                      if (cancelModalError) setCancelModalError(null);
                    }}
                    required
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setCancellingAppt(null)}
                    className="btn btn-secondary btn-sm"
                  >
                    Keep Appointment
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger btn-sm"
                    disabled={updateStatusMutation.isLoading}
                  >
                    {updateStatusMutation.isLoading ? "Cancelling..." : "Confirm Cancellation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 6: APPOINTMENT DETAILS, STATUS ACTIONS & TIMELINE */}
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
                    Contact: {appointmentDetail.patientContact} • Scheduling Provider: <strong>{appointmentDetail.schedulingProvider.name}</strong>
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => setEditingPatientAppt(appointmentDetail)}
                    className="btn btn-secondary btn-sm"
                  >
                    Edit Patient
                  </button>
                  {isFrontDesk && (
                    <button
                      onClick={() => setReassigningAppt(appointmentDetail)}
                      className="btn btn-secondary btn-sm"
                    >
                      Reassign Provider...
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAppointmentId(null)}
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: "50%", width: "2rem", height: "2rem", padding: 0 }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Current Status</span>
                  <span className={`badge badge-${appointmentDetail.status.toLowerCase()}`} style={{ marginTop: "0.25rem" }}>
                    <span className="badge-dot" />
                    {appointmentDetail.status}
                  </span>
                </div>

                {/* State Machine Transition Actions (One step forward only + Guards) */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  {(() => {
                    const status = appointmentDetail.status;
                    const [slotH, slotM] = appointmentDetail.slot.startTime.split(":").map(Number);
                    const scheduledTime = new Date(appointmentDetail.slot.date);
                    scheduledTime.setHours(slotH, slotM, 0, 0);
                    const now = new Date();
                    const isPastScheduled = now.getTime() > scheduledTime.getTime();

                    if (status === "REQUESTED") {
                      return (
                        <>
                          <button
                            onClick={() => updateStatusMutation.mutate({ appointmentId: appointmentDetail.id, toStatus: "CONFIRMED" })}
                            className="btn btn-primary btn-sm"
                            disabled={updateStatusMutation.isLoading}
                          >
                            Confirm Appointment (→ Confirmed)
                          </button>
                          <button
                            onClick={() => {
                              setCancellingAppt(appointmentDetail);
                              setCancellationReasonInput("");
                              setCancelModalError(null);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ color: "var(--alert-red)" }}
                          >
                            Cancel Appointment...
                          </button>
                        </>
                      );
                    }

                    if (status === "CONFIRMED") {
                      return (
                        <>
                          <button
                            onClick={() => updateStatusMutation.mutate({ appointmentId: appointmentDetail.id, toStatus: "CHECKED_IN" })}
                            className="btn btn-primary btn-sm"
                            disabled={updateStatusMutation.isLoading}
                          >
                            Check In Patient (→ Checked In)
                          </button>

                          {/* No Show: Reachable only from CONFIRMED and only if scheduledStartTime < now */}
                          {isPastScheduled ? (
                            <button
                              onClick={() => {
                                if (confirm("Mark this patient as No Show? This records a missed appointment.")) {
                                  updateStatusMutation.mutate({ appointmentId: appointmentDetail.id, toStatus: "NO_SHOW" });
                                }
                              }}
                              className="btn btn-danger btn-sm"
                              disabled={updateStatusMutation.isLoading}
                            >
                              Mark No Show
                            </button>
                          ) : (
                            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start" }}>
                              <button
                                disabled
                                className="btn btn-secondary btn-sm"
                                style={{ opacity: 0.45, cursor: "not-allowed" }}
                                title={`Cannot mark as No Show before scheduled time (${appointmentDetail.slot.startTime}). Current time is before start time.`}
                              >
                                Mark No Show (Locked)
                              </button>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                🔒 Unlocks after {appointmentDetail.slot.startTime}
                              </span>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setCancellingAppt(appointmentDetail);
                              setCancellationReasonInput("");
                              setCancelModalError(null);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ color: "var(--alert-red)" }}
                          >
                            Cancel Appointment...
                          </button>
                        </>
                      );
                    }

                    if (status === "CHECKED_IN") {
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <button
                            onClick={() => updateStatusMutation.mutate({ appointmentId: appointmentDetail.id, toStatus: "COMPLETED" })}
                            className="btn btn-primary btn-sm"
                            disabled={updateStatusMutation.isLoading}
                          >
                            Complete Visit (→ Completed)
                          </button>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            (Patient checked in — Cancellation blocked)
                          </span>
                        </div>
                      );
                    }

                    // Terminal states: COMPLETED, NO_SHOW, CANCELLED
                    return (
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                        Terminal State — No further transitions permitted.
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Care Team & Supporting Providers (SupportingProviderAssignment add/remove) */}
              <div style={{ marginBottom: "1.5rem", padding: "1.1rem", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Care Team & Providers</h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {appointmentDetail.supportingProviders.length + 1} clinician{appointmentDetail.supportingProviders.length > 0 ? "s" : ""} assigned
                  </span>
                </div>

                {/* Primary Scheduling Provider */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.75rem", background: "rgba(99,102,241,0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(99,102,241,0.2)", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <div className="avatar-circle avatar-primary">
                      {getInitials(appointmentDetail.schedulingProvider.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{appointmentDetail.schedulingProvider.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{appointmentDetail.schedulingProvider.email}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--brand-primary-light)", padding: "0.15rem 0.5rem", background: "rgba(99,102,241,0.15)", borderRadius: "var(--radius-full)" }}>
                    Lead / Scheduling Provider
                  </span>
                </div>

                {/* Supporting Providers List */}
                {appointmentDetail.supportingProviders.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
                    {appointmentDetail.supportingProviders.map((sp: any) => (
                      <div
                        key={sp.id}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                          <div className="avatar-circle avatar-supporting">
                            {getInitials(sp.provider.name)}
                          </div>
                          <div>
                            <div style={{ fontSize: "0.825rem", fontWeight: 500 }}>{sp.provider.name}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{sp.provider.email}</div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--brand-secondary)", fontWeight: 600 }}>
                            Supporting Provider
                          </span>
                          {(isFrontDesk || appointmentDetail.schedulingProviderId === session?.user?.id) && (
                            <button
                              type="button"
                              onClick={() => removeSupportingProviderMutation.mutate({ assignmentId: sp.id })}
                              className="btn btn-secondary btn-sm"
                              style={{ color: "var(--alert-red)", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                              disabled={removeSupportingProviderMutation.isLoading}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem", fontStyle: "italic" }}>
                    No supporting providers assigned yet.
                  </div>
                )}

                {/* Add Supporting Provider Controls (Front Desk or Scheduling Provider Only) */}
                {(isFrontDesk || appointmentDetail.schedulingProviderId === session?.user?.id) ? (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
                    <select
                      className="select-field"
                      style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
                      value={selectedNewSupportingProviderId}
                      onChange={(e) => setSelectedNewSupportingProviderId(e.target.value)}
                    >
                      <option value="">+ Assign Supporting Provider...</option>
                      {providers
                        ?.filter(
                          (p) =>
                            p.id !== appointmentDetail.schedulingProviderId &&
                            !appointmentDetail.supportingProviders.some((sp: any) => sp.providerId === p.id)
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedNewSupportingProviderId) {
                          addSupportingProviderMutation.mutate({
                            appointmentId: appointmentDetail.id,
                            providerId: selectedNewSupportingProviderId,
                          });
                        }
                      }}
                      className="btn btn-primary btn-sm"
                      disabled={!selectedNewSupportingProviderId || addSupportingProviderMutation.isLoading}
                    >
                      {addSupportingProviderMutation.isLoading ? "Adding..." : "Add to Care Team"}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Care team management is restricted to Front Desk staff and the Primary Scheduling Provider.
                  </div>
                )}
              </div>

              {/* Visit Notes */}
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
                {isProvider && (
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

              {/* Goal 9: Unified Immutable Audit Timeline Per Appointment */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                    Unified Audit Timeline (Immutable)
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    🔒 Append-Only • No Edit / Delete
                  </span>
                </div>

                {(() => {
                  interface TimelineEvent {
                    id: string;
                    timestamp: Date;
                    icon: string;
                    title: string;
                    actor?: string;
                    details?: string | null;
                    badgeText?: string;
                    badgeClass?: string;
                  }

                  const events: TimelineEvent[] = [];

                  // 1. Appointment Creation
                  events.push({
                    id: "creation",
                    timestamp: new Date(appointmentDetail.createdAt),
                    icon: "✨",
                    title: "Appointment Created & Slot Booked",
                    actor: "System / " + appointmentDetail.schedulingProvider.name,
                    details: `Booked for ${appointmentDetail.patientName} (${appointmentDetail.patientContact}). Initial status: REQUESTED.`,
                    badgeText: "CREATED",
                    badgeClass: "badge-confirmed",
                  });

                  // 2. Status History changes
                  appointmentDetail.statusHistory.forEach((h: any) => {
                    const isCancel = h.toStatus === "CANCELLED";
                    events.push({
                      id: `sh-${h.id}`,
                      timestamp: new Date(h.changedAt),
                      icon: isCancel ? "❌" : "🔄",
                      title: isCancel
                        ? "Appointment Cancelled"
                        : `Status Changed: ${h.fromStatus || "INITIAL"} → ${h.toStatus}`,
                      actor: `${h.changedByUser.name} (${h.changedByUser.role})`,
                      details: h.reason ? h.reason : `Transitioned status to ${h.toStatus}.`,
                      badgeText: h.toStatus,
                      badgeClass: `badge-${h.toStatus.toLowerCase()}`,
                    });
                  });

                  // 3. Supporting Provider Assignments & Unassignments
                  appointmentDetail.supportingProviders.forEach((sp: any) => {
                    events.push({
                      id: `sp-assign-${sp.id}`,
                      timestamp: new Date(sp.assignedAt),
                      icon: "🩺",
                      title: `Care Team Assigned: ${sp.provider.name}`,
                      actor: "Scheduling Provider / Front Desk",
                      details: `${sp.provider.name} (${sp.provider.email}) assigned as supporting provider.`,
                      badgeText: "CARE TEAM",
                      badgeClass: "badge-checked_in",
                    });

                    if (sp.unassignedAt) {
                      events.push({
                        id: `sp-unassign-${sp.id}`,
                        timestamp: new Date(sp.unassignedAt),
                        icon: "👋",
                        title: `Care Team Unassigned: ${sp.provider.name}`,
                        actor: "Scheduling Provider / Front Desk",
                        details: `${sp.provider.name} unassigned from supporting care team.`,
                        badgeText: "REMOVED",
                        badgeClass: "badge-cancelled",
                      });
                    }
                  });

                  // 4. Clinical Visit Notes
                  appointmentDetail.visitNotes.forEach((note: any) => {
                    events.push({
                      id: `vn-${note.id}`,
                      timestamp: new Date(note.createdAt),
                      icon: "📝",
                      title: `Clinical Note Logged by ${note.authorProvider.name}`,
                      actor: note.authorProvider.name,
                      details: note.content,
                      badgeText: "VISIT NOTE",
                      badgeClass: "badge-completed",
                    });
                  });

                  // 5. Alert Dismissals
                  appointmentDetail.alertDismissals?.forEach((d: any) => {
                    events.push({
                      id: `ad-${d.id}`,
                      timestamp: new Date(d.dismissedAt),
                      icon: "🔕",
                      title: "Unconfirmed Alert Dismissed",
                      actor: d.dismissedByUser.name,
                      details: `Alert dismissed for scheduled start at ${format(new Date(d.dismissedForScheduledAt), "h:mm a")}. (Reappears within 1h).`,
                      badgeText: "DISMISSED",
                      badgeClass: "badge-requested",
                    });
                  });

                  // Sort unified stream chronologically
                  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderLeft: "2px solid var(--brand-primary)", paddingLeft: "1.25rem", marginLeft: "0.5rem" }}>
                      {events.map((evt) => (
                        <div
                          key={evt.id}
                          style={{
                            padding: "0.6rem 0.85rem",
                            background: "rgba(255,255,255,0.02)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border-subtle)",
                            position: "relative",
                          }}
                        >
                          {/* Circle dot on border line */}
                          <div
                            style={{
                              position: "absolute",
                              left: "-1.62rem",
                              top: "0.85rem",
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: "var(--brand-primary)",
                              border: "2px solid var(--surface-card)",
                            }}
                          />

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span>{evt.icon}</span>
                              <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#fff" }}>{evt.title}</span>
                            </div>
                            {evt.badgeText && (
                              <span className={`badge ${evt.badgeClass}`} style={{ fontSize: "0.65rem", padding: "0.1rem 0.45rem" }}>
                                {evt.badgeText}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                            {format(evt.timestamp, "MMM d, yyyy h:mm:ss a")} • By: <strong>{evt.actor}</strong>
                          </div>

                          {evt.details && (
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.25)", padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)", whiteSpace: "pre-wrap" }}>
                              {evt.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
