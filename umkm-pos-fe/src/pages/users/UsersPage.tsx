import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  UserPlus, Search, MoreVertical, Shield, ShieldCheck,
  ShoppingCart, Pencil, Trash2, X, Loader2, Eye, EyeOff,
  UserCog,
} from 'lucide-react'
import { userApi } from '@/api'
import { getInitials, formatDateTime, getAxiosErrorMessage } from '@/lib/utils'
import type { User } from '@/types'
import toast from 'react-hot-toast'

// ── Role badge ────────────────────────────────────────────────────
const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: <ShieldCheck size={12} />, cls: 'bg-primary-50 text-primary-700' },
  manager: { label: 'Manager', icon: <Shield size={12} />, cls: 'bg-amber-50 text-amber-700' },
  cashier: { label: 'Kasir', icon: <ShoppingCart size={12} />, cls: 'bg-surface-100 text-surface-600' },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG]
  if (!cfg) return null
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

// ── Form schema ───────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  phone: z.string().optional(),
  role: z.enum(['manager', 'cashier']),
})

const editSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['manager', 'cashier']),
  is_active: z.boolean(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

// ── Modal Form ────────────────────────────────────────────────────
function UserModal({
  user, onClose,
}: {
  user?: User
  onClose: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!user
  const [showPass, setShowPass] = useState(false)

  const schema = isEdit ? editSchema : createSchema
  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? {
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role === 'owner' ? 'manager' : user.role,
      is_active: user.is_active,
      password: '',
    } : { role: 'cashier', is_active: true },
  })

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? userApi.update(user!.id, data)
      : userApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(isEdit ? 'Data karyawan diperbarui.' : 'Karyawan berhasil ditambahkan.')
      onClose()
    },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  const onSubmit = (data: any) => {
    if (isEdit && !data.password) delete data.password
    mutation.mutate(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-card-lg animate-fade-in">
        <div className="flex justify-between items-center px-5 py-4 border-b border-surface-100">
          <h3 className="font-display font-semibold">{isEdit ? 'Edit Karyawan' : 'Tambah Karyawan'}</h3>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-surface-600 mb-1">Nama Lengkap</label>
              <input {...register('name')} className="input" placeholder="Budi Santoso" />
              {errors.name && <p className="text-xs text-danger-500 mt-1">{errors.name.message as string}</p>}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-surface-600 mb-1">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="budi@toko.com" />
              {errors.email && <p className="text-xs text-danger-500 mt-1">{errors.email.message as string}</p>}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-surface-600 mb-1">No. HP</label>
              <input {...register('phone')} className="input" placeholder="08xxxxxxxxxx" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-surface-600 mb-1">
                Password {isEdit && <span className="text-surface-400">(kosongkan jika tidak diubah)</span>}
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder={isEdit ? '••••••••' : 'Min. 8 karakter'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger-500 mt-1">{errors.password.message as string}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Role</label>
              <select {...register('role')} className="input">
                <option value="cashier">Kasir</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Status</label>
                <select {...register('is_active', { setValueAs: (v) => v === 'true' || v === true })} className="input">
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </div>
            )}
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

// ── Main Page ─────────────────────────────────────────────────────
export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [modalUser, setModalUser] = useState<User | undefined>()
  const [showModal, setShowModal] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => userApi.list({ search, role: roleFilter, per_page: 20 }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Karyawan dihapus.')
    },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  const openCreate = () => { setModalUser(undefined); setShowModal(true) }
  const openEdit = (u: User) => { setModalUser(u); setShowModal(true); setMenuId(null) }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">Karyawan</h2>
          <p className="text-xs text-surface-400 mt-0.5">Kelola akses dan role tim Anda</p>
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0 self-start xs:self-auto">
          <UserPlus size={16} />Tambah Karyawan
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col xs:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email..." className="input pl-9" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input xs:w-36">
          <option value="">Semua Role</option>
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
          <option value="cashier">Kasir</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Karyawan</th>
              <th className="hidden sm:table-cell">Role</th>
              <th className="hidden md:table-cell">Login Terakhir</th>
              <th>Status</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {[140, 80, 120, 60, 30].map((w, j) => (
                  <td key={j}><div className="h-4 rounded bg-surface-100 animate-pulse" style={{ width: w }} /></td>
                ))}
              </tr>
            ))}
            {!isLoading && (data?.data ?? []).map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {getInitials(u.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-800">{u.name}</p>
                      <p className="text-xs text-surface-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden sm:table-cell"><RoleBadge role={u.role} /></td>
                <td className="hidden md:table-cell text-xs text-surface-400">
                  {u.last_login_at ?? '—'}
                </td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {u.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td>
                  <div className="relative">
                    <button onClick={() => setMenuId(menuId === u.id ? null : u.id)}
                      className="btn-icon btn-ghost">
                      <MoreVertical size={16} />
                    </button>
                    {menuId === u.id && (
                      <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-card-md border border-surface-100 py-1 w-36">
                        <button onClick={() => openEdit(u)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-700 hover:bg-surface-50">
                          <Pencil size={14} />Edit
                        </button>
                        <button
                          onClick={() => { if (confirm('Hapus karyawan ini?')) deleteMutation.mutate(u.id); setMenuId(null) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger-600 hover:bg-danger-50">
                          <Trash2 size={14} />Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-surface-400">
                <UserCog size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Tidak ada karyawan ditemukan</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <UserModal user={modalUser} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}