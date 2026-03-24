<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'store_id',
        'user_id',
        'shift_id',
        'customer_id',
        'order_number',
        'status',
        'subtotal',
        'discount_amount',
        'tax_percentage',
        'tax_amount',
        'total',
        'payment_method',
        'amount_paid',
        'change_amount',
        'notes',
        'cancelled_at',
        'cancel_reason',
    ];

    protected $casts = [
        'subtotal'        => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_percentage'  => 'decimal:2',
        'tax_amount'      => 'decimal:2',
        'total'           => 'decimal:2',
        'amount_paid'     => 'decimal:2',
        'change_amount'   => 'decimal:2',
        'cancelled_at'    => 'datetime',
    ];

    // ── Boot: auto-generate order number ─────────────────────────

    protected static function booted(): void // Gunakan booted() bukan boot()
    {
        static::creating(function (Order $order) {
            if (empty($order->order_number)) {
                // Gunakan tanggal dari order jika ada, jika tidak gunakan hari ini
                $date = $order->created_at ? $order->created_at : now();

                $count = static::whereDate('created_at', $date)
                    ->where('store_id', $order->store_id)
                    ->count() + 1;

                $order->order_number = 'INV-'
                    . $date->format('Ymd') . '-'
                    . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    // ── Scopes ───────────────────────────────────────────────────

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }

    // ── Relations ────────────────────────────────────────────────

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function discounts(): HasMany
    {
        return $this->hasMany(OrderDiscount::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
