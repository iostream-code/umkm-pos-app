import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  UserPlus, Search, Users, Pencil, Trash2, X,
  Loader2, Phone, Mail, ShoppingBag, Star, ChevronRight,
} from 'lucide-react'
import { customerApi } from '@/api'
import { formatRupiah, formatDate, formatDateTime, getInitials, getAxiosErrorMessage } from '@/lib/utils'
import type { Customer } from '@/types'
import toast from 'react-hot-toast'

// ── Form Schema ───────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
  birth_date: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Customer Modal ────────────────────────────────────────────────
function CustomerModal({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const qc = useQueryClient()
  const isEdit = !!customer

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? {
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      birth_date: customer.birth_date ?? '',
    } : {},
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => isEdit
      ? customerApi.update(customer!.id, data)
      : customerApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success(isEdit ? 'Data pelanggan diperbarui.' : 'Pelanggan berhasil ditambahkan.')
      onClose()
    },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-card-lg animate-fade-in">
        <div className="flex justify-between items-center px-5 py-4 border-b border-surface-100">
          <h3 className="font-display font-semibold">{isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h3>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Nama Lengkap</label>
            <input {...register('name')} className="input" placeholder="Budi Santoso" />
            {errors.name && <p className="text-xs text-danger-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">No. HP</label>
              <input {...register('phone')} className="input" placeholder="08xxxxxxxxxx" inputMode="tel" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Tanggal Lahir</label>
              <input {...register('birth_date')} type="date" className="input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Email</label>
            <input {...register('email')} type="email" className="input" placeholder="budi@email.com" />
            {errors.email && <p className="text-xs text-danger-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Alamat</label>
            <textarea {...register('address')} className="input resize-none" rows={2} placeholder="Jl. ..." />
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

// ── Detail drawer ─────────────────────────────────────────────────
function CustomerDetail({ customer, onClose, onEdit }: { customer: Customer; onClose: () => void; onEdit: () => void }) {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['customer-orders', customer.id],
    queryFn: () => customerApi.orders(customer.id).then((r) => r.data),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-card-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-5 py-4 border-b border-surface-100 sticky top-0 bg-white">
          <h3 className="font-display font-semibold">Detail Pelanggan</h3>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="btn-sm btn-secondary gap-1.5"><Pencil size={13} />Edit</button>
            <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
          </div>
        </div>
        <div className="p-5 space-y-5">
          {/* Profile */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold shrink-0">
              {getInitials(customer.name)}
            </div>
            <div>
              <h4 className="font-bold text-surface-900 text-lg">{customer.name}</h4>
              {customer.phone && <p className="text-sm text-surface-400 flex items-center gap-1"><Phone size={12} />{customer.phone}</p>}
              {customer.email && <p className="text-sm text-surface-400 flex items-center gap-1"><Mail size={12} />{customer.email}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Transaksi', val: customer.total_transactions, icon: <ShoppingBag size={14} /> },
              { label: 'Total Belanja', val: formatRupiah(customer.total_spent), icon: <Star size={14} /> },
              { label: 'Poin', val: customer.loyalty_points, icon: <Star size={14} /> },
            ].map((s) => (
              <div key={s.label} className="bg-surface-50 rounded-xl p-3 text-center">
                <div className="flex justify-center text-surface-400 mb-1">{s.icon}</div>
                <p className="font-bold text-surface-900 text-sm">{s.val}</p>
                <p className="text-xs text-surface-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Riwayat transaksi */}
          <div>
            <h4 className="text-sm font-semibold text-surface-800 mb-2">Riwayat Transaksi</h4>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-surface-100 animate-pulse" />)}
              </div>
            ) : (ordersData?.orders?.data ?? []).length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-6">Belum ada transaksi</p>
            ) : (
              <div className="space-y-2">
                {(ordersData?.orders?.data ?? []).slice(0, 10).map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50">
                    <div>
                      <p className="text-sm font-medium text-surface-800">{o.order_number}</p>
                      <p className="text-xs text-surface-400">{formatDateTime(o.created_at)}</p>
                    </div>
                    <p className="text-sm font-bold text-primary-600">{formatRupiah(o.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<{ open: boolean; data?: Customer }>({ open: false })
  const [detail, setDetail] = useState<Customer | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => customerApi.list({ search, page, per_page: 12 }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Pelanggan dihapus.') },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  const customers: Customer[] = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">Pelanggan</h2>
          <p className="text-xs text-surface-400 mt-0.5">{meta?.total ?? 0} pelanggan terdaftar</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="btn-primary shrink-0 self-start xs:self-auto">
          <UserPlus size={16} />Tambah Pelanggan
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Cari nama, HP, atau email..." className="input pl-9" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-36 bg-surface-100" />
        ))}

        {!isLoading && customers.map((c) => (
          <div key={c.id} className="card hover:shadow-card-md transition-shadow cursor-pointer group"
            onClick={() => setDetail(c)}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                {getInitials(c.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-surface-900 truncate">{c.name}</p>
                {c.phone && <p className="text-xs text-surface-400 flex items-center gap-1"><Phone size={11} />{c.phone}</p>}
                {c.email && <p className="text-xs text-surface-400 flex items-center gap-1 truncate"><Mail size={11} />{c.email}</p>}
              </div>
              <ChevronRight size={16} className="text-surface-300 shrink-0 group-hover:text-surface-500 transition-colors mt-1" />
            </div>

            <div className="flex items-center justify-between text-xs border-t border-surface-100 pt-3">
              <div className="flex items-center gap-1 text-surface-400">
                <ShoppingBag size={12} />
                <span>{c.total_transactions} transaksi</span>
              </div>
              <span className="font-semibold text-primary-600">{formatRupiah(c.total_spent)}</span>
            </div>

            {/* Action buttons — muncul saat hover */}
            <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setModal({ open: true, data: c })}
                className="btn-sm btn-secondary flex-1 justify-center gap-1">
                <Pencil size={12} />Edit
              </button>
              <button onClick={() => confirm('Hapus pelanggan ini?') && deleteMutation.mutate(c.id)}
                className="btn-sm btn-ghost text-danger-500 hover:bg-danger-50 px-2.5">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}

        {!isLoading && customers.length === 0 && (
          <div className="col-span-full text-center py-16 text-surface-400">
            <Users size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Tidak ada pelanggan ditemukan</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-surface-400">
            Halaman {meta.current_page} dari {meta.last_page}
          </p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-sm btn-secondary">Prev</button>
            <button disabled={page >= meta.last_page} onClick={() => setPage(page + 1)} className="btn-sm btn-secondary">Next</button>
          </div>
        </div>
      )}

      {modal.open && (
        <CustomerModal customer={modal.data} onClose={() => setModal({ open: false })} />
      )}
      {detail && (
        <CustomerDetail
          customer={detail}
          onClose={() => setDetail(null)}
          onEdit={() => { setModal({ open: true, data: detail }); setDetail(null) }}
        />
      )}
    </div>
  )
}