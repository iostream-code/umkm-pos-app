"""
SalesService — agregasi data penjualan dari database Laravel.
Semua query menggunakan Django ORM dengan annotate dan aggregate
untuk memaksimalkan eksekusi di sisi PostgreSQL.
"""

from datetime import date, timedelta
from django.db.models import (
    Sum,
    Count,
    Avg,
    F,
    Q,
    ExpressionWrapper,
    DecimalField,
    FloatField,
    Value,
)
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, ExtractHour

from analytics.models import Order, OrderItem, Product, Customer


class SalesService:

    @staticmethod
    def _base_qs(store_id: str, date_from: date, date_to: date):
        """Query dasar: order completed dalam rentang tanggal."""
        return Order.objects.filter(
            store_id=store_id,
            status="completed",
            deleted_at__isnull=True,
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
        )

    @staticmethod
    def summary(store_id: str, date_from: date, date_to: date) -> dict:
        """Summary total untuk periode tertentu."""
        qs = SalesService._base_qs(store_id, date_from, date_to)
        agg = qs.aggregate(
            total_orders=Count("id"),
            total_revenue=Sum("total"),
            total_discount=Sum("discount_amount"),
            total_tax=Sum("tax_amount"),
            avg_order_value=Avg("total"),
            unique_customers=Count("customer_id", distinct=True),
        )
        return {
            "total_orders": agg["total_orders"] or 0,
            "total_revenue": float(agg["total_revenue"] or 0),
            "total_discount": float(agg["total_discount"] or 0),
            "total_tax": float(agg["total_tax"] or 0),
            "avg_order_value": float(agg["avg_order_value"] or 0),
            "unique_customers": agg["unique_customers"] or 0,
        }

    @staticmethod
    def by_period(
        store_id: str, date_from: date, date_to: date, group_by: str = "day"
    ) -> list:
        """Penjualan dikelompokkan per hari/minggu/bulan."""
        trunc_fn = {"day": TruncDay, "week": TruncWeek, "month": TruncMonth}.get(
            group_by, TruncDay
        )

        qs = SalesService._base_qs(store_id, date_from, date_to)
        rows = (
            qs.annotate(period=trunc_fn("created_at"))
            .values("period")
            .annotate(
                total_orders=Count("id"),
                total_revenue=Sum("total"),
                total_discount=Sum("discount_amount"),
                total_tax=Sum("tax_amount"),
                avg_order_value=Avg("total"),
            )
            .order_by("period")
        )

        return [
            {
                "period": r["period"].date().isoformat() if r["period"] else None,
                "total_orders": r["total_orders"],
                "total_revenue": float(r["total_revenue"] or 0),
                "total_discount": float(r["total_discount"] or 0),
                "total_tax": float(r["total_tax"] or 0),
                "avg_order_value": float(r["avg_order_value"] or 0),
            }
            for r in rows
        ]

    @staticmethod
    def by_payment_method(store_id: str, date_from: date, date_to: date) -> list:
        """Breakdown per metode pembayaran."""
        qs = SalesService._base_qs(store_id, date_from, date_to)
        rows = (
            qs.values("payment_method")
            .annotate(
                total_orders=Count("id"),
                total_revenue=Sum("total"),
            )
            .order_by("-total_revenue")
        )
        return [
            {
                "payment_method": r["payment_method"],
                "total_orders": r["total_orders"],
                "total_revenue": float(r["total_revenue"] or 0),
            }
            for r in rows
        ]

    @staticmethod
    def busy_hours(store_id: str, date_from: date, date_to: date) -> list:
        """Jam-jam tersibuk (untuk optimasi jadwal kasir)."""
        qs = SalesService._base_qs(store_id, date_from, date_to)
        rows = (
            qs.annotate(hour=ExtractHour("created_at"))
            .values("hour")
            .annotate(total_orders=Count("id"))
            .order_by("hour")
        )
        return [{"hour": r["hour"], "total_orders": r["total_orders"]} for r in rows]

    @staticmethod
    def top_products(
        store_id: str, date_from: date, date_to: date, limit: int = 20
    ) -> list:
        """Produk terlaris dengan analisis margin."""
        rows = (
            OrderItem.objects.filter(
                order__store_id=store_id,
                order__status="completed",
                order__deleted_at__isnull=True,
                order__created_at__date__gte=date_from,
                order__created_at__date__lte=date_to,
            )
            .values("product_id", "product_name")
            .annotate(
                total_qty=Sum("quantity"),
                total_revenue=Sum("subtotal"),
                total_cost=Sum(
                    F("quantity") * F("cost_price"), output_field=DecimalField()
                ),
            )
            .order_by("-total_revenue")[:limit]
        )

        result = []
        for r in rows:
            revenue = float(r["total_revenue"] or 0)
            cost = float(r["total_cost"] or 0)
            profit = revenue - cost
            margin = round((profit / revenue * 100), 2) if revenue > 0 else 0

            # Ambil nama kategori jika product_id ada
            cat_name = None
            if r["product_id"]:
                try:
                    p = Product.objects.select_related("category").get(
                        pk=r["product_id"]
                    )
                    cat_name = p.category.name if p.category else None
                except Product.DoesNotExist:
                    pass

            result.append(
                {
                    "product_id": str(r["product_id"]) if r["product_id"] else None,
                    "product_name": r["product_name"],
                    "category_name": cat_name,
                    "total_qty": r["total_qty"],
                    "total_revenue": revenue,
                    "total_cost": cost,
                    "total_profit": round(profit, 2),
                    "margin_pct": margin,
                }
            )

        return result

    @staticmethod
    def no_sales_products(store_id: str, date_from: date, date_to: date) -> list:
        """Produk aktif yang tidak terjual sama sekali di periode ini."""
        sold_ids = (
            OrderItem.objects.filter(
                order__store_id=store_id,
                order__status="completed",
                order__created_at__date__gte=date_from,
                order__created_at__date__lte=date_to,
            )
            .values_list("product_id", flat=True)
            .distinct()
        )

        products = (
            Product.objects.filter(
                store_id=store_id, is_active=True, deleted_at__isnull=True
            )
            .exclude(id__in=sold_ids)
            .values("id", "name", "stock", "price")[:20]
        )

        return [
            {
                "id": str(p["id"]),
                "name": p["name"],
                "stock": p["stock"],
                "price": float(p["price"]),
            }
            for p in products
        ]
