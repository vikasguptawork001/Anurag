export function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysToDateString(dateStr, daysFloat) {
  if (!dateStr || daysFloat == null || Number.isNaN(daysFloat)) return null;
  const d = new Date(dateStr + "T12:00:00");
  d.setTime(d.getTime() + daysFloat * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function estimateNextDueDate(serviceDate, odometerKm, nextDueKm, avgDailyKm) {
  const avg = Number(avgDailyKm) || 10;
  const odo = Number(odometerKm);
  const next = Number(nextDueKm);
  if (!serviceDate || Number.isNaN(odo) || Number.isNaN(next)) return null;
  const remaining = next - odo;
  if (remaining <= 0) return serviceDate;
  if (avg <= 0) return null;
  const daysUntilDue = remaining / avg;
  return addDaysToDateString(serviceDate, daysUntilDue);
}
