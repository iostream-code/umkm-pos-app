"""
Models ini adalah MIRROR read-only dari tabel Laravel.
Tidak ada migration yang dibuat dari sini (managed = False).
Django hanya membaca — semua write tetap via Laravel.
"""

from django.db import models


class Store(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=150)
    currency = models.CharField(max_length=3, default="IDR")
    timezone = models.CharField(max_length=50, default="Asia/Jakarta")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "stores"


class Category(models.Model):
    id = models.UUIDField(primary_key=True)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    name = models.CharField(max_length=100)
    slug = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = "categories"


class Product(models.Model):
    id = models.UUIDField(primary_key=True)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    category = models.ForeignKey(
        Category, null=True, on_delete=models.DO_NOTHING, db_column="category_id"
    )
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, null=True)
    price = models.DecimalField(max_digits=15, decimal_places=2)
    cost_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    stock = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=5)
    unit = models.CharField(max_length=30, default="pcs")
    track_stock = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    deleted_at = models.DateTimeField(null=True)

    class Meta:
        managed = False
        db_table = "products"


class Customer(models.Model):
    id = models.UUIDField(primary_key=True)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, null=True)
    total_transactions = models.IntegerField(default=0)
    total_spent = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    last_transaction_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "customers"


class Order(models.Model):
    id = models.UUIDField(primary_key=True)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    customer = models.ForeignKey(
        Customer, null=True, on_delete=models.DO_NOTHING, db_column="customer_id"
    )
    order_number = models.CharField(max_length=50)
    status = models.CharField(max_length=20)
    subtotal = models.DecimalField(max_digits=15, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=15, decimal_places=2)
    payment_method = models.CharField(max_length=20)
    created_at = models.DateTimeField()
    deleted_at = models.DateTimeField(null=True)

    class Meta:
        managed = False
        db_table = "orders"


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True)
    order = models.ForeignKey(
        Order, on_delete=models.DO_NOTHING, db_column="order_id", related_name="items"
    )
    product = models.ForeignKey(
        Product, null=True, on_delete=models.DO_NOTHING, db_column="product_id"
    )
    product_name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=15, decimal_places=2)
    cost_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    quantity = models.IntegerField()
    subtotal = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        managed = False
        db_table = "order_items"


class StockMovement(models.Model):
    id = models.UUIDField(primary_key=True)
    product = models.ForeignKey(
        Product, on_delete=models.DO_NOTHING, db_column="product_id"
    )
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    type = models.CharField(max_length=20)
    quantity = models.IntegerField()
    stock_before = models.IntegerField()
    stock_after = models.IntegerField()
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "stock_movements"
