export default function StatsCard({ title, value, subtitle, icon }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition hover:shadow-md sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{title}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 sm:text-3xl">{value}</p>
          {subtitle ? <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{subtitle}</p> : null}
        </div>
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-bajaj-orange sm:h-10 sm:w-10">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
