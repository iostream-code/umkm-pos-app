import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Users, Tag,
  BarChart3, LogOut, Store, Archive, ClipboardList,
  UserCog, X,
} from 'lucide-react'
import { useAuthStore, selectUser } from '@/stores/authStore'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['owner', 'manager', 'cashier'] },
  { label: 'Kasir (POS)', to: '/pos', icon: <ShoppingCart size={18} />, roles: ['owner', 'manager', 'cashier'] },
  { label: 'Transaksi', to: '/orders', icon: <ClipboardList size={18} />, roles: ['owner', 'manager', 'cashier'] },
  { label: 'Shift', to: '/shifts', icon: <Archive size={18} />, roles: ['owner', 'manager', 'cashier'] },
  { label: 'Produk', to: '/products', icon: <Package size={18} />, roles: ['owner', 'manager'] },
  { label: 'Stok', to: '/stock', icon: <Archive size={18} />, roles: ['owner', 'manager'] },
  { label: 'Pelanggan', to: '/customers', icon: <Users size={18} />, roles: ['owner', 'manager'] },
  { label: 'Diskon', to: '/discounts', icon: <Tag size={18} />, roles: ['owner', 'manager'] },
  { label: 'Laporan', to: '/reports', icon: <BarChart3 size={18} />, roles: ['owner', 'manager'] },
  { label: 'Karyawan', to: '/users', icon: <UserCog size={18} />, roles: ['owner'] },
  { label: 'Toko', to: '/store', icon: <Store size={18} />, roles: ['owner'] },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const user = useAuthStore(selectUser)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const filtered = NAV_ITEMS.filter((item) =>
    item.roles.includes(user?.role ?? '')
  )

  const handleLogout = async () => {
    await logout()
    toast.success('Sampai jumpa!')
    navigate('/login')
  }

  const handleNavClick = () => {
    // Tutup sidebar di mobile setelah navigasi
    onClose?.()
  }

  return (
    <aside className="w-[220px] h-full flex flex-col bg-surface-900 text-white shrink-0">

      {/* Logo + tombol tutup (mobile) */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <ShoppingCart size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">SmartPOS</span>
        </div>
        {/* Tombol X hanya tampil di mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-surface-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filtered.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-xs font-medium shrink-0">
            {getInitials(user?.name ?? 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-surface-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full mt-1 text-danger-400 hover:text-danger-300 hover:bg-danger-500/10"
        >
          <LogOut size={18} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  )
}