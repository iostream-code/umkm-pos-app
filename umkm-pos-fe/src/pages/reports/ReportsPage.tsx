import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, ShoppingBag, BarChart2,
  Download, Calendar, ChevronDown, Package,
  ArrowUpRight, ArrowDownRight, Minus, Loader2,
} from 'lucide-react'
import { reportApi } from '@/api'
import { formatRupiah, formatDate, formatShort } from '@/lib/utils'

// ─── Types — disesuaikan dengan response backend Laravel ─────────

// GET /api/v1/reports/sales
interface SalesByPeriod {
  period: string
  total_orders: number
  total_revenue: number
  total_discount: number
  total_tax: number
  avg_order_value: number
}

interface PaymentBreakdown {
  payment_method: string
  total_orders: number
  total_revenue: number
}

interface SalesSummary {
  total_orders: number
  total_revenue: number
  total_discount: number
  avg_order_value: number
  unique_customers: number
}

interface SalesReport {
  period: { from: string; to: string; group_by: string }
  summary: SalesSummary
  sales_by_period: SalesByPeriod[]
  by_payment_method: PaymentBreakdown[]
  busy_hours: { hour: number; total_orders: number }[]
}

// GET /api/v1/reports/products
interface TopProduct {
  product_id: string
  product_name: string
  category_name: string | null
  total_qty: number
  total_revenue: number
  total_cost: number
  total_profit: number
  margin_pct: number
}

interface ProductReport {
  period: { from: string; to: string }
  top_products: TopProduct[]
  no_sales_products: { id: string; name: string; stock: number; price: number }[]
}

// ─── Date helpers ─────────────────────────────────────────────────

type Preset = 'today' | '7d' | '30d' | 'this_month' | 'custom'

function toISO(d: Date) {
  return d.toISOString().split('T')[0]
}

function getPresetRange(preset: Preset): { from: string; to: string; group_by: string } {
  const today = new Date()
  const to = toISO(today)
  if (preset === 'today')
    return { from: to, to, group_by: 'day' }
  if (preset === '7d') {
    const f = new Date(today); f.setDate(today.getDate() - 6)
    return { from: toISO(f), to, group_by: 'day' }
  }
  if (preset === '30d') {
    const f = new Date(today); f.setDate(today.getDate() - 29)
    return { from: toISO(f), to, group_by: 'day' }
  }
  if (preset === 'this_month') {
    const f = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: toISO(f), to, group_by: 'day' }
  }
  return { from: to, to, group_by: 'day' }
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: '7d', label: '7 Hari' },
  { value: '30d', label: '30 Hari' },
  { value: 'this_month', label: 'Bulan Ini' },
  { value: 'custom', label: 'Custom' },
]

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tunai', qris: 'QRIS', card: 'Kartu',
  transfer: 'Transfer', mixed: 'Campuran',
}

const PAYMENT_COLORS: Record<string, string> = {
  cash: '#3670ff', qris: '#1D9E75', card: '#f59e0b',
  transfer: '#8b5cf6', mixed: '#64748b',
}

// ─── Shared UI ────────────────────────────────────────────────────

const inputCls = 'px-3 py-2 text-sm border border-surface-200 rounded-xl bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all'

function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-surface-400">
      <Minus size={11} />0%
    </span>
  )
  const up = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-success-600' : 'text-danger-600'}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────

function ChartTooltip({ active, payload, label, metric }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-100 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[160px]">
      <p className="text-xs font-semibold text-surface-500 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-surface-600">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-surface-900">
            {metric === 'total_orders'
              ? p.value.toLocaleString('id-ID')
              : formatRupiah(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Summary Cards ────────────────────────────────────────────────

function SummaryCards({ summary, isLoading }: { summary?: SalesSummary; isLoading: boolean }) {
  const cards = [
    {
      label: 'Total Omzet',
      value: summary ? formatRupiah(summary.total_revenue) : '—',
      icon: <TrendingUp size={18} className="text-primary-600" />,
      bg: 'bg-primary-50',
    },
    {
      label: 'Total Transaksi',
      value: summary ? summary.total_orders.toLocaleString('id-ID') : '—',
      icon: <ShoppingBag size={18} className="text-success-600" />,
      bg: 'bg-success-500/10',
    },
    {
      label: 'Rata-rata Transaksi',
      value: summary ? formatRupiah(summary.avg_order_value) : '—',
      icon: <BarChart2 size={18} className="text-amber-600" />,
      bg: 'bg-amber-50',
    },
    {
      label: 'Total Diskon',
      value: summary ? formatRupiah(summary.total_discount) : '—',
      icon: <BarChart2 size={18} className="text-surface-500" />,
      bg: 'bg-surface-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
              {c.icon}
            </div>
          </div>
          {isLoading ? (
            <>
              <div className="h-6 w-24 rounded-lg bg-surface-100 animate-pulse mb-1" />
              <div className="h-3 w-16 rounded bg-surface-100 animate-pulse" />
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-surface-900 leading-tight">{c.value}</p>
              <p className="text-xs text-surface-400 mt-0.5">{c.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Sales Chart ──────────────────────────────────────────────────

type ChartMetric = 'total_revenue' | 'avg_order_value' | 'total_orders'

function SalesChart({
  salesData, isLoading,
}: {
  salesData: SalesByPeriod[]
  isLoading: boolean
}) {
  const [metric, setMetric] = useState<ChartMetric>('total_revenue')

  // Format label tanggal dari ISO period
  const chartData = useMemo(() =>
    salesData.map((d) => ({
      ...d,
      label: (() => {
        try { return formatDate(d.period) } catch { return d.period }
      })(),
    })),
    [salesData]
  )

  const metricConfig: Record<ChartMetric, { label: string; color: string }> = {
    total_revenue: { label: 'Omzet', color: '#3670ff' },
    avg_order_value: { label: 'Avg. Order', color: '#1D9E75' },
    total_orders: { label: 'Transaksi', color: '#f59e0b' },
  }
  const mc = metricConfig[metric]

  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-display font-semibold text-surface-900">Tren Penjualan</h3>
          <p className="text-xs text-surface-400 mt-0.5">{chartData.length} titik data</p>
        </div>
        {/* Toggle metrik */}
        <div className="flex rounded-xl border border-surface-200 overflow-hidden bg-white text-xs shrink-0">
          {(Object.keys(metricConfig) as ChartMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-2 font-medium transition-all ${metric === m ? 'bg-surface-900 text-white' : 'text-surface-500 hover:bg-surface-50'
                }`}
            >
              {metricConfig[m].label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-xs text-surface-400">Memuat data chart...</p>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <BarChart2 size={32} className="text-surface-200" />
          <p className="text-sm text-surface-400">Tidak ada data untuk periode ini</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={mc.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={mc.color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={metric === 'total_orders' ? 40 : 72}
              tickFormatter={(v) =>
                metric === 'total_orders'
                  ? v.toLocaleString('id-ID')
                  : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt`
                    : `${(v / 1_000).toFixed(0)}rb`
              }
            />
            <Tooltip content={<ChartTooltip metric={metric} />} />
            <Area
              type="monotone"
              dataKey={metric}
              name={mc.label}
              stroke={mc.color}
              strokeWidth={2}
              fill="url(#gradMetric)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Payment Breakdown ────────────────────────────────────────────

function PaymentBreakdownCard({ data }: { data: PaymentBreakdown[] }) {
  const total = data.reduce((sum, d) => sum + d.total_revenue, 0)
  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold text-surface-900 mb-4">Metode Pembayaran</h3>
      {data.length === 0 ? (
        <p className="text-sm text-surface-400 text-center py-6">Tidak ada data</p>
      ) : (
        <div className="space-y-3">
          {data.map((d) => {
            const pct = total > 0 ? Math.round((d.total_revenue / total) * 100) : 0
            const color = PAYMENT_COLORS[d.payment_method] ?? '#64748b'
            return (
              <div key={d.payment_method}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-sm text-surface-700">
                      {PAYMENT_LABELS[d.payment_method] ?? d.payment_method}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-surface-800">
                      {formatShort(d.total_revenue)}
                    </span>
                    <span className="text-xs text-surface-400 ml-1.5">{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Top Products Table ───────────────────────────────────────────

function TopProductsTable({
  products, isLoading,
}: {
  products: TopProduct[]
  isLoading: boolean
}) {
  const maxRevenue = Math.max(...products.map((p) => p.total_revenue), 1)
  const rankColors = ['text-yellow-500', 'text-surface-400', 'text-orange-400']

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-surface-900">Produk Terlaris</h3>
          <p className="text-xs text-surface-400 mt-0.5">Top {products.length} berdasarkan omzet</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
          <Package size={15} className="text-primary-600" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-4 rounded bg-surface-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 rounded bg-surface-100 animate-pulse" style={{ width: `${70 - i * 8}%` }} />
                <div className="h-2 rounded bg-surface-100 animate-pulse w-full" />
              </div>
              <div className="w-20 h-3 rounded bg-surface-100 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Package size={28} className="text-surface-200" />
          <p className="text-sm text-surface-400">Belum ada data produk terjual</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p, idx) => (
            <div key={p.product_id ?? idx} className="group">
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-xs font-bold w-5 text-right shrink-0 ${rankColors[idx] ?? 'text-surface-300'}`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-surface-800 truncate">{p.product_name}</span>
                    {p.category_name && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-surface-100 text-surface-500 hidden sm:inline">
                        {p.category_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-surface-900">{formatRupiah(p.total_revenue)}</p>
                  <p className="text-xs text-surface-400">{p.total_qty.toLocaleString('id-ID')} terjual</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="ml-8 h-1.5 rounded-full bg-surface-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-400 group-hover:bg-primary-500 transition-all duration-500"
                  style={{ width: `${(p.total_revenue / maxRevenue) * 100}%` }}
                />
              </div>
              {/* Margin info */}
              <div className="ml-8 mt-0.5 flex items-center gap-3">
                <span className="text-xs text-surface-400">
                  Profit: <span className="text-success-600 font-medium">{formatShort(p.total_profit)}</span>
                </span>
                <span className="text-xs text-surface-400">
                  Margin: <span className="text-surface-600 font-medium">{p.margin_pct}%</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────

export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [exporting, setExporting] = useState(false)

  const range = preset === 'custom' && customFrom && customTo
    ? { from: customFrom, to: customTo, group_by: 'day' }
    : getPresetRange(preset)

  // Fetch laporan penjualan dari GET /api/v1/reports/sales
  const { data: salesData, isLoading: salesLoading, isFetching } = useQuery({
    queryKey: ['reports-sales', range.from, range.to, range.group_by],
    queryFn: () => reportApi.sales({
      date_from: range.from,
      date_to: range.to,
      group_by: range.group_by,
    }).then((r: any) => r.data as SalesReport),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch laporan produk dari GET /api/v1/reports/products
  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['reports-products', range.from, range.to],
    queryFn: () => reportApi.products({
      date_from: range.from,
      date_to: range.to,
    }).then((r: any) => r.data as ProductReport),
    staleTime: 5 * 60 * 1000,
  })

  // Export CSV via backend endpoint GET /api/v1/reports/export/sales
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await reportApi.export({
        date_from: range.from,
        date_to: range.to,
      })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `laporan-smartpos-${range.from}-${range.to}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // toast sudah handle di axios interceptor
    } finally {
      setTimeout(() => setExporting(false), 800)
    }
  }

  const isLoading = salesLoading || productLoading

  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">Laporan & Analitik</h2>
          <p className="text-sm text-surface-400 mt-0.5">Pantau performa penjualan dan produk terlaris</p>
        </div>
        <button
          onClick={handleExport}
          disabled={!salesData || exporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-200 bg-white hover:bg-surface-50 text-sm font-medium text-surface-700 transition-all disabled:opacity-50 shrink-0"
        >
          {exporting
            ? <Loader2 size={15} className="animate-spin" />
            : <Download size={15} />
          }
          {exporting ? 'Mengunduh...' : 'Export CSV'}
        </button>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────── */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={15} className="text-surface-400 shrink-0" />
          <span className="text-xs font-medium text-surface-500 mr-1">Periode:</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setPreset(p.value); setShowCustom(p.value === 'custom') }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${preset === p.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {showCustom && (
            <div className="flex flex-wrap items-center gap-2 ml-1">
              <input
                type="date"
                className={inputCls}
                value={customFrom}
                max={customTo || toISO(new Date())}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="text-xs text-surface-400">s/d</span>
              <input
                type="date"
                className={inputCls}
                value={customTo}
                min={customFrom}
                max={toISO(new Date())}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}

          {isFetching && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-surface-400">
              <span className="w-3 h-3 border border-surface-300 border-t-primary-500 rounded-full animate-spin" />
              Memperbarui...
            </span>
          )}
        </div>

        {/* Label periode aktif */}
        <div className="flex items-center gap-1.5 mt-2 pl-5">
          <ChevronDown size={12} className="text-surface-300" />
          <span className="text-xs text-surface-400">
            {range.from === range.to
              ? formatDate(range.from)
              : `${formatDate(range.from)} — ${formatDate(range.to)}`
            }
          </span>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────── */}
      <SummaryCards summary={salesData?.summary} isLoading={salesLoading} />

      {/* ── Chart + Payment breakdown ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesChart
            salesData={salesData?.sales_by_period ?? []}
            isLoading={salesLoading}
          />
        </div>
        <PaymentBreakdownCard data={salesData?.by_payment_method ?? []} />
      </div>

      {/* ── Top Products ──────────────────────────────────────── */}
      <TopProductsTable
        products={productData?.top_products ?? []}
        isLoading={productLoading}
      />

    </div>
  )
}