import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingCart,
  Users, Package, AlertTriangle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { dashboardApi } from '@/api'
import { formatRupiah, formatShort, formatDate } from '@/lib/utils'

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, iconBg, trend, trendValue,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  iconBg: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-surface-400 font-medium mb-0.5 truncate">{label}</p>
        <p className="text-xl lg:text-2xl font-display font-bold text-surface-900 leading-none">{value}</p>
        {(sub || trendValue) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {trend === 'up' && <ArrowUpRight size={13} className="text-success-500 shrink-0" />}
            {trend === 'down' && <ArrowDownRight size={13} className="text-danger-500 shrink-0" />}
            {trendValue && (
              <span className={`text-xs font-semibold ${trend === 'up' ? 'text-success-600' :
                trend === 'down' ? 'text-danger-600' : 'text-surface-500'
                }`}>{trendValue}</span>
            )}
            {sub && <span className="text-xs text-surface-400">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-100 rounded-xl shadow-card-md p-3 text-sm min-w-[150px]">
      <p className="text-surface-500 text-xs mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-xs text-surface-500">{p.name}</span>
          </div>
          <span className="text-xs font-semibold text-surface-800">
            {p.name === 'Transaksi' ? p.value : formatRupiah(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-100 rounded-xl ${className}`} />
}

// ── Main Page ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const s = data?.summary
  const isAnalytics = data?.source === 'analytics' // dari Python service

  // Format data chart — pastikan field sesuai response backend
  const areaData = (data?.weekly_sales ?? []).map((d) => ({
    date: formatDate(d.date),
    Pendapatan: Number(d.revenue ?? 0),
    Transaksi: Number(d.orders ?? 0),
  }))

  // Bar chart top produk
  const barData = (data?.top_products ?? []).slice(0, 5).map((p) => ({
    name: p.product_name?.length > 12 ? p.product_name.slice(0, 12) + '…' : (p.product_name ?? ''),
    Terjual: Number(p.total_qty ?? 0),
  }))

  const BAR_COLORS = ['#3670ff', '#5b8aff', '#85a8ff', '#adc3ff', '#d0dcff']

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Summary Cards ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1">
        {isAnalytics && (
          <span className="inline-flex items-center gap-1.5 text-xs text-success-600 bg-success-50 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse-dot" />
            Powered by Analytics AI
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          label="Pendapatan Hari Ini"
          value={formatShort(s?.today_revenue ?? 0)}
          icon={<ShoppingCart size={20} className="text-primary-600" />}
          iconBg="bg-primary-50"
          trend={s?.revenue_growth >= 0 ? 'up' : 'down'}
          trendValue={`${s?.revenue_growth > 0 ? '+' : ''}${s?.revenue_growth ?? 0}%`}
          sub="vs kemarin"
        />
        <StatCard
          label="Transaksi Hari Ini"
          value={String(s?.today_orders ?? 0)}
          sub="transaksi selesai"
          icon={<TrendingUp size={20} className="text-success-600" />}
          iconBg="bg-success-500/10"
        />
        <StatCard
          label="Pelanggan Baru"
          value={String(s?.new_customers ?? 0)}
          sub="bulan ini"
          icon={<Users size={20} className="text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Stok Menipis"
          value={String(s?.low_stock_count ?? 0)}
          sub="produk perlu restock"
          icon={<AlertTriangle size={20} className={s?.low_stock_count > 0 ? 'text-danger-500' : 'text-surface-400'} />}
          iconBg={s?.low_stock_count > 0 ? 'bg-danger-50' : 'bg-surface-100'}
          trend={s?.low_stock_count > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* ── Charts Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart pendapatan */}
        <div className="card lg:col-span-2">
          <div className="flex items-start justify-between mb-5 gap-3">
            <div>
              <h3 className="font-display font-semibold text-surface-900">Pendapatan 7 Hari</h3>
              <p className="text-xs text-surface-400 mt-0.5">Tren penjualan minggu ini</p>
            </div>
            {areaData.length > 0 && (
              <div className="text-right shrink-0">
                <p className="text-xs text-surface-400">Total</p>
                <p className="text-sm font-bold text-primary-600">
                  {formatShort(areaData.reduce((s, d) => s + d.Pendapatan, 0))}
                </p>
              </div>
            )}
          </div>

          {areaData.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-surface-400 gap-2">
              <TrendingUp size={28} className="opacity-30" />
              <p className="text-sm">Belum ada data penjualan</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3670ff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3670ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#8896b3' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatShort(v)}
                  tick={{ fontSize: 11, fill: '#8896b3' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Pendapatan"
                  stroke="#3670ff"
                  strokeWidth={2}
                  fill="url(#gradRevenue)"
                  dot={{ fill: '#3670ff', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top produk bar chart */}
        <div className="card">
          <h3 className="font-display font-semibold text-surface-900 mb-1">Produk Terlaris</h3>
          <p className="text-xs text-surface-400 mb-4">Bulan ini berdasarkan qty</p>

          {barData.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-surface-400 gap-2">
              <Package size={28} className="opacity-30" />
              <p className="text-sm">Belum ada data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#8896b3' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#8896b3' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Terjual" radius={[6, 6, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i] ?? '#3670ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top produk list + stok menipis ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Ranking produk */}
        <div className="card">
          <h3 className="font-display font-semibold text-surface-900 mb-4">Ranking Produk</h3>
          {(data?.top_products ?? []).length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-6">Belum ada data penjualan</p>
          ) : (
            <div className="space-y-3">
              {(data?.top_products ?? []).slice(0, 5).map((p, i) => {
                const max = data?.top_products?.[0]?.total_revenue ?? 1
                const pct = Math.round((p.total_revenue / max) * 100)
                return (
                  <div key={i}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xs font-bold w-4 shrink-0 ${i === 0 ? 'text-[#16DB93]' : i === 1 ? 'text-[#83E377]' : i === 2 ? 'text-[#B9E769]' : 'text-surface-300'
                        }`}>#{i + 1}</span>
                      <p className="text-sm text-surface-700 flex-1 truncate">{p.product_name}</p>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-surface-800">{formatShort(p.total_revenue)}</p>
                        <p className="text-xs text-surface-400">{p.total_qty} terjual</p>
                      </div>
                    </div>
                    <div className="ml-7 h-1 bg-surface-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Stok menipis */}
        <div className={`card ${(data?.low_stock ?? []).length > 0 ? 'border-warning-200 bg-warning-50/30' : ''}`}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-warning-500" />
            <h3 className="font-semibold text-surface-900">Stok Menipis</h3>
            {(data?.low_stock ?? []).length > 0 && (
              <span className="badge badge-warning ml-auto">{data!.low_stock.length} produk</span>
            )}
          </div>

          {(data?.low_stock ?? []).length === 0 ? (
            <div className="text-center py-6 text-surface-400">
              <Package size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Semua stok aman</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data!.low_stock.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-warning-100 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package size={13} className="text-surface-400 shrink-0" />
                    <span className="text-sm text-surface-700 truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge badge-warning">{p.stock} {p.unit}</span>
                    <span className="text-xs text-surface-400">/ {p.min_stock}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}