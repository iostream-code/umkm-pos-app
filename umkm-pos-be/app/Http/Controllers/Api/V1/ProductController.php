<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Http\Resources\Product\ProductResource;
use App\Http\Resources\Product\ProductCollection;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(
        private readonly ProductService $productService
    ) {}

    /**
     * GET /api/v1/products
     * Query params: search, category_id, is_active, low_stock, per_page, sort_by, sort_dir
     */
    public function index(Request $request): JsonResponse
    {
        $products = $this->productService->paginate(
            storeId: $request->user()->store_id,
            filters: $request->only(['search', 'category_id', 'is_active', 'low_stock']),
            perPage: (int) $request->get('per_page', 20),
            sortBy: $request->get('sort_by', 'name'),
            sortDir: $request->get('sort_dir', 'asc'),
        );

        return response()->json(new ProductCollection($products));
    }

    /**
     * GET /api/v1/products/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $product = $this->productService->findOrFail($id, $request->user()->store_id);

        return response()->json([
            'product' => new ProductResource($product->load('category')),
        ]);
    }

    /**
     * POST /api/v1/products
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->create(
            storeId: $request->user()->store_id,
            userId: $request->user()->id,
            data: $request->validated(),
        );

        return response()->json([
            'message' => 'Produk berhasil ditambahkan.',
            'product' => new ProductResource($product),
        ], 201);
    }

    /**
     * PUT /api/v1/products/{id}
     */
    public function update(UpdateProductRequest $request, string $id): JsonResponse
    {
        $product = $this->productService->update(
            id: $id,
            storeId: $request->user()->store_id,
            userId: $request->user()->id,
            data: $request->validated(),
        );

        return response()->json([
            'message' => 'Produk berhasil diperbarui.',
            'product' => new ProductResource($product),
        ]);
    }

    /**
     * DELETE /api/v1/products/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->productService->delete($id, $request->user()->store_id);

        return response()->json(['message' => 'Produk berhasil dihapus.']);
    }
}
