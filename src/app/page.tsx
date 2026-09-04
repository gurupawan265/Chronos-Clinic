"use client";

import React, { useState } from "react";
import { trpc } from "./_trpc/client";
import { format } from "date-fns";
import Navbar from "../components/Navbar";
import StatCards from "../components/StatCards";
import AlertsBanner from "../components/AlertsBanner";
import DayScheduleGrid, { Slot } from "../components/DayScheduleGrid";
import AppointmentDetailDrawer from "../components/AppointmentDetailDrawer";
import AppointmentsDirectory from "../components/AppointmentsDirectory";
import BulkAvailabilityGenerator from "../components/BulkAvailabilityGenerator";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import {
  BookSlotModal,
  CreateSlotModal,
  EditSlotModal,
  EditPatientModal,
  ReassignProviderModal,
  CancelAppointmentModal,
} from "../components/Modals";
import {
  Calendar,
  List,
  Sparkles,
  BarChart3,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { data: session, isLoading: sessionLoading } = trpc.auth.getSession.useQuery();
  const { data: providers = [] } = trpc.auth.getProviders.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const isFrontDesk = session?.user?.role === "FRONT_DESK";
  const isProvider = session?.user?.role === "PROVIDER";

  // Tab State: Centerpiece is Schedule
  const [activeTab, setActiveTab] = useState<
    "schedule" | "appointments" | "bulk" | "analytics"
  >("schedule");

  // Selection state for Drawer & Modals
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);
  const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
  const [createSlotPrefill, setCreateSlotPrefill] = useState<{
    providerId?: string;
    time?: string;
  }>({});
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [editingPatientAppt, setEditingPatientAppt] = useState<any | null>(null);
  const [reassigningAppt, setReassigningAppt] = useState<any | null>(null);
  const [cancellingAppt, setCancellingAppt] = useState<any | null>(null);

  // Schedule filters
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [scheduleProviderFilter, setScheduleProviderFilter] = useState("");

  // Directory filters
  const [search, setSearch] = useState("");
  const [filterProviderId, setFilterProviderId] = useState("");
  const [filterStatus, setFilterStatus] = useState<any>("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [sortBy, setSortBy] = useState<"dateTime" | "status" | "provider">("dateTime");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  // Status feedback toast
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Queries
  const { data: stats, refetch: refetchStats } = trpc.dashboard.getStats.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  const { data: alertsData, refetch: refetchAlerts } =
    trpc.alert.getUnconfirmedAlerts.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const {
    data: slotsData = [],
    refetch: refetchSlots,
    isLoading: slotsLoading,
  } = trpc.slot.getAll.useQuery(
    {
      date: selectedScheduleDate || undefined,
      providerId: scheduleProviderFilter || undefined,
    },
    { enabled: !!session?.user }
  );

  const { data: appointmentsData, isLoading: appointmentsLoading } =
    trpc.appointment.list.useQuery(
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
      { enabled: !!session?.user && activeTab === "appointments" }
    );

  const {
    data: appointmentDetail,
    refetch: refetchDetail,
  } = trpc.appointment.getById.useQuery(
    { id: selectedAppointmentId! },
    { enabled: !!selectedAppointmentId }
  );

  // 2. Mutations
  const dismissAlertMutation = trpc.alert.dismiss.useMutation({
    onSuccess: () => {
      refetchAlerts();
      setActionSuccess("Alert dismissed.");
    },
    onError: (err) => setActionError(err.message),
  });

  const updateStatusMutation = trpc.appointment.updateStatus.useMutation({
    onSuccess: () => {
      refetchSlots();
      refetchStats();
      refetchAlerts();
      if (selectedAppointmentId) refetchDetail();
      setActionSuccess("Status updated successfully.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const updatePatientDetailsMutation = trpc.appointment.updatePatientDetails.useMutation({
    onSuccess: () => {
      refetchSlots();
      if (selectedAppointmentId) refetchDetail();
      setEditingPatientAppt(null);
      setActionSuccess("Patient details updated.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const reassignMutation = trpc.appointment.reassign.useMutation({
    onSuccess: () => {
      refetchSlots();
      if (selectedAppointmentId) refetchDetail();
      setReassigningAppt(null);
      setActionSuccess("Provider successfully reassigned.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const bookSlotMutation = trpc.appointment.bookSlot.useMutation({
    onSuccess: () => {
      refetchSlots();
      refetchStats();
      setBookingSlot(null);
      setActionSuccess("Slot successfully booked!");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const createSlotMutation = trpc.slot.create.useMutation({
    onSuccess: () => {
      refetchSlots();
      setShowCreateSlotModal(false);
      setActionSuccess("Availability slot created.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const updateSlotMutation = trpc.slot.update.useMutation({
    onSuccess: () => {
      refetchSlots();
      setEditingSlot(null);
      setActionSuccess("Slot updated.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const archiveSlotMutation = trpc.slot.archive.useMutation({
    onSuccess: () => {
      refetchSlots();
      setActionSuccess("Slot archived.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const restoreSlotMutation = trpc.slot.restore.useMutation({
    onSuccess: () => {
      refetchSlots();
      setActionSuccess("Slot restored.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const createNoteMutation = trpc.visitNote.create.useMutation({
    onSuccess: () => {
      if (selectedAppointmentId) refetchDetail();
      setActionSuccess("Clinical visit note appended.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const addSupportingProviderMutation = trpc.appointment.addSupportingProvider.useMutation({
    onSuccess: () => {
      if (selectedAppointmentId) refetchDetail();
      setActionSuccess("Supporting clinician added to care team.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const removeSupportingProviderMutation = trpc.appointment.removeSupportingProvider.useMutation({
    onSuccess: () => {
      if (selectedAppointmentId) refetchDetail();
      setActionSuccess("Supporting clinician removed.");
      setActionError(null);
    },
    onError: (err) => setActionError(err.message),
  });

  const [bulkResult, setBulkResult] = useState<{
    createdCount: number;
    skippedCount: number;
  } | null>(null);

  const bulkMutation = trpc.slot.bulkGenerate.useMutation({
    onSuccess: (data) => {
      setBulkResult(data);
      refetchSlots();
      setActionSuccess(
        `Bulk generation completed: ${data.createdCount} created, ${data.skippedCount} skipped.`
      );
    },
    onError: (err) => setActionError(err.message),
  });

  const exportCsvMutation = trpc.slot.exportDayScheduleCsv.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `chronos-schedule-${selectedScheduleDate}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setActionSuccess("Day schedule exported to CSV.");
    },
    onError: (err) => setActionError(err.message),
  });

  // Session guard
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold">Loading Chronos Clinic...</span>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-300">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center space-y-4 border border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center font-bold text-2xl">
            +
          </div>
          <h2 className="text-xl font-bold text-white">Access Required</h2>
          <p className="text-xs text-slate-400">
            Please log in with clinic credentials to access provider schedules and patient records.
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            Sign In to Chronos Clinic
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 relative">
      {/* Clinic Top Navigation */}
      <Navbar user={session.user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Flash Toast Notifications */}
        {actionError && (
          <div className="mb-5 p-4 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between shadow-lg shadow-rose-950/40 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>
                <strong>Server Notice:</strong> {actionError}
              </span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="p-1 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-xs flex items-center justify-between shadow-lg shadow-emerald-950/40 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="p-1 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. Urgency-Sorted Dismissible Alerts Banner */}
        {alertsData && alertsData.alerts.length > 0 && (
          <AlertsBanner
            alerts={alertsData.alerts as any}
            count={alertsData.count}
            onDismiss={(id) => dismissAlertMutation.mutate({ appointmentId: id })}
            onViewAppointment={(id) => setSelectedAppointmentId(id)}
            isDismissing={dismissAlertMutation.isLoading}
          />
        )}

        {/* 2. Headline Stat Cards */}
        <StatCards stats={stats?.headline} />

        {/* 3. Navigation Tabs: Centerpiece is Schedule */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "schedule"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                  : "bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500/50 hover:shadow-sm active:scale-95"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>
                {isFrontDesk ? "Day Schedule Grid" : "My Provider Schedule"}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("appointments")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "appointments"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                  : "bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500/50 hover:shadow-sm active:scale-95"
              }`}
            >
              <List className="w-4 h-4" />
              <span>Appointments Directory</span>
            </button>

            <button
              onClick={() => setActiveTab("bulk")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "bulk"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                  : "bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500/50 hover:shadow-sm active:scale-95"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Availability</span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "analytics"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                  : "bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500/50 hover:shadow-sm active:scale-95"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics & Trends</span>
            </button>
          </div>

          <button
            onClick={() => {
              setCreateSlotPrefill({
                providerId: isProvider ? session.user.id : providers[0]?.id || "",
                time: "09:00",
              });
              setShowCreateSlotModal(true);
            }}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900/90 hover:bg-indigo-950/80 text-slate-200 hover:text-indigo-300 text-xs sm:text-sm font-bold rounded-xl border border-slate-700/80 hover:border-indigo-500/60 transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>+ Create Availability Slot</span>
          </button>
        </div>

        {/* TAB 1: THE CENTERPIECE: DAY SCHEDULE GRID */}
        {activeTab === "schedule" && (
          <DayScheduleGrid
            slots={slotsData as any}
            providers={providers}
            selectedDate={selectedScheduleDate}
            onDateChange={setSelectedScheduleDate}
            selectedProviderId={scheduleProviderFilter}
            onProviderChange={setScheduleProviderFilter}
            isFrontDesk={isFrontDesk}
            currentUserId={session.user.id}
            onSelectAppointment={(id) => setSelectedAppointmentId(id)}
            onBookSlot={(slot) => setBookingSlot(slot)}
            onEditSlot={(slot) => setEditingSlot(slot)}
            onArchiveSlot={(id) => archiveSlotMutation.mutate({ id })}
            onRestoreSlot={(id) => restoreSlotMutation.mutate({ id })}
            onCreateSlotAtTime={(providerId, time) => {
              setCreateSlotPrefill({ providerId, time });
              setShowCreateSlotModal(true);
            }}
            onExportCsv={() =>
              exportCsvMutation.mutate({
                date: selectedScheduleDate,
                providerId: scheduleProviderFilter || undefined,
              })
            }
            onRefresh={() => refetchSlots()}
            isExporting={exportCsvMutation.isLoading}
          />
        )}

        {/* TAB 2: APPOINTMENTS DIRECTORY */}
        {activeTab === "appointments" && (
          <AppointmentsDirectory
            appointments={(appointmentsData?.items as any) || []}
            total={appointmentsData?.totalCount || 0}
            page={page}
            pageSize={8}
            totalPages={appointmentsData?.totalPages || 1}
            search={search}
            onSearchChange={setSearch}
            filterProviderId={filterProviderId}
            onFilterProviderChange={setFilterProviderId}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            startDate={startDateFilter}
            onStartDateChange={setStartDateFilter}
            endDate={endDateFilter}
            onEndDateChange={setEndDateFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            onPageChange={setPage}
            providers={providers}
            onSelectAppointment={(id) => setSelectedAppointmentId(id)}
            isLoading={appointmentsLoading}
          />
        )}

        {/* TAB 3: BULK AVAILABILITY GENERATION */}
        {activeTab === "bulk" && (
          <BulkAvailabilityGenerator
            providers={providers}
            isFrontDesk={isFrontDesk}
            currentUserId={session.user.id}
            onGenerate={(data) => bulkMutation.mutate(data)}
            isLoading={bulkMutation.isLoading}
            result={bulkResult}
          />
        )}

        {/* TAB 4: ANALYTICS & 8-WEEK NO-SHOW TREND */}
        {activeTab === "analytics" && <AnalyticsDashboard stats={stats as any} />}
      </main>

      {/* =========================================================================
          SIDE PANEL / DRAWER: APPOINTMENT DETAILS (Keeps Day-Grid underneath!)
          ========================================================================= */}
      <AppointmentDetailDrawer
        appointment={appointmentDetail as any}
        isOpen={!!selectedAppointmentId}
        onClose={() => setSelectedAppointmentId(null)}
        isFrontDesk={isFrontDesk}
        isProvider={isProvider}
        currentUserId={session.user.id}
        providers={providers}
        onUpdateStatus={(id, toStatus) =>
          updateStatusMutation.mutate({ appointmentId: id, toStatus: toStatus as any })
        }
        onOpenCancelModal={(appt) => setCancellingAppt(appt)}
        onOpenEditPatient={(appt) => setEditingPatientAppt(appt)}
        onOpenReassign={(appt) => setReassigningAppt(appt)}
        onAddSupportingProvider={(apptId, provId) =>
          addSupportingProviderMutation.mutate({ appointmentId: apptId, providerId: provId })
        }
        onRemoveSupportingProvider={(assignmentId) =>
          removeSupportingProviderMutation.mutate({ assignmentId })
        }
        onCreateNote={(apptId, content) =>
          createNoteMutation.mutate({ appointmentId: apptId, content })
        }
        isUpdatingStatus={updateStatusMutation.isLoading}
        isAddingSupporting={addSupportingProviderMutation.isLoading}
        isRemovingSupporting={removeSupportingProviderMutation.isLoading}
        isCreatingNote={createNoteMutation.isLoading}
      />

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      {/* 1. Book Slot Modal */}
      <BookSlotModal
        slot={bookingSlot}
        isOpen={!!bookingSlot}
        onClose={() => setBookingSlot(null)}
        onBook={(slotId, patientName, patientContact) =>
          bookSlotMutation.mutate({ slotId, patientName, patientContact })
        }
        isLoading={bookSlotMutation.isLoading}
      />

      {/* 2. Create Availability Slot Modal */}
      <CreateSlotModal
        isOpen={showCreateSlotModal}
        onClose={() => setShowCreateSlotModal(false)}
        providers={providers}
        isFrontDesk={isFrontDesk}
        currentUserId={session.user.id}
        defaultProviderId={createSlotPrefill.providerId}
        defaultDate={selectedScheduleDate}
        defaultTime={createSlotPrefill.time}
        onCreateSlot={(data) => createSlotMutation.mutate(data)}
        isLoading={createSlotMutation.isLoading}
      />

      {/* 3. Edit Slot Modal */}
      <EditSlotModal
        slot={editingSlot}
        isOpen={!!editingSlot}
        onClose={() => setEditingSlot(null)}
        onSave={(data) =>
          updateSlotMutation.mutate({
            id: data.slotId,
            date: data.date,
            startTime: data.startTime,
            durationMinutes: data.durationMinutes,
          })
        }
        isLoading={updateSlotMutation.isLoading}
      />

      {/* 4. Edit Patient Details Modal */}
      <EditPatientModal
        appointment={editingPatientAppt}
        isOpen={!!editingPatientAppt}
        onClose={() => setEditingPatientAppt(null)}
        onSave={(id, name, contact) =>
          updatePatientDetailsMutation.mutate({
            appointmentId: id,
            patientName: name,
            patientContact: contact,
          })
        }
        isLoading={updatePatientDetailsMutation.isLoading}
      />

      {/* 5. Reassign Provider Modal */}
      <ReassignProviderModal
        appointment={reassigningAppt}
        isOpen={!!reassigningAppt}
        onClose={() => setReassigningAppt(null)}
        providers={providers}
        onReassign={(id, newProviderId) =>
          reassignMutation.mutate({ appointmentId: id, newProviderId })
        }
        isLoading={reassignMutation.isLoading}
      />

      {/* 6. Cancel Appointment Modal (with Mandatory Reason) */}
      <CancelAppointmentModal
        appointment={cancellingAppt}
        isOpen={!!cancellingAppt}
        onClose={() => setCancellingAppt(null)}
        onCancel={(id, reason) => {
          updateStatusMutation.mutate(
            { appointmentId: id, toStatus: "CANCELLED", cancellationReason: reason },
            {
              onSuccess: () => setCancellingAppt(null),
            }
          );
        }}
        isLoading={updateStatusMutation.isLoading}
      />
    </div>
  );
}
