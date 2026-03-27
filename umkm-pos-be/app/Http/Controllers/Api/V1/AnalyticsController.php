<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * AnalyticsController — proxy request dari React ke Python service.
 *
 * React tidak perlu tahu URL Python service.
 * Semua request tetap ke Laravel dengan auth Sanctum,
 * Laravel yang forward ke Python dengan token analytics.
 */
class AnalyticsController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analytics
    ) {}

    /**
     * GET /api/v1/analytics/stock-forecast
     * Prediksi stok habis menggunakan ML dari Python
     */
    public function stockForecast(Request $request): JsonResponse
    {
        $storeId = $request->user()->store_id;

        $data = $this->analytics->getStockForecast($storeId);

        if (!$data) {
            return response()->json([
                'message'         => 'Analytics service sedang tidak tersedia.',
                'total_at_risk'   => 0,
                'all_predictions' => [],
                'by_risk'         => ['critical' => [], 'high' => [], 'medium' => [], 'low' => []],
            ]);
        }

        return response()->json($data);
    }

    /**
     * GET /api/v1/analytics/sales-report
     * Laporan penjualan dari Python (lebih detail dari Laravel)
     */
    public function salesReport(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date'],
            'group_by'  => ['nullable', 'in:day,week,month'],
        ]);

        $storeId  = $request->user()->store_id;
        $dateFrom = $request->get('date_from', now()->startOfMonth()->toDateString());
        $dateTo   = $request->get('date_to', now()->toDateString());
        $groupBy  = $request->get('group_by', 'day');

        $data = $this->analytics->getSalesReport($storeId, $dateFrom, $dateTo, $groupBy);

        if (! $data) {
            return response()->json(['message' => 'Analytics service tidak tersedia.'], 503);
        }

        return response()->json($data);
    }

    /**
     * GET /api/v1/analytics/generate-pdf
     * Generate dan download PDF laporan dari Python
     */
    public function generatePdf(Request $request): Response|JsonResponse
    {
        $request->validate([
            'date_from' => ['required', 'date'],
            'date_to'   => ['required', 'date'],
        ]);

        $storeId  = $request->user()->store_id;
        $dateFrom = $request->date_from;
        $dateTo   = $request->date_to;

        $pdfBytes = $this->analytics->generatePdf($storeId, $dateFrom, $dateTo);

        if (! $pdfBytes) {
            return response()->json(['message' => 'Gagal generate PDF.'], 503);
        }

        return response($pdfBytes, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"laporan-{$dateFrom}-{$dateTo}.pdf\"",
            'Content-Length'      => strlen($pdfBytes),
        ]);
    }
}
