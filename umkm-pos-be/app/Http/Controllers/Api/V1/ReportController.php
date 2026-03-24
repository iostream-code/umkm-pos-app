<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;

class ReportController extends Controller
{
    /**
     * GET /api/v1/reports/sales
     * Laporan penjualan berdasarkan rentang tanggal
     * Query params: date_from, date_to, group_by (day|week|month)
     */
    public function sales(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date', 'after_or_equal:date_from'],
            'group_by'  => ['nullable', 'string', 'in:day,week,month'],
        ]);

        $storeId  = $request->user()->store_id;
        $dateFrom = $request->get('date_from', now()->startOfMonth()->toDateString());
        $dateTo   = $request->get('date_to', now()->toDateString());
        $groupBy  = $request->get('group_by', 'day');

        // Format tanggal sesuai grouping — fitur PostgreSQL date_trunc
        $truncFormat = match ($groupBy) {
            'week'  => 'week',
            'month' => 'month',
            default => 'day',
        };

        // Penjualan per periode
        $salesByPeriod = DB::table('orders')
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween(DB::raw('DATE(created_at)'), [$dateFrom, $dateTo])
            ->selectRaw("
                DATE_TRUNC('{$truncFormat}', created_at) as period,
                COUNT(*) as total_orders,
                COALESCE(SUM(total), 0) as total_revenue,
                COALESCE(SUM(discount_amount), 0) as total_discount,
                COALESCE(SUM(tax_amount), 0) as total_tax,
                COALESCE(AVG(total), 0) as avg_order_value
            ")
            ->groupByRaw("DATE_TRUNC('{$truncFormat}', created_at)")
            ->orderBy('period')
            ->get();

        // Breakdown per metode pembayaran
        $byPaymentMethod = DB::table('orders')
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween(DB::raw('DATE(created_at)'), [$dateFrom, $dateTo])
            ->selectRaw("
                payment_method,
                COUNT(*) as total_orders,
                COALESCE(SUM(total), 0) as total_revenue
            ")
            ->groupBy('payment_method')
            ->get();

        // Jam tersibuk (untuk optimasi jadwal kasir)
        $busyHours = DB::table('orders')
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween(DB::raw('DATE(created_at)'), [$dateFrom, $dateTo])
            ->selectRaw("
                EXTRACT(HOUR FROM created_at)::int as hour,
                COUNT(*) as total_orders
            ")
            ->groupByRaw('EXTRACT(HOUR FROM created_at)')
            ->orderByRaw('EXTRACT(HOUR FROM created_at)')
            ->get();

        // Summary total periode
        $summary = DB::table('orders')
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween(DB::raw('DATE(created_at)'), [$dateFrom, $dateTo])
            ->selectRaw("
                COUNT(*) as total_orders,
                COALESCE(SUM(total), 0) as total_revenue,
                COALESCE(SUM(discount_amount), 0) as total_discount,
                COALESCE(AVG(total), 0) as avg_order_value,
                COUNT(DISTINCT customer_id) as unique_customers
            ")
            ->first();

        return response()->json([
            'period'            => ['from' => $dateFrom, 'to' => $dateTo, 'group_by' => $groupBy],
            'summary'           => $summary,
            'sales_by_period'   => $salesByPeriod,
            'by_payment_method' => $byPaymentMethod,
            'busy_hours'        => $busyHours,
        ]);
    }

    /**
     * GET /api/v1/reports/products
     * Laporan produk terlaris & analisis margin
     */
    public function products(Request $request): JsonResponse
    {
        $request->validate([
            'date_from'   => ['nullable', 'date'],
            'date_to'     => ['nullable', 'date'],
            'category_id' => ['nullable', 'uuid'],
            'limit'       => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $storeId  = $request->user()->store_id;
        $dateFrom = $request->get('date_from', now()->startOfMonth()->toDateString());
        $dateTo   = $request->get('date_to', now()->toDateString());
        $limit    = $request->get('limit', 20);

        $topProducts = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->where('orders.store_id', $storeId)
            ->where('orders.status', 'completed')
            ->whereBetween(DB::raw('DATE(orders.created_at)'), [$dateFrom, $dateTo])
            ->when(
                $request->category_id,
                fn($q) =>
                $q->where('products.category_id', $request->category_id)
            )
            ->selectRaw("
                order_items.product_id,
                order_items.product_name,
                categories.name as category_name,
                SUM(order_items.quantity) as total_qty,
                COALESCE(SUM(order_items.subtotal), 0) as total_revenue,
                COALESCE(SUM(order_items.quantity * order_items.cost_price), 0) as total_cost,
                COALESCE(SUM(order_items.subtotal) - SUM(order_items.quantity * order_items.cost_price), 0) as total_profit,
                ROUND(
                    CASE WHEN SUM(order_items.subtotal) > 0
                    THEN ((SUM(order_items.subtotal) - SUM(order_items.quantity * order_items.cost_price)) / SUM(order_items.subtotal)) * 100
                    ELSE 0 END, 2
                ) as margin_pct
            ")
            ->groupBy('order_items.product_id', 'order_items.product_name', 'categories.name')
            ->orderByDesc('total_qty')
            ->limit($limit)
            ->get();

        // Produk yang tidak terjual sama sekali di periode ini
        $noSalesProducts = DB::table('products')
            ->where('products.store_id', $storeId)
            ->where('products.is_active', true)
            ->whereNotIn('products.id', function ($sub) use ($storeId, $dateFrom, $dateTo) {
                $sub->select('order_items.product_id')
                    ->from('order_items')
                    ->join('orders', 'orders.id', '=', 'order_items.order_id')
                    ->where('orders.store_id', $storeId)
                    ->where('orders.status', 'completed')
                    ->whereBetween(DB::raw('DATE(orders.created_at)'), [$dateFrom, $dateTo]);
            })
            ->select('id', 'name', 'stock', 'price')
            ->limit(20)
            ->get();

        return response()->json([
            'period'           => ['from' => $dateFrom, 'to' => $dateTo],
            'top_products'     => $topProducts,
            'no_sales_products' => $noSalesProducts,
        ]);
    }

    /**
     * GET /api/v1/reports/customers
     * Laporan analisis pelanggan
     */
    public function customers(Request $request): JsonResponse
    {
        $storeId  = $request->user()->store_id;
        $dateFrom = $request->get('date_from', now()->startOfMonth()->toDateString());
        $dateTo   = $request->get('date_to', now()->toDateString());

        // Top pelanggan berdasarkan total belanja
        $topCustomers = DB::table('customers')
            ->where('customers.store_id', $storeId)
            ->where('customers.total_transactions', '>', 0)
            ->select(
                'customers.id',
                'customers.name',
                'customers.phone',
                'customers.total_transactions',
                'customers.total_spent',
                'customers.last_transaction_at'
            )
            ->orderByDesc('total_spent')
            ->limit(20)
            ->get();

        // Pelanggan baru vs returning di periode ini
        $newCustomers = Customer::where('store_id', $storeId)
            ->whereBetween(DB::raw('DATE(created_at)'), [$dateFrom, $dateTo])
            ->count();

        return response()->json([
            'period'        => ['from' => $dateFrom, 'to' => $dateTo],
            'top_customers' => $topCustomers,
            'new_customers' => $newCustomers,
        ]);
    }

    /**
     * GET /api/v1/reports/export/sales
     * Export laporan penjualan ke CSV
     * (Untuk export PDF kompleks, dikirim ke Python service via queue)
     */
    public function exportSales(Request $request)
    {
        $request->validate([
            'date_from' => ['required', 'date'],
            'date_to'   => ['required', 'date', 'after_or_equal:date_from'],
        ]);

        $storeId  = $request->user()->store_id;
        $dateFrom = $request->date_from;
        $dateTo   = $request->date_to;

        $orders = Order::where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween(DB::raw('DATE(created_at)'), [$dateFrom, $dateTo])
            ->with(['user:id,name', 'customer:id,name'])
            ->orderBy('created_at')
            ->get();

        // Build CSV
        $headers  = ['No. Invoice', 'Tanggal', 'Kasir', 'Pelanggan', 'Metode', 'Subtotal', 'Diskon', 'Pajak', 'Total'];
        $rows     = [];
        $rows[]   = implode(',', $headers);

        foreach ($orders as $order) {
            $rows[] = implode(',', [
                $order->order_number,
                $order->created_at->format('d/m/Y H:i'),
                $order->user->name ?? '-',
                $order->customer->name ?? 'Umum',
                $order->payment_method,
                $order->subtotal,
                $order->discount_amount,
                $order->tax_amount,
                $order->total,
            ]);
        }

        $filename = "laporan-penjualan-{$dateFrom}-sd-{$dateTo}.csv";
        $content  = implode("\n", $rows);

        return Response::make($content, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
