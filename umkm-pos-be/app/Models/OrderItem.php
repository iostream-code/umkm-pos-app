<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'order_id',
        'product_id',
        'product_name',
        'product_sku',
        'price',
        'cost_price',
        'quantity',
        'discount_amount',
        'subtotal',
    ];

    protected $casts = [
        'price'           => 'decimal:2',
        'cost_price'      => 'decimal:2',
        'quantity'        => 'integer',
        'discount_amount' => 'decimal:2',
        'subtotal'        => 'decimal:2',
    ];

    // ── Computed ─────────────────────────────────────────────────

    /** Profit per item = (harga - modal) * qty */
    public function getProfitAttribute(): float
    {
        return round(($this->price - $this->cost_price) * $this->quantity, 2);
    }

    // ── Relations ────────────────────────────────────────────────

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
