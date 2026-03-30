<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory, SoftDeletes, HasUuids;

    protected $keyType    = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'store_id',
        'parent_id',
        'name',
        'slug',
        'color',
        'icon',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    // ── Relations ────────────────────────────────────────────────

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
