<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\DiscountController;
use App\Http\Controllers\Api\V1\ShiftController;
use App\Http\Controllers\Api\V1\StockController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\StoreController;
use App\Http\Controllers\Api\V1\AnalyticsController;

/*
|--------------------------------------------------------------------------
| API Routes — SmartPOS v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ── Public Routes ────────────────────────────────────────────────────
    Route::post('auth/login',   [AuthController::class, 'login']);
    Route::post('auth/refresh', [AuthController::class, 'refresh']);

    // ── Protected Routes ─────────────────────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('logout',  [AuthController::class, 'logout']);
            Route::get('me',       [AuthController::class, 'me']);
            Route::put('password', [AuthController::class, 'changePassword']);
        });

        // Store (owner only)
        Route::middleware('role:owner')->group(function () {
            Route::get('store',    [StoreController::class, 'show']);
            Route::put('store',    [StoreController::class, 'update']);
        });

        // Shift — kasir harus buka shift sebelum transaksi
        Route::prefix('shifts')->group(function () {
            Route::get('active',      [ShiftController::class, 'active']);
            Route::post('open',       [ShiftController::class, 'open']);
            Route::post('{id}/close', [ShiftController::class, 'close']);
            Route::get('history',     [ShiftController::class, 'history']);
        });

        // Products
        Route::apiResource('products', ProductController::class);
        Route::get('products/{id}/stock-history', [StockController::class, 'productHistory']);

        // Categories
        Route::apiResource('categories', CategoryController::class);

        // Customers
        Route::apiResource('customers', CustomerController::class);
        Route::get('customers/{id}/orders', [CustomerController::class, 'orders']);

        // Discounts
        Route::apiResource('discounts', DiscountController::class);
        Route::post('discounts/validate', [DiscountController::class, 'validate']);

        // Orders (transaksi POS)
        Route::apiResource('orders', OrderController::class)->only([
            'index',
            'show',
            'store',
        ]);

        Route::post('orders/{id}/cancel',  [OrderController::class, 'cancel']);
        Route::post('orders/{id}/refund',  [OrderController::class, 'refund']);
        Route::get('orders/{id}/receipt',  [OrderController::class, 'receipt']);

        // Stock
        Route::prefix('stock')->group(function () {
            Route::get('low',              [StockController::class, 'lowStock']);
            Route::post('adjustment',      [StockController::class, 'adjustment']);
            Route::get('movements',        [StockController::class, 'movements']);
        });

        // Dashboard & Reports
        Route::get('dashboard',            [DashboardController::class, 'index']);
        Route::prefix('reports')->group(function () {
            Route::get('sales',            [ReportController::class, 'sales']);
            Route::get('products',         [ReportController::class, 'products']);
            Route::get('customers',        [ReportController::class, 'customers']);
            Route::get('export/sales',     [ReportController::class, 'exportSales']);
        });

        // Analytics (proxy ke Python service)
        Route::prefix('analytics')->group(function () {
            Route::get('stock-forecast', [AnalyticsController::class, 'stockForecast']);
            Route::get('sales-report',   [AnalyticsController::class, 'salesReport']);
            Route::get('generate-pdf',   [AnalyticsController::class, 'generatePdf']);
        });

        // User Management (owner & manager only)
        Route::middleware('role:owner,manager')->group(function () {
            Route::apiResource('users', UserController::class);
        });
    });
});
