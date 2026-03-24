<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'store_id',
        'name',
        'phone',
        'email',
        'address',
        'birth_date',
        'total_transactions',
        'total_spent',
        'loyalty_points',
        'last_transaction_at',
    ];

    protected $casts = [
        'total_transactions'  => 'integer',
        'total_spent'         => 'decimal:2',
        'loyalty_points'      => 'decimal:2',
        'birth_date'          => 'date',
        'last_transaction_at' => 'datetime',
    ];

    // ── Relations ────────────────────────────────────────────────

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
