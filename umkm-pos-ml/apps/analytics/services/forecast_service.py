"""
ForecastService — prediksi stok habis menggunakan Machine Learning.

Algoritma: Linear Regression sederhana pada time series penjualan per produk.
Untuk production, bisa diganti dengan Prophet atau ARIMA.

Flow:
1. Ambil data penjualan 90 hari terakhir per produk
2. Buat features: jumlah hari sejak awal, moving average 7 hari
3. Fit LinearRegression
4. Prediksi konsumsi harian rata-rata ke depan
5. Hitung estimasi hari sampai stok habis
"""

import numpy as np
import pandas as pd
from datetime import date, timedelta
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

from django.db.models import Sum
from django.db.models.functions import TruncDay

from analytics.models import OrderItem, Product


class ForecastService:

    LOOKBACK_DAYS = 90  # Data historis yang dipakai
    FORECAST_DAYS = 30  # Jangka prediksi ke depan
    MIN_DATA_POINTS = 7  # Minimal data untuk prediksi

    @staticmethod
    def predict_stock_depletion(store_id: str) -> list:
        """
        Prediksi produk mana yang akan kehabisan stok dalam 30 hari ke depan.
        Returns list produk dengan estimasi hari tersisa.
        """
        date_from = date.today() - timedelta(days=ForecastService.LOOKBACK_DAYS)

        # Ambil semua produk aktif dengan stok tracking
        products = Product.objects.filter(
            store_id=store_id,
            is_active=True,
            track_stock=True,
            deleted_at__isnull=True,
            stock__gt=0,
        )

        results = []

        for product in products:
            prediction = ForecastService._predict_single(product, date_from)
            if prediction:
                results.append(prediction)

        # Sort: yang paling segera habis lebih dulu
        results.sort(key=lambda x: x["days_until_empty"])
        return results

    @staticmethod
    def _predict_single(product: Product, date_from: date) -> dict | None:
        """Prediksi untuk satu produk."""
        # Ambil data penjualan harian
        daily_sales = (
            OrderItem.objects.filter(
                product_id=product.id,
                order__status="completed",
                order__deleted_at__isnull=True,
                order__created_at__date__gte=date_from,
            )
            .annotate(day=TruncDay("order__created_at"))
            .values("day")
            .annotate(qty=Sum("quantity"))
            .order_by("day")
        )

        if len(daily_sales) < ForecastService.MIN_DATA_POINTS:
            # Data terlalu sedikit — pakai rata-rata sederhana
            if daily_sales:
                total_qty = sum(r["qty"] for r in daily_sales)
                avg_daily = total_qty / ForecastService.LOOKBACK_DAYS
            else:
                return None  # Belum pernah terjual, skip
        else:
            avg_daily = ForecastService._ml_predict(daily_sales)

        if avg_daily <= 0:
            return None  # Tidak ada konsumsi, skip

        days_until_empty = product.stock / avg_daily
        restock_date = date.today() + timedelta(days=days_until_empty)

        # Hanya report produk yang akan habis dalam FORECAST_DAYS
        if days_until_empty > ForecastService.FORECAST_DAYS:
            return None

        risk_level = (
            "critical"
            if days_until_empty <= 3
            else (
                "high"
                if days_until_empty <= 7
                else "medium" if days_until_empty <= 14 else "low"
            )
        )

        return {
            "product_id": str(product.id),
            "product_name": product.name,
            "product_sku": product.sku,
            "current_stock": product.stock,
            "unit": product.unit,
            "min_stock": product.min_stock,
            "avg_daily_usage": round(avg_daily, 2),
            "days_until_empty": round(days_until_empty, 1),
            "estimated_empty_date": restock_date.isoformat(),
            "risk_level": risk_level,
            "recommended_restock": max(
                product.min_stock, int(avg_daily * 30)  # Restock untuk 30 hari
            ),
        }

    @staticmethod
    def _ml_predict(daily_sales) -> float:
        """
        Linear Regression pada time series penjualan.
        Feature: nomor hari (X), qty terjual (y).
        """
        df = pd.DataFrame([{"day": r["day"], "qty": r["qty"]} for r in daily_sales])
        df["day"] = pd.to_datetime(df["day"])
        df = df.sort_values("day")

        # Feature engineering
        df["day_num"] = (df["day"] - df["day"].min()).dt.days
        df["ma7"] = df["qty"].rolling(window=7, min_periods=1).mean()

        X = df[["day_num", "ma7"]].values
        y = df["qty"].values

        # Standardize
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Fit model
        model = LinearRegression()
        model.fit(X_scaled, y)

        # Prediksi rata-rata konsumsi 30 hari ke depan
        future_days = np.arange(
            df["day_num"].max() + 1,
            df["day_num"].max() + ForecastService.FORECAST_DAYS + 1,
        )
        last_ma7 = float(df["ma7"].iloc[-1])
        future_X = np.column_stack(
            [future_days, np.full(ForecastService.FORECAST_DAYS, last_ma7)]
        )
        future_X_scaled = scaler.transform(future_X)

        predictions = model.predict(future_X_scaled)
        avg_prediction = max(0, float(np.mean(predictions)))

        return avg_prediction
