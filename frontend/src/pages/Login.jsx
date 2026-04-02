import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!password) {
      toast.error("Password is required");
      return;
    }
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      toast.success("Welcome back");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-10 sm:px-6 lg:px-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur dark:border-slate-600 dark:bg-slate-900/95 sm:p-8 lg:p-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-bajaj-orange sm:text-3xl">
              Bajaj Service Center
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              Sign in to manage vehicles and services
            </p>
          </div>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Username
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-bajaj-orange focus:outline-none focus:ring-2 focus:ring-bajaj-orange/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-bajaj-orange focus:outline-none focus:ring-2 focus:ring-bajaj-orange/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-bajaj-orange py-3 text-sm font-semibold text-white shadow-md transition hover:bg-bajaj-dark disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Demo: admin / admin123 (after running seed)
        </p>
      </div>
    </div>
  );
}
