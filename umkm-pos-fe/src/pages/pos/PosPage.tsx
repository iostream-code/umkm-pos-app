import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  X, Loader2, Tag, Package, ArrowLeft,
} from 'lucide-react'
import { productApi, orderApi, discountApi } from '@/api'
import { useCartStore } from '@/stores/cartStore'
import { formatRupiah } from '@/lib/utils'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

// ── Product Card ──────────────────────────────────────────────────
function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const isOutOfStock = product.track_stock && product.stock === 0
  return (
    <button
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={`product-card text-left w-full ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-16 sm:h-20 object-cover rounded-lg mb-2"
        />
      ) : (
        <div className="w-full h-16 sm:h-20 rounded-lg bg-surface-100 flex items-center justify-center mb-2">
          <Package size={20} className="text-surface-300" />
        </div>
      )}
      <p className="text-xs sm:text-sm font-medium text-surface-800 line-clamp-2 leading-tight mb-1">
        {product.name}
      </p>
      <p className="text-xs sm:text-sm font-bold text-primary-600">{formatRupiah(product.price)}</p>
      {product.track_stock && (
        <p className={`text-xs mt-0.5 ${product.is_low_stock ? 'text-warning-500' : 'text-surface-400'}`}>
          Stok: {product.stock} {product.unit}
        </p>
      )}
    </button>
  )
}

// ── Payment Modal ─────────────────────────────────────────────────
function PaymentModal({
  total, onClose, onPay, isPaying,
}: {
  total: number
  onClose: () => void
  onPay: (method: string, amountPaid: number) => void
  isPaying: boolean
}) {
  const [method, setMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState(total)
  const change = Math.max(0, amountPaid - total)

  const methods = [
    { id: 'cash', label: 'Tunai' },
    { id: 'qris', label: 'QRIS' },
    { id: 'card', label: 'Kartu' },
    { id: 'transfer', label: 'Transfer' },
  ]

  // Quick nominal — kelipatan di atas total
  const quickAmounts = [
    total,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 50000) * 50000,
    Math.ceil(total / 100000) * 100000,
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      {/* Bottom sheet di mobile, modal di desktop */}
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-card-lg animate-fade-in">
        {/* Handle bar mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-surface-200" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="font-display font-semibold text-lg">Pembayaran</h3>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Total */}
          <div className="bg-primary-50 rounded-xl p-4 text-center">
            <p className="text-sm text-primary-600 mb-1">Total</p>
            <p className="font-display text-3xl font-bold text-primary-700">
              {formatRupiah(total)}
            </p>
          </div>

          {/* Metode pembayaran */}
          <div>
            <p className="text-sm font-medium text-surface-700 mb-2">Metode</p>
            <div className="grid grid-cols-4 gap-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-colors ${method === m.id
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-surface-600 border-surface-200 hover:border-primary-300'
                    }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jumlah bayar (cash) */}
          {method === 'cash' && (
            <div>
              <p className="text-sm font-medium text-surface-700 mb-2">Jumlah Dibayar</p>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="input text-lg font-bold"
                min={total}
                inputMode="numeric"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {quickAmounts.map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmountPaid(v)}
                    className="btn-sm btn-secondary justify-center text-xs"
                  >
                    {formatRupiah(v)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kembalian */}
          {method === 'cash' && (
            <div className="flex items-center justify-between py-3 border-t border-surface-100">
              <span className="text-sm text-surface-500">Kembalian</span>
              <span className="font-bold text-success-600 text-xl">{formatRupiah(change)}</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-6 sm:pb-5">
          <button
            onClick={() => onPay(method, method === 'cash' ? amountPaid : total)}
            disabled={isPaying || (method === 'cash' && amountPaid < total)}
            className="btn-primary w-full justify-center py-3"
          >
            {isPaying
              ? <><Loader2 size={16} className="animate-spin" />Memproses...</>
              : 'Bayar Sekarang'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cart Panel ────────────────────────────────────────────────────
function CartPanel({
  onCheckout,
  onBack,
}: {
  onCheckout: () => void
  onBack?: () => void
}) {
  const cart = useCartStore()
  const [discountInput, setDiscountInput] = useState('')

  const discountMutation = useMutation({
    mutationFn: () => discountApi.validate(discountInput, cart.subtotal()),
    onSuccess: (res: any) => {
      cart.setDiscount(discountInput, res.data.discount_amount)
      toast.success(`Diskon ${res.data.name} berhasil diterapkan!`)
      setDiscountInput('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Kode diskon tidak valid.')
    },
  })

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Header cart */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 shrink-0">
        {/* Tombol back hanya tampil di mobile */}
        {onBack && (
          <button onClick={onBack} className="lg:hidden btn-icon btn-ghost -ml-1">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-primary-600" />
          <span className="font-semibold text-surface-800">Keranjang</span>
          {cart.itemCount() > 0 && (
            <span className="badge badge-info">{cart.itemCount()}</span>
          )}
        </div>
        {cart.items.length > 0 && (
          <button onClick={cart.clearCart} className="btn-sm btn-ghost text-danger-500 text-xs">
            Kosongkan
          </button>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {cart.items.length === 0 ? (
          <div className="text-center py-12 text-surface-400">
            <ShoppingCart size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Keranjang kosong</p>
            <p className="text-xs mt-1">Pilih produk untuk mulai transaksi</p>
          </div>
        ) : (
          cart.items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-3 py-2 border-b border-surface-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-800 truncate">{item.product.name}</p>
                <p className="text-xs text-primary-600 font-semibold">{formatRupiah(item.product.price)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => cart.updateQty(item.product.id, item.quantity - 1)}
                  className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center hover:bg-surface-200 active:scale-95"
                >
                  <Minus size={13} />
                </button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <button
                  onClick={() => cart.updateQty(item.product.id, item.quantity + 1)}
                  className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center hover:bg-surface-200 active:scale-95"
                >
                  <Plus size={13} />
                </button>
                <button
                  onClick={() => cart.removeItem(item.product.id)}
                  className="w-7 h-7 rounded-lg text-danger-400 hover:bg-danger-50 flex items-center justify-center ml-0.5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-sm font-semibold text-surface-800 w-16 text-right shrink-0">
                {formatRupiah(item.subtotal)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Summary & checkout */}
      <div className="border-t border-surface-100 p-4 space-y-3 shrink-0">

        {/* Discount input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
              placeholder="Kode diskon"
              className="input pl-8 text-sm py-2"
              disabled={!!cart.discountCode}
            />
          </div>
          {cart.discountCode ? (
            <button onClick={cart.clearDiscount} className="btn-sm btn-danger shrink-0">Hapus</button>
          ) : (
            <button
              onClick={() => discountInput && discountMutation.mutate()}
              disabled={!discountInput || discountMutation.isPending}
              className="btn-sm btn-secondary shrink-0"
            >
              Pakai
            </button>
          )}
        </div>

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-surface-500">
            <span>Subtotal</span>
            <span>{formatRupiah(cart.subtotal())}</span>
          </div>
          {cart.discountAmount > 0 && (
            <div className="flex justify-between text-success-600">
              <span>Diskon ({cart.discountCode})</span>
              <span>-{formatRupiah(cart.discountAmount)}</span>
            </div>
          )}
          {cart.taxPercentage > 0 && (
            <div className="flex justify-between text-surface-500">
              <span>Pajak ({cart.taxPercentage}%)</span>
              <span>{formatRupiah(cart.taxAmount())}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-surface-900 text-base pt-2 border-t border-surface-100">
            <span>Total</span>
            <span className="text-primary-700">{formatRupiah(cart.total())}</span>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={cart.items.length === 0}
          className="btn-primary w-full justify-center py-3"
        >
          <ShoppingCart size={18} />
          Proses Pembayaran
        </button>
      </div>
    </div>
  )
}

// ── Main POS Page ─────────────────────────────────────────────────
export default function PosPage() {
  const [search, setSearch] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  // Mobile: 'products' atau 'cart'
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products')

  const cart = useCartStore()
  const itemCount = cart.itemCount()

  const { data: productsData } = useQuery({
    queryKey: ['products-pos', search],
    queryFn: () => productApi.list({
      search,
      is_active: true,
      per_page: 60,
    }).then((r: any) => r.data),
  })

  const orderMutation = useMutation({
    mutationFn: (payload: { method: string; amountPaid: number }) =>
      orderApi.create({
        items: cart.items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
        payment_method: payload.method,
        amount_paid: payload.amountPaid,
        discount_code: cart.discountCode ?? undefined,
        tax_percentage: cart.taxPercentage,
        notes: cart.notes,
        customer_id: cart.customerId ?? undefined,
      }),
    onSuccess: (res: any) => {
      toast.success(`Transaksi ${res.data.order.order_number} berhasil!`)
      cart.clearCart()
      setShowPayment(false)
      setMobileView('products')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Transaksi gagal.')
    },
  })

  const products = productsData?.data ?? []

  return (
    // Fullscreen layout — keluar dari padding main
    <div className="flex h-[calc(100vh-60px)] -m-4 lg:-m-6">

      {/* ── Left: Product Grid ────────────────────────────────── */}
      <div className={`
        flex-1 flex flex-col bg-surface-50 overflow-hidden
        ${mobileView === 'cart' ? 'hidden lg:flex' : 'flex'}
      `}>

        {/* Search bar */}
        <div className="p-3 lg:p-4 border-b border-surface-100 bg-white shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk atau scan barcode..."
              className="input pl-10"
              inputMode="search"
            />
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-3">
            {products.map((p: any) => (
              <ProductCard key={p.id} product={p} onAdd={cart.addItem} />
            ))}
            {products.length === 0 && (
              <div className="col-span-full text-center py-16 text-surface-400">
                <Package size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Produk tidak ditemukan</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: floating cart button */}
        <div className="lg:hidden p-3 bg-white border-t border-surface-100 shrink-0">
          <button
            onClick={() => setMobileView('cart')}
            className="btn-primary w-full justify-between py-3"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} />
              <span>Keranjang</span>
              {itemCount > 0 && (
                <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="font-bold">{formatRupiah(cart.total())}</span>
          </button>
        </div>
      </div>

      {/* ── Right: Cart Panel ─────────────────────────────────── */}
      <div className={`
        w-full lg:w-[340px] lg:border-l border-surface-100 shrink-0
        ${mobileView === 'cart' ? 'flex' : 'hidden lg:flex'}
        flex-col
      `}>
        <CartPanel
          onCheckout={() => setShowPayment(true)}
          onBack={() => setMobileView('products')}
        />
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          total={cart.total()}
          onClose={() => setShowPayment(false)}
          onPay={(method, amountPaid) => orderMutation.mutate({ method, amountPaid })}
          isPaying={orderMutation.isPending}
        />
      )}
    </div>
  )
}