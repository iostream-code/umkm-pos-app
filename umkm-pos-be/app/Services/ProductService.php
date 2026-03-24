<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ActivityLog;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProductService
{
    public function paginate(
        string $storeId,
        array  $filters,
        int    $perPage,
        string $sortBy,
        string $sortDir
    ): LengthAwarePaginator {

        $allowed = ['name', 'price', 'stock', 'created_at'];
        $sortBy  = in_array($sortBy, $allowed) ? $sortBy : 'name';
        $sortDir = in_array($sortDir, ['asc', 'desc']) ? $sortDir : 'asc';

        $query = Product::where('store_id', $storeId)
            ->with('category:id,name')
            ->orderBy($sortBy, $sortDir);

        if (! empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'ilike', "%{$filters['search']}%")
                  ->orWhere('sku', 'ilike', "%{$filters['search']}%")
                  ->orWhere('barcode', 'ilike', "%{$filters['search']}%");
            });
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (! empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (! empty($filters['low_stock'])) {
            $query->lowStock();
        }

        return $query->paginate($perPage);
    }

    public function create(string $storeId, string $userId, array $data): Product
    {
        if (isset($data['image'])) {
            $data['image'] = $this->uploadImage($data['image'], $storeId);
        }

        $product = Product::create([...$data, 'store_id' => $storeId]);

        ActivityLog::create([
            'user_id'    => $userId,
            'store_id'   => $storeId,
            'action'     => 'created',
            'model_type' => Product::class,
            'model_id'   => $product->id,
            'new_values' => $data,
        ]);

        return $product;
    }

    public function update(string $id, string $storeId, string $userId, array $data): Product
    {
        $product  = $this->findOrFail($id, $storeId);
        $oldValues = $product->toArray();

        if (isset($data['image'])) {
            // Hapus gambar lama jika ada
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $data['image'] = $this->uploadImage($data['image'], $storeId);
        }

        $product->update($data);

        ActivityLog::create([
            'user_id'    => $userId,
            'store_id'   => $storeId,
            'action'     => 'updated',
            'model_type' => Product::class,
            'model_id'   => $product->id,
            'old_values' => $oldValues,
            'new_values' => $data,
        ]);

        return $product->fresh(['category']);
    }

    public function delete(string $id, string $storeId): void
    {
        $product = $this->findOrFail($id, $storeId);
        $product->delete(); // soft delete
    }

    public function findOrFail(string $id, string $storeId): Product
    {
        return Product::where('id', $id)
            ->where('store_id', $storeId)
            ->firstOrFail();
    }

    private function uploadImage($image, string $storeId): string
    {
        return $image->store("products/{$storeId}", 'public');
    }
}
