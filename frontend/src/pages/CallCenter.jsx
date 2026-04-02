import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api/axios.js";
import Spinner from "../components/Spinner.jsx";
import ExportButtons from "../components/ExportButtons.jsx";

const OUTCOMES = [
  ["CONTACTED", "Contacted"],
  ["NO_ANSWER", "No answer"],
  ["CALLBACK_REQUESTED", "Callback requested"],
  ["RESCHEDULED", "Rescheduled"],
  ["ADJUSTED_DUE", "Adjusted due date / KM"],
  ["OTHER", "Other"],
];

export default function CallCenter() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState("");
  const [serviceRecordId, setServiceRecordId] = useState("");
  const [outcome, setOutcome] = useState("CONTACTED");
  const [notes, setNotes] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueKm, setNewDueKm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const vidNum = vehicleId ? Number(vehicleId) : null;

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const { data } = await api.get("/api/vehicles");
        if (!c) setVehicles(data);
      } catch (e) {
        toast.error(e.message);
      } finally {
        if (!c) setLoadingList(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const loadCalls = async () => {
    setLoadingList(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (vidNum && !Number.isNaN(vidNum)) params.vehicle_id = vidNum;
      const { data } = await api.get("/api/calls", { params });
      setHistory(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, [from, to]);

  const submit = async (e) => {
    e.preventDefault();
    if (!vidNum || Number.isNaN(vidNum)) {
      toast.error("Select a vehicle");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/calls", {
        vehicle_id: vidNum,
        service_record_id: serviceRecordId ? Number(serviceRecordId) : undefined,
        outcome,
        notes: notes.trim() || undefined,
        new_next_due_date: newDueDate || undefined,
        new_next_due_km: newDueKm !== "" ? Number(newDueKm) : undefined,
      });
      toast.success("Call logged");
      setNotes("");
      setNewDueDate("");
      setNewDueKm("");
      loadCalls();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const exportRows = useMemo(
    () =>
      history.map((r) => ({
        called_at: r.called_at,
        vehicle: r.vehicle_number,
        owner: r.owner_name,
        outcome: r.outcome,
        notes: r.notes || "",
        prev_due_date: r.previous_next_due_date || "",
        new_due_date: r.new_next_due_date || "",
        prev_km: r.previous_next_due_km ?? "",
        new_km: r.new_next_due_km ?? "",
        by: r.logged_by_username || "",
      })),
    [history]
  );

  if (loadingList && !history.length && !vehicles.length) {
    return <Spinner label="Loading…" />;
  }

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Customer care
          </p>
          <h1 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Call center &amp; due-date desk</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Log outreach, reschedule commitments, and adjust next due date / KM with full audit trail.
          </p>
        </div>
        <ExportButtons
          filenameBase={`call-records_${new Date().toISOString().slice(0, 10)}`}
          pdfTitle="Customer call register"
          rows={exportRows}
          sheetName="Calls"
        />
      </div>

      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
      >
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Log a call</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Updates sync to the active service line item and reminder window.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Vehicle *</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              required
            >
              <option value="">Select…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number} — {v.owner_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Service record ID (optional)</label>
            <input
              type="number"
              value={serviceRecordId}
              onChange={(e) => setServiceRecordId(e.target.value)}
              placeholder="Defaults to latest for vehicle"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Outcome *</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {OUTCOMES.map(([val, lab]) => (
                <option key={val} value={val}>
                  {lab}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">New next due date</label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">New next due (KM)</label>
            <input
              type="number"
              value={newDueKm}
              onChange={(e) => setNewDueKm(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              If only KM is set, calendar due is recalculated from last service + average km.
            </p>
          </div>
        </div>
        <div className="sticky bottom-0 z-10 flex justify-end border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:px-5">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 min-w-[10rem] items-center justify-center rounded-lg bg-bajaj-orange px-6 text-sm font-semibold text-white hover:bg-bajaj-dark disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save call log"}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Call history</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => loadCalls()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              Apply
            </button>
          </div>
        </div>
        <div className="max-h-[min(520px,calc(100dvh-14rem))] overflow-auto scrollbar-thin">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="whitespace-nowrap px-3 py-2">When</th>
                <th className="whitespace-nowrap px-3 py-2">Vehicle</th>
                <th className="whitespace-nowrap px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Notes</th>
                <th className="whitespace-nowrap px-3 py-2">Due Δ</th>
                <th className="whitespace-nowrap px-3 py-2">KM Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {history.map((r) => (
                <tr key={r.id} className="bg-white hover:bg-orange-50/20 dark:bg-slate-900/40 dark:hover:bg-slate-800/60">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-800 dark:text-slate-200">{r.called_at}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{r.vehicle_number}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{r.outcome}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-slate-600 dark:text-slate-400">{r.notes || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                    {r.previous_next_due_date || "—"} → {r.new_next_due_date || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                    {r.previous_next_due_km ?? "—"} → {r.new_next_due_km ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!history.length ? (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No calls in range.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
