<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * GET /api/v1/dashboard
     * Data ringkasan untuk halaman utama admin/owner
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $request->user()->store_id;
        $today   = today();

        // Query paralel menggunakan subquery — lebih efisien dari N+1 queries
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

        // Pertumbuhan penjualan
        $growth = $yesterdaySales->total_revenue > 0
            ? round((($todaySales->total_revenue - $yesterdaySales->total_revenue) / $yesterdaySales->total_revenue) * 100, 1)
            : 0;

        // Penjualan 7 hari terakhir (untuk chart)
        $weeklySales = Order::where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('created_at', [now()->subDays(6)->startOfDay(), now()->endOfDay()])
            ->selectRaw("DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Produk terlaris bulan ini
        $topProducts = DB::table('order_items')
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
            ->get();

        // Produk stok menipis
        $lowStock = Product::where('store_id', $storeId)
            ->lowStock()
            ->with('category:id,name')
            ->select('id', 'name', 'stock', 'min_stock', 'unit', 'category_id')
            ->orderBy('stock')
            ->limit(5)
            ->get();

        // Total pelanggan bulan ini
        $newCustomers = Customer::where('store_id', $storeId)
            ->whereMonth('created_at', now()->month)
            ->count();

        return response()->json([
            'summary' => [
                'today_revenue'    => (float) $todaySales->total_revenue,
                'today_orders'     => (int) $todaySales->total_orders,
                'revenue_growth'   => $growth,
                'new_customers'    => $newCustomers,
                'low_stock_count'  => $lowStock->count(),
            ],
            'weekly_sales'  => $weeklySales,
            'top_products'  => $topProducts,
            'low_stock'     => $lowStock,
        ]);
    }
}
