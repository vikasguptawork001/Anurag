import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const linkClass = ({ isActive }) =>
  [
    "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition sm:px-4",
    isActive
      ? "bg-bajaj-orange text-white shadow-sm"
      : "text-slate-700 hover:bg-orange-50 hover:text-bajaj-dark",
  ].join(" ");

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/add-service", label: "Add Service" },
  { to: "/vehicle-history", label: "Vehicle History" },
  { to: "/reminders", label: "Reminders" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    setOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:hidden">
        <span className="text-lg font-bold text-bajaj-orange">Bajaj Service</span>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-[min(100%,18rem)] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 md:static md:z-auto md:h-[100dvh] md:w-56 md:min-h-0 md:shrink-0 md:shadow-none lg:w-60 xl:w-64",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="hidden shrink-0 border-b border-slate-100 px-4 py-4 md:block md:px-5">
          <p className="text-lg font-bold text-bajaj-orange">Bajaj Service</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">Service Center</p>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3 md:p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 border-t border-slate-100 p-3 md:p-4">
          <p className="truncate px-2 text-xs text-slate-500">Signed in as</p>
          <p className="truncate px-2 text-sm font-medium text-slate-800">{user?.username}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
