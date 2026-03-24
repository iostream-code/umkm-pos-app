<?php

// ===================== app/Models/Store.php =====================
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'name', 'address', 'phone', 'email',
        'tax_number', 'logo', 'currency',
        'timezone', 'receipt_footer', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function users(): HasMany      { return $this->hasMany(User::class); }
    public function products(): HasMany   { return $this->hasMany(Product::class); }
    public function categories(): HasMany { return $this->hasMany(Category::class); }
    public function orders(): HasMany     { return $this->hasMany(Order::class); }
    public function customers(): HasMany  { return $this->hasMany(Customer::class); }
    public function discounts(): HasMany  { return $this->hasMany(Discount::class); }
    public function shifts(): HasMany     { return $this->hasMany(Shift::class); }
}
