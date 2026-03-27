import api from "@/lib/axios";
import type {
  Product,
  Category,
  Customer,
  Order,
  Shift,
  Discount,
  DashboardData,
  Paginated,
  User,
  Store,
} from "@/types";

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
  changePassword: (data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }) => api.put("/auth/password", data),
};

// ── Store ─────────────────────────────────────────────────────────
export const storeApi = {
  get: () => api.get<{ store: Store }>("/store"),
  update: (data: FormData) =>
    api.post("/store?_method=PUT", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ── Products ──────────────────────────────────────────────────────
export const productApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Product>>("/products", { params }),
  show: (id: string) => api.get<{ product: Product }>(`/products/${id}`),
  create: (data: FormData) =>
    api.post("/products", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: string, data: FormData) =>
    api.post(`/products/${id}?_method=PUT`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  delete: (id: string) => api.delete(`/products/${id}`),
  stockHistory: (id: string) => api.get(`/products/${id}/stock-history`),
};

// ── Categories ────────────────────────────────────────────────────
export const categoryApi = {
  list: () => api.get<{ data: Category[] }>("/categories"),
  create: (data: Partial<Category>) => api.post("/categories", data),
  update: (id: string, data: Partial<Category>) =>
    api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// ── Customers ─────────────────────────────────────────────────────
export const customerApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Customer>>("/customers", { params }),
  show: (id: string) => api.get<{ customer: Customer }>(`/customers/${id}`),
  orders: (id: string) => api.get(`/customers/${id}/orders`),
  create: (data: Partial<Customer>) => api.post("/customers", data),
  update: (id: string, data: Partial<Customer>) =>
    api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

// ── Discounts ─────────────────────────────────────────────────────
export const discountApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Discount>>("/discounts", { params }),
  create: (data: Partial<Discount>) => api.post("/discounts", data),
  update: (id: string, data: Partial<Discount>) =>
    api.put(`/discounts/${id}`, data),
  delete: (id: string) => api.delete(`/discounts/${id}`),
  validate: (code: string, subtotal: number) =>
    api.post("/discounts/validate", { code, subtotal }),
};

// ── Orders ────────────────────────────────────────────────────────
export const orderApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Order>>("/orders", { params }),
  show: (id: string) => api.get<{ order: Order }>(`/orders/${id}`),
  create: (data: unknown) =>
    api.post<{ order: Order; message: string }>("/orders", data),
  cancel: (id: string, reason: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
  refund: (id: string, data: { reason: string; amount: number }) =>
    api.post(`/orders/${id}/refund`, data),
  receipt: (id: string) => api.get(`/orders/${id}/receipt`),
};

// ── Shifts ────────────────────────────────────────────────────────
export const shiftApi = {
  active: () =>
    api.get<{ shift: Shift | null; is_open: boolean }>("/shifts/active"),
  open: (opening_cash: number) => api.post("/shifts/open", { opening_cash }),
  close: (id: string, data: { closing_cash: number; notes?: string }) =>
    api.post(`/shifts/${id}/close`, data),
  history: (params?: Record<string, unknown>) =>
    api.get("/shifts/history", { params }),
};

// ── Stock ─────────────────────────────────────────────────────────
export const stockApi = {
  lowStock: (params?: Record<string, unknown>) =>
    api.get("/stock/low", { params }),
  adjustment: (data: {
    product_id: string;
    quantity: number;
    type: string;
    notes: string;
  }) => api.post("/stock/adjustment", data),
  movements: (params?: Record<string, unknown>) =>
    api.get("/stock/movements", { params }),
};

// ── Dashboard ─────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get<DashboardData>("/dashboard"),
};

// ── Reports ───────────────────────────────────────────────────────
export const reportApi = {
  sales: (params?: Record<string, unknown>) =>
    api.get("/reports/sales", { params }),
  products: (params?: Record<string, unknown>) =>
    api.get("/reports/products", { params }),
  customers: (params?: Record<string, unknown>) =>
    api.get("/reports/customers", { params }),
  export: (params?: Record<string, unknown>) =>
    api.get("/reports/export/sales", { params, responseType: "blob" }),
};

// ── Users ─────────────────────────────────────────────────────────
export const userApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<User>>("/users", { params }),
  show: (id: string) => api.get<{ user: User }>(`/users/${id}`),
  create: (data: Partial<User> & { password: string }) =>
    api.post("/users", data),
  update: (id: string, data: Partial<User> & { password?: string }) =>
    api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// ── Analytics (Python Django service via Laravel proxy) ───────────
// Laravel memproxy request ke Python agar frontend tidak perlu
// tahu URL service Python secara langsung
export const analyticsApi = {
  // Dashboard summary dengan data dari Python
  dashboard: (storeId: string) =>
    api.get("/dashboard", { params: { store_id: storeId } }),

  // Prediksi stok ML
  stockForecast: (storeId: string) =>
    api.get("/analytics/stock-forecast", { params: { store_id: storeId } }),
};
