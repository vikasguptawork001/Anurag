import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api/axios.js";
import Spinner from "../components/Spinner.jsx";
import ExportButtons from "../components/ExportButtons.jsx";
import { formatDisplayDate } from "../lib/format.js";

const OUTCOMES = [
  ["CONTACTED", "Contacted"],
  ["NO_ANSWER", "No answer"],
  ["CALLBACK_REQUESTED", "Callback requested"],
  ["RESCHEDULED", "Rescheduled"],
  ["ADJUSTED_DUE", "Adjusted due date / KM"],
  ["OTHER", "Other"],
];

const OUTCOME_LABEL = Object.fromEntries(OUTCOMES);

const TABS = [
  { id: "log", label: "Log call" },
  { id: "calls", label: "Call register" },
  { id: "services", label: "Service history" },
];

export default function CallCenter() {
  const [tab, setTab] = useState("log");
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState("");
  const [serviceRecordId, setServiceRecordId] = useState("");
  const [outcome, setOutcome] = useState("CONTACTED");
  const [notes, setNotes] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueKm, setNewDueKm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [calls, setCalls] = useState([]);
  const [serviceRows, setServiceRows] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editingCall, setEditingCall] = useState(null);
  const [savingCall, setSavingCall] = useState(false);
  const [archivingCallId, setArchivingCallId] = useState(null);

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
        if (!c) setLoadingVehicles(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const loadCalls = async () => {
    setLoadingCalls(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (vidNum && !Number.isNaN(vidNum)) params.vehicle_id = vidNum;
      const { data } = await api.get("/api/calls", { params });
      setCalls(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingCalls(false);
    }
  };

  useEffect(() => {
    if (tab === "calls") loadCalls();
  }, [from, to, tab, vehicleId]);

  useEffect(() => {
    let cancelled = false;
    if (tab !== "services" || !vidNum || Number.isNaN(vidNum)) {
      setServiceRows([]);
      return () => {
        cancelled = true;
      };
    }
    setLoadingServices(true);
    (async () => {
      try {
        const { data } = await api.get(`/api/services/${vidNum}`);
        if (!cancelled) setServiceRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) toast.error(e.message);
      } finally {
        if (!cancelled) setLoadingServices(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, vehicleId, vidNum]);

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

  const saveCallEdit = async (e) => {
    e.preventDefault();
    if (!editingCall) return;
    setSavingCall(true);
    try {
      await api.patch(`/api/calls/${editingCall.id}`, {
        outcome: editingCall.outcome,
        notes: editingCall.notes?.trim() || null,
      });
      toast.success("Call updated");
      setEditingCall(null);
      loadCalls();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingCall(false);
    }
  };

  const archiveCall = async (row) => {
    if (!window.confirm("Archive this call log entry? It stays in the database for compliance but hidden from lists.")) {
      return;
    }
    setArchivingCallId(row.id);
    try {
      await api.put(`/api/calls/${row.id}/archive`);
      toast.success("Call archived");
      loadCalls();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setArchivingCallId(null);
    }
  };

  const exportRows = useMemo(
    () =>
      calls.map((r) => ({
        called_at: r.called_at,
        vehicle: r.vehicle_number,
        owner: r.owner_name,
        outcome: OUTCOME_LABEL[r.outcome] ?? r.outcome,
        notes: r.notes || "",
        prev_due_date: r.previous_next_due_date || "",
        new_due_date: r.new_next_due_date || "",
        prev_km: r.previous_next_due_km ?? "",
        new_km: r.new_next_due_km ?? "",
        by: r.logged_by_username || "",
      })),
    [calls]
  );

  const selectedVeh = vehicles.find((v) => String(v.id) === String(vehicleId));

  const formatWhen = (iso) => {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return String(iso);
    }
  };

  if (loadingVehicles) {
    return <Spinner label="Loading…" />;
  }

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md dark:border-slate-600">
        <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200/90">Operations</p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">Call center</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Log outreach with a full audit trail, review the call register in a table, and open matching service history
              for the selected vehicle.
            </p>
          </div>
          <ExportButtons
            filenameBase={`call-records_${new Date().toISOString().slice(0, 10)}`}
            pdfTitle="Customer call register"
            rows={exportRows}
            sheetName="Calls"
            className="sm:shrink-0"
          />
        </div>
        <div className="flex gap-1 border-t border-white/10 bg-black/20 px-2 py-2 sm:px-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
                tab === t.id
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/50 sm:px-5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
          Context vehicle
        </label>
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="mt-1.5 w-full max-w-xl rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">All vehicles / pick for log…</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_number} — {v.owner_name}
            </option>
          ))}
        </select>
        {selectedVeh ? (
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            {selectedVeh.owner_phone ? (
              <a href={`tel:${selectedVeh.owner_phone}`} className="font-semibold text-bajaj-orange hover:underline">
                {selectedVeh.owner_phone}
              </a>
            ) : (
              "No phone on file"
            )}
            {selectedVeh.vehicle_model ? ` · ${selectedVeh.vehicle_model}` : ""}
          </p>
        ) : null}
      </div>

      {tab === "log" ? (
        <form
          onSubmit={submit}
          className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Log a call</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a vehicle above (required). Optional service record ID defaults to the latest open line for that
              vehicle.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Service record ID (optional)</label>
              <input
                type="number"
                value={serviceRecordId}
                onChange={(e) => setServiceRecordId(e.target.value)}
                placeholder="Latest for vehicle if empty"
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
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
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
              disabled={submitting || !vehicleId}
              className="inline-flex h-10 min-w-[10rem] items-center justify-center rounded-lg bg-bajaj-orange px-6 text-sm font-semibold text-white hover:bg-bajaj-dark disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save call log"}
            </button>
          </div>
        </form>
      ) : null}

      {tab === "calls" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Call register</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filter by vehicle (context strip) and date range. Use row actions to correct notes or archive a row.
              </p>
            </div>
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
                Refresh
              </button>
            </div>
          </div>
          <div className="max-h-[min(560px,calc(100dvh-14rem))] overflow-auto scrollbar-thin">
            {loadingCalls ? (
              <div className="flex justify-center py-16">
                <Spinner label="Loading calls…" />
              </div>
            ) : !calls.length ? (
              <p className="py-14 text-center text-sm text-slate-500 dark:text-slate-400">No calls match the filters.</p>
            ) : (
              <table className="min-w-[920px] w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2.5">When</th>
                    <th className="whitespace-nowrap px-3 py-2.5">Vehicle</th>
                    <th className="whitespace-nowrap px-3 py-2.5">Owner</th>
                    <th className="whitespace-nowrap px-3 py-2.5">Outcome</th>
                    <th className="min-w-[12rem] px-3 py-2.5">Notes</th>
                    <th className="whitespace-nowrap px-3 py-2.5">Due date Δ</th>
                    <th className="whitespace-nowrap px-3 py-2.5">Due km Δ</th>
                    <th className="whitespace-nowrap px-3 py-2.5">Logged by</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {calls.map((r) => (
                    <tr
                      key={r.id}
                      className="bg-white hover:bg-orange-50/30 dark:bg-slate-900/30 dark:hover:bg-slate-800/50"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-slate-800 dark:text-slate-200">
                        {formatWhen(r.called_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {r.vehicle_number}
                      </td>
                      <td className="max-w-[8rem] truncate px-3 py-2 text-slate-700 dark:text-slate-300">
                        {r.owner_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                          {OUTCOME_LABEL[r.outcome] ?? r.outcome}
                        </span>
                      </td>
                      <td className="max-w-xs px-3 py-2 align-top text-xs text-slate-600 dark:text-slate-400">
                        {r.notes || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {r.previous_next_due_date || "—"} → {r.new_next_due_date || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {r.previous_next_due_km ?? "—"} → {r.new_next_due_km ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                        {r.logged_by_username || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingCall({ ...r })}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={archivingCallId === r.id}
                            onClick={() => archiveCall(r)}
                            className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                          >
                            {archivingCallId === r.id ? "…" : "Archive"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}

      {tab === "services" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Service history (read-only)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose a vehicle in the context strip to load its workshop register. Edit or archive records from Vehicle
              history.
            </p>
          </div>
          <div className="max-h-[min(520px,calc(100dvh-14rem))] overflow-auto scrollbar-thin">
            {!vehicleId ? (
              <p className="py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                Select a vehicle to load service history.
              </p>
            ) : loadingServices ? (
              <div className="flex justify-center py-16">
                <Spinner label="Loading services…" />
              </div>
            ) : !serviceRows.length ? (
              <p className="py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                No service records for this vehicle.
              </p>
            ) : (
              <table className="min-w-[880px] w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2.5">Job card</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5 text-right">Odo</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="min-w-[10rem] px-3 py-2.5">Work</th>
                    <th className="px-3 py-2.5 text-right">Next km</th>
                    <th className="px-3 py-2.5">Next due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {serviceRows.map((r) => (
                    <tr key={r.id} className="dark:bg-slate-900/20">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.job_card_no}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatDisplayDate(r.service_date)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{r.odometer_km}</td>
                      <td className="whitespace-nowrap px-3 py-2">{r.service_type}</td>
                      <td className="max-w-md px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{r.work_done || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {r.next_due_km != null ? Number(r.next_due_km).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{formatDisplayDate(r.next_due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}

      {editingCall ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal
        >
          <form
            onSubmit={saveCallEdit}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-900"
          >
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Edit call log</h3>
              <p className="text-xs text-slate-500">{editingCall.vehicle_number}</p>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Outcome</label>
                <select
                  value={editingCall.outcome}
                  onChange={(e) => setEditingCall((c) => ({ ...c, outcome: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  {OUTCOMES.map(([val, lab]) => (
                    <option key={val} value={val}>
                      {lab}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Notes</label>
                <textarea
                  rows={4}
                  value={editingCall.notes || ""}
                  onChange={(e) => setEditingCall((c) => ({ ...c, notes: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setEditingCall(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCall}
                className="rounded-lg bg-bajaj-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingCall ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
