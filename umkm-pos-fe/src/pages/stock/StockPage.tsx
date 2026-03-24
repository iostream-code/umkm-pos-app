import { useState, useContext, useCallback, createContext } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Package, AlertTriangle, ChevronLeft, ChevronRight,
  X, SlidersHorizontal, CheckCircle, XCircle,
  ArrowDownCircle, ArrowUpCircle, RefreshCw,
  History, TrendingDown, Filter,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import axios from '@/lib/axios'
import { useStockAlert } from '@/hooks/useStockAlert'

// ─── Toast System ─────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'warning'
interface ToastItem { id: number; message: string; variant: ToastVariant }

const ToastContext = createContext<(msg: string, variant?: ToastVariant) => void>(() => { })
const useToast = () => useContext(ToastContext)

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  let nextId = 0

  const push = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const styles: Record<ToastVariant, string> = {
    success: 'bg-white border-success-200 text-success-700',
    error: 'bg-white border-danger-200 text-danger-700',
    warning: 'bg-white border-warning-200 text-warning-700',
  }
  const icons: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle size={16} className="text-success-500 shrink-0" />,
    error: <XCircle size={16} className="text-danger-500 shrink-0" />,
    warning: <AlertTriangle size={16} className="text-warning-500 shrink-0" />,
  }

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium pointer-events-auto
              animate-[slideIn_0.2s_ease-out] ${styles[t.variant]}`}
            style={{ minWidth: 260, maxWidth: 360 }}
          >
            {icons[t.variant]}
            <span className="flex-1 text-surface-800">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-surface-300 hover:text-surface-500 transition-colors ml-1">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  slug: string
  color: string | null
  icon: string | null
  sort_order: number
  children?: Category[]
}

interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  image: string | null
  price: number
  cost_price: number
  stock: number
  min_stock: number
  unit: string | null
  track_stock: boolean
  is_active: boolean
  is_low_stock: boolean
  category: { id: string; name: string } | null
  updated_at: string
}

interface ProductMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

interface StockMovement {
  id: string
  product_id: string
  product_name: string
  product_sku: string | null
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  stock_before: number
  stock_after: number
  notes: string | null
  created_at: string
}

// ─── API ──────────────────────────────────────────────────────────────────────

const productsApi = {
  list: (params: Record<string, any>) =>
    axios.get('/products', { params }).then((r) => r.data as { data: Product[]; meta: ProductMeta }),
  stockHistory: (id: string) =>
    axios.get(`/products/${id}/stock-history`).then((r) => r.data),
}

const categoriesApi = {
  list: () => axios.get('/categories').then((r) => r.data.data as Category[]),
}

const stockApi = {
  adjustment: (data: { product_id: string; type: string; quantity: number; notes: string }) =>
    axios.post('/stock/adjustment', data),
  movements: (params?: Record<string, any>) =>
    axios.get('/stock/movements', { params }).then((r) => r.data),
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-white text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all'

function Badge({ children, variant = 'default' }: {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'default' | 'neutral'
}) {
  const cls = {
    success: 'bg-success-50 text-success-700 border-success-200',
    warning: 'bg-warning-50 text-warning-700 border-warning-200',
    danger: 'bg-danger-50 text-danger-700 border-danger-200',
    default: 'bg-primary-50 text-primary-700 border-primary-200',
    neutral: 'bg-surface-100 text-surface-600 border-surface-200',
  }[variant]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${cls}`}>
      {children}
    </span>
  )
}

function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg'
}) {
  if (!open) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-display font-semibold text-surface-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function FormField({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-surface-600">
        {label}{required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MOVEMENT_ICONS: Record<string, React.ReactNode> = {
  in: <ArrowDownCircle size={14} className="text-success-500" />,
  out: <ArrowUpCircle size={14} className="text-danger-500" />,
  adjustment: <RefreshCw size={14} className="text-primary-500" />,
}
const MOVEMENT_LABELS: Record<string, string> = {
  in: 'Masuk', out: 'Keluar', adjustment: 'Penyesuaian',
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ products, lowCount, isLoading }: {
  products: Product[]
  lowCount: number
  isLoading: boolean
}) {
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
  const tracked = products.filter((p) => p.track_stock).length

  const cards = [
    {
      label: 'Total Produk',
      value: isLoading ? '…' : products.length,
      sub: 'dalam halaman ini',
      icon: <Package size={18} className="text-primary-600" />,
      bg: 'bg-primary-50',
    },
    {
      label: 'Total Stok',
      value: isLoading ? '…' : totalStock.toLocaleString('id-ID'),
      sub: 'unit di semua produk',
      icon: <SlidersHorizontal size={18} className="text-success-600" />,
      bg: 'bg-success-50',
    },
    {
      label: 'Stok Menipis',
      value: isLoading ? '…' : lowCount,
      sub: 'perlu restock segera',
      icon: <TrendingDown size={18} className="text-warning-600" />,
      bg: 'bg-warning-50',
    },
    {
      label: 'Dipantau',
      value: isLoading ? '…' : tracked,
      sub: 'produk track stok aktif',
      icon: <History size={18} className="text-surface-600" />,
      bg: 'bg-surface-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="card p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
            {c.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-surface-400">{c.label}</p>
            <p className="text-xl font-bold text-surface-900 leading-tight">{c.value}</p>
            <p className="text-xs text-surface-400 truncate">{c.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Adjustment Modal ─────────────────────────────────────────────────────────

function AdjustmentModal({ open, onClose, allProducts, preselectedId }: {
  open: boolean
  onClose: () => void
  allProducts: Product[]
  preselectedId?: string
}) {
  const toast = useToast()
  const qc = useQueryClient()

  const [adjProductId, setAdjProductId] = useState(preselectedId ?? '')
  const [adjType, setAdjType] = useState<'in' | 'out' | 'adjustment'>('in')
  const [adjQty, setAdjQty] = useState('')
  const [adjNotes, setAdjNotes] = useState('')
  const [adjError, setAdjError] = useState('')

  const adjMut = useMutation({
    mutationFn: stockApi.adjustment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-low'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['stock-products'] })
      onClose()
      setAdjProductId(''); setAdjQty(''); setAdjNotes(''); setAdjError('')
      toast('Penyesuaian stok berhasil disimpan.')
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Terjadi kesalahan.'
      setAdjError(msg)
      toast(msg, 'error')
    },
  })

  const handleAdj = () => {
    if (!adjProductId) { setAdjError('Pilih produk terlebih dahulu.'); return }
    if (!adjQty || Number(adjQty) <= 0) { setAdjError('Jumlah harus lebih dari 0.'); return }
    setAdjError('')
    adjMut.mutate({ product_id: adjProductId, type: adjType, quantity: Number(adjQty), notes: adjNotes })
  }

  const selected = allProducts.find((p) => p.id === adjProductId)

  return (
    <Modal open={open} onClose={onClose} title="Penyesuaian Stok" size="sm">
      <div className="space-y-4">

        <FormField label="Produk" required>
          <select className={inputCls} value={adjProductId} onChange={(e) => setAdjProductId(e.target.value)}>
            <option value="">— Pilih Produk —</option>
            {allProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.sku ? ` (${p.sku})` : ''} — stok: {p.stock}
              </option>
            ))}
          </select>
        </FormField>

        {/* Stok preview */}
        {selected && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 border border-surface-100">
            <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
              <Package size={15} className="text-surface-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-800 truncate">{selected.name}</p>
              {selected.sku && <p className="text-xs text-surface-400">{selected.sku}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-bold text-surface-900">{selected.stock}</p>
              <p className="text-xs text-surface-400">{selected.unit ?? 'unit'}</p>
            </div>
          </div>
        )}

        <FormField label="Tipe Pergerakan" required>
          <div className="grid grid-cols-3 gap-2">
            {(['in', 'out', 'adjustment'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setAdjType(t)}
                className={`py-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all
                  ${adjType === t ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-surface-200 text-surface-600 hover:border-surface-300'}`}>
                {MOVEMENT_ICONS[t]}
                {MOVEMENT_LABELS[t]}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Jumlah" required>
          <input className={inputCls} type="number" min={1} value={adjQty}
            onChange={(e) => setAdjQty(e.target.value)} placeholder="0" />
        </FormField>

        <FormField label="Catatan">
          <textarea className={`${inputCls} resize-none`} rows={2} value={adjNotes}
            onChange={(e) => setAdjNotes(e.target.value)} placeholder="Alasan penyesuaian..." />
        </FormField>

        {adjError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-50 border border-danger-200">
            <AlertTriangle size={14} className="text-danger-500 shrink-0" />
            <p className="text-xs text-danger-700">{adjError}</p>
          </div>
        )}

        <button onClick={handleAdj} disabled={adjMut.isPending}
          className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
          {adjMut.isPending ? 'Menyimpan...' : 'Simpan Penyesuaian'}
        </button>
      </div>
    </Modal>
  )
}

// ─── History Modal ────────────────────────────────────────────────────────────

function HistoryModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { data: histData, isLoading } = useQuery({
    queryKey: ['stock-history', product?.id],
    queryFn: () => productsApi.stockHistory(product!.id),
    enabled: !!product,
  })

  return (
    <Modal open={!!product} onClose={onClose} title={`Riwayat Stok: ${product?.name ?? ''}`} size="md">
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}
      {!isLoading && (histData?.data ?? []).length === 0 && (
        <p className="text-sm text-surface-400 text-center py-8">Belum ada riwayat untuk produk ini.</p>
      )}
      {!isLoading && (histData?.data ?? []).map((m: StockMovement) => (
        <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-surface-50 last:border-0">
          <div className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
            {MOVEMENT_ICONS[m.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-surface-700">{m.notes ?? MOVEMENT_LABELS[m.type]}</p>
            <p className="text-xs text-surface-400">{formatDate(m.created_at)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-sm font-semibold ${m.type === 'in' ? 'text-success-600' : m.type === 'out' ? 'text-danger-600' : 'text-primary-600'}`}>
              {m.type === 'in' ? '+' : m.type === 'out' ? '-' : '~'}{m.quantity}
            </p>
            <p className="text-xs text-surface-400">{m.stock_before}→{m.stock_after}</p>
          </div>
        </div>
      ))}
    </Modal>
  )
}

// ─── Stock Table ──────────────────────────────────────────────────────────────

function StockTable({
  products, meta, isLoading, page, onPageChange,
  onAdjust, onHistory, lowStockIds,
}: {
  products: Product[]
  meta?: ProductMeta
  isLoading: boolean
  page: number
  onPageChange: (p: number) => void
  onAdjust: (product: Product) => void
  onHistory: (product: Product) => void
  lowStockIds: Set<string>
}) {
  const getStockBadge = (p: Product, isAlertLow: boolean) => {
    if (!p.track_stock) return <Badge variant="neutral">Tidak Dipantau</Badge>
    if (p.stock === 0) return <Badge variant="danger">Habis</Badge>
    if (isAlertLow) return <Badge variant="warning">Menipis</Badge>
    return <Badge variant="success">Aman</Badge>
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">PRODUK</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 hidden sm:table-cell">KATEGORI</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">STOK</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 hidden md:table-cell">MIN. STOK</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">STATUS</th>
              <th className="px-4 py-3 text-xs font-semibold text-surface-500 hidden lg:table-cell text-right">TERAKHIR UPDATE</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-surface-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-surface-100 animate-pulse shrink-0" />
                    <div className="space-y-1.5">
                      <div className="w-32 h-3 rounded bg-surface-100 animate-pulse" />
                      <div className="w-20 h-2.5 rounded bg-surface-100 animate-pulse" />
                    </div>
                  </div>
                </td>
                {[...Array(5)].map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-3 w-16 mx-auto rounded bg-surface-100 animate-pulse" />
                  </td>
                ))}
                <td className="px-4 py-3" />
              </tr>
            ))}

            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <Package size={32} className="mx-auto text-surface-200 mb-3" />
                  <p className="text-sm font-medium text-surface-400">Tidak ada produk ditemukan</p>
                  <p className="text-xs text-surface-300 mt-1">Coba ubah filter atau kata kunci pencarian</p>
                </td>
              </tr>
            )}

            {!isLoading && products.map((p) => {
              const isAlertLow = lowStockIds.has(p.id)
              return (
                <tr key={p.id} className={`border-b border-surface-50 transition-colors
                ${isAlertLow
                    ? 'bg-warning-50/40 hover:bg-warning-50/70'
                    : 'hover:bg-surface-50/60'}`}>
                  {/* Produk */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-surface-100 shrink-0 overflow-hidden flex items-center justify-center
                      ${isAlertLow ? 'bg-warning-100' : 'bg-surface-100'}`}>
                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package size={16} className={isAlertLow ? 'text-warning-600' : 'text-surface-400'} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-surface-800 truncate max-w-[160px]">{p.name}</p>
                          {isAlertLow && (
                            <AlertTriangle size={12} className="text-warning-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-surface-400">{p.sku ?? '—'}</p>
                      </div>
                    </div>
                  </td>

                  {/* Kategori */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {p.category
                      ? <Badge variant="default">{p.category.name}</Badge>
                      : <span className="text-xs text-surface-300">—</span>}
                  </td>

                  {/* Stok */}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-base font-bold
                    ${p.stock === 0 ? 'text-danger-600' : isAlertLow ? 'text-warning-600' : 'text-surface-800'}`}>
                      {p.stock}
                    </span>
                    {p.unit && <span className="text-xs text-surface-400 ml-1">{p.unit}</span>}
                  </td>

                  {/* Min stok */}
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className="text-sm text-surface-500">{p.min_stock}</span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    {getStockBadge(p, isAlertLow)}
                  </td>

                  {/* Terakhir update */}
                  <td className="px-4 py-3 text-right text-xs text-surface-400 hidden lg:table-cell whitespace-nowrap">
                    {formatDate(p.updated_at)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => onHistory(p)}
                        title="Riwayat stok"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                        <History size={15} />
                      </button>
                      <button
                        onClick={() => onAdjust(p)}
                        title="Sesuaikan stok"
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                        ${isAlertLow
                            ? 'text-warning-500 hover:text-warning-700 hover:bg-warning-100'
                            : 'text-surface-400 hover:text-success-600 hover:bg-success-50'}`}>
                        <SlidersHorizontal size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
          <p className="text-xs text-surface-400">
            {((meta.current_page - 1) * meta.per_page) + 1}–{Math.min(meta.current_page * meta.per_page, meta.total)} dari {meta.total} produk
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-surface-500 px-2">Hal. {meta.current_page} / {meta.last_page}</span>
            <button disabled={page >= meta.last_page} onClick={() => onPageChange(page + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page Inner ──────────────────────────────────────────────────────────

function StockPageInner() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState<'low' | 'out' | ''>('')
  const [adjModal, setAdjModal] = useState(false)
  const [adjPreselect, setAdjPreselect] = useState<string | undefined>()
  const [histProduct, setHistProduct] = useState<Product | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Shared hook — sudah polling otomatis tiap 3 menit
  const { lowStockProducts, lowStockCount, hasAlert } = useStockAlert()

  // Fetch categories for filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  })

  // Fetch all products (stock view)
  const params = {
    search: search || undefined,
    category_id: filterCat || undefined,
    low_stock: filterStatus === 'low' ? '1' : undefined,
    out_of_stock: filterStatus === 'out' ? '1' : undefined,
    track_stock: '1',
    page,
    per_page: 15,
    sort_by: 'stock',
    sort_dir: 'asc',
  }

  const { data, isLoading } = useQuery({
    queryKey: ['stock-products', params],
    queryFn: () => productsApi.list(params),
    placeholderData: (prev) => prev,
  })

  // All products for adjustment modal select
  const { data: allProductsData } = useQuery({
    queryKey: ['stock-products', { per_page: 200, sort_by: 'name', sort_dir: 'asc' }],
    queryFn: () => productsApi.list({ per_page: 200, sort_by: 'name', sort_dir: 'asc' }),
  })
  const allProducts = allProductsData?.data ?? []

  const products = data?.data ?? []
  const meta = data?.meta
  const allCats = categories.flatMap((c) => [c, ...(c.children ?? [])])

  // Set low stock IDs untuk highlight tabel
  const lowStockIds = new Set(lowStockProducts.map((p) => p.id))

  // Reset banner saat data berubah (misal setelah adjustment berhasil)
  const prevHasAlert = !hasAlert
  if (!hasAlert && !prevHasAlert) setBannerDismissed(false)

  const handleAdjust = (p: Product) => {
    setAdjPreselect(p.id)
    setAdjModal(true)
  }

  const handleAdjClose = () => {
    setAdjModal(false)
    setAdjPreselect(undefined)
  }

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">Manajemen Stok</h2>
          <p className="text-sm text-surface-400 mt-0.5">Pantau, filter, dan sesuaikan stok produk toko Anda</p>
        </div>
        <button
          onClick={() => { setAdjPreselect(undefined); setAdjModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors shrink-0">
          <SlidersHorizontal size={15} />
          Penyesuaian Stok
        </button>
      </div>

      {/* ── Banner Alert Stok Menipis ── */}
      {hasAlert && !bannerDismissed && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-warning-50 border border-warning-200 animate-[slideIn_0.2s_ease-out]">
          <div className="w-8 h-8 rounded-xl bg-warning-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={16} className="text-warning-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-warning-800">
              {lowStockCount} produk membutuhkan restock segera
            </p>
            <p className="text-xs text-warning-600 mt-0.5">
              {lowStockProducts.slice(0, 3).map((p) => p.name).join(', ')}
              {lowStockCount > 3 ? ` dan ${lowStockCount - 3} lainnya` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setFilterStatus('low'); setBannerDismissed(true) }}
              className="px-3 py-1.5 rounded-lg bg-warning-600 hover:bg-warning-700 text-white text-xs font-semibold transition-colors">
              Tampilkan
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-warning-400 hover:text-warning-600 hover:bg-warning-100 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards products={products} lowCount={lowStockCount} isLoading={isLoading} />

      {/* Toolbar: search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Cari nama produk atau SKU..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <div className="flex gap-2 flex-wrap shrink-0">
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <select
              className={`${inputCls} pl-8 w-auto`}
              value={filterCat}
              onChange={(e) => { setFilterCat(e.target.value); setPage(1) }}>
              <option value="">Semua Kategori</option>
              {allCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex rounded-xl border border-surface-200 overflow-hidden bg-white text-sm">
            {[
              { value: '', label: 'Semua' },
              { value: 'low', label: 'Menipis' },
              { value: 'out', label: 'Habis' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setFilterStatus(opt.value as any); setPage(1) }}
                className={`px-3 py-2 font-medium transition-all whitespace-nowrap
                  ${filterStatus === opt.value
                    ? opt.value === 'out' ? 'bg-danger-600 text-white'
                      : opt.value === 'low' ? 'bg-warning-500 text-white'
                        : 'bg-primary-600 text-white'
                    : 'text-surface-500 hover:bg-surface-50'}`}>
                {opt.value === 'low' && lowStockCount > 0 && filterStatus !== 'low' && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-warning-100 text-warning-700 text-[10px] font-bold mr-1.5">
                    {lowStockCount}
                  </span>
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <StockTable
        products={products}
        meta={meta}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
        onAdjust={handleAdjust}
        onHistory={setHistProduct}
        lowStockIds={lowStockIds}
      />

      {/* Adjustment Modal */}
      <AdjustmentModal
        open={adjModal}
        onClose={handleAdjClose}
        allProducts={allProducts}
        preselectedId={adjPreselect}
      />

      {/* History Modal */}
      <HistoryModal product={histProduct} onClose={() => setHistProduct(null)} />
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function StockPage() {
  return (
    <ToastProvider>
      <StockPageInner />
    </ToastProvider>
  )
}