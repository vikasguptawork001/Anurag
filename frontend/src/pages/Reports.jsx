import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api/axios.js";
import Spinner from "../components/Spinner.jsx";
import ExportButtons from "../components/ExportButtons.jsx";

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Reports() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(todayISODate);
  const [overview, setOverview] = useState(null);
  const [services, setServices] = useState([]);
  const [calls, setCalls] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ov, sv, cl, rm] = await Promise.all([
        api.get("/api/reports/overview"),
        api.get("/api/reports/services", { params: { from, to } }),
        api.get("/api/reports/calls", { params: { from, to } }),
        api.get("/api/reports/reminders-open"),
      ]);
      setOverview(ov.data);
      setServices(sv.data);
      setCalls(cl.data);
      setReminders(rm.data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const svcRows = useMemo(
    () =>
      services.map((r) => ({
        job_card: r.job_card_no,
        vehicle: r.vehicle_number,
        owner: r.owner_name,
        date: r.service_date,
        odometer: r.odometer_km,
        type: r.service_type,
        next_due_km: r.next_due_km,
        next_due_date: r.next_due_date,
      })),
    [services]
  );

  const callRows = useMemo(
    () =>
      calls.map((r) => ({
        at: r.called_at,
        vehicle: r.vehicle_number,
        outcome: r.outcome,
        notes: r.notes || "",
        new_due: r.new_next_due_date || "",
        new_km: r.new_next_due_km ?? "",
      })),
    [calls]
  );

  const remRows = useMemo(
    () =>
      reminders.map((r) => ({
        vehicle: r.vehicle_number,
        owner: r.owner_name,
        phone: r.owner_phone || "",
        reminder_date: r.reminder_date,
        calendar_due: r.next_due_date,
        days_cal: r.days_left_calendar,
        days_km: r.days_left_km_track,
        km_left: r.km_remaining,
        avg_km_day: r.avg_daily_km,
      })),
    [reminders]
  );

  if (loading && !overview) return <Spinner label="Loading reports…" />;

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Intelligence
          </p>
          <h1 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Reports &amp; exports</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Operational dashboards with PDF and Excel hand-off for management.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-0.5 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-0.5 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={() => loadAll()}
            className="h-10 rounded-lg bg-bajaj-orange px-4 text-sm font-semibold text-white hover:bg-bajaj-dark"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
        {[
          ["summary", "Summary"],
          ["services", "Services"],
          ["calls", "Calls"],
          ["reminders", "Reminders queue"],
        ].map(([id, lab]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
              tab === id
                ? "bg-bajaj-orange text-white shadow"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {lab}
          </button>
        ))}
      </div>

      {tab === "summary" && overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Vehicles on file", overview.totalVehicles],
            ["Total services", overview.totalServices],
            ["Calls logged", overview.totalCalls],
            ["Open reminders", overview.pendingReminders],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{v}</p>
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Services by month (12 mo)</h2>
              <ExportButtons
                filenameBase={`report_services-by-month_${todayISODate()}`}
                pdfTitle="Services by month"
                rows={overview.servicesByMonth || []}
                sheetName="ByMonth"
              />
            </div>
            <div className="max-h-60 overflow-auto scrollbar-thin">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="py-2">Month</th>
                    <th className="py-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.servicesByMonth || []).map((row) => (
                    <tr key={row.ym} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 text-slate-800 dark:text-slate-200">{row.ym}</td>
                      <td className="py-2 tabular-nums text-slate-900 dark:text-slate-100">{row.cnt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "services" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Service register ({svcRows.length})</h2>
            <ExportButtons
              filenameBase={`report_services_${from}_${to}`}
              pdfTitle="Service register"
              rows={svcRows}
              sheetName="Services"
            />
          </div>
          <div className="max-h-[min(560px,calc(100dvh-14rem))] overflow-auto scrollbar-thin p-2">
            <table className="min-w-full text-xs sm:text-sm" id="reports-services-table">
              <thead className="sticky top-0 bg-slate-100 text-left dark:bg-slate-800">
                <tr>
                  {["Job", "Vehicle", "Owner", "Date", "Odo", "Type", "Next km", "Next date"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 font-semibold text-slate-600 dark:text-slate-300">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {services.map((r) => (
                  <tr key={r.id} className="dark:bg-slate-900/30">
                    <td className="px-2 py-1.5 font-mono text-slate-900 dark:text-slate-100">{r.job_card_no}</td>
                    <td className="px-2 py-1.5 text-slate-800 dark:text-slate-200">{r.vehicle_number}</td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.owner_name}</td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.service_date}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-800 dark:text-slate-200">{r.odometer_km}</td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.service_type}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-800 dark:text-slate-200">{r.next_due_km}</td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.next_due_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "calls" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Call archive ({callRows.length})</h2>
            <ExportButtons
              filenameBase={`report_calls_${from}_${to}`}
              pdfTitle="Call archive"
              rows={callRows}
              sheetName="Calls"
            />
          </div>
          <div className="max-h-[min(560px,calc(100dvh-14rem))] overflow-auto scrollbar-thin p-2">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                <tr>
                  {["At", "Vehicle", "Outcome", "Notes", "New due", "New km"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {calls.map((r) => (
                  <tr key={r.id}>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.called_at}</td>
                    <td className="px-2 py-1.5 text-slate-900 dark:text-slate-100">{r.vehicle_number}</td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.outcome}</td>
                    <td className="max-w-xs truncate px-2 py-1.5 text-slate-600 dark:text-slate-400">{r.notes || "—"}</td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.new_next_due_date || "—"}</td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.new_next_due_km ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "reminders" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Open reminders — dual track (calendar &amp; km) ({remRows.length})
            </h2>
            <ExportButtons
              filenameBase={`report_reminders_open_${todayISODate()}`}
              pdfTitle="Open reminders"
              rows={remRows}
              sheetName="Reminders"
            />
          </div>
          <div className="max-h-[min(560px,calc(100dvh-14rem))] overflow-auto scrollbar-thin p-2">
            <table className="min-w-[900px] w-full text-xs sm:text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                <tr>
                  {["Vehicle", "Owner", "Remind on", "Due date", "Days (cal)", "Days (km)", "Km left", "Avg/day"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reminders.map((r) => (
                  <tr key={r.reminder_id}>
                    <td className="px-2 py-1.5 font-medium text-slate-900 dark:text-slate-100">{r.vehicle_number}</td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.owner_name}</td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.reminder_date}</td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.next_due_date}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-800 dark:text-slate-200">{r.days_left_calendar}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-800 dark:text-slate-200">{r.days_left_km_track}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-800 dark:text-slate-200">{r.km_remaining}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-700 dark:text-slate-300">{r.avg_daily_km}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
