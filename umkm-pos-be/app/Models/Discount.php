<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Discount extends Model
{
    use HasFactory, SoftDeletes, HasUuids;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'store_id',
        'name',
        'code',
        'type',
        'value',
        'min_purchase',
        'max_discount',
        'usage_limit',
        'used_count',
        'is_active',
        'starts_at',
        'expires_at',
    ];

    protected $casts = [
        'value'        => 'decimal:2',
        'min_purchase' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'usage_limit'  => 'integer',
        'used_count'   => 'integer',
        'is_active'    => 'boolean',
        'starts_at'    => 'datetime',
        'expires_at'   => 'datetime',
    ];

    // ── Scopes ───────────────────────────────────────────────────

    /** Hanya diskon yang sedang aktif dan belum kadaluarsa */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(fn($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->where(fn($q) => $q->whereNull('usage_limit')->orWhereColumn('used_count', '<', 'usage_limit'));
    }

    // ── Relations ────────────────────────────────────────────────

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function orderDiscounts(): HasMany
    {
        return $this->hasMany(OrderDiscount::class);
    }
}
