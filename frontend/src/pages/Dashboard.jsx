import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api/axios.js";
import Spinner from "../components/Spinner.jsx";
import StatsCard from "../components/StatsCard.jsx";
import ServiceTable from "../components/ServiceTable.jsx";
import ReminderCard from "../components/ReminderCard.jsx";
import ExportButtons from "../components/ExportButtons.jsx";

function urgencyFromDays(daysLeft) {
  if (daysLeft == null) return "scheduled";
  if (daysLeft < 0 || daysLeft <= 3) return "critical";
  if (daysLeft <= 7) return "soon";
  return "scheduled";
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: res } = await api.get("/api/dashboard/stats");
        if (!cancelled) setData(res);
      } catch (e) {
        toast.error(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recentExportRows = useMemo(
    () =>
      (data?.recentServices ?? []).map((r) => ({
        vehicle: r.vehicle_number,
        owner: r.owner_name,
        job_card: r.job_card_no,
        service_date: r.service_date,
        odometer_km: r.odometer_km,
        type: r.service_type,
        work_done: r.work_done ?? "",
      })),
    [data?.recentServices]
  );

  const upcomingExportRows = useMemo(
    () =>
      (data?.upcomingReminders ?? []).map((r) => ({
        vehicle: r.vehicle_number,
        owner: r.owner_name,
        phone: r.owner_phone ?? "",
        due_date: r.next_due_date,
        days_left: r.days_left,
        days_calendar: r.days_left_calendar,
        days_km_track: r.days_left_km_track,
        job_card: r.job_card_no,
      })),
    [data?.upcomingReminders]
  );

  if (loading) return <Spinner label="Loading dashboard…" />;

  return (
    <div className="flex min-h-0 flex-col gap-5 lg:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Overview
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl lg:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Service activity and upcoming work at a glance.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <Link
            to="/add-service"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-bajaj-orange px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-bajaj-dark sm:h-10 sm:min-w-[10.5rem]"
          >
            Add service
          </Link>
          <Link
            to="/vehicle-history"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:h-10 sm:min-w-[10.5rem]"
          >
            Vehicle lookup
          </Link>
          <Link
            to="/reports"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:h-10 sm:min-w-[10.5rem]"
          >
            Reports
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard
          title="Total Vehicles"
          value={data?.totalVehicles ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h8m-8 5h12M4 7h.01M4 12h.01M4 17h.01" />
            </svg>
          }
        />
        <StatsCard
          title="Services This Month"
          value={data?.servicesThisMonth ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatsCard
          title="Pending Reminders"
          value={data?.pendingReminders ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
        />
        <StatsCard
          title="Calls This Month"
          value={data?.callsThisMonth ?? 0}
          subtitle="Customer call logs"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
        />
        <StatsCard
          title="Follow-up Calls Due"
          value={data?.followupDue ?? 0}
          subtitle="Pending follow-up"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
        />
      </section>

      <section className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">Recent services</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Last 10 records</p>
            </div>
            <ExportButtons
              rows={recentExportRows}
              filenameBase={`dashboard_recent_${new Date().toISOString().slice(0, 10)}`}
              pdfTitle="Recent services"
              sheetName="Recent"
              className="justify-end"
            />
          </div>
          <div className="min-h-0 flex-1">
            <ServiceTable rows={data?.recentServices} emptyMessage="No services recorded yet." />
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">Upcoming reminders</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Calendar &amp; km track · 7-day window</p>
            </div>
            <ExportButtons
              rows={upcomingExportRows}
              filenameBase={`dashboard_upcoming_${new Date().toISOString().slice(0, 10)}`}
              pdfTitle="Upcoming reminders"
              sheetName="Upcoming"
              className="justify-end"
            />
          </div>
          <div className="flex min-h-0 max-h-[min(360px,calc(100dvh-17rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Queue</p>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 scrollbar-thin sm:p-4">
              {!data?.upcomingReminders?.length ? (
                <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-400">No reminders in this window.</p>
              ) : (
                data.upcomingReminders.map((r) => (
                  <ReminderCard
                    key={r.reminder_id}
                    vehicleNumber={r.vehicle_number}
                    ownerName={r.owner_name}
                    phone={r.owner_phone}
                    dueDate={r.next_due_date}
                    daysLeft={r.days_left}
                    daysLeftCalendar={r.days_left_calendar}
                    daysLeftKmTrack={r.days_left_km_track}
                    urgency={urgencyFromDays(r.days_left)}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
