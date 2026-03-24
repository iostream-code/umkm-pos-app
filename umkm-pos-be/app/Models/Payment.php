<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'order_id',
        'method',
        'amount',
        'reference',
        'status',
        'metadata',
        'paid_at',
    ];

    protected $casts = [
        'amount'   => 'decimal:2',
        'metadata' => 'array',   // jsonb PostgreSQL → array PHP otomatis
        'paid_at'  => 'datetime',
    ];

    // ── Relations ────────────────────────────────────────────────

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
