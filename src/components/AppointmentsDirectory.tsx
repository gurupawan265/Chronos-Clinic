import React from "react";
import { format } from "date-fns";
import StatusBadge from "./StatusBadge";
import {
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  User,
  Phone,
  FileText,
} from "lucide-react";

interface AppointmentItem {
  id: string;
  patientName: string;
  patientContact: string;
  status: string;
  slot: {
    id: string;
    date: string | Date;
    startTime: string;
    durationMinutes: number;
  };
  schedulingProvider: {
    id: string;
    name: string;
  };
}

interface AppointmentsDirectoryProps {
  appointments: AppointmentItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  onSearchChange: (search: string) => void;
  filterProviderId: string;
  onFilterProviderChange: (id: string) => void;
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  sortBy: "dateTime" | "status" | "provider";
  onSortByChange: (sort: "dateTime" | "status" | "provider") => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (order: "asc" | "desc") => void;
  onPageChange: (page: number) => void;
  providers: Array<{ id: string; name: string }>;
  onSelectAppointment: (id: string) => void;
  isLoading?: boolean;
}

export default function AppointmentsDirectory({
  appointments,
  total,
  page,
  pageSize,
  totalPages,
  search,
  onSearchChange,
  filterProviderId,
  onFilterProviderChange,
  filterStatus,
  onFilterStatusChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onPageChange,
  providers,
  onSelectAppointment,
  isLoading = false,
}: AppointmentsDirectoryProps) {
  return (
    <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      {/* 1. Filter and Search Bar */}
      <div className="p-5 border-b border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Text Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by patient name..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-900/90 text-slate-200 text-sm pl-10 pr-4 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500"
            />
          </div>

          {/* Quick Stats Pill */}
          <div className="text-xs font-semibold text-slate-400">
            Found <strong className="text-white">{total}</strong> total matches
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Provider Filter */}
          <select
            value={filterProviderId}
            onChange={(e) => onFilterProviderChange(e.target.value)}
            className="bg-slate-900 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value)}
            className="bg-slate-900 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="REQUESTED">Requested</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="COMPLETED">Completed</option>
            <option value="NO_SHOW">No Show</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Date Range Filters */}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-slate-900 text-slate-300 text-xs px-2.5 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-slate-900 text-slate-300 text-xs px-2.5 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Clear filters button if active */}
          {(search || filterProviderId || filterStatus || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                onFilterProviderChange("");
                onFilterStatusChange("");
                onStartDateChange("");
                onEndDateChange("");
              }}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 2. Appointments Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th
                onClick={() => {
                  if (sortBy === "dateTime") {
                    onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    onSortByChange("dateTime");
                    onSortOrderChange("asc");
                  }
                }}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Date & Time</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Patient</th>
              <th
                onClick={() => {
                  if (sortBy === "provider") {
                    onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    onSortByChange("provider");
                    onSortOrderChange("asc");
                  }
                }}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Lead Provider</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => {
                  if (sortBy === "status") {
                    onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    onSortByChange("status");
                    onSortOrderChange("asc");
                  }
                }}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  No appointments found matching your search and filter criteria.
                </td>
              </tr>
            ) : (
              appointments.map((appt) => (
                <tr
                  key={appt.id}
                  onClick={() => onSelectAppointment(appt.id)}
                  className="hover:bg-slate-850/50 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 font-medium text-white">
                    <div className="font-semibold text-slate-200">
                      {format(new Date(appt.slot.date), "MMM d, yyyy")}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {appt.slot.startTime} ({appt.slot.durationMinutes}m)
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {appt.patientName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {appt.patientContact}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-300">
                      {appt.schedulingProvider.name}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={appt.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAppointment(appt.id);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-all"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, total)} of {total} records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-white px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
