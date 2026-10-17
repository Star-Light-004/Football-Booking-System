from django.db import models
import uuid
from django.utils import timezone


class Voucher(models.Model):
    DISCOUNT_TYPES = (
        ('percent', 'Giảm theo phần trăm (%)'),
        ('fixed', 'Giảm theo số tiền cố định (VNĐ)'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES, default='percent')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    min_booking_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    expiry_days = models.IntegerField(default=30)
    usage_limit = models.IntegerField(default=100, null=True, blank=True)
    is_system_reward = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vouchers'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} - {self.title}"


class CustomerVoucher(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey('users.Customers', on_delete=models.CASCADE, related_name='vouchers')
    voucher = models.ForeignKey(Voucher, on_delete=models.CASCADE, related_name='customer_instances')

    code = models.CharField(max_length=60, db_index=True)

    source_booking = models.ForeignKey(
        'bookings.Bookings',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='awarded_vouchers'
    )
    used_booking = models.ForeignKey(
        'bookings.Bookings',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='applied_vouchers'
    )

    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True, null=True)
    is_used = models.BooleanField(default=False, db_index=True)
    used_at = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'customer_vouchers'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer', 'is_used']),
            models.Index(fields=['code']),
        ]

    @property
    def is_expired(self):
        return timezone.now() > self.valid_until

    @property
    def is_valid_to_use(self):
        return not self.is_used and not self.is_expired and self.voucher.is_active

    def __str__(self):
        return f"{self.code} - {self.customer.phone}"
