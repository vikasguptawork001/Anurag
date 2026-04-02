import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api/axios.js";
import Spinner from "../components/Spinner.jsx";
import ReminderCard from "../components/ReminderCard.jsx";

function urgencyFromDays(daysLeft) {
  if (daysLeft == null) return "scheduled";
  if (daysLeft < 0 || daysLeft <= 3) return "critical";
  if (daysLeft <= 7) return "soon";
  return "scheduled";
}

const filters = [
  { id: "all", label: "All" },
  { id: "week", label: "Due this week" },
  { id: "overdue", label: "Overdue" },
];

export default function Reminders() {
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/reminders", { params: { filter } });
      const sorted = [...data].sort((a, b) => {
        const da = new Date(a.next_due_date);
        const db = new Date(b.next_due_date);
        return da - db;
      });
      setRows(sorted);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const dismiss = async (id) => {
    if (
      !window.confirm(
        "Mark this reminder as called / dismissed? This cannot be undone from the list."
      )
    ) {
      return;
    }
    setDismissingId(id);
    try {
      await api.put(`/api/reminders/${id}/dismiss`);
      toast.success("Reminder dismissed");
      setRows((prev) => prev.filter((r) => r.reminder_id !== id));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Follow-up</p>
          <h1 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">Reminders</h1>
          <p className="mt-1 text-sm text-slate-600">Nearest due dates first.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[20rem] sm:items-end">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-right">Filter</p>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`inline-flex h-9 min-w-[5.5rem] items-center justify-center rounded-lg px-3 text-xs font-semibold transition sm:text-sm ${
                  filter === f.id
                    ? "bg-bajaj-orange text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading reminders…" />
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Reminder list</p>
            <span className="text-xs tabular-nums text-slate-500">{rows.length} item{rows.length === 1 ? "" : "s"}</span>
          </div>
          <div className="max-h-[min(520px,calc(100dvh-13rem))] overflow-y-auto overscroll-contain p-3 sm:p-4 scrollbar-thin">
            {!rows.length ? (
              <p className="py-12 text-center text-sm text-slate-600">No reminders for this filter.</p>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <ReminderCard
                    key={r.reminder_id}
                    vehicleNumber={r.vehicle_number}
                    ownerName={r.owner_name}
                    phone={r.owner_phone}
                    dueDate={r.next_due_date}
                    daysLeft={r.days_left}
                    urgency={urgencyFromDays(r.days_left)}
                    onDismiss={() => dismiss(r.reminder_id)}
                    dismissing={dismissingId === r.reminder_id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
