"""
API Views untuk SmartPOS Analytics Service.

Endpoint yang tersedia:
  POST /api/orders/sync          ← Terima data order dari Laravel queue
  GET  /api/reports/sales        ← Laporan penjualan
  GET  /api/reports/products     ← Laporan produk
  GET  /api/reports/generate     ← Generate PDF
  GET  /api/forecast/stock       ← Prediksi stok habis (ML)
  GET  /api/dashboard/summary    ← Summary untuk dashboard
  GET  /api/health               ← Health check
"""

from datetime import date, timedelta, datetime

from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status

from analytics.permissions import AnalyticsTokenPermission
from analytics.services.sales_service import SalesService
from analytics.services.forecast_service import ForecastService
from analytics.services.pdf_service import PDFService


# ── Helper ────────────────────────────────────────────────────────


def _parse_date(value: str | None, fallback: date) -> date:
    if not value:
        return fallback
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return fallback


# ── Health Check (tidak butuh auth) ──────────────────────────────


@api_view(["GET"])
@permission_classes([])
def health(request):
    return Response({"status": "ok", "service": "SmartPOS Analytics"})


# ── Sync Order dari Laravel Queue ─────────────────────────────────


@api_view(["POST"])
def sync_order(request):
    """
    Endpoint yang dipanggil oleh SyncToAnalyticsJob dari Laravel.
    Saat ini hanya validasi dan acknowledge — data sudah ada di DB bersama.
    Bisa dikembangkan untuk update cache, trigger ML retraining, dll.
    """
    store_id = request.data.get("store_id")
    order_id = request.data.get("order_id")

    if not store_id or not order_id:
        return Response(
            {"error": "store_id dan order_id wajib ada."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # TODO: update cache summary harian jika menggunakan Redis
    # TODO: trigger retraining model ML jika data sudah cukup banyak

    return Response(
        {
            "status": "synced",
            "order_id": order_id,
        }
    )


# ── Sales Report ──────────────────────────────────────────────────


@api_view(["GET"])
def report_sales(request):
    """
    GET /api/reports/sales
    Params: store_id, date_from, date_to, group_by (day|week|month)
    """
    store_id = request.query_params.get("store_id")
    if not store_id:
        return Response({"error": "store_id wajib ada."}, status=400)

    today = date.today()
    date_from = _parse_date(request.query_params.get("date_from"), today.replace(day=1))
    date_to = _parse_date(request.query_params.get("date_to"), today)
    group_by = request.query_params.get("group_by", "day")

    if group_by not in ("day", "week", "month"):
        group_by = "day"

    return Response(
        {
            "period": {
                "from": date_from.isoformat(),
                "to": date_to.isoformat(),
                "group_by": group_by,
            },
            "summary": SalesService.summary(store_id, date_from, date_to),
            "sales_by_period": SalesService.by_period(
                store_id, date_from, date_to, group_by
            ),
            "by_payment_method": SalesService.by_payment_method(
                store_id, date_from, date_to
            ),
            "busy_hours": SalesService.busy_hours(store_id, date_from, date_to),
        }
    )


# ── Product Report ────────────────────────────────────────────────


@api_view(["GET"])
def report_products(request):
    """
    GET /api/reports/products
    Params: store_id, date_from, date_to, limit, category_id
    """
    store_id = request.query_params.get("store_id")
    if not store_id:
        return Response({"error": "store_id wajib ada."}, status=400)

    today = date.today()
    date_from = _parse_date(request.query_params.get("date_from"), today.replace(day=1))
    date_to = _parse_date(request.query_params.get("date_to"), today)
    limit = min(int(request.query_params.get("limit", 20)), 100)

    return Response(
        {
            "period": {
                "from": date_from.isoformat(),
                "to": date_to.isoformat(),
            },
            "top_products": SalesService.top_products(
                store_id, date_from, date_to, limit
            ),
            "no_sales_products": SalesService.no_sales_products(
                store_id, date_from, date_to
            ),
        }
    )


# ── PDF Generation ────────────────────────────────────────────────


@api_view(["GET"])
def generate_pdf(request):
    """
    GET /api/reports/generate
    Params: store_id, date_from, date_to, report_type (sales)
    Returns: PDF file bytes
    """
    store_id = request.query_params.get("store_id")
    if not store_id:
        return Response({"error": "store_id wajib ada."}, status=400)

    today = date.today()
    date_from = _parse_date(request.query_params.get("date_from"), today.replace(day=1))
    date_to = _parse_date(request.query_params.get("date_to"), today)

    # Kumpulkan semua data
    summary = SalesService.summary(store_id, date_from, date_to)
    sales_by_period = SalesService.by_period(store_id, date_from, date_to, "day")
    top_products = SalesService.top_products(store_id, date_from, date_to, 15)
    by_payment = SalesService.by_payment_method(store_id, date_from, date_to)

    # Generate PDF
    pdf_bytes = PDFService.generate_sales_report(
        store_id=store_id,
        date_from=date_from,
        date_to=date_to,
        summary=summary,
        sales_by_period=sales_by_period,
        top_products=top_products,
        by_payment=by_payment,
    )

    filename = f"laporan-{date_from}-{date_to}.pdf"

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response["Content-Length"] = len(pdf_bytes)
    return response


# ── Stock Forecast (ML) ───────────────────────────────────────────


@api_view(["GET"])
def forecast_stock(request):
    """
    GET /api/forecast/stock
    Params: store_id

    Menjalankan ML prediction untuk semua produk di toko.
    Hasilnya adalah list produk yang diprediksi akan habis dalam 30 hari.
    """
    store_id = request.query_params.get("store_id")
    if not store_id:
        return Response({"error": "store_id wajib ada."}, status=400)

    predictions = ForecastService.predict_stock_depletion(store_id)

    # Kelompokkan berdasarkan risk level
    grouped = {
        "critical": [p for p in predictions if p["risk_level"] == "critical"],
        "high": [p for p in predictions if p["risk_level"] == "high"],
        "medium": [p for p in predictions if p["risk_level"] == "medium"],
        "low": [p for p in predictions if p["risk_level"] == "low"],
    }

    return Response(
        {
            "generated_at": date.today().isoformat(),
            "forecast_days": ForecastService.FORECAST_DAYS,
            "total_at_risk": len(predictions),
            "by_risk": grouped,
            "all_predictions": predictions,
        }
    )


# ── Dashboard Summary ─────────────────────────────────────────────


@api_view(["GET"])
def dashboard_summary(request):
    """
    GET /api/dashboard/summary
    Params: store_id

    Summary ringkas untuk ditampilkan di dashboard Laravel/React.
    """
    store_id = request.query_params.get("store_id")
    if not store_id:
        return Response({"error": "store_id wajib ada."}, status=400)

    today = date.today()
    yesterday = today - timedelta(days=1)
    month_start = today.replace(day=1)

    today_summary = SalesService.summary(store_id, today, today)
    yesterday_summary = SalesService.summary(store_id, yesterday, yesterday)
    month_summary = SalesService.summary(store_id, month_start, today)
    top_products = SalesService.top_products(store_id, month_start, today, 5)

    # Hitung growth pendapatan
    prev_revenue = yesterday_summary["total_revenue"]
    curr_revenue = today_summary["total_revenue"]
    growth = 0
    if prev_revenue > 0:
        growth = round(((curr_revenue - prev_revenue) / prev_revenue) * 100, 1)

    return Response(
        {
            "today": today_summary,
            "month": month_summary,
            "revenue_growth": growth,
            "top_products": top_products,
        }
    )
