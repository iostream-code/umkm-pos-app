import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Menu, Package, AlertTriangle, ChevronRight, X } from 'lucide-react'
import { useAuthStore, selectUser } from '@/stores/authStore'
import { useStockAlert } from '@/hooks/useStockAlert'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pos': 'Kasir',
  '/orders': 'Transaksi',
  '/products': 'Produk',
  '/customers': 'Pelanggan',
  '/discounts': 'Diskon',
  '/stock': 'Manajemen Stok',
  '/reports': 'Laporan',
  '/users': 'Karyawan',
  '/store': 'Pengaturan Toko',
  '/shifts': 'Shift',
}

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore(selectUser)
  const title = TITLES[pathname] ?? 'SmartPOS'

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { lowStockProducts, lowStockCount, hasAlert } = useStockAlert()

  // Tutup dropdown kalau klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Tutup dropdown saat navigasi
  useEffect(() => {
    setDropdownOpen(false)
  }, [pathname])

  const handleGoToStock = () => {
    setDropdownOpen(false)
    navigate('/stock')
  }

  return (
    <header className="h-[60px] bg-white border-b border-surface-100 flex items-center px-4 lg:px-6 gap-3 shrink-0">

      {/* Hamburger — hanya mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden btn-icon btn-ghost shrink-0"
        aria-label="Buka menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="font-display font-semibold text-base lg:text-lg text-surface-900 truncate">
          {title}
        </h1>
        {user?.store && (
          <p className="text-xs text-surface-400 -mt-0.5 truncate hidden sm:block">
            {user.store.name}
          </p>
        )}
      </div>

      {/* Bell + Dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="btn-icon btn-ghost relative"
          aria-label="Notifikasi stok"
        >
          <Bell size={18} />
          {hasAlert && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-danger-500 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold leading-none">
                {lowStockCount > 99 ? '99+' : lowStockCount}
              </span>
            </span>
          )}
          {!hasAlert && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-surface-200" />
          )}
        </button>

        {/* Dropdown panel */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-surface-100 z-50 overflow-hidden">

            {/* Header dropdown */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className={hasAlert ? 'text-warning-500' : 'text-surface-300'} />
                <span className="text-sm font-semibold text-surface-800">
                  {hasAlert ? `${lowStockCount} Produk Stok Menipis` : 'Semua Stok Aman'}
                </span>
              </div>
              <button
                onClick={() => setDropdownOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-surface-300 hover:text-surface-500 hover:bg-surface-100 transition-colors"
              >
                <X size={13} />
              </button>
            </div>

            {/* Isi dropdown */}
            <div className="max-h-72 overflow-y-auto">
              {!hasAlert ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-success-50 flex items-center justify-center mb-2">
                    <Bell size={18} className="text-success-400" />
                  </div>
                  <p className="text-sm font-medium text-surface-700">Tidak ada notifikasi</p>
                  <p className="text-xs text-surface-400 mt-0.5">Semua produk masih dalam stok aman</p>
                </div>
              ) : (
                <ul className="py-1">
                  {lowStockProducts.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={handleGoToStock}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-warning-50/60 transition-colors text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-warning-100 flex items-center justify-center shrink-0">
                          <Package size={14} className="text-warning-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-800 truncate">{p.name}</p>
                          <p className="text-xs text-surface-400">
                            Sisa <span className="font-semibold text-warning-600">{p.stock}</span>
                            {p.unit ? ` ${p.unit}` : ''} · min. {p.min_stock}
                          </p>
                        </div>
                        <ChevronRight size={13} className="text-surface-300 group-hover:text-warning-400 transition-colors shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer dropdown */}
            {hasAlert && (
              <div className="border-t border-surface-100">
                <button
                  onClick={handleGoToStock}
                  className="w-full px-4 py-3 text-xs font-semibold text-primary-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  Lihat Semua di Manajemen Stok
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}