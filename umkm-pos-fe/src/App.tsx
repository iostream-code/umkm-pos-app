import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import {
  useAuthStore,
  selectIsAuthenticated,
  selectUser,
  selectHydrated,
} from '@/stores/authStore'

// Layouts
import AppLayout from '@/components/layout/AppLayout'
import AuthLayout from '@/components/layout/AuthLayout'

// Pages
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import PosPage from '@/pages/pos/PosPage'
import ProductsPage from '@/pages/products/ProductsPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import DiscountsPage from '@/pages/discounts/DiscountsPage'
import OrdersPage from '@/pages/orders/OrdersPage'
import ShiftsPage from '@/pages/shifts/ShiftsPage'
import StockPage from '@/pages/stock/StockPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import UsersPage from '@/pages/users/UsersPage'
import StorePage from '@/pages/store/StorePage'

// ── Loading screen saat hydration ────────────────────────────────
function HydrationLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center animate-pulse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </div>
        <p className="text-surface-500 text-sm">Memuat SmartPOS...</p>
      </div>
    </div>
  )
}

// ── Route Guards ──────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore(selectHydrated)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  // Tunggu Zustand selesai baca localStorage — jangan render apapun dulu
  if (!hydrated) return <HydrationLoader />

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireRole({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const user = useAuthStore(selectUser)
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore(selectHydrated)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  // Tunggu hydration juga di sini — mencegah flash ke login lalu redirect ke dashboard
  if (!hydrated) return <HydrationLoader />

  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// ── Router ────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Guest */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={<GuestOnly><LoginPage /></GuestOnly>}
          />
        </Route>

        {/* Protected */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="shifts" element={<ShiftsPage />} />

          <Route path="products"
            element={<RequireRole roles={['owner', 'manager']}><ProductsPage /></RequireRole>}
          />
          <Route path="customers"
            element={<RequireRole roles={['owner', 'manager']}><CustomersPage /></RequireRole>}
          />
          <Route path="discounts"
            element={<RequireRole roles={['owner', 'manager']}><DiscountsPage /></RequireRole>}
          />
          <Route path="stock"
            element={<RequireRole roles={['owner', 'manager']}><StockPage /></RequireRole>}
          />
          <Route path="reports"
            element={<RequireRole roles={['owner', 'manager']}><ReportsPage /></RequireRole>}
          />
          <Route path="users"
            element={<RequireRole roles={['owner']}><UsersPage /></RequireRole>}
          />
          <Route path="store"
            element={<RequireRole roles={['owner']}><StorePage /></RequireRole>}
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
