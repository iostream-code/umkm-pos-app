import axios from "axios";
import toast from "react-hot-toast";
import tokenManager from "./tokenManager";

const api = axios.create({
  baseURL: "https://api-umkm-pos-be.hexaverse.biz.id/api/v1",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  withCredentials: true,
});

// ── Request interceptor ───────────────────────────────────────────
// tokenManager.get() selalu sync dan up-to-date
// Token diset oleh authStore.login() sebelum navigate dipanggil
api.interceptors.request.use((config) => {
  const token = tokenManager.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor ──────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401) {
      tokenManager.clear();
      localStorage.removeItem("smartpos_auth");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (status === 403) {
      toast.error("Akses ditolak. Anda tidak memiliki izin untuk aksi ini.");
      return Promise.reject(error);
    }

    if (status === 422) {
      return Promise.reject(error);
    }

    if (status === 404) {
      toast.error("Data tidak ditemukan.");
      return Promise.reject(error);
    }

    if (status >= 500) {
      toast.error("Terjadi kesalahan server. Coba beberapa saat lagi.");
      return Promise.reject(error);
    }

    if (message) {
      toast.error(message);
    }

    return Promise.reject(error);
  },
);

export default api;
