<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AnalyticsService — HTTP client untuk komunikasi ke Python Django service.
 *
 * Semua request menyertakan Bearer token yang dikonfigurasi di .env.
 * Jika service tidak tersedia, method akan return null/empty
 * tanpa mengganggu operasi utama Laravel.
 */
class AnalyticsService
{
    private string $baseUrl;
    private string $token;
    private int    $timeout;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.analytics.url', 'http://127.0.0.1:8001'), '/');
        $this->token   = config('services.analytics.token', '');
        $this->timeout = (int) config('services.analytics.timeout', 30);
    }

    // ── HTTP Client helper ────────────────────────────────────────

    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::timeout($this->timeout)
            ->withToken($this->token)
            ->acceptJson();
    }

    // ── Health check ──────────────────────────────────────────────

    public function isAvailable(): bool
    {
        try {
            $res = Http::timeout(3)->get("{$this->baseUrl}/api/health");
            return $res->successful();
        } catch (\Throwable) {
            return false;
        }
    }

    // ── Sync order setelah transaksi ──────────────────────────────

    public function syncOrder(array $payload): bool
    {
        try {
            $res = $this->http()->post("{$this->baseUrl}/api/orders/sync", $payload);

            if (! $res->successful()) {
                Log::warning('Analytics sync gagal', [
                    'status'  => $res->status(),
                    'body'    => $res->body(),
                    'order_id' => $payload['order_id'] ?? null,
                ]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Analytics service tidak tersedia: ' . $e->getMessage());
            return false;
        }
    }

    // ── Dashboard summary dari Python ─────────────────────────────

    public function getDashboardSummary(string $storeId): ?array
    {
        try {
            $res = $this->http()->get("{$this->baseUrl}/api/dashboard/summary", [
                'store_id' => $storeId,
            ]);

            if ($res->successful()) {
                return $res->json();
            }

            Log::warning('Analytics dashboard summary gagal', ['status' => $res->status()]);
            return null;
        } catch (\Throwable $e) {
            Log::error('Analytics getDashboardSummary error: ' . $e->getMessage());
            return null;
        }
    }

    // ── Laporan penjualan ─────────────────────────────────────────

    public function getSalesReport(
        string $storeId,
        string $dateFrom,
        string $dateTo,
        string $groupBy = 'day'
    ): ?array {
        try {
            $res = $this->http()->get("{$this->baseUrl}/api/reports/sales", [
                'store_id'  => $storeId,
                'date_from' => $dateFrom,
                'date_to'   => $dateTo,
                'group_by'  => $groupBy,
            ]);

            return $res->successful() ? $res->json() : null;
        } catch (\Throwable $e) {
            Log::error('Analytics getSalesReport error: ' . $e->getMessage());
            return null;
        }
    }

    // ── Laporan produk ────────────────────────────────────────────

    public function getProductReport(
        string $storeId,
        string $dateFrom,
        string $dateTo,
        int    $limit = 20
    ): ?array {
        try {
            $res = $this->http()->get("{$this->baseUrl}/api/reports/products", [
                'store_id'  => $storeId,
                'date_from' => $dateFrom,
                'date_to'   => $dateTo,
                'limit'     => $limit,
            ]);

            return $res->successful() ? $res->json() : null;
        } catch (\Throwable $e) {
            Log::error('Analytics getProductReport error: ' . $e->getMessage());
            return null;
        }
    }

    // ── Generate PDF ──────────────────────────────────────────────

    public function generatePdf(
        string $storeId,
        string $dateFrom,
        string $dateTo
    ): ?string {
        try {
            $res = $this->http()->get("{$this->baseUrl}/api/reports/generate", [
                'store_id'  => $storeId,
                'date_from' => $dateFrom,
                'date_to'   => $dateTo,
            ]);

            // Return raw PDF bytes
            return $res->successful() ? $res->body() : null;
        } catch (\Throwable $e) {
            Log::error('Analytics generatePdf error: ' . $e->getMessage());
            return null;
        }
    }

    // ── Prediksi stok (ML) ────────────────────────────────────────

    public function getStockForecast(string $storeId): ?array
    {
        try {
            $res = $this->http()->get("{$this->baseUrl}/api/forecast/stock", [
                'store_id' => $storeId,
            ]);

            return $res->successful() ? $res->json() : null;
        } catch (\Throwable $e) {
            Log::error('Analytics getStockForecast error: ' . $e->getMessage());
            return null;
        }
    }
}
