import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    if (
      err.response?.status === 401 &&
      typeof url === "string" &&
      !url.includes("/api/auth/login")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    const msg =
      (err.response?.data && (err.response.data.error || err.response.data.message)) ||
      err.message ||
      "Something went wrong";
    return Promise.reject(new Error(msg));
  }
);
