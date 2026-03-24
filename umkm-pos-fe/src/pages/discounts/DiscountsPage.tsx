import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Tag, Pencil, Trash2, X,
  Loader2, ToggleLeft, ToggleRight, Percent, Banknote,
} from 'lucide-react'
import { discountApi } from '@/api'
import { formatRupiah, formatDate, formatDateTime, getAxiosErrorMessage } from '@/lib/utils'
import type { Discount } from '@/types'
import toast from 'react-hot-toast'

// ── Form schema ───────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, 'Nama wajib diisi'),
  code: z.string().optional(),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().min(0.01, 'Nilai harus lebih dari 0'),
  min_purchase: z.coerce.number().min(0).optional(),
  max_discount: z.coerce.number().min(0).optional(),
  usage_limit: z.coerce.number().int().min(1).optional(),
  is_active: z.boolean(),
  starts_at: z.string().optional(),
  expires_at: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Modal ─────────────────────────────────────────────────────────
function DiscountModal({ discount, onClose }: { discount?: Discount; onClose: () => void }) {
  const qc = useQueryClient()
  const isEdit = !!discount

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? {
      name: discount.name,
      code: discount.code ?? '',
      type: discount.type,
      value: discount.value,
      min_purchase: discount.min_purchase,
      max_discount: discount.max_discount ?? undefined,
      usage_limit: discount.usage_limit ?? undefined,
      is_active: discount.is_active,
      starts_at: discount.starts_at?.split('T')[0] ?? '',
      expires_at: discount.expires_at?.split('T')[0] ?? '',
    } : { type: 'percentage', is_active: true, value: 10 },
  })

  const type = watch('type')

  const mutation = useMutation({
    mutationFn: (data: FormData) => isEdit
      ? discountApi.update(discount!.id, data)
      : discountApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discounts'] })
      toast.success(isEdit ? 'Diskon diperbarui.' : 'Diskon berhasil ditambahkan.')
      onClose()
    },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-card-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-5 py-4 border-b border-surface-100 sticky top-0 bg-white">
          <h3 className="font-display font-semibold">{isEdit ? 'Edit Diskon' : 'Tambah Diskon'}</h3>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-surface-600 mb-1">Nama Diskon</label>
              <input {...register('name')} className="input" placeholder="Diskon Lebaran" />
              {errors.name && <p className="text-xs text-danger-500 mt-1">{errors.name.message}</p>}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-surface-600 mb-1">Kode Voucher <span className="text-surface-400">(opsional)</span></label>
              <input {...register('code')} className="input uppercase" placeholder="DISKON10" />
            </div>

            {/* Tipe diskon */}
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Tipe</label>
              <div className="flex rounded-xl border border-surface-200 overflow-hidden">
                {[
                  { val: 'percentage', label: 'Persen', icon: <Percent size={13} /> },
                  { val: 'fixed', label: 'Nominal', icon: <Banknote size={13} /> },
                ].map((opt) => (
                  <label key={opt.val} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium cursor-pointer transition-colors ${watch('type') === opt.val ? 'bg-primary-600 text-white' : 'text-surface-500 hover:bg-surface-50'
                    }`}>
                    <input {...register('type')} type="radio" value={opt.val} className="sr-only" />
                    {opt.icon}{opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">
                Nilai {type === 'percentage' ? '(%)' : '(Rp)'}
              </label>
              <input {...register('value')} type="number" step="0.01" className="input"
                placeholder={type === 'percentage' ? '10' : '50000'} />
              {errors.value && <p className="text-xs text-danger-500 mt-1">{errors.value.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Min. Pembelian (Rp)</label>
              <input {...register('min_purchase')} type="number" className="input" placeholder="0" />
            </div>

            {type === 'percentage' && (
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Maks. Diskon (Rp)</label>
                <input {...register('max_discount')} type="number" className="input" placeholder="Tidak terbatas" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Batas Penggunaan</label>
              <input {...register('usage_limit')} type="number" className="input" placeholder="Tidak terbatas" />
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Berlaku Mulai</label>
              <input {...register('starts_at')} type="date" className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Berlaku Sampai</label>
              <input {...register('expires_at')} type="date" className="input" />
            </div>

            <div className="col-span-2 flex items-center gap-3">
              <input {...register('is_active')} type="checkbox" id="is_active" className="w-4 h-4 rounded" />
              <label htmlFor="is_active" className="text-sm text-surface-700">Diskon aktif</label>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? <><Loader2 size={15} className="animate-spin" />Menyimpan...</> : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────
function DiscountStatus({ d }: { d: Discount }) {
  const now = new Date()
  if (!d.is_active) return <span className="badge badge-danger">Nonaktif</span>
  if (d.expires_at && new Date(d.expires_at) < now) return <span className="badge badge-gray">Kadaluarsa</span>
  if (d.starts_at && new Date(d.starts_at) > now) return <span className="badge badge-warning">Belum Mulai</span>
  if (d.usage_limit && d.used_count >= d.usage_limit) return <span className="badge badge-gray">Habis</span>
  return <span className="badge badge-success">Aktif</span>
}

// ── Main Page ─────────────────────────────────────────────────────
export default function DiscountsPage() {
  const [search, setSearch] = useState('')
  const [showActive, setShowActive] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; data?: Discount }>({ open: false })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['discounts', search, showActive],
    queryFn: () => discountApi.list({ is_active: showActive || undefined }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => discountApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discounts'] }); toast.success('Diskon dihapus.') },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  const filtered = (data?.data ?? []).filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.code?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">Diskon & Voucher</h2>
          <p className="text-xs text-surface-400 mt-0.5">{data?.meta?.total ?? 0} diskon terdaftar</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="btn-primary shrink-0 self-start xs:self-auto">
          <Plus size={16} />Tambah Diskon
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col xs:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau kode..." className="input pl-9" />
        </div>
        <button onClick={() => setShowActive(!showActive)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors shrink-0 ${showActive ? 'bg-success-500/10 border-success-300 text-success-700' : 'bg-white border-surface-200 text-surface-600'
            }`}>
          {showActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          Aktif saja
        </button>
      </div>

      {/* Grid cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-36 bg-surface-100" />
        ))}

        {!isLoading && filtered.map((d) => (
          <div key={d.id} className="card hover:shadow-card-md transition-shadow">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                  {d.type === 'percentage' ? <Percent size={16} className="text-primary-600" /> : <Banknote size={16} className="text-primary-600" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-surface-900 truncate text-sm">{d.name}</p>
                  {d.code && (
                    <code className="text-xs bg-surface-100 text-surface-600 px-1.5 py-0.5 rounded font-mono">{d.code}</code>
                  )}
                </div>
              </div>
              <DiscountStatus d={d} />
            </div>

            <div className="text-2xl font-display font-bold text-primary-600 mb-2">
              {d.type === 'percentage' ? `${d.value}%` : formatRupiah(d.value)}
            </div>

            <div className="space-y-1 text-xs text-surface-400">
              {d.min_purchase > 0 && <p>Min. beli: {formatRupiah(d.min_purchase)}</p>}
              {d.max_discount && <p>Maks. diskon: {formatRupiah(d.max_discount)}</p>}
              {d.usage_limit && <p>Terpakai: {d.used_count}/{d.usage_limit}</p>}
              {d.expires_at && <p>Berakhir: {formatDate(d.expires_at)}</p>}
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-surface-100">
              <button onClick={() => setModal({ open: true, data: d })}
                className="btn-sm btn-secondary flex-1 justify-center gap-1.5">
                <Pencil size={13} />Edit
              </button>
              <button onClick={() => confirm('Hapus diskon ini?') && deleteMutation.mutate(d.id)}
                className="btn-sm btn-ghost text-danger-500 hover:bg-danger-50 px-3">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-surface-400">
            <Tag size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Belum ada diskon</p>
          </div>
        )}
      </div>

      {modal.open && (
        <DiscountModal discount={modal.data} onClose={() => setModal({ open: false })} />
      )}
    </div>
  )
}