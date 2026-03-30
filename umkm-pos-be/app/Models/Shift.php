<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    use HasFactory, HasUuids;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'store_id',
        'user_id',
        'opening_cash',
        'closing_cash',
        'expected_cash',
        'total_sales',
        'total_cash_sales',
        'total_non_cash_sales',
        'total_transactions',
        'status',
        'notes',
        'opened_at',
        'closed_at',
    ];

    protected $casts = [
        'opening_cash'         => 'decimal:2',
        'closing_cash'         => 'decimal:2',
        'expected_cash'        => 'decimal:2',
        'total_sales'          => 'decimal:2',
        'total_cash_sales'     => 'decimal:2',
        'total_non_cash_sales' => 'decimal:2',
        'total_transactions'   => 'integer',
        'opened_at'            => 'datetime',
        'closed_at'            => 'datetime',
    ];

    // ── Helpers ──────────────────────────────────────────────────

    public function isOpen(): bool
    {
        return $this->status === 'open';
    }

    /** Selisih kas aktual vs ekspektasi */
    public function getCashDifferenceAttribute(): float
    {
        if (is_null($this->closing_cash) || is_null($this->expected_cash)) {
            return 0;
        }
        return round($this->closing_cash - $this->expected_cash, 2);
    }

    // ── Scopes ───────────────────────────────────────────────────

    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
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

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
