import { Outlet } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-surface-950 flex">

      {/* Left panel — hanya desktop */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-surface-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
            <ShoppingCart size={20} className="text-white" />
          </div>
          <span className="font-display text-xl font-bold text-white">SmartPOS</span>
        </div>
        <div>
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Sistem Kasir<br />Modern untuk UMKM
          </h2>
          <p className="text-surface-400 text-lg">
            Kelola transaksi, stok, dan laporan bisnis Anda dalam satu platform.
          </p>
        </div>
        <p className="text-surface-600 text-sm">© 2026 SmartPOS. Portofolio Project.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <Outlet />
      </div>
    </div>
  )
}