import { useState, useRef, useContext, useCallback, createContext } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Edit2, Trash2, Package,
  Tag, AlertTriangle, ChevronLeft, ChevronRight,
  X, Upload, ToggleLeft, ToggleRight, Layers,
  CheckCircle, XCircle, Image as ImageIcon, SlidersHorizontal,
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import axios from '@/lib/axios'

// ─── Toast System ─────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'warning'
interface ToastItem { id: number; message: string; variant: ToastVariant }

const ToastContext = createContext<(msg: string, variant?: ToastVariant) => void>(() => { })
export const useToast = () => useContext(ToastContext)

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
      {/* Toast container — fixed bottom-right */}
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
  description: string | null
  image: string | null
  price: number
  cost_price: number
  margin: number
  stock: number
  min_stock: number
  unit: string | null
  track_stock: boolean
  is_active: boolean
  is_low_stock: boolean
  category: { id: string; name: string } | null
  created_at: string
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

// ─── API helpers ──────────────────────────────────────────────────────────────
// Endpoint sesuai api.php:
//   Route::apiResource('products', ProductController::class)
//   Route::get('products/{id}/stock-history', [StockController::class, 'productHistory'])
//   Route::apiResource('categories', CategoryController::class)
//   Route::get('stock/low', ...)
//   Route::post('stock/adjustment', ...)
//   Route::get('stock/movements', ...)

const productsApi = {
  list: (params: Record<string, any>) =>
    axios.get('/products', { params }).then((r) => r.data as { data: Product[]; meta: ProductMeta }),
  create: (form: FormData) =>
    axios.post('/products', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  // PUT /products/{product} — method spoofing karena FormData
  update: (id: string, form: FormData) =>
    axios.post(`/products/${id}?_method=PUT`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id: string) => axios.delete(`/products/${id}`),
  // GET /products/{product}/stock-history
  stockHistory: (id: string) =>
    axios.get(`/products/${id}/stock-history`).then((r) => r.data),
}

const categoriesApi = {
  list: () => axios.get('/categories').then((r) => r.data.data as Category[]),
  create: (data: Partial<Category>) => axios.post('/categories', data),
  update: (id: string, data: Partial<Category>) => axios.put(`/categories/${id}`, data),
  remove: (id: string) => axios.delete(`/categories/${id}`),
}

const stockApi = {
  // GET  /stock/low
  low: () => axios.get('/stock/low').then((r) => r.data.data as Product[]),
  // POST /stock/adjustment
  adjustment: (data: { product_id: string; type: string; quantity: number; notes: string }) =>
    axios.post('/stock/adjustment', data),
  // GET  /stock/movements
  movements: (params?: Record<string, any>) =>
    axios.get('/stock/movements', { params }).then((r) => r.data),
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

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

function ConfirmModal({ open, onClose, onConfirm, loading, title, description }: {
  open: boolean; onClose: () => void; onConfirm: () => void; loading?: boolean; title: string; description: string
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-surface-500 mb-5">{description}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Batal</button>
        <button onClick={onConfirm} disabled={loading}
          className="px-4 py-2 rounded-xl bg-danger-600 hover:bg-danger-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? 'Menghapus...' : 'Hapus'}
        </button>
      </div>
    </Modal>
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

const inputCls = 'w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-white text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all'

// ─── Product Form ─────────────────────────────────────────────────────────────

const emptyProduct = {
  name: '', sku: '', barcode: '', description: '', price: '', cost_price: '',
  stock: '', min_stock: '', unit: 'pcs', category_id: '', track_stock: true, is_active: true,
}

function ProductForm({ initial, categories, onSubmit, loading, errors }: {
  initial?: Partial<typeof emptyProduct & { image?: string | null }>
  categories: Category[]
  onSubmit: (form: FormData) => void
  loading: boolean
  errors: Record<string, string>
}) {
  const [form, setForm] = useState({ ...emptyProduct, ...initial })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }))

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = () => {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) fd.append(k, String(v))
    })
    fd.set('track_stock', form.track_stock ? '1' : '0')
    fd.set('is_active', form.is_active ? '1' : '0')
    if (imageFile) fd.append('image', imageFile)
    onSubmit(fd)
  }

  const allCats = categories.flatMap((c) => [c, ...(c.children ?? [])])

  return (
    <div className="space-y-4">
      {/* Image upload */}
      <div onClick={() => fileRef.current?.click()}
        className="relative w-full h-36 rounded-xl border-2 border-dashed border-surface-200 bg-surface-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-all overflow-hidden group">
        {imagePreview ? (
          <>
            <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
            <div className="absolute inset-0 bg-surface-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <span className="text-white text-xs font-medium flex items-center gap-1.5"><Upload size={14} />Ganti Gambar</span>
            </div>
          </>
        ) : (
          <>
            <ImageIcon size={24} className="text-surface-300" />
            <span className="text-xs text-surface-400">Upload gambar produk</span>
            <span className="text-xs text-surface-300">JPG, PNG, WebP · Maks 2MB</span>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nama Produk" required error={errors.name}>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nama produk..." />
        </FormField>
        <FormField label="Kategori">
          <select className={inputCls} value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">— Tanpa Kategori —</option>
            {allCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="SKU" error={errors.sku}>
          <input className={inputCls} value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="AUTO jika kosong" />
        </FormField>
        <FormField label="Barcode" error={errors.barcode}>
          <input className={inputCls} value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="Scan atau ketik..." />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Harga Jual" required error={errors.price}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 font-medium">Rp</span>
            <input className={`${inputCls} pl-8`} type="number" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0" />
          </div>
        </FormField>
        <FormField label="Harga Modal" error={errors.cost_price}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 font-medium">Rp</span>
            <input className={`${inputCls} pl-8`} type="number" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} placeholder="0" />
          </div>
        </FormField>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FormField label="Stok Awal" required error={errors.stock}>
          <input className={inputCls} type="number" value={form.stock} onChange={(e) => set('stock', e.target.value)} placeholder="0" />
        </FormField>
        <FormField label="Stok Minimum" error={errors.min_stock}>
          <input className={inputCls} type="number" value={form.min_stock} onChange={(e) => set('min_stock', e.target.value)} placeholder="0" />
        </FormField>
        <FormField label="Satuan">
          <input className={inputCls} value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="pcs, kg, box..." />
        </FormField>
      </div>

      <FormField label="Deskripsi">
        <textarea className={`${inputCls} resize-none`} rows={2} value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)} placeholder="Deskripsi opsional..." />
      </FormField>

      <div className="flex gap-4">
        <button type="button" onClick={() => set('track_stock', !form.track_stock)}
          className="flex items-center gap-2 text-sm text-surface-600 hover:text-surface-900 transition-colors">
          {form.track_stock ? <ToggleRight size={22} className="text-primary-500" /> : <ToggleLeft size={22} className="text-surface-300" />}
          Kelola Stok
        </button>
        <button type="button" onClick={() => set('is_active', !form.is_active)}
          className="flex items-center gap-2 text-sm text-surface-600 hover:text-surface-900 transition-colors">
          {form.is_active ? <ToggleRight size={22} className="text-success-500" /> : <ToggleLeft size={22} className="text-surface-300" />}
          Produk Aktif
        </button>
      </div>

      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
        {loading ? 'Menyimpan...' : 'Simpan Produk'}
      </button>
    </div>
  )
}

// ─── Category Form ────────────────────────────────────────────────────────────

const PRESET_COLORS = ['#3670ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1', '#84cc16', '#f97316']
const PRESET_ICONS = ['🛒', '🥗', '🥩', '🥤', '🍰', '🧴', '👕', '📦', '💊', '🎮', '⚡', '🛠']

function CategoryForm({ initial, parentCategories, lockedParentId, onSubmit, loading, onCancel }: {
  initial?: Partial<Category & { parent_id?: string | null }>
  /** Hanya root kategori — untuk pilihan parent */
  parentCategories: Category[]
  /** Jika diisi, select parent dikunci (misal klik "Tambah Sub" dari baris parent) */
  lockedParentId?: string | null
  onSubmit: (data: Partial<Category & { parent_id: string | null }>) => void
  loading: boolean
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    color: initial?.color ?? '#3670ff',
    icon: initial?.icon ?? '',
    sort_order: initial?.sort_order ?? 0,
    // lockedParentId takes priority → pre-fills parent saat klik "Tambah Sub"
    parent_id: lockedParentId !== undefined ? lockedParentId : (initial?.parent_id ?? null),
  })
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const isLocked = lockedParentId !== undefined

  return (
    <div className="space-y-3 py-1">
      <FormField label="Nama Kategori" required>
        <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nama kategori..." />
      </FormField>

      {/* Parent kategori */}
      <FormField label="Tipe">
        {isLocked ? (
          // Locked — tampilkan nama parent saja, tidak bisa diubah
          <div className={`${inputCls} bg-surface-50 text-surface-500 cursor-not-allowed flex items-center gap-2`}>
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-md font-medium">Sub-kategori dari</span>
            <span className="font-medium text-surface-700">
              {parentCategories.find((c) => c.id === lockedParentId)?.name ?? '—'}
            </span>
          </div>
        ) : (
          <select
            className={inputCls}
            value={form.parent_id ?? ''}
            onChange={(e) => set('parent_id', e.target.value || null)}
          >
            <option value="">— Kategori Utama (Root) —</option>
            {parentCategories
              // Cegah kategori menjadi parent dari dirinya sendiri saat edit
              .filter((c) => c.id !== initial?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        )}
      </FormField>

      <FormField label="Warna">
        <div className="flex flex-wrap gap-1.5 mt-1">
          {PRESET_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-lg border-2 transition-all ${form.color === c ? 'border-surface-900 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)}
            className="w-7 h-7 rounded-lg border-2 border-surface-200 cursor-pointer" />
        </div>
      </FormField>

      <FormField label="Ikon">
        <div className="flex flex-wrap gap-1.5 mt-1">
          {PRESET_ICONS.map((ic) => (
            <button key={ic} type="button" onClick={() => set('icon', ic)}
              className={`w-8 h-8 rounded-lg border text-base transition-all ${form.icon === ic ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:border-surface-300'}`}>
              {ic}
            </button>
          ))}
          {form.icon && (
            <button type="button" onClick={() => set('icon', '')}
              className="w-8 h-8 rounded-lg border border-surface-200 text-xs text-surface-400 hover:border-danger-300 hover:text-danger-500 transition-all">
              ✕
            </button>
          )}
        </div>
      </FormField>

      <FormField label="Urutan Tampil">
        <input className={inputCls} type="number" min={0} value={form.sort_order}
          onChange={(e) => set('sort_order', Number(e.target.value))} />
      </FormField>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-surface-200 text-sm text-surface-600 hover:bg-surface-50 transition-colors">
          Batal
        </button>
        <button onClick={() => onSubmit(form)} disabled={loading || !form.name.trim()}
          className="flex-1 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab({ categories }: { categories: Category[] }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLow, setFilterLow] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const params = {
    search: search || undefined,
    category_id: filterCat || undefined,
    is_active: filterStatus !== '' ? filterStatus : undefined,
    low_stock: filterLow ? '1' : undefined,
    page,
    per_page: 15,
    sort_by: 'name',
    sort_dir: 'asc',
  }

  const { data, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.list(params),
    placeholderData: (prev) => prev,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['products'] })

  const createMut = useMutation({
    mutationFn: (fd: FormData) => productsApi.create(fd),
    onSuccess: () => {
      invalidate(); setShowForm(false); setFormErrors({})
      toast('Produk berhasil ditambahkan.')
    },
    onError: (e: any) => {
      setFormErrors(e.response?.data?.errors ?? {})
      toast(e.response?.data?.message ?? 'Gagal menambahkan produk.', 'error')
    },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, fd }: { id: string; fd: FormData }) => productsApi.update(id, fd),
    onSuccess: () => {
      invalidate(); setEditing(null); setFormErrors({})
      toast('Produk berhasil diperbarui.')
    },
    onError: (e: any) => {
      setFormErrors(e.response?.data?.errors ?? {})
      toast(e.response?.data?.message ?? 'Gagal memperbarui produk.', 'error')
    },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      invalidate(); setDeleting(null)
      toast('Produk berhasil dihapus.', 'warning')
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Gagal menghapus produk.', 'error'),
  })

  const products = data?.data ?? []
  const meta = data?.meta
  const allCats = categories.flatMap((c) => [c, ...(c.children ?? [])])

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input className={`${inputCls} pl-9`} placeholder="Cari nama, SKU, barcode..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <select className={`${inputCls} w-auto`} value={filterCat} onChange={(e) => { setFilterCat(e.target.value); setPage(1) }}>
            <option value="">Semua Kategori</option>
            {allCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={`${inputCls} w-auto`} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
          <button onClick={() => { setFilterLow((v) => !v); setPage(1) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${filterLow ? 'bg-warning-50 border-warning-300 text-warning-700' : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'}`}>
            <AlertTriangle size={14} />Stok Tipis
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
            <Plus size={15} />Tambah
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">PRODUK</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">KATEGORI</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">HARGA JUAL</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">HARGA MODAL</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">STOK</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">STATUS</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-surface-50">
                <td colSpan={7} className="px-4 py-3"><div className="h-4 bg-surface-100 rounded animate-pulse" /></td>
              </tr>
            ))}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Package size={32} className="mx-auto text-surface-200 mb-2" />
                  <p className="text-sm text-surface-400">Belum ada produk</p>
                </td>
              </tr>
            )}
            {!isLoading && products.map((p) => (
              <tr key={p.id} className="border-b border-surface-50 hover:bg-surface-50/60 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-100 shrink-0 overflow-hidden flex items-center justify-center">
                      {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package size={16} className="text-surface-300" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-surface-800 truncate max-w-[180px]">{p.name}</p>
                      <p className="text-xs text-surface-400 mt-0.5">{p.sku ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.category ? <Badge variant="default">{p.category.name}</Badge> : <span className="text-surface-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-medium text-surface-800">{formatRupiah(p.price)}</td>
                <td className="px-4 py-3 text-right text-surface-500">{p.cost_price > 0 ? formatRupiah(p.cost_price) : '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-semibold ${p.is_low_stock ? 'text-warning-600' : 'text-surface-800'}`}>{p.stock}</span>
                  {p.unit && <span className="text-xs text-surface-400 ml-1">{p.unit}</span>}
                  {p.is_low_stock && <AlertTriangle size={11} className="inline ml-1 text-warning-500" />}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={p.is_active ? 'success' : 'neutral'}>
                    {p.is_active ? <><CheckCircle size={10} />Aktif</> : <><XCircle size={10} />Nonaktif</>}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditing(p); setFormErrors({}) }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleting(p)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-surface-400">
            {(meta.current_page - 1) * meta.per_page + 1}–{Math.min(meta.current_page * meta.per_page, meta.total)} dari{' '}
            <span className="font-medium text-surface-600">{meta.total}</span> produk
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50 transition-colors">
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: meta.last_page }, (_, i) => i + 1)
              .filter((n) => Math.abs(n - page) <= 2)
              .map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${n === page ? 'bg-primary-600 text-white' : 'border border-surface-200 text-surface-600 hover:bg-surface-50'}`}>
                  {n}
                </button>
              ))}
            <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setFormErrors({}) }} title="Tambah Produk Baru" size="lg">
        <ProductForm categories={categories} onSubmit={(fd) => createMut.mutate(fd)} loading={createMut.isPending} errors={formErrors} />
      </Modal>
      <Modal open={!!editing} onClose={() => { setEditing(null); setFormErrors({}) }} title="Edit Produk" size="lg">
        {editing && (
          <ProductForm
            initial={{
              name: editing.name, sku: editing.sku ?? '', barcode: editing.barcode ?? '',
              description: editing.description ?? '', price: String(editing.price),
              cost_price: String(editing.cost_price), stock: String(editing.stock),
              min_stock: String(editing.min_stock), unit: editing.unit ?? 'pcs',
              category_id: editing.category?.id ?? '', track_stock: editing.track_stock,
              is_active: editing.is_active, image: editing.image,
            }}
            categories={categories}
            onSubmit={(fd) => updateMut.mutate({ id: editing.id, fd })}
            loading={updateMut.isPending}
            errors={formErrors}
          />
        )}
      </Modal>
      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)} loading={deleteMut.isPending}
        title="Hapus Produk" description={`Yakin hapus "${deleting?.name}"? Tindakan ini tidak dapat dibatalkan.`} />
    </>
  )
}

// ─── Categories Tab ───────────────────────────────────────────────────────────
// formMode variants:
//   'idle'                        → tampilkan tombol "Tambah Kategori"
//   { type:'add' }                → form tambah kategori root
//   { type:'addSub', parentId }   → form tambah sub-kategori, parent dikunci
//   { type:'edit', cat }          → form edit kategori (root atau child)

type FormMode =
  | 'idle'
  | { type: 'add' }
  | { type: 'addSub'; parentId: string }
  | { type: 'edit'; cat: Category & { parent_id?: string | null } }

function CategoriesTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const [formMode, setFormMode] = useState<FormMode>('idle')
  const [deleting, setDeleting] = useState<Category | null>(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] })

  const createMut = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      invalidate(); setFormMode('idle')
      toast('Kategori berhasil ditambahkan.')
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Gagal menambahkan kategori.', 'error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category & { parent_id: string | null }> }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      invalidate(); setFormMode('idle')
      toast('Kategori berhasil diperbarui.')
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Gagal memperbarui kategori.', 'error'),
  })
  const deleteMut = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      invalidate(); setDeleting(null)
      toast('Kategori berhasil dihapus.', 'warning')
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Gagal menghapus kategori.', 'error'),
  })

  // Label & konteks form panel
  const formTitle =
    formMode === 'idle' ? '' :
      formMode.type === 'add' ? 'Tambah Kategori Utama' :
        formMode.type === 'addSub' ? `Tambah Sub-kategori` :
    /* edit */                              `Edit: ${formMode.cat.name}`

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── List ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-2">
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-surface-100 animate-pulse" />
          ))}

          {!isLoading && categories.length === 0 && (
            <div className="text-center py-12">
              <Layers size={32} className="mx-auto text-surface-200 mb-2" />
              <p className="text-sm text-surface-400">Belum ada kategori</p>
            </div>
          )}

          {!isLoading && categories.map((cat) => (
            <div key={cat.id}>

              {/* Parent row */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-surface-100 bg-white hover:border-surface-200 transition-colors group">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: cat.color ? `${cat.color}20` : '#f0f2f7' }}>
                  {cat.icon ?? <Tag size={16} style={{ color: cat.color ?? '#8896b3' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-surface-800 text-sm">{cat.name}</p>
                    {cat.color && <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                  </div>
                  <p className="text-xs text-surface-400">
                    {(cat.children?.length ?? 0) > 0
                      ? `${cat.children!.length} sub-kategori`
                      : 'Kategori utama'}
                  </p>
                </div>
                {/* Action buttons — visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Tambah sub-kategori langsung dari baris parent */}
                  <button
                    onClick={() => setFormMode({ type: 'addSub', parentId: cat.id })}
                    title="Tambah sub-kategori"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-success-600 hover:bg-success-50 transition-colors">
                    <Plus size={13} />
                  </button>
                  <button
                    onClick={() => setFormMode({ type: 'edit', cat: { ...cat, parent_id: null } })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => setDeleting(cat)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Children rows */}
              {(cat.children ?? []).map((child) => (
                <div key={child.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-surface-50 bg-surface-50/50 ml-7 mt-1 hover:border-surface-200 transition-colors group">
                  {/* Connector line */}
                  <div className="absolute -ml-4 w-4 h-px bg-surface-200" />
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: child.color ? `${child.color}20` : '#f0f2f7' }}>
                    {child.icon ?? <span className="text-surface-300 text-xs">—</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-700 font-medium truncate">{child.name}</p>
                    {child.color && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: child.color }} />
                        <span className="text-xs text-surface-400">sub dari {cat.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setFormMode({ type: 'edit', cat: { ...child, parent_id: cat.id } })}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleting(child)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Form panel ──────────────────────────────────────── */}
        <div className="card self-start sticky top-4">
          {formMode === 'idle' ? (
            <div className="text-center py-4">
              <Tag size={28} className="mx-auto text-surface-200 mb-3" />
              <p className="text-sm font-medium text-surface-700 mb-1">Kelola Kategori</p>
              <p className="text-xs text-surface-400 mb-4">
                Buat kategori utama atau sub-kategori untuk mengorganisir produk
              </p>
              <button
                onClick={() => setFormMode({ type: 'add' })}
                className="flex items-center gap-1.5 mx-auto px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
                <Plus size={15} />Tambah Kategori
              </button>
            </div>
          ) : (
            <>
              <h4 className="font-semibold text-surface-800 text-sm mb-4">{formTitle}</h4>
              <CategoryForm
                /* Untuk 'addSub': kosong tapi parent dikunci */
                initial={
                  formMode !== 'idle' && formMode.type === 'edit'
                    ? formMode.cat
                    : undefined
                }
                parentCategories={categories}
                lockedParentId={
                  formMode !== 'idle' && formMode.type === 'addSub'
                    ? formMode.parentId
                    : undefined
                }
                onSubmit={(data) => {
                  if (formMode !== 'idle' && formMode.type === 'edit') {
                    updateMut.mutate({ id: formMode.cat.id, data })
                  } else {
                    createMut.mutate(data)
                  }
                }}
                loading={createMut.isPending || updateMut.isPending}
                onCancel={() => setFormMode('idle')}
              />
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
        loading={deleteMut.isPending}
        title="Hapus Kategori"
        description={`Hapus "${deleting?.name}"? Produk di dalamnya jadi tanpa kategori, sub-kategori dipindah ke root.`}
      />
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'products' | 'categories' | 'stock'

export default function ProductsPage() {
  return (
    <ToastProvider>
      <ProductsPageInner />
    </ToastProvider>
  )
}

function ProductsPageInner() {
  const [tab, setTab] = useState<Tab>('products')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  })

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'products', label: 'Produk', icon: <Package size={15} /> },
    { id: 'categories', label: 'Kategori', icon: <Tag size={15} /> },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-surface-900">Manajemen Produk</h2>
        <p className="text-sm text-surface-400 mt-0.5">Kelola produk, kategori, dan stok toko Anda</p>
      </div>

      <div className="card p-1.5">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {tab === 'products' && <ProductsTab categories={categories} />}
        {tab === 'categories' && <CategoriesTab />}
      </div>
    </div>
  )
}