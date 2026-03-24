<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderDiscount extends Model
{
    use HasFactory;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'order_id',
        'discount_id',
        'discount_name',
        'discount_code',
        'discount_type',
        'discount_value',
        'discount_amount',
    ];

    protected $casts = [
        'discount_value'  => 'decimal:2',
        'discount_amount' => 'decimal:2',
    ];

    // ── Relations ────────────────────────────────────────────────

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** Nullable — diskon bisa dihapus tapi record order tetap ada */
    public function discount(): BelongsTo
    {
        return $this->belongsTo(Discount::class);
    }
}
