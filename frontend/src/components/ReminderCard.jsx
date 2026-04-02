export default function ReminderCard({
  vehicleNumber,
  ownerName,
  phone,
  dueDate,
  daysLeft,
  daysLeftCalendar,
  daysLeftKmTrack,
  urgency,
  onDismiss,
  dismissing,
  compact = false,
}) {
  const badge =
    urgency === "critical"
      ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800"
      : urgency === "soon"
        ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800"
        : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600";

  const label =
    urgency === "critical"
      ? "≤3 days"
      : urgency === "soon"
        ? "≤7 days"
        : "Scheduled";

  const pad = compact ? "p-3 sm:p-3.5" : "p-4 sm:p-5";
  const cal = daysLeftCalendar != null ? daysLeftCalendar : daysLeft;
  const kmD = daysLeftKmTrack;

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60 ${pad}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-semibold text-slate-900 dark:text-white ${compact ? "text-sm" : "text-base sm:text-lg"}`}
            >
              {vehicleNumber}
            </span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}>
              {label}
            </span>
          </div>
          <p className={`mt-1 text-slate-600 dark:text-slate-300 ${compact ? "text-xs" : "text-sm"}`}>{ownerName}</p>
          {phone ? (
            <a
              href={`tel:${phone}`}
              className={`mt-1 inline-block font-medium text-bajaj-orange hover:underline ${compact ? "text-xs" : "text-sm"}`}
            >
              {phone}
            </a>
          ) : null}
          <p className={`mt-2 text-slate-500 dark:text-slate-400 ${compact ? "text-xs" : "text-sm"}`}>
            Due: <span className="font-medium text-slate-800 dark:text-slate-100">{dueDate}</span>
            {cal != null && (
              <span className="ml-2 tabular-nums">
                (cal: {cal < 0 ? `${Math.abs(cal)}d overdue` : `${cal}d`})
              </span>
            )}
            {kmD != null && (
              <span className="ml-2 tabular-nums text-slate-600 dark:text-slate-400">
                · km track: {kmD < 0 ? `${Math.abs(kmD)}d overdue` : `${kmD}d`}
              </span>
            )}
          </p>
        </div>
        {onDismiss ? (
          <div className="flex w-full shrink-0 justify-end sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={onDismiss}
              disabled={dismissing}
              className="inline-flex h-10 w-full min-w-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:h-9 sm:min-w-[11rem] sm:px-4"
            >
              {dismissing ? "Updating…" : "Dismiss"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
