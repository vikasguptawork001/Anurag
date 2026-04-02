/** Display formatting for tables and reports (en-IN locale). */

export function formatDisplayDate(isoDate) {
  if (!isoDate) return "—";
  const s = String(isoDate).slice(0, 10);
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatKm(n) {
  if (n == null || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return `${num.toLocaleString("en-IN")} km`;
}
