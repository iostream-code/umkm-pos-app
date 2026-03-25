from django.urls import path
from analytics import views

urlpatterns = [
    # Health check
    path("health", views.health, name="health"),
    # Sync dari Laravel queue job
    path("orders/sync", views.sync_order, name="sync_order"),
    # Laporan
    path("reports/sales", views.report_sales, name="report_sales"),
    path("reports/products", views.report_products, name="report_products"),
    path("reports/generate", views.generate_pdf, name="generate_pdf"),
    # ML Forecast
    path("forecast/stock", views.forecast_stock, name="forecast_stock"),
    # Dashboard
    path("dashboard/summary", views.dashboard_summary, name="dashboard_summary"),
]
