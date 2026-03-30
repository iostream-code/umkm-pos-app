<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use HasFactory, HasUuids;

    protected $keyType      = 'string';
    public    $incrementing = false;

    /**
     * Tabel ini hanya punya created_at, tidak ada updated_at.
     * Log tidak boleh diubah setelah dibuat (immutable audit trail).
     */
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'store_id',
        'action',
        'model_type',
        'model_id',
        'description',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    protected $casts = [
        'old_values' => 'array',   // jsonb → array PHP
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    // ── Relations ────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
