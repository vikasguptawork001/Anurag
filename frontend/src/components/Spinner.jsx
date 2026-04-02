export default function Spinner({ label = "Loading…", className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 sm:h-12 sm:w-12 animate-spin rounded-full border-2 border-bajaj-orange border-t-transparent" />
      {label ? (
        <span className="text-sm sm:text-base text-slate-600">{label}</span>
      ) : null}
    </div>
  );
}
