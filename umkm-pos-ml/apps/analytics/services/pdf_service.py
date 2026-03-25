"""
PDFService — generate laporan penjualan dalam format PDF.
Menggunakan ReportLab untuk layout profesional.
"""

import io
from datetime import date
from pathlib import Path

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

from analytics.models import Store


# ── Warna brand SmartPOS ──────────────────────────────────────────
PRIMARY = colors.HexColor("#3670ff")
LIGHT_GRAY = colors.HexColor("#f8f9fc")
DARK_GRAY = colors.HexColor("#3d3d3a")
MEDIUM_GRAY = colors.HexColor("#8896b3")


def fmt_rupiah(amount: float) -> str:
    """Format angka ke Rupiah Indonesia."""
    return f"Rp {amount:,.0f}".replace(",", ".")


class PDFService:

    @staticmethod
    def generate_sales_report(
        store_id: str,
        date_from: date,
        date_to: date,
        summary: dict,
        sales_by_period: list,
        top_products: list,
        by_payment: list,
    ) -> bytes:
        """
        Generate laporan penjualan PDF.
        Returns bytes — bisa disimpan ke file atau dikirim sebagai response.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=15 * mm,
            leftMargin=15 * mm,
            topMargin=20 * mm,
            bottomMargin=15 * mm,
        )

        styles = getSampleStyleSheet()
        story = []

        # ── Header ────────────────────────────────────────────────
        try:
            store = Store.objects.get(pk=store_id)
            store_name = store.name
        except Store.DoesNotExist:
            store_name = "SmartPOS"

        title_style = ParagraphStyle(
            "Title",
            parent=styles["Title"],
            fontSize=18,
            textColor=PRIMARY,
            spaceAfter=2 * mm,
        )
        sub_style = ParagraphStyle(
            "Sub",
            parent=styles["Normal"],
            fontSize=10,
            textColor=MEDIUM_GRAY,
            spaceAfter=6 * mm,
        )

        story.append(Paragraph(store_name, title_style))
        story.append(Paragraph("Laporan Penjualan", title_style))
        story.append(
            Paragraph(
                f"Periode: {date_from.strftime('%d %B %Y')} — {date_to.strftime('%d %B %Y')}",
                sub_style,
            )
        )
        story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY))
        story.append(Spacer(1, 5 * mm))

        # ── Summary Cards ─────────────────────────────────────────
        story.append(Paragraph("Ringkasan", styles["Heading2"]))
        story.append(Spacer(1, 2 * mm))

        summary_data = [
            ["Metrik", "Nilai"],
            ["Total Omzet", fmt_rupiah(summary.get("total_revenue", 0))],
            ["Total Transaksi", str(summary.get("total_orders", 0))],
            ["Rata-rata Transaksi", fmt_rupiah(summary.get("avg_order_value", 0))],
            ["Total Diskon", fmt_rupiah(summary.get("total_discount", 0))],
            ["Total Pajak", fmt_rupiah(summary.get("total_tax", 0))],
            ["Pelanggan Unik", str(summary.get("unique_customers", 0))],
        ]

        summary_table = Table(summary_data, colWidths=[90 * mm, 80 * mm])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BACKGROUND", (0, 1), (-1, -1), LIGHT_GRAY),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e6ef")),
                    ("ROWHEIGHT", (0, 0), (-1, -1), 8 * mm),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ]
            )
        )
        story.append(summary_table)
        story.append(Spacer(1, 6 * mm))

        # ── Metode Pembayaran ─────────────────────────────────────
        if by_payment:
            story.append(Paragraph("Metode Pembayaran", styles["Heading2"]))
            story.append(Spacer(1, 2 * mm))

            PAYMENT_LABELS = {
                "cash": "Tunai",
                "qris": "QRIS",
                "card": "Kartu",
                "transfer": "Transfer",
                "mixed": "Campuran",
            }

            pay_data = [["Metode", "Transaksi", "Total"]]
            for p in by_payment:
                pay_data.append(
                    [
                        PAYMENT_LABELS.get(p["payment_method"], p["payment_method"]),
                        str(p["total_orders"]),
                        fmt_rupiah(p["total_revenue"]),
                    ]
                )

            pay_table = Table(pay_data, colWidths=[70 * mm, 40 * mm, 60 * mm])
            pay_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                        (
                            "ROWBACKGROUNDS",
                            (0, 1),
                            (-1, -1),
                            [colors.white, LIGHT_GRAY],
                        ),
                        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e6ef")),
                        ("ROWHEIGHT", (0, 0), (-1, -1), 7 * mm),
                        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                    ]
                )
            )
            story.append(pay_table)
            story.append(Spacer(1, 6 * mm))

        # ── Top Produk ────────────────────────────────────────────
        if top_products:
            story.append(Paragraph("Produk Terlaris", styles["Heading2"]))
            story.append(Spacer(1, 2 * mm))

            prod_data = [["#", "Produk", "Qty", "Omzet", "Profit", "Margin"]]
            for i, p in enumerate(top_products[:15], 1):
                prod_data.append(
                    [
                        str(i),
                        (
                            p["product_name"][:35] + "…"
                            if len(p["product_name"]) > 35
                            else p["product_name"]
                        ),
                        str(p["total_qty"]),
                        fmt_rupiah(p["total_revenue"]),
                        fmt_rupiah(p["total_profit"]),
                        f"{p['margin_pct']}%",
                    ]
                )

            prod_table = Table(
                prod_data,
                colWidths=[8 * mm, 65 * mm, 15 * mm, 32 * mm, 32 * mm, 18 * mm],
            )
            prod_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 8),
                        (
                            "ROWBACKGROUNDS",
                            (0, 1),
                            (-1, -1),
                            [colors.white, LIGHT_GRAY],
                        ),
                        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e6ef")),
                        ("ROWHEIGHT", (0, 0), (-1, -1), 7 * mm),
                        ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
                    ]
                )
            )
            story.append(prod_table)
            story.append(Spacer(1, 6 * mm))

        # ── Tren Penjualan ────────────────────────────────────────
        if sales_by_period:
            story.append(Paragraph("Detail Penjualan Per Periode", styles["Heading2"]))
            story.append(Spacer(1, 2 * mm))

            period_data = [
                ["Periode", "Transaksi", "Omzet", "Diskon", "Avg. Transaksi"]
            ]
            for row in sales_by_period:
                period_data.append(
                    [
                        row.get("period", ""),
                        str(row.get("total_orders", 0)),
                        fmt_rupiah(row.get("total_revenue", 0)),
                        fmt_rupiah(row.get("total_discount", 0)),
                        fmt_rupiah(row.get("avg_order_value", 0)),
                    ]
                )

            period_table = Table(
                period_data,
                colWidths=[35 * mm, 20 * mm, 38 * mm, 35 * mm, 38 * mm],
            )
            period_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 8),
                        (
                            "ROWBACKGROUNDS",
                            (0, 1),
                            (-1, -1),
                            [colors.white, LIGHT_GRAY],
                        ),
                        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e6ef")),
                        ("ROWHEIGHT", (0, 0), (-1, -1), 6.5 * mm),
                        ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
                    ]
                )
            )
            story.append(period_table)

        # ── Footer ────────────────────────────────────────────────
        story.append(Spacer(1, 8 * mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=MEDIUM_GRAY))
        story.append(Spacer(1, 2 * mm))
        footer_style = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontSize=7,
            textColor=MEDIUM_GRAY,
            alignment=TA_CENTER,
        )
        story.append(
            Paragraph(
                f"Digenerate oleh SmartPOS Analytics · {date.today().strftime('%d %B %Y')}",
                footer_style,
            )
        )

        doc.build(story)
        return buffer.getvalue()

    @staticmethod
    def save_to_file(pdf_bytes: bytes, filename: str) -> str:
        """Simpan PDF ke local storage, return path."""
        path = settings.PDF_LOCAL_DIR / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            f.write(pdf_bytes)
        return str(path)
