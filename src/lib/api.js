import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: "application/json" },
});

// Attach the saved token, unless the request set its own
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// An expired or revoked token sends the user back to the login page
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    if (error.response?.status === 401 && !url.includes("/login")) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const get = (url, params) => api.get(url, { params }).then((r) => r.data);

export function errMsg(e) {
  const d = e?.response?.data;
  if (d?.errors) return Object.values(d.errors).flat()[0];
  return d?.message || e?.message || "Something went wrong. Please try again.";
}
