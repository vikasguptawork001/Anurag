import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api/axios.js";
import Spinner from "../components/Spinner.jsx";
import { estimateNextDueDate, todayLocal } from "../lib/dates.js";

export default function AddService() {
  const [vehicles, setVehicles] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleId, setVehicleId] = useState(null);
  const [avgKm, setAvgKm] = useState(10);
  const [resolvedVehicle, setResolvedVehicle] = useState(null);
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newOwner, setNewOwner] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newAvgKm, setNewAvgKm] = useState(10);

  const [jobCardNo, setJobCardNo] = useState("");
  const [serviceDate, setServiceDate] = useState(todayLocal());
  const [odometerKm, setOdometerKm] = useState("");
  const [serviceType, setServiceType] = useState("PAID");
  const [workDone, setWorkDone] = useState("");
  const [partsReplaced, setPartsReplaced] = useState("");
  const [nextDueKm, setNextDueKm] = useState("");
  const [feedback, setFeedback] = useState("");
  const [followupDone, setFollowupDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/api/vehicles");
        if (!cancelled) setVehicles(data);
      } catch (e) {
        toast.error(e.message);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredVehicles = useMemo(() => {
    const q = vehicleNumber.trim().toUpperCase();
    if (!q) return vehicles.slice(0, 10);
    return vehicles
      .filter((v) => v.vehicle_number.includes(q) || v.owner_name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 10);
  }, [vehicles, vehicleNumber]);

  const effectiveAvg = showNewVehicle ? Number(newAvgKm) || 10 : Number(avgKm) || 10;
  const estimatedDue = estimateNextDueDate(
    serviceDate,
    odometerKm,
    nextDueKm,
    effectiveAvg
  );

  const resolveVehicle = async (num) => {
    const n = num.trim().toUpperCase();
    if (!n) {
      setVehicleId(null);
      setResolvedVehicle(null);
      setShowNewVehicle(false);
      return;
    }
    const local = vehicles.find((v) => v.vehicle_number === n);
    if (local) {
      setVehicleId(local.id);
      setAvgKm(Number(local.avg_daily_km) || 10);
      setResolvedVehicle(local);
      setShowNewVehicle(false);
      return;
    }
    try {
      const { data } = await api.get(`/api/vehicles/${encodeURIComponent(n)}`);
      setVehicleId(data.id);
      setAvgKm(Number(data.avg_daily_km) || 10);
      setResolvedVehicle(data);
      setShowNewVehicle(false);
    } catch {
      setVehicleId(null);
      setResolvedVehicle(null);
      setShowNewVehicle(true);
    }
  };

  const handleVehicleBlur = () => {
    resolveVehicle(vehicleNumber);
  };

  const pickVehicle = (v) => {
    setVehicleNumber(v.vehicle_number);
    setVehicleId(v.id);
    setAvgKm(Number(v.avg_daily_km) || 10);
    setResolvedVehicle(v);
    setShowNewVehicle(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const n = vehicleNumber.trim().toUpperCase();
    if (!n) {
      toast.error("Vehicle number is required");
      return;
    }

    let vid = vehicleId;
    let resolvedSnap = resolvedVehicle;
    if (!vid) {
      const local = vehicles.find((v) => v.vehicle_number === n);
      if (local) {
        vid = local.id;
        resolvedSnap = local;
        setVehicleId(local.id);
        setResolvedVehicle(local);
        setAvgKm(Number(local.avg_daily_km) || 10);
        setShowNewVehicle(false);
      } else {
        try {
          const { data } = await api.get(`/api/vehicles/${encodeURIComponent(n)}`);
          vid = data.id;
          resolvedSnap = data;
          setVehicleId(data.id);
          setResolvedVehicle(data);
          setAvgKm(Number(data.avg_daily_km) || 10);
          setShowNewVehicle(false);
        } catch {
          setShowNewVehicle(true);
        }
      }
    }

    if (!vid) {
      if (!newOwner.trim()) {
        toast.error("Owner name is required for new vehicle");
        return;
      }
      const km = Number(newAvgKm);
      if (Number.isNaN(km) || km <= 0) {
        toast.error("Average daily KM must be a positive number");
        return;
      }
    }

    if (!jobCardNo.trim()) {
      toast.error("Job card number is required");
      return;
    }
    if (!serviceDate) {
      toast.error("Service date is required");
      return;
    }
    const odo = Number(odometerKm);
    if (Number.isNaN(odo) || odo < 0) {
      toast.error("Odometer must be a valid non-negative number");
      return;
    }
    const nextKm = Number(nextDueKm);
    if (Number.isNaN(nextKm)) {
      toast.error("Next due KM is required");
      return;
    }

    if (vid && resolvedSnap && Number(avgKm) !== Number(resolvedSnap.avg_daily_km)) {
      try {
        await api.put(`/api/vehicles/${vid}/avg-km`, { avg_daily_km: Number(avgKm) });
        setResolvedVehicle((prev) => (prev ? { ...prev, avg_daily_km: Number(avgKm) } : prev));
      } catch (err) {
        toast.error(err.message);
        return;
      }
    }

    if (!vid) {
      try {
        const { data: created } = await api.post("/api/vehicles", {
          vehicle_number: n,
          owner_name: newOwner.trim(),
          owner_phone: newPhone.trim() || undefined,
          owner_address: newAddress.trim() || undefined,
          vehicle_model: newModel.trim() || undefined,
          avg_daily_km: Number(newAvgKm) || 10,
        });
        vid = created.id;
        setVehicleId(created.id);
        setResolvedVehicle(created);
        setShowNewVehicle(false);
        setVehicles((prev) => [created, ...prev.filter((x) => x.id !== created.id)]);
      } catch (err) {
        toast.error(err.message);
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.post("/api/services", {
        job_card_no: jobCardNo.trim(),
        vehicle_id: vid,
        service_date: serviceDate,
        odometer_km: odo,
        service_type: serviceType,
        work_done: workDone.trim() || undefined,
        parts_replaced: partsReplaced.trim() || undefined,
        next_due_km: nextKm,
        feedback: feedback.trim() || undefined,
        followup_call_done: followupDone,
      });
      toast.success("Service record saved");
      setJobCardNo("");
      setOdometerKm("");
      setWorkDone("");
      setPartsReplaced("");
      setNextDueKm("");
      setFeedback("");
      setFollowupDone(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingList) return <Spinner label="Loading vehicles…" />;

  return (
    <div className="mx-auto max-w-5xl pb-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Workshop</p>
          <h1 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Add service record</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Capture job card details and due-date logic in one pass.</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
      >
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Vehicle &amp; job</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Identify the vehicle, then enter the job card.</p>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
            <div className="lg:col-span-7">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Vehicle number *</label>
              <input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                onBlur={handleVehicleBlur}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 uppercase text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                placeholder="e.g. MH12AB1234"
                autoComplete="off"
              />
              {vehicleNumber.trim() && filteredVehicles.length > 0 && (
                <ul className="mt-2 max-h-32 overflow-auto rounded-lg border border-slate-200 bg-slate-50 text-sm scrollbar-thin dark:border-slate-600 dark:bg-slate-800">
                  {filteredVehicles.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => pickVehicle(v)}
                        className="flex w-full flex-col px-3 py-2 text-left hover:bg-orange-50 dark:hover:bg-slate-700"
                      >
                        <span className="font-medium text-slate-900 dark:text-slate-100">{v.vehicle_number}</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{v.owner_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {resolvedVehicle && !showNewVehicle && (
                <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Matched: {resolvedVehicle.owner_name} · {resolvedVehicle.vehicle_model || "—"}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/50 lg:col-span-5">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Estimated next due date</p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">From odometer, next due KM, avg km.</p>
              <p className="mt-2 text-lg font-bold tabular-nums text-bajaj-orange">{estimatedDue || "—"}</p>
            </div>
          </div>

          {showNewVehicle && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/30 sm:p-5">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">New vehicle</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Owner name *</label>
                  <input
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Model</label>
                  <input
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Address</label>
                  <textarea
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Avg daily KM *</label>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={newAvgKm}
                    onChange={(e) => setNewAvgKm(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Job card no. *</label>
              <input
                value={jobCardNo}
                onChange={(e) => setJobCardNo(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Service date *</label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Odometer (KM) *</label>
              <input
                type="number"
                min={0}
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Service type *</label>
              <div className="mt-2.5 flex h-11 items-center gap-6 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-600 dark:bg-slate-800/80">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="stype"
                    checked={serviceType === "FREE"}
                    onChange={() => setServiceType("FREE")}
                  />
                  Free
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="stype"
                    checked={serviceType === "PAID"}
                    onChange={() => setServiceType("PAID")}
                  />
                  Paid
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Work done</label>
              <textarea
                value={workDone}
                onChange={(e) => setWorkDone(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Parts replaced</label>
              <textarea
                value={partsReplaced}
                onChange={(e) => setPartsReplaced(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Next due (KM) *</label>
              <input
                type="number"
                value={nextDueKm}
                onChange={(e) => setNextDueKm(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Avg daily KM</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={showNewVehicle ? newAvgKm : avgKm}
                onChange={(e) =>
                  showNewVehicle ? setNewAvgKm(e.target.value) : setAvgKm(e.target.value)
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              {vehicleId && !showNewVehicle ? (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Updates vehicle if changed.</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Follow-up call done?</span>
            <div className="mt-2 flex flex-wrap items-center gap-6">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                <input
                  type="radio"
                  name="fu"
                  checked={followupDone === true}
                  onChange={() => setFollowupDone(true)}
                />
                Yes
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                <input
                  type="radio"
                  name="fu"
                  checked={followupDone === false}
                  onChange={() => setFollowupDone(false)}
                />
                No
              </label>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6">
          <p className="mr-auto hidden text-xs text-slate-500 dark:text-slate-400 sm:block">All required fields must be filled.</p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-bajaj-orange px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-bajaj-dark disabled:opacity-60 sm:h-10 sm:w-auto sm:min-w-[12rem]"
          >
            {submitting ? "Saving…" : "Save service record"}
          </button>
        </div>
      </form>
    </div>
  );
}
