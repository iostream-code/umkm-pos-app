<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory, SoftDeletes, HasUuids;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'store_id',
        'category_id',
        'name',
        'sku',
        'barcode',
        'description',
        'image',
        'price',
        'cost_price',
        'stock',
        'min_stock',
        'unit',
        'track_stock',
        'is_active',
    ];

    protected $casts = [
        'price'       => 'decimal:2',
        'cost_price'  => 'decimal:2',
        'stock'       => 'integer',
        'min_stock'   => 'integer',
        'track_stock' => 'boolean',
        'is_active'   => 'boolean',
    ];

    // ── Computed ─────────────────────────────────────────────────

    /** Persentase margin keuntungan */
    public function getMarginAttribute(): float
    {
        if ($this->price <= 0) return 0;
        return round((($this->price - $this->cost_price) / $this->price) * 100, 2);
    }

    /** Apakah stok di bawah minimum */
    public function getIsLowStockAttribute(): bool
    {
        return $this->track_stock && $this->stock <= $this->min_stock;
    }

    // ── Scopes ───────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeLowStock($query)
    {
        return $query->where('track_stock', true)
            ->whereColumn('stock', '<=', 'min_stock');
    }

    // ── Relations ────────────────────────────────────────────────

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
