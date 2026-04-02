export default function ReminderCard({
  vehicleNumber,
  ownerName,
  phone,
  dueDate,
  daysLeft,
  urgency,
  onDismiss,
  dismissing,
  compact = false,
}) {
  const badge =
    urgency === "critical"
      ? "bg-red-100 text-red-800 border-red-200"
      : urgency === "soon"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

  const label =
    urgency === "critical"
      ? "≤3 days"
      : urgency === "soon"
        ? "≤7 days"
        : "Scheduled";

  const pad = compact ? "p-3 sm:p-3.5" : "p-4 sm:p-5";

  return (
    <div className={`rounded-lg border border-slate-200 bg-white shadow-sm ${pad}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-semibold text-slate-900 ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
              {vehicleNumber}
            </span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}>
              {label}
            </span>
          </div>
          <p className={`mt-1 text-slate-600 ${compact ? "text-xs" : "text-sm"}`}>{ownerName}</p>
          {phone ? (
            <a
              href={`tel:${phone}`}
              className={`mt-1 inline-block font-medium text-bajaj-orange hover:underline ${compact ? "text-xs" : "text-sm"}`}
            >
              {phone}
            </a>
          ) : null}
          <p className={`mt-2 text-slate-500 ${compact ? "text-xs" : "text-sm"}`}>
            Due: <span className="font-medium text-slate-800">{dueDate}</span>
            {daysLeft != null && (
              <span className="ml-2 tabular-nums">
                ({daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`})
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
              className="inline-flex h-10 w-full min-w-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50 sm:h-9 sm:min-w-[11rem] sm:px-4"
            >
              {dismissing ? "Updating…" : "Dismiss"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
