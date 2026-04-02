export default function ServiceTable({
  rows,
  emptyMessage = "No service records yet.",
  /** Keeps the dashboard compact — scroll inside the table instead of the whole page */
  scrollClassName = "max-h-[min(360px,calc(100dvh-17rem))]",
}) {
  if (!rows?.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/80">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recent service register
          </h3>
        </div>
        <p className="px-4 py-10 text-center text-sm text-slate-600 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-5 dark:border-slate-700 dark:bg-slate-800/80">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Recent service register
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Latest entries (most recent first)</p>
      </div>
      <div className={`min-h-0 overflow-auto scrollbar-thin ${scrollClassName}`}>
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <th scope="col" className="whitespace-nowrap px-4 py-2.5 sm:px-5">
                Vehicle
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-2.5 sm:px-5">
                Job card
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-2.5 sm:px-5">
                Service date
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-2.5 text-right sm:px-5">
                Odometer
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-2.5 sm:px-5">
                Type
              </th>
              <th scope="col" className="hidden min-w-[12rem] lg:table-cell whitespace-nowrap px-4 py-2.5 sm:px-5">
                Work performed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr
                key={r.id}
                className="bg-white odd:bg-slate-50/60 transition-colors hover:bg-orange-50/50 dark:bg-slate-900/30 dark:odd:bg-slate-900/50 dark:hover:bg-slate-800/80"
              >
                <td className="align-top px-4 py-2.5 sm:px-5">
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{r.vehicle_number}</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-600 dark:text-slate-400">{r.owner_name}</span>
                </td>
                <td className="align-top whitespace-nowrap px-4 py-2.5 font-mono text-sm text-slate-800 dark:text-slate-200 sm:px-5">
                  {r.job_card_no}
                </td>
                <td className="align-top whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300 sm:px-5">
                  {r.service_date}
                </td>
                <td className="align-top whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-800 dark:text-slate-200 sm:px-5">
                  {(r.odometer_km?.toLocaleString?.("en-IN") ?? r.odometer_km) + " km"}
                </td>
                <td className="align-top whitespace-nowrap px-4 py-2.5 sm:px-5">
                  <span
                    className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                      r.service_type === "FREE"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
                        : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                    }`}
                  >
                    {r.service_type}
                  </span>
                </td>
                <td className="hidden max-w-md align-top px-4 py-2.5 text-slate-600 dark:text-slate-400 lg:table-cell sm:px-5">
                  <span className="line-clamp-2">{r.work_done || "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
