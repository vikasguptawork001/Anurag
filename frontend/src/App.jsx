import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import Spinner from "./components/Spinner.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AddService from "./pages/AddService.jsx";
import VehicleHistory from "./pages/VehicleHistory.jsx";
import Reminders from "./pages/Reminders.jsx";
import Reports from "./pages/Reports.jsx";
import CallCenter from "./pages/CallCenter.jsx";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner label="Loading…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-slate-50 dark:bg-slate-950 md:flex-row">
      <Navbar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-8">
          <div className="mx-auto max-w-[1680px] text-slate-900 dark:text-slate-100">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-service" element={<AddService />} />
        <Route path="/vehicle-history" element={<VehicleHistory />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/calls" element={<CallCenter />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
