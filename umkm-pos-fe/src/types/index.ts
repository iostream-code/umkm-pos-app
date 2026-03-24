// src/types/index.ts
// Semua TypeScript interface yang mencerminkan struktur API Laravel

// ── Auth ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "owner" | "manager" | "cashier";
  avatar: string | null;
  is_active: boolean;
  last_login_at: string | null;
  store: Store;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  logo: string | null;
  currency: string;
  timezone: string;
  receipt_footer: string | null;
  is_active: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// ── Product ───────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  children?: Category[];
  parent?: Category | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  image: string | null;
  price: number;
  cost_price: number;
  margin: number;
  stock: number;
  min_stock: number;
  unit: string;
  track_stock: boolean;
  is_active: boolean;
  is_low_stock: boolean;
  category: Pick<Category, "id" | "name"> | null;
  created_at: string;
  updated_at: string;
}

// ── Customer ──────────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  birth_date: string | null;
  total_transactions: number;
  total_spent: number;
  loyalty_points: number;
  last_transaction_at: string | null;
  created_at: string;
}

// ── Discount ──────────────────────────────────────────────────────
export interface Discount {
  id: string;
  name: string;
  code: string | null;
  type: "percentage" | "fixed";
  value: number;
  min_purchase: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
}

// ── Order / Transaksi ─────────────────────────────────────────────
export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

export interface OrderDiscount {
  name: string;
  code: string | null;
  amount: number;
}

export interface Payment {
  method: string;
  amount: number;
  status: string;
  reference: string | null;
  paid_at: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  status: "pending" | "completed" | "cancelled" | "refunded";
  subtotal: number;
  discount_amount: number;
  tax_percentage: number;
  tax_amount: number;
  total: number;
  payment_method: string;
  amount_paid: number;
  change_amount: number;
  notes: string | null;
  cancel_reason: string | null;
  cashier: Pick<User, "id" | "name"> | null;
  customer: Pick<Customer, "id" | "name" | "phone"> | null;
  items: OrderItem[];
  discounts: OrderDiscount[];
  payments: Payment[];
  created_at: string;
}

// ── Shift ─────────────────────────────────────────────────────────
export interface Shift {
  id: string;
  user_id: string;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  total_sales: number;
  total_cash_sales: number;
  total_non_cash_sales: number;
  total_transactions: number;
  status: "open" | "closed";
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  user?: Pick<User, "id" | "name">;
}

// ── Dashboard ─────────────────────────────────────────────────────
export interface DashboardSummary {
  today_revenue: number;
  today_orders: number;
  revenue_growth: number;
  new_customers: number;
  low_stock_count: number;
}

export interface WeeklySale {
  date: string;
  orders: number;
  revenue: number;
}

export interface TopProduct {
  product_name: string;
  total_qty: number;
  total_revenue: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  weekly_sales: WeeklySale[];
  top_products: TopProduct[];
  low_stock: Pick<Product, "id" | "name" | "stock" | "min_stock" | "unit">[];
}

// ── Keranjang POS (state lokal, bukan dari API) ───────────────────
export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  subtotal: number;
}

// ── API Pagination wrapper ────────────────────────────────────────
export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

// ── API Generic response ──────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}
