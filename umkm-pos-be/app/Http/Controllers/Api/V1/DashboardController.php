<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Customer;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analytics
    ) {}

    /**
     * GET /api/v1/dashboard
     *
     * Strategy:
     * 1. Coba ambil data dari Python Analytics Service
     * 2. Jika tidak tersedia (service down/timeout), fallback ke query Laravel langsung
     * 3. Frontend tidak perlu tahu dari mana data berasal
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $request->user()->store_id;

        // Coba ambil dari Python Analytics Service
        $analyticsData = $this->analytics->getDashboardSummary($storeId);

        if ($analyticsData) {
            // Python service tersedia — gunakan datanya
            return response()->json([
                'source'       => 'analytics',  // info debug
                'summary'      => $analyticsData['today'],
                'weekly_sales' => $this->getWeeklySales($storeId), // tetap dari Laravel (lebih fresh)
                'top_products' => $analyticsData['top_products'] ?? [],
                'low_stock'    => $this->getLowStock($storeId),
            ]);
        }

        // Fallback: Python service tidak tersedia, query langsung dari Laravel
        return response()->json([
            'source'       => 'laravel',
            'summary'      => $this->getSummaryFromLaravel($storeId),
            'weekly_sales' => $this->getWeeklySales($storeId),
            'top_products' => $this->getTopProducts($storeId),
            'low_stock'    => $this->getLowStock($storeId),
        ]);
    }

    // ── Laravel fallback queries ──────────────────────────────────

    private function getSummaryFromLaravel(string $storeId): array
    {
        $today = today();

        $todaySales = Order::where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereDate('created_at', $today)
            ->selectRaw('COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue')
            ->first();

        $yesterdaySales = Order::where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereDate('created_at', $today->copy()->subDay())
            ->selectRaw('COALESCE(SUM(total), 0) as total_revenue')
            ->first();

        $growth = $yesterdaySales->total_revenue > 0
            ? round((($todaySales->total_revenue - $yesterdaySales->total_revenue) / $yesterdaySales->total_revenue) * 100, 1)
            : 0;

        $newCustomers = Customer::where('store_id', $storeId)
            ->whereMonth('created_at', now()->month)
            ->count();

        $lowStockCount = Product::where('store_id', $storeId)
            ->lowStock()
            ->count();

        return [
            'today_revenue'   => (float) $todaySales->total_revenue,
            'today_orders'    => (int) $todaySales->total_orders,
            'revenue_growth'  => $growth,
            'new_customers'   => $newCustomers,
            'low_stock_count' => $lowStockCount,
        ];
    }

    private function getWeeklySales(string $storeId): array
    {
        return Order::where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('created_at', [now()->subDays(6)->startOfDay(), now()->endOfDay()])
            ->selectRaw("DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue")
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->toArray();
    }

    private function getTopProducts(string $storeId): array
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.store_id', $storeId)
            ->where('orders.status', 'completed')
            ->whereMonth('orders.created_at', now()->month)
            ->selectRaw('
                order_items.product_name,
                SUM(order_items.quantity) as total_qty,
                SUM(order_items.subtotal) as total_revenue
            ')
            ->groupBy('order_items.product_name')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->get()
            ->toArray();
    }

    private function getLowStock(string $storeId): array
    {
        return Product::where('store_id', $storeId)
            ->lowStock()
            ->select('id', 'name', 'stock', 'min_stock', 'unit', 'category_id')
            ->orderBy('stock')
            ->limit(5)
            ->get()
            ->toArray();
    }
}
