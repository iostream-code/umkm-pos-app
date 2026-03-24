import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingCart,
  Users, Package, AlertTriangle,
} from 'lucide-react'
import { dashboardApi } from '@/api'
import { formatRupiah, formatShort, formatDate } from '@/lib/utils'

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, trend, trendValue,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-surface-400 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-display font-bold text-surface-900 leading-none">{value}</p>
        {(sub || trendValue) && (
          <div className="flex items-center gap-1.5 mt-1">
            {trend === 'up' && <TrendingUp size={12} className="text-success-500" />}
            {trend === 'down' && <TrendingDown size={12} className="text-danger-500" />}
            {trendValue && (
              <span className={`text-xs font-medium ${trend === 'up' ? 'text-success-600' :
                trend === 'down' ? 'text-danger-600' : 'text-surface-500'
                }`}>
                {trendValue}
              </span>
            )}
            {sub && <span className="text-xs text-surface-400">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Custom Tooltip Chart ──────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-100 rounded-xl shadow-card-md p-3 text-sm">
      <p className="text-surface-500 mb-1">{label}</p>
      <p className="font-semibold text-surface-900">{formatRupiah(payload[0]?.value ?? 0)}</p>
      {payload[1] && (
        <p className="text-surface-500">{payload[1].value} transaksi</p>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then((r) => r.data),
    refetchInterval: 30_000, // refresh tiap 30 detik
  })

  const chartData = (data?.weekly_sales ?? []).map((d) => ({
    date: formatDate(d.date),
    revenue: d.revenue,
    orders: d.orders,
  }))

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-surface-100" />
        ))}
      </div>
    )
  }

  const s = data?.summary

  return (
    <div className="space-y-6">

      {/* ── Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          label="Pendapatan Hari Ini"
          value={formatShort(s?.today_revenue ?? 0)}
          icon={<ShoppingCart size={20} />}
          trend={s?.revenue_growth >= 0 ? 'up' : 'down'}
          trendValue={`${s?.revenue_growth > 0 ? '+' : ''}${s?.revenue_growth ?? 0}%`}
          sub="vs kemarin"
        />
        <StatCard
          label="Transaksi Hari Ini"
          value={String(s?.today_orders ?? 0)}
          icon={<ShoppingCart size={20} />}
          sub="transaksi"
        />
        <StatCard
          label="Pelanggan Baru"
          value={String(s?.new_customers ?? 0)}
          icon={<Users size={20} />}
          sub="bulan ini"
        />
        <StatCard
          label="Stok Menipis"
          value={String(s?.low_stock_count ?? 0)}
          icon={<AlertTriangle size={20} />}
          trend={s?.low_stock_count > 0 ? 'down' : 'neutral'}
          sub="produk"
        />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">

        {/* Area chart pendapatan 7 hari */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold text-surface-900">Pendapatan 7 Hari</h3>
              <p className="text-xs text-surface-400 mt-0.5">Tren penjualan minggu ini</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3670ff" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3670ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8896b3' }} />
              <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 11, fill: '#8896b3' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3670ff"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top produk */}
        <div className="card">
          <h3 className="font-display font-semibold text-surface-900 mb-1">Produk Terlaris</h3>
          <p className="text-xs text-surface-400 mb-5">Bulan ini</p>
          <div className="space-y-3">
            {(data?.top_products ?? []).slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-primary-50 flex items-center justify-center text-xs font-bold text-primary-600">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-800 truncate">{p.product_name}</p>
                  <p className="text-xs text-surface-400">{p.total_qty} terjual</p>
                </div>
                <p className="text-sm font-medium text-surface-700 shrink-0">
                  {formatShort(p.total_revenue)}
                </p>
              </div>
            ))}
            {(data?.top_products ?? []).length === 0 && (
              <p className="text-sm text-surface-400 text-center py-4">Belum ada data</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Low Stock Alert ─────────────────────────────────────── */}
      {(data?.low_stock ?? []).length > 0 && (
        <div className="card border-warning-200 bg-warning-50/50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-warning-500" />
            <h3 className="font-semibold text-surface-900">Stok Menipis</h3>
          </div>
          <div className="space-y-2">
            {data!.low_stock.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-warning-100 last:border-0">
                <div className="flex items-center gap-3">
                  <Package size={14} className="text-surface-400" />
                  <span className="text-sm text-surface-700">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-warning">{p.stock} {p.unit}</span>
                  <span className="text-xs text-surface-400">min. {p.min_stock}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}