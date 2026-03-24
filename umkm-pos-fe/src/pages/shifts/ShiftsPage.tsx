import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Clock, Play, Square, Archive, TrendingUp,
  Banknote, ShoppingCart, X, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { shiftApi } from '@/api'
import { formatRupiah, formatDateTime, getAxiosErrorMessage } from '@/lib/utils'
import type { Shift } from '@/types'
import toast from 'react-hot-toast'

// ── Open Shift Modal ──────────────────────────────────────────────
function OpenShiftModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const schema = z.object({
    opening_cash: z.coerce.number().min(0, 'Tidak boleh negatif'),
  })
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { opening_cash: 0 },
  })

  const mutation = useMutation({
    mutationFn: (d: { opening_cash: number }) => shiftApi.open(d.opening_cash),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-active'] })
      qc.invalidateQueries({ queryKey: ['shifts'] })
      toast.success('Shift berhasil dibuka!')
      onClose()
    },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-card-lg animate-fade-in">
        <div className="flex justify-between items-center px-5 py-4 border-b border-surface-100">
          <h3 className="font-display font-semibold">Buka Shift</h3>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Modal Kas Awal (Rp)</label>
            <input {...register('opening_cash')} type="number" className="input text-lg font-bold"
              placeholder="0" inputMode="numeric" />
            {errors.opening_cash && <p className="text-xs text-danger-500 mt-1">{errors.opening_cash.message as string}</p>}
            <p className="text-xs text-surface-400 mt-1.5">Jumlah uang tunai yang ada di laci kasir saat ini</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? <><Loader2 size={15} className="animate-spin" />Membuka...</> : <><Play size={15} />Buka Shift</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Close Shift Modal ─────────────────────────────────────────────
function CloseShiftModal({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  const qc = useQueryClient()
  const schema = z.object({
    closing_cash: z.coerce.number().min(0, 'Tidak boleh negatif'),
    notes: z.string().optional(),
  })
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { closing_cash: 0, notes: '' },
  })

  const closingCash = watch('closing_cash')
  const expectedCash = (shift.opening_cash ?? 0) + (shift.total_cash_sales ?? 0)
  const diff = closingCash - expectedCash

  const mutation = useMutation({
    mutationFn: (d: { closing_cash: number; notes: string }) =>
      shiftApi.close(shift.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-active'] })
      qc.invalidateQueries({ queryKey: ['shifts'] })
      toast.success('Shift berhasil ditutup!')
      onClose()
    },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-card-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-5 py-4 border-b border-surface-100 sticky top-0 bg-white">
          <h3 className="font-display font-semibold">Tutup Shift</h3>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Ringkasan shift */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Modal Awal', val: formatRupiah(shift.opening_cash ?? 0) },
              { label: 'Total Penjualan', val: formatRupiah(shift.total_sales ?? 0) },
              { label: 'Tunai', val: formatRupiah(shift.total_cash_sales ?? 0) },
              { label: 'Non-tunai', val: formatRupiah(shift.total_non_cash_sales ?? 0) },
              { label: 'Total Transaksi', val: String(shift.total_transactions ?? 0) },
              { label: 'Kas Seharusnya', val: formatRupiah(expectedCash) },
            ].map((item) => (
              <div key={item.label} className="bg-surface-50 rounded-xl p-3">
                <p className="text-xs text-surface-400 mb-0.5">{item.label}</p>
                <p className="font-semibold text-surface-800">{item.val}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Kas Aktual (Rp)</label>
              <input {...register('closing_cash')} type="number" className="input text-lg font-bold"
                placeholder="0" inputMode="numeric" />
              {errors.closing_cash && <p className="text-xs text-danger-500 mt-1">{errors.closing_cash.message as string}</p>}
            </div>

            {/* Selisih kas */}
            {closingCash !== 0 && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${diff === 0 ? 'bg-success-50 text-success-700' :
                  diff > 0 ? 'bg-primary-50 text-primary-700' : 'bg-danger-50 text-danger-700'
                }`}>
                {diff === 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span className="font-medium">
                  {diff === 0 ? 'Kas sesuai' :
                    diff > 0 ? `Lebih ${formatRupiah(diff)}` :
                      `Kurang ${formatRupiah(Math.abs(diff))}`}
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Catatan <span className="text-surface-400">(opsional)</span></label>
              <textarea {...register('notes')} className="input resize-none" rows={2} placeholder="Catatan penutupan shift..." />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Batal</button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
                {mutation.isPending ? <><Loader2 size={15} className="animate-spin" />Menutup...</> : <><Square size={15} />Tutup Shift</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Shift Card ────────────────────────────────────────────────────
function ShiftCard({ shift }: { shift: Shift }) {
  const isOpen = shift.status === 'open'
  return (
    <div className={`card border-l-4 ${isOpen ? 'border-l-success-500' : 'border-l-surface-200'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`badge ${isOpen ? 'badge-success' : 'badge-gray'}`}>
              {isOpen ? 'Berjalan' : 'Selesai'}
            </span>
            {shift.user && <span className="text-xs text-surface-400">{shift.user.name}</span>}
          </div>
          <p className="text-xs text-surface-400 flex items-center gap-1 mt-1">
            <Clock size={11} />{formatDateTime(shift.opened_at)}
            {shift.closed_at && <> — {formatDateTime(shift.closed_at)}</>}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-display font-bold text-surface-900">{formatRupiah(shift.total_sales ?? 0)}</p>
          <p className="text-xs text-surface-400">{shift.total_transactions ?? 0} transaksi</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Modal Awal', val: formatRupiah(shift.opening_cash ?? 0), icon: <Banknote size={12} /> },
          { label: 'Tunai', val: formatRupiah(shift.total_cash_sales ?? 0), icon: <Banknote size={12} /> },
          { label: 'Non-tunai', val: formatRupiah(shift.total_non_cash_sales ?? 0), icon: <ShoppingCart size={12} /> },
        ].map((item) => (
          <div key={item.label} className="bg-surface-50 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-surface-400 mb-1">{item.icon}<span className="text-xs">{item.label}</span></div>
            <p className="text-xs font-semibold text-surface-700 truncate">{item.val}</p>
          </div>
        ))}
      </div>

      {/* Selisih kas jika sudah tutup */}
      {!isOpen && shift.closing_cash !== null && shift.expected_cash !== null && (
        <div className={`mt-3 flex items-center justify-between text-xs px-3 py-2 rounded-lg ${shift.closing_cash === shift.expected_cash ? 'bg-success-50 text-success-700' :
            shift.closing_cash! > shift.expected_cash! ? 'bg-primary-50 text-primary-700' : 'bg-danger-50 text-danger-700'
          }`}>
          <span>Selisih kas</span>
          <span className="font-semibold">
            {shift.closing_cash === shift.expected_cash ? 'Sesuai' :
              shift.closing_cash! > shift.expected_cash!
                ? `+${formatRupiah(shift.closing_cash! - shift.expected_cash!)}`
                : `-${formatRupiah(shift.expected_cash! - shift.closing_cash!)}`}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ShiftsPage() {
  const [modal, setModal] = useState<'open' | 'close' | null>(null)

  const { data: activeData } = useQuery({
    queryKey: ['shift-active'],
    queryFn: () => shiftApi.active().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftApi.history().then((r) => r.data),
  })

  const activeShift = activeData?.shift
  const isShiftOpen = activeData?.is_open ?? false
  const shifts: Shift[] = historyData?.data ?? []

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">Shift Kasir</h2>
          <p className="text-xs text-surface-400 mt-0.5">Kelola sesi kerja kasir</p>
        </div>
        {isShiftOpen ? (
          <button onClick={() => setModal('close')} className="btn-danger shrink-0 self-start xs:self-auto">
            <Square size={16} />Tutup Shift
          </button>
        ) : (
          <button onClick={() => setModal('open')} className="btn-primary shrink-0 self-start xs:self-auto">
            <Play size={16} />Buka Shift
          </button>
        )}
      </div>

      {/* Active shift banner */}
      {isShiftOpen && activeShift && (
        <div className="card bg-success-50 border-success-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-500 flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-success-800">Shift sedang berjalan</p>
              <p className="text-xs text-success-600">
                Dibuka {formatDateTime(activeShift.opened_at)} •{' '}
                {activeShift.total_transactions ?? 0} transaksi •{' '}
                {formatRupiah(activeShift.total_sales ?? 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Shift history */}
      <div>
        <h3 className="font-semibold text-surface-800 mb-3">Riwayat Shift</h3>
        <div className="space-y-3">
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-36 bg-surface-100" />
          ))}
          {!isLoading && shifts.map((s) => <ShiftCard key={s.id} shift={s} />)}
          {!isLoading && shifts.length === 0 && (
            <div className="card text-center py-12 text-surface-400">
              <Archive size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada riwayat shift</p>
            </div>
          )}
        </div>
      </div>

      {modal === 'open' && <OpenShiftModal onClose={() => setModal(null)} />}
      {modal === 'close' && activeShift && (
        <CloseShiftModal shift={activeShift} onClose={() => setModal(null)} />
      )}
    </div>
  )
}