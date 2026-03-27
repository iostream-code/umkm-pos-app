import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Filter, Eye, XCircle, RefreshCcw,
  Receipt, Download, ChevronLeft, ChevronRight,
  Clock, CheckCircle2, X, Loader2, Banknote,
  Smartphone, CreditCard, ArrowUpRight, Package,
} from 'lucide-react'
import { orderApi } from '@/api'
import {
  formatRupiah, formatDateTime, getOrderStatusLabel,
  getOrderStatusColor, getPaymentLabel, getAxiosErrorMessage,
} from '@/lib/utils'
import type { Order } from '@/types'
import toast from 'react-hot-toast'

// ── Config ────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'completed', label: 'Selesai' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Dibatalkan' },
  { value: 'refunded', label: 'Direfund' },
]

const PAYMENT_OPTIONS = [
  { value: '', label: 'Semua Metode' },
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'card', label: 'Kartu' },
  { value: 'transfer', label: 'Transfer' },
]

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote size={13} />,
  qris: <Smartphone size={13} />,
  card: <CreditCard size={13} />,
  transfer: <ArrowUpRight size={13} />,
}

// ── Order Detail Modal ────────────────────────────────────────────
function OrderDetailModal({
  orderId, onClose,
}: {
  orderId: string
  onClose: () => void
}) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.show(orderId).then((r) => r.data.order),
  })

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => orderApi.cancel(orderId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      toast.success('Transaksi berhasil dibatalkan.')
    },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  const refundMutation = useMutation({
    mutationFn: () => orderApi.refund(orderId, {
      reason: 'Permintaan pelanggan',
      amount: data?.total ?? 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      toast.success('Refund berhasil diproses.')
    },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  const handleCancel = () => {
    const reason = prompt('Alasan pembatalan:')
    if (reason) cancelMutation.mutate(reason)
  }

  const handlePrint = async () => {
    try {
      const res = await orderApi.receipt(orderId)
      const receipt = res.data.receipt
      const win = window.open('', '_blank', 'width=400,height=600')
      if (!win) return
      win.document.write(`
        <html><head><title>Struk ${receipt.order_number}</title>
        <style>
          body { font-family: monospace; font-size: 12px; padding: 16px; max-width: 300px; margin: 0 auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; }
        </style></head><body>
        <div class="center bold">${receipt.store.name}</div>
        <div class="center">${receipt.store.address ?? ''}</div>
        <div class="center">${receipt.store.phone ?? ''}</div>
        <div class="line"></div>
        <div class="row"><span>No.</span><span>${receipt.order_number}</span></div>
        <div class="row"><span>Tanggal</span><span>${receipt.date}</span></div>
        <div class="row"><span>Kasir</span><span>${receipt.cashier}</span></div>
        <div class="row"><span>Pelanggan</span><span>${receipt.customer}</span></div>
        <div class="line"></div>
        ${receipt.items.map((item: any) => `
          <div>${item.name}</div>
          <div class="row"><span>${item.qty} x ${new Intl.NumberFormat('id-ID').format(item.price)}</span><span>${new Intl.NumberFormat('id-ID').format(item.subtotal)}</span></div>
        `).join('')}
        <div class="line"></div>
        <div class="row"><span>Subtotal</span><span>${new Intl.NumberFormat('id-ID').format(receipt.subtotal)}</span></div>
        ${receipt.discount > 0 ? `<div class="row"><span>Diskon</span><span>-${new Intl.NumberFormat('id-ID').format(receipt.discount)}</span></div>` : ''}
        ${receipt.tax > 0 ? `<div class="row"><span>Pajak</span><span>${new Intl.NumberFormat('id-ID').format(receipt.tax)}</span></div>` : ''}
        <div class="row bold"><span>TOTAL</span><span>${new Intl.NumberFormat('id-ID').format(receipt.total)}</span></div>
        <div class="row"><span>Bayar</span><span>${new Intl.NumberFormat('id-ID').format(receipt.amount_paid)}</span></div>
        <div class="row"><span>Kembali</span><span>${new Intl.NumberFormat('id-ID').format(receipt.change)}</span></div>
        <div class="line"></div>
        <div class="center">${receipt.store.footer ?? 'Terima kasih!'}</div>
        </body></html>
      `)
      win.document.close()
      win.print()
    } catch {
      toast.error('Gagal memuat struk.')
    }
  }

  const order: Order | undefined = data

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-card-lg animate-fade-in max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
          <div>
            <h3 className="font-display font-semibold">Detail Transaksi</h3>
            {order && <p className="text-xs text-surface-400 mt-0.5">{order.order_number}</p>}
          </div>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[80, 120, 180, 80].map((w, i) => (
                <div key={i} className="h-4 bg-surface-100 rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : !order ? (
            <p className="text-center text-surface-400 py-8">Transaksi tidak ditemukan</p>
          ) : (
            <>
              {/* Status + info */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`badge ${getOrderStatusColor(order.status)}`}>
                    {getOrderStatusLabel(order.status)}
                  </span>
                  <p className="text-xs text-surface-400 mt-1.5 flex items-center gap-1">
                    <Clock size={11} />{formatDateTime(order.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-surface-400">Kasir</p>
                  <p className="text-sm font-medium text-surface-700">{order.cashier?.name ?? '—'}</p>
                </div>
              </div>

              {/* Pelanggan */}
              {order.customer && (
                <div className="bg-surface-50 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                  <span className="text-surface-500">Pelanggan</span>
                  <span className="font-medium text-surface-800">{order.customer.name}</span>
                </div>
              )}

              {/* Item list */}
              <div>
                <p className="text-xs font-semibold text-surface-500 mb-2">ITEM</p>
                <div className="space-y-2">
                  {(order.items ?? []).map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                        <Package size={14} className="text-surface-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-800 truncate">{item.product_name}</p>
                        <p className="text-xs text-surface-400">
                          {item.quantity} × {formatRupiah(item.price)}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-surface-800 shrink-0">
                        {formatRupiah(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="border-t border-surface-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-surface-500">
                  <span>Subtotal</span><span>{formatRupiah(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-success-600">
                    <span>Diskon</span><span>-{formatRupiah(order.discount_amount)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-surface-500">
                    <span>Pajak ({order.tax_percentage}%)</span><span>{formatRupiah(order.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-surface-900 text-base pt-1 border-t border-surface-100">
                  <span>Total</span><span className="text-primary-700">{formatRupiah(order.total)}</span>
                </div>
                <div className="flex justify-between text-surface-500">
                  <span>Bayar ({getPaymentLabel(order.payment_method)})</span>
                  <span>{formatRupiah(order.amount_paid)}</span>
                </div>
                {order.change_amount > 0 && (
                  <div className="flex justify-between text-surface-500">
                    <span>Kembalian</span><span>{formatRupiah(order.change_amount)}</span>
                  </div>
                )}
              </div>

              {/* Cancel reason */}
              {order.cancel_reason && (
                <div className="bg-danger-50 rounded-xl px-4 py-3 text-sm">
                  <p className="text-danger-600 font-medium mb-0.5">Alasan Pembatalan</p>
                  <p className="text-danger-700">{order.cancel_reason}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {order && (
          <div className="px-5 pb-5 pt-3 border-t border-surface-100 flex flex-wrap gap-2 shrink-0">
            <button onClick={handlePrint} className="btn-secondary gap-1.5 text-sm">
              <Receipt size={15} />Cetak Struk
            </button>
            {order.status === 'completed' && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="btn-ghost text-danger-500 hover:bg-danger-50 gap-1.5 text-sm"
                >
                  {cancelMutation.isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : <XCircle size={14} />
                  }
                  Batalkan
                </button>
                <button
                  onClick={() => confirm('Proses refund transaksi ini?') && refundMutation.mutate()}
                  disabled={refundMutation.isPending}
                  className="btn-ghost text-amber-600 hover:bg-amber-50 gap-1.5 text-sm"
                >
                  {refundMutation.isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : <RefreshCcw size={14} />
                  }
                  Refund
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [payment, setPayment] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showFilter, setShowFilter] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', search, status, payment, dateFrom, dateTo, page],
    queryFn: () => orderApi.list({
      search: search || undefined,
      status: status || undefined,
      payment_method: payment || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      per_page: 10,
    }).then((r) => r.data),
  })

  const orders: Order[] = data?.data ?? []
  const meta = data?.meta

  const hasFilter = !!(status || payment || dateFrom || dateTo)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">Riwayat Transaksi</h2>
          <p className="text-xs text-surface-400 mt-0.5">{meta?.total ?? 0} transaksi ditemukan</p>
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="flex flex-col xs:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Cari nomor invoice..."
            className="input pl-9"
          />
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors shrink-0 ${hasFilter || showFilter
            ? 'bg-primary-50 border-primary-300 text-primary-700'
            : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
            }`}
        >
          <Filter size={15} />Filter
          {hasFilter && <span className="w-2 h-2 rounded-full bg-primary-500" />}
        </button>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="card p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Status</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="input text-sm">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Metode Bayar</label>
            <select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1) }} className="input text-sm">
              {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Dari Tanggal</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Sampai Tanggal</label>
            <input type="date" value={dateTo} min={dateFrom} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="input text-sm" />
          </div>
          {hasFilter && (
            <div className="col-span-full">
              <button
                onClick={() => { setStatus(''); setPayment(''); setDateFrom(''); setDateTo(''); setPage(1) }}
                className="btn-ghost text-danger-500 text-sm gap-1.5"
              >
                <X size={14} />Reset Filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th className="hidden sm:table-cell">Waktu</th>
              <th className="hidden md:table-cell">Kasir</th>
              <th>Metode</th>
              <th className="text-right">Total</th>
              <th>Status</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                {[120, 100, 80, 60, 80, 70, 30].map((w, j) => (
                  <td key={j}><div className="h-4 rounded bg-surface-100 animate-pulse" style={{ width: w }} /></td>
                ))}
              </tr>
            ))}

            {!isLoading && orders.map((o) => (
              <tr key={o.id} className="cursor-pointer" onClick={() => setDetailId(o.id)}>
                <td>
                  <p className="text-sm font-medium text-surface-800">{o.order_number}</p>
                  {o.customer && (
                    <p className="text-xs text-surface-400">{o.customer.name}</p>
                  )}
                </td>
                <td className="hidden sm:table-cell text-xs text-surface-400">
                  {formatDateTime(o.created_at)}
                </td>
                <td className="hidden md:table-cell text-sm text-surface-500">
                  {o.cashier?.name ?? '—'}
                </td>
                <td>
                  <div className="flex items-center gap-1.5 text-xs text-surface-600">
                    <span className="text-surface-400">
                      {PAYMENT_ICONS[o.payment_method] ?? null}
                    </span>
                    {getPaymentLabel(o.payment_method)}
                  </div>
                </td>
                <td className="text-right">
                  <p className="text-sm font-semibold text-surface-900">{formatRupiah(o.total)}</p>
                </td>
                <td>
                  <span className={`badge ${getOrderStatusColor(o.status)}`}>
                    {getOrderStatusLabel(o.status)}
                  </span>
                </td>
                <td>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailId(o.id) }}
                    className="btn-icon btn-ghost"
                  >
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            ))}

            {!isLoading && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-14 text-surface-400">
                  <Receipt size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Tidak ada transaksi ditemukan</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-surface-400">
            {(meta.current_page - 1) * meta.per_page + 1}–
            {Math.min(meta.current_page * meta.per_page, meta.total)} dari {meta.total}
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50">
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: meta.last_page }, (_, i) => i + 1)
              .filter((n) => Math.abs(n - page) <= 2)
              .map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${n === page ? 'bg-primary-600 text-white' : 'border border-surface-200 text-surface-600 hover:bg-surface-50'
                    }`}>
                  {n}
                </button>
              ))}
            <button disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailId && (
        <OrderDetailModal orderId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  )
}