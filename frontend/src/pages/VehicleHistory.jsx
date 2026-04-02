import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import html2pdf from "html2pdf.js";
import { api } from "../api/axios.js";
import ServiceHistoryPdfTemplate from "../components/pdf/ServiceHistoryPdfTemplate.jsx";
import Spinner from "../components/Spinner.jsx";
import { formatDisplayDate, formatKm } from "../lib/format.js";

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
    </svg>
  );
}

export default function VehicleHistory() {
  const pdfTemplateRef = useRef(null);
  const [pdfGeneratedAtIso, setPdfGeneratedAtIso] = useState(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const { data } = await api.get("/api/vehicles", { params: { q: q.trim() } });
        if (!cancelled) setResults(data);
      } catch (e) {
        toast.error(e.message);
      } finally {
        if (!cancelled) setSearching(false);
      }
    };
    const t = setTimeout(run, 320);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    setPdfGeneratedAtIso(null);
  }, [selected?.id]);

  const loadHistory = async (vehicle) => {
    setSelected(vehicle);
    setLoadingHistory(true);
    try {
      const { data } = await api.get(`/api/services/${vehicle.id}`);
      setHistory(data);
    } catch (e) {
      toast.error(e.message);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const exportPdf = () => {
    if (!selected || !history.length) return;
    if (!window.confirm("Generate a PDF of this vehicle’s complete service history register?")) {
      return;
    }
    setExporting(true);
    setPdfGeneratedAtIso(new Date().toISOString());
    window.setTimeout(() => {
      const el = pdfTemplateRef.current;
      if (!el) {
        toast.error("PDF template not ready");
        setExporting(false);
        return;
      }
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Service-History_${selected.vehicle_number}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        pagebreak: { mode: ["css", "legacy"] },
      };
      html2pdf()
        .set(opt)
        .from(el)
        .save()
        .then(() => setExporting(false))
        .catch(() => {
          toast.error("Could not generate PDF");
          setExporting(false);
        });
    }, 120);
  };

  const clearSearch = () => {
    setQ("");
    setResults([]);
  };

  return (
    <div className="flex min-h-0 flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] xl:items-start xl:gap-6">
      {selected && history.length > 0 ? (
        <div
          className="fixed left-[-12000px] top-0 z-[-1]"
          style={{ width: "1123px" }}
          aria-hidden
        >
          <ServiceHistoryPdfTemplate
            ref={pdfTemplateRef}
            vehicle={selected}
            records={history}
            generatedAtIso={pdfGeneratedAtIso}
          />
        </div>
      ) : null}

      <div className="min-w-0 space-y-4 xl:sticky xl:top-0">
        <header className="border-b border-slate-200 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Records</p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Vehicle service history
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Search, open a register — on large screens the register stays beside lookup to reduce scrolling.
          </p>
        </header>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900">Vehicle lookup</h2>
            <p className="text-xs text-slate-500">Registration or owner name</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="relative">
              <label htmlFor="vehicle-search" className="sr-only">
                Search vehicles
              </label>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="vehicle-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Registration no. or owner name"
                autoComplete="off"
                className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-11 pr-20 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-bajaj-orange focus:outline-none focus:ring-2 focus:ring-bajaj-orange/20"
              />
              <div className="absolute inset-y-0 right-1 flex items-center">
                {q ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            {searching && q.trim() ? (
              <p className="mt-2 text-xs font-medium text-slate-500">Searching…</p>
            ) : null}

            {!q.trim() ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-6 text-center text-sm text-slate-600">
                Type to search the vehicle directory.
              </p>
            ) : null}

            {q.trim() && !searching && results.length === 0 ? (
              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm text-slate-700">
                No matches — try another term.
              </p>
            ) : null}

            {q.trim() && results.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-100 px-3 py-2 sm:px-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Results ({results.length})
                  </p>
                </div>
                <div className="max-h-[min(280px,calc(100dvh-22rem))] overflow-auto scrollbar-thin">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-white shadow-sm">
                      <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                        <th className="whitespace-nowrap px-3 py-2 sm:px-4">Reg.</th>
                        <th className="whitespace-nowrap px-3 py-2 sm:px-4">Owner</th>
                        <th className="hidden whitespace-nowrap px-3 py-2 sm:table-cell sm:px-4">Phone</th>
                        <th className="whitespace-nowrap px-3 py-2 text-right sm:px-4"> </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((v) => (
                        <tr
                          key={v.id}
                          className={`transition-colors hover:bg-orange-50/60 ${
                            selected?.id === v.id ? "bg-orange-50/90" : ""
                          }`}
                        >
                          <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums text-slate-900 sm:px-4">
                            {v.vehicle_number}
                          </td>
                          <td className="max-w-[10rem] truncate px-3 py-2 text-slate-800 sm:px-4">{v.owner_name}</td>
                          <td className="hidden whitespace-nowrap px-3 py-2 text-slate-700 sm:table-cell sm:px-4">
                            {v.owner_phone || "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right sm:px-4">
                            <button
                              type="button"
                              onClick={() => loadHistory(v)}
                              className="inline-flex h-8 min-w-[6.5rem] items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 shadow-sm hover:border-bajaj-orange hover:text-bajaj-dark"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="min-h-0 min-w-0 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-5.5rem)] xl:overflow-hidden">
        {!selected ? (
          <div className="flex h-full min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center xl:min-h-[min(420px,calc(100dvh-8rem))]">
            <div>
              <p className="text-sm font-medium text-slate-700">No vehicle selected</p>
              <p className="mt-1 text-xs text-slate-500">Search and tap Open to load the register here.</p>
            </div>
          </div>
        ) : (
          <div className="flex max-h-[min(720px,calc(100dvh-6rem))] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md xl:max-h-[calc(100dvh-5.5rem)]">
            <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-4 text-white sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200/90">
                    Vehicle register
                  </p>
                  <h2 className="mt-1 truncate text-xl font-bold sm:text-2xl">{selected.vehicle_number}</h2>
                  <p className="mt-0.5 text-xs text-slate-300">Chronological service history</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={exportPdf}
                    disabled={exporting || !history.length}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[11rem]"
                  >
                    {exporting ? "Preparing PDF…" : "Export PDF"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 lg:grid-cols-4">
              {[
                { k: "Owner", v: selected.owner_name },
                { k: "Contact", v: selected.owner_phone || "—" },
                { k: "Model", v: selected.vehicle_model || "—" },
                {
                  k: "Avg. km/day",
                  v:
                    selected.avg_daily_km != null
                      ? `${Number(selected.avg_daily_km).toLocaleString("en-IN")} km`
                      : "—",
                },
              ].map((cell) => (
                <div key={cell.k} className="bg-white px-3 py-2.5 sm:px-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{cell.k}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{cell.v}</p>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2 sm:px-6">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Service register</h3>
            </div>

            {loadingHistory ? (
              <div className="flex min-h-[8rem] items-center justify-center p-6">
                <Spinner label="Loading…" />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
                {!history.length ? (
                  <p className="p-8 text-center text-sm text-slate-600">No service records for this vehicle.</p>
                ) : (
                  <table className="min-w-[1000px] w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
                      <tr className="border-b border-slate-200">
                        <th className="sticky left-0 z-20 whitespace-nowrap border-r border-slate-200 bg-slate-100 px-2 py-2 text-center">
                          #
                        </th>
                        <th className="whitespace-nowrap px-2 py-2">Job card</th>
                        <th className="whitespace-nowrap px-2 py-2">Date</th>
                        <th className="whitespace-nowrap px-2 py-2 text-right">Odo</th>
                        <th className="whitespace-nowrap px-2 py-2">Type</th>
                        <th className="min-w-[8rem] px-2 py-2">Work</th>
                        <th className="min-w-[8rem] px-2 py-2">Parts</th>
                        <th className="whitespace-nowrap px-2 py-2 text-right">Next km</th>
                        <th className="whitespace-nowrap px-2 py-2">Due</th>
                        <th className="min-w-[6rem] px-2 py-2">Feedback</th>
                        <th className="whitespace-nowrap px-2 py-2">F/U</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.map((row, idx) => (
                        <tr key={row.id} className="border-b border-slate-100 bg-white hover:bg-orange-50/30">
                          <td className="sticky left-0 z-[1] whitespace-nowrap border-r border-slate-200 bg-white px-2 py-2 text-center text-xs font-semibold tabular-nums text-slate-700">
                            {idx + 1}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 font-mono text-xs text-slate-900">{row.job_card_no}</td>
                          <td className="whitespace-nowrap px-2 py-2 text-slate-800">
                            {formatDisplayDate(row.service_date)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-slate-800">
                            {formatKm(row.odometer_km)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2">
                            <span
                              className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                row.service_type === "FREE"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-amber-200 bg-amber-50 text-amber-900"
                              }`}
                            >
                              {row.service_type}
                            </span>
                          </td>
                          <td className="max-w-[14rem] px-2 py-2 align-top text-xs text-slate-700">{row.work_done || "—"}</td>
                          <td className="max-w-[14rem] px-2 py-2 align-top text-xs text-slate-700">
                            {row.parts_replaced || "—"}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-slate-800">
                            {row.next_due_km != null ? Number(row.next_due_km).toLocaleString("en-IN") : "—"}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-slate-800">
                            {formatDisplayDate(row.next_due_date)}
                          </td>
                          <td className="max-w-[10rem] px-2 py-2 align-top text-xs text-slate-700">{row.feedback || "—"}</td>
                          <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-800">
                            {row.followup_call_done ? (
                              <span className="font-semibold text-emerald-700">Done</span>
                            ) : (
                              <span className="font-semibold text-amber-800">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2 text-center text-[10px] text-slate-500 sm:px-6">
              Bajaj Service Center — for official use only
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
