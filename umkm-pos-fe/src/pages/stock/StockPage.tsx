import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle, TrendingDown, Package, RefreshCw, X,
  Loader2, Brain, Clock, ArrowUpCircle, ArrowDownCircle,
  SlidersHorizontal, ShieldAlert, ShieldCheck, Search,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { stockApi, analyticsApi, productApi } from '@/api'
import { formatDateTime, getAxiosErrorMessage } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useAuthStore, selectUser } from '@/stores/authStore'
import type { Product } from '@/types'

// ── Types ─────────────────────────────────────────────────────────
interface ForecastItem {
  product_id: string
  product_name: string
  product_sku: string | null
  current_stock: number
  unit: string
  min_stock: number
  avg_daily_usage: number
  days_until_empty: number
  estimated_empty_date: string
  risk_level: 'critical' | 'high' | 'medium' | 'low'
  recommended_restock: number
}

interface ForecastData {
  generated_at: string
  forecast_days: number
  total_at_risk: number
  by_risk: {
    critical: ForecastItem[]
    high: ForecastItem[]
    medium: ForecastItem[]
    low: ForecastItem[]
  }
}

// ── Risk config ───────────────────────────────────────────────────
const RISK_CONFIG = {
  critical: {
    label: 'Kritis',
    icon: <ShieldAlert size={13} />,
    badge: 'bg-danger-50 text-danger-700 border border-danger-200',
    card: 'border-l-danger-500',
  },
  high: {
    label: 'Tinggi',
    icon: <AlertTriangle size={13} />,
    badge: 'bg-warning-50 text-warning-700 border border-warning-200',
    card: 'border-l-warning-500',
  },
  medium: {
    label: 'Sedang',
    icon: <TrendingDown size={13} />,
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    card: 'border-l-amber-400',
  },
  low: {
    label: 'Rendah',
    icon: <Package size={13} />,
    badge: 'bg-surface-100 text-surface-600 border border-surface-200',
    card: 'border-l-surface-300',
  },
}

// ── Step 1 Modal: Pilih Produk ────────────────────────────────────
function ProductPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (product: Product) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const user = useAuthStore(selectUser)

  const { data, isLoading } = useQuery({
    queryKey: ['products-picker', search],
    queryFn: () => productApi.list({
      search,
      is_active: true,
      per_page: 20,
    }).then((r) => r.data),
    enabled: true,
  })

  const products: Product[] = data?.data ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-card-lg animate-fade-in flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-surface-100 shrink-0">
          <div>
            <h3 className="font-display font-semibold">Pilih Produk</h3>
            <p className="text-xs text-surface-400 mt-0.5">Cari produk yang akan disesuaikan stoknya</p>
          </div>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-surface-100 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, SKU, barcode..."
              className="input pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Product list */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-surface-100 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-surface-400">
              <Package size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Produk tidak ditemukan</p>
            </div>
          ) : (
            <div className="p-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-50 transition-colors text-left group"
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {p.image
                      ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      : <Package size={16} className="text-surface-300" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.sku && <code className="text-xs text-surface-400">{p.sku}</code>}
                      {p.category && (
                        <span className="text-xs text-surface-400">{p.category.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Stok */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${p.is_low_stock ? 'text-warning-600' : 'text-surface-700'}`}>
                      {p.stock} {p.unit}
                    </p>
                    {p.is_low_stock && (
                      <p className="text-xs text-warning-500">stok menipis</p>
                    )}
                  </div>

                  <ChevronRight size={16} className="text-surface-300 group-hover:text-surface-500 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step 2 Modal: Form Adjustment ─────────────────────────────────
const adjSchema = z.object({
  product_id: z.string(),
  quantity: z.coerce.number().int().refine((v) => v !== 0, 'Tidak boleh 0'),
  type: z.enum(['in', 'out', 'adjustment', 'damage']),
  notes: z.string().min(3, 'Catatan minimal 3 karakter'),
})

type AdjForm = z.infer<typeof adjSchema>

function AdjustmentFormModal({
  productId,
  productName,
  currentStock,
  unit,
  suggestedQty,
  onClose,
  onBack,
}: {
  productId: string
  productName: string
  currentStock: number
  unit: string
  suggestedQty?: number
  onClose: () => void
  onBack?: () => void
}) {
  const qc = useQueryClient()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<AdjForm>({
    resolver: zodResolver(adjSchema),
    defaultValues: {
      product_id: productId,
      type: 'in',
      quantity: suggestedQty ?? 0,
      notes: suggestedQty
        ? `Restock sesuai rekomendasi ML: ${suggestedQty} ${unit}`
        : '',
    },
  })

  const type = watch('type')
  const quantity = watch('quantity') || 0

  // Preview stok setelah adjustment
  const newStock = (() => {
    if (type === 'in') return currentStock + Math.abs(quantity)
    if (type === 'out') return Math.max(0, currentStock - Math.abs(quantity))
    if (type === 'damage') return Math.max(0, currentStock - Math.abs(quantity))
    if (type === 'adjustment') return Math.max(0, currentStock + quantity) // bisa negatif
    return currentStock
  })()

  const mutation = useMutation({
    mutationFn: (data: AdjForm) => stockApi.adjustment({
      product_id: data.product_id,
      quantity: data.type === 'in'
        ? Math.abs(data.quantity)
        : -Math.abs(data.quantity),
      type: data.type,
      notes: data.notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-forecast'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Stok berhasil disesuaikan.')
      onClose()
    },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  const TYPE_OPTIONS = [
    { value: 'in', label: 'Masuk / Restock', icon: <ArrowUpCircle size={14} className="text-success-500" /> },
    { value: 'out', label: 'Keluar', icon: <ArrowDownCircle size={14} className="text-danger-500" /> },
    { value: 'adjustment', label: 'Opname', icon: <SlidersHorizontal size={14} className="text-primary-500" /> },
    { value: 'damage', label: 'Barang Rusak', icon: <X size={14} className="text-warning-500" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-card-lg animate-fade-in">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100">
          {onBack && (
            <button onClick={onBack} className="btn-icon btn-ghost -ml-1 shrink-0">
              <ChevronRight size={18} className="rotate-180" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold">Penyesuaian Stok</h3>
            <p className="text-xs text-surface-400 truncate">{productName}</p>
          </div>
          <button onClick={onClose} className="btn-icon btn-ghost shrink-0">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <input type="hidden" {...register('product_id')} />

          {/* Preview stok */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-50 rounded-xl p-4 text-center">
              <p className="text-xs text-surface-400 mb-1">Stok Sekarang</p>
              <p className="text-2xl font-display font-bold text-surface-900">
                {currentStock}
                <span className="text-sm font-normal text-surface-400 ml-1">{unit}</span>
              </p>
            </div>
            <div className={`rounded-xl p-4 text-center transition-colors ${newStock > currentStock ? 'bg-success-50' :
              newStock < currentStock ? 'bg-danger-50' : 'bg-surface-50'
              }`}>
              <p className="text-xs text-surface-400 mb-1">Setelah Penyesuaian</p>
              <p className={`text-2xl font-display font-bold transition-colors ${newStock > currentStock ? 'text-success-700' :
                newStock < currentStock ? 'text-danger-700' : 'text-surface-900'
                }`}>
                {newStock}
                <span className="text-sm font-normal ml-1">{unit}</span>
              </p>
            </div>
          </div>

          {/* Tipe */}
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-2">Tipe Penyesuaian</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${type === opt.value
                    ? 'border-primary-400 bg-primary-50 shadow-sm'
                    : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
                    }`}
                >
                  <input {...register('type')} type="radio" value={opt.value} className="sr-only" />
                  {opt.icon}
                  <span className="text-xs font-medium text-surface-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Jumlah */}
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1.5">
              Jumlah{' '}
              {type === 'adjustment' && (
                <span className="text-surface-400 font-normal">(+ tambah / − kurang)</span>
              )}
            </label>
            <input
              {...register('quantity')}
              type="number"
              className="input text-xl font-bold text-center"
              placeholder="0"
              inputMode="numeric"
            />
            {errors.quantity && (
              <p className="text-xs text-danger-500 mt-1">{errors.quantity.message}</p>
            )}
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1.5">
              Catatan <span className="text-surface-400 font-normal">(wajib)</span>
            </label>
            <textarea
              {...register('notes')}
              className="input resize-none"
              rows={3}
              placeholder="Contoh: Pembelian dari supplier, stock opname, barang rusak saat pengiriman..."
            />
            {errors.notes && (
              <p className="text-xs text-danger-500 mt-1">{errors.notes.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Batal
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {mutation.isPending
                ? <><Loader2 size={15} className="animate-spin" />Menyimpan...</>
                : 'Simpan Penyesuaian'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Forecast Card ─────────────────────────────────────────────────
function ForecastCard({
  item,
  onRestock,
}: {
  item: ForecastItem
  onRestock: (item: ForecastItem) => void
}) {
  const cfg = RISK_CONFIG[item.risk_level]

  return (
    <div className={`card border-l-4 ${cfg.card} hover:shadow-card-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-surface-800 truncate text-sm">{item.product_name}</p>
          {item.product_sku && (
            <code className="text-xs text-surface-400">{item.product_sku}</code>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${cfg.badge}`}>
          {cfg.icon}{cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-surface-50 rounded-lg p-2 text-center">
          <p className="text-xs text-surface-400 mb-0.5">Stok</p>
          <p className={`font-bold text-sm ${item.current_stock <= item.min_stock ? 'text-danger-600' : 'text-surface-800'}`}>
            {item.current_stock}
            <span className="text-xs font-normal text-surface-400 ml-0.5">{item.unit}</span>
          </p>
        </div>
        <div className="bg-surface-50 rounded-lg p-2 text-center">
          <p className="text-xs text-surface-400 mb-0.5">Sisa</p>
          <p className={`font-bold text-sm ${item.days_until_empty <= 3 ? 'text-danger-600' :
            item.days_until_empty <= 7 ? 'text-warning-600' : 'text-surface-800'
            }`}>
            ~{item.days_until_empty}
            <span className="text-xs font-normal text-surface-400 ml-0.5">hari</span>
          </p>
        </div>
        <div className="bg-surface-50 rounded-lg p-2 text-center">
          <p className="text-xs text-surface-400 mb-0.5">Pakai/hari</p>
          <p className="font-bold text-sm text-surface-800">
            {item.avg_daily_usage}
            <span className="text-xs font-normal text-surface-400 ml-0.5">{item.unit}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-surface-400 mb-3">
        <Clock size={11} />
        <span>Habis: <strong className="text-surface-600">{item.estimated_empty_date}</strong></span>
      </div>

      <button
        onClick={() => onRestock(item)}
        className="btn-primary w-full justify-center py-2 text-sm gap-1.5"
      >
        <ArrowUpCircle size={14} />
        Restock {item.recommended_restock} {item.unit}
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
type ModalState =
  | { step: 'closed' }
  | { step: 'picker' }
  | { step: 'form'; product: Product }
  | { step: 'forecast-form'; item: ForecastItem }

export default function StockPage() {
  const user = useAuthStore(selectUser)
  const [modal, setModal] = useState<ModalState>({ step: 'closed' })
  const [activeRisk, setActiveRisk] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [page, setPage] = useState(1)

  // ── Forecast dari Python ML ───────────────────────────────────
  const {
    data: forecastData,
    isLoading: forecastLoading,
    isFetching: forecastFetching,
    refetch: refetchForecast,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['stock-forecast'],
    queryFn: () => analyticsApi.stockForecast((user as any)!.store_id).then((r) => r.data as ForecastData),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // ── Riwayat mutasi stok ───────────────────────────────────────
  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['stock-movements', page],
    queryFn: () => stockApi.movements({ page }).then((r) => r.data),
  })

  const movementsMeta = movementsData
    ? { current_page: movementsData.current_page, last_page: movementsData.last_page, per_page: movementsData.per_page, total: movementsData.total }
    : undefined

  const forecast = forecastData
  const totalAtRisk = forecast?.total_at_risk ?? 0
  const riskCounts = {
    critical: forecast?.by_risk.critical.length ?? 0,
    high: forecast?.by_risk.high.length ?? 0,
    medium: forecast?.by_risk.medium.length ?? 0,
    low: forecast?.by_risk.low.length ?? 0,
  }

  const displayedItems: ForecastItem[] = (() => {
    if (!forecast) return []
    if (activeRisk === 'all') return [
      ...forecast.by_risk.critical,
      ...forecast.by_risk.high,
      ...forecast.by_risk.medium,
      ...forecast.by_risk.low,
    ]
    return forecast.by_risk[activeRisk]
  })()

  const MOVEMENT_ICONS: Record<string, React.ReactNode> = {
    sale: <ArrowDownCircle size={14} className="text-danger-500" />,
    in: <ArrowUpCircle size={14} className="text-success-500" />,
    return: <ArrowUpCircle size={14} className="text-primary-500" />,
    adjustment: <SlidersHorizontal size={14} className="text-amber-500" />,
    damage: <X size={14} className="text-warning-500" />,
    out: <ArrowDownCircle size={14} className="text-surface-400" />,
  }

  const MOVEMENT_LABELS: Record<string, string> = {
    sale: 'Penjualan',
    in: 'Masuk',
    out: 'Keluar',
    return: 'Retur',
    adjustment: 'Opname',
    damage: 'Rusak',
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">Manajemen Stok</h2>
          <p className="text-xs text-surface-400 mt-0.5">Prediksi ML & riwayat mutasi stok</p>
        </div>
        <button
          onClick={() => setModal({ step: 'picker' })}
          className="btn-primary shrink-0 self-start xs:self-auto gap-1.5"
        >
          <SlidersHorizontal size={16} />
          Penyesuaian Manual
        </button>
      </div>

      {/* ── ML Forecast ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Brain size={18} className="text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-900 text-sm">Prediksi Stok Habis</h3>
              <p className="text-xs text-surface-400">
                {dataUpdatedAt
                  ? `Update ${new Date(dataUpdatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Powered by ML Analytics'
                }
              </p>
            </div>
          </div>
          {/* Risk filter pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: 'all', label: `Semua (${totalAtRisk})`, cls: 'bg-surface-900 text-white' },
              { key: 'critical', label: `Kritis (${riskCounts.critical})`, cls: 'bg-danger-500 text-white' },
              { key: 'high', label: `Tinggi (${riskCounts.high})`, cls: 'bg-warning-500 text-white' },
              { key: 'medium', label: `Sedang (${riskCounts.medium})`, cls: 'bg-amber-400 text-white' },
              { key: 'low', label: `Rendah (${riskCounts.low})`, cls: 'bg-surface-400 text-white' },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => setActiveRisk(btn.key as typeof activeRisk)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeRisk === btn.key
                  ? btn.cls
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetchForecast()}
            disabled={forecastFetching}
            className="btn-icon btn-ghost"
            title="Refresh prediksi"
          >
            <RefreshCw size={16} className={forecastFetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Cards */}
        {forecastLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card h-52 animate-pulse bg-surface-100" />
            ))}
          </div>
        ) : !forecast || totalAtRisk === 0 ? (
          <div className="card text-center py-14">
            <ShieldCheck size={36} className="mx-auto mb-3 text-success-500 opacity-60" />
            <p className="font-semibold text-surface-700">Semua stok aman</p>
            <p className="text-sm text-surface-400 mt-1">
              Tidak ada produk yang diprediksi habis dalam {forecast?.forecast_days ?? 30} hari ke depan
            </p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="card text-center py-10 text-surface-400">
            <Package size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Tidak ada produk di kategori ini</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedItems.map((item) => (
              <ForecastCard
                key={item.product_id}
                item={item}
                onRestock={(i) => setModal({ step: 'forecast-form', item: i })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Riwayat Mutasi ─────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-surface-900 mb-3">Riwayat Mutasi Stok</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Tipe</th>
                <th className="text-center">Qty</th>
                <th className="text-center hidden sm:table-cell">Sebelum</th>
                <th className="text-center hidden sm:table-cell">Sesudah</th>
                <th className="hidden md:table-cell">Catatan</th>
                <th className="hidden lg:table-cell">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {movementsLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {[160, 80, 50, 50, 50, 120, 110].map((w, j) => (
                    <td key={j}>
                      <div className="h-4 rounded bg-surface-100 animate-pulse" style={{ width: w }} />
                    </td>
                  ))}
                </tr>
              ))}

              {!movementsLoading && (movementsData?.data ?? []).map((m: any) => (
                <tr key={m.id}>
                  <td>
                    <p className="text-sm font-medium text-surface-800 truncate max-w-[150px]">
                      {m.product?.name ?? '—'}
                    </p>
                    {m.product?.sku && (
                      <code className="text-xs text-surface-400">{m.product.sku}</code>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {MOVEMENT_ICONS[m.type] ?? <Package size={14} className="text-surface-400" />}
                      <span className="text-xs text-surface-600">
                        {MOVEMENT_LABELS[m.type] ?? m.type}
                      </span>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`font-semibold text-sm ${m.quantity > 0 ? 'text-success-600' : 'text-danger-600'
                      }`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </span>
                  </td>
                  <td className="text-center hidden sm:table-cell text-xs text-surface-500">
                    {m.stock_before}
                  </td>
                  <td className="text-center hidden sm:table-cell text-xs font-medium text-surface-700">
                    {m.stock_after}
                  </td>
                  <td className="hidden md:table-cell text-xs text-surface-500 max-w-[140px] truncate">
                    {m.notes ?? '—'}
                  </td>
                  <td className="hidden lg:table-cell text-xs text-surface-400 whitespace-nowrap">
                    {formatDateTime(m.created_at)}
                  </td>
                </tr>
              ))}

              {!movementsLoading && (movementsData?.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-surface-400">
                    <Package size={24} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Belum ada riwayat mutasi</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {movementsMeta && movementsMeta.last_page > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-surface-400">
              {(movementsMeta.current_page - 1) * movementsMeta.per_page + 1}–
              {Math.min(movementsMeta.current_page * movementsMeta.per_page, movementsMeta.total)} dari {movementsMeta.total}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50">
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: movementsMeta.last_page }, (_, i) => i + 1)
                .filter((n) => Math.abs(n - page) <= 2)
                .map((n) => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${n === page ? 'bg-primary-600 text-white' : 'border border-surface-200 text-surface-600 hover:bg-surface-50'
                      }`}>
                    {n}
                  </button>
                ))}
              <button disabled={page >= movementsMeta.last_page} onClick={() => setPage(page + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}

      {/* Step 1: Pilih produk (penyesuaian manual) */}
      {modal.step === 'picker' && (
        <ProductPickerModal
          onSelect={(product) => setModal({ step: 'form', product })}
          onClose={() => setModal({ step: 'closed' })}
        />
      )}

      {/* Step 2: Form adjustment (dari picker) */}
      {modal.step === 'form' && (
        <AdjustmentFormModal
          productId={modal.product.id}
          productName={modal.product.name}
          currentStock={modal.product.stock}
          unit={modal.product.unit}
          onClose={() => setModal({ step: 'closed' })}
          onBack={() => setModal({ step: 'picker' })}
        />
      )}

      {/* Form adjustment langsung dari forecast card */}
      {modal.step === 'forecast-form' && (
        <AdjustmentFormModal
          productId={modal.item.product_id}
          productName={modal.item.product_name}
          currentStock={modal.item.current_stock}
          unit={modal.item.unit}
          suggestedQty={modal.item.recommended_restock}
          onClose={() => setModal({ step: 'closed' })}
        />
      )}
    </div>
  )
}