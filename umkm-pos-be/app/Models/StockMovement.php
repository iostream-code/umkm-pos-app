<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockMovement extends Model
{
    use HasFactory, HasUuids;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'product_id',
        'store_id',
        'user_id',
        'type',
        'quantity',
        'stock_before',
        'stock_after',
        'notes',
        'reference_id',
        'reference_type',
    ];

    protected $casts = [
        'quantity'     => 'integer',
        'stock_before' => 'integer',
        'stock_after'  => 'integer',
    ];

    // ── Relations ────────────────────────────────────────────────

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Polymorphic: bisa merujuk ke Order, atau model lain di masa depan
     * Contoh: StockMovement->reference() → Order instance
     */
    public function reference(): MorphTo
    {
        return $this->morphTo('reference');
    }
}
