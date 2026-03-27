<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
{
    /**
     * GET /api/v1/stock/low
     * Produk dengan stok di bawah minimum
     */
    public function lowStock(Request $request): JsonResponse
    {
        $products = Product::where('store_id', $request->user()->store_id)
            ->lowStock()
            ->with('category:id,name')
            ->orderBy('stock')
            ->paginate(20);

        return response()->json($products);
    }

    /**
     * POST /api/v1/stock/adjustment
     * Penyesuaian stok manual (misal: stok opname)
     */
    public function adjustment(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'  => ['required', 'uuid', 'exists:products,id'],
            'quantity'    => ['required', 'integer', 'not_in:0'],
            'type'        => ['required', 'string', 'in:in,out,adjustment,damage'],
            'notes'       => ['required', 'string', 'max:255'],
        ]);

        $product = Product::where('id', $request->product_id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        $stockBefore = $product->stock;
        $stockAfter  = $stockBefore + $request->quantity;

        if ($stockAfter < 0) {
            return response()->json([
                'message' => 'Stok tidak boleh negatif.',
            ], 422);
        }

        $product->update(['stock' => $stockAfter]);

        $movement = StockMovement::create([
            'product_id'     => $product->id,
            'store_id'       => $request->user()->store_id,
            'user_id'        => $request->user()->id,
            'type'           => $request->type,
            'quantity'       => $request->quantity,
            'stock_before'   => $stockBefore,
            'stock_after'    => $stockAfter,
            'notes'          => $request->notes,
        ]);

        return response()->json([
            'message'  => 'Stok berhasil disesuaikan.',
            'product'  => ['id' => $product->id, 'name' => $product->name, 'stock' => $stockAfter],
            'movement' => $movement,
        ]);
    }

    /**
     * GET /api/v1/stock/movements
     * Riwayat mutasi stok
     */
    public function movements(Request $request): JsonResponse
    {
        $movements = StockMovement::where('store_id', $request->user()->store_id)
            ->with(['product:id,name,sku', 'user:id,name'])
            ->when($request->product_id, fn($q) => $q->where('product_id', $request->product_id))
            ->when($request->type, fn($q) => $q->where('type', $request->type))
            ->latest()
            ->paginate(5);

        return response()->json($movements);
    }

    /**
     * GET /api/v1/products/{id}/stock-history
     */
    public function productHistory(Request $request, string $id): JsonResponse
    {
        $product = Product::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        $history = StockMovement::where('product_id', $product->id)
            ->with('user:id,name')
            ->latest()
            ->paginate(30);

        return response()->json([
            'product' => ['id' => $product->id, 'name' => $product->name, 'stock' => $product->stock],
            'history' => $history,
        ]);
    }
}
