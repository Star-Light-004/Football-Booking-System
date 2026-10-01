import uuid
from django.db import models


class Admin(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(unique=True, max_length=15)
    password_hash = models.TextField()
    role = models.TextField()
    is_active = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'admins'


class Customers(models.Model):

    class Role(models.TextChoices):
        CUSTOMER = 'customer', 'Khách hàng'
        STAFF    = 'staff',    'Nhân viên'
        ADMIN    = 'admin',    'Quản trị viên'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'Admin',
        models.DO_NOTHING,
        db_column='user_id',
        blank=True,
        null=True
    )
    full_name = models.CharField(max_length=150)
    password_hash = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    email = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    # ── Phân quyền vai trò ──────────────────────────────────────────────────
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
        verbose_name='Vai trò',
    )

    # ── Trạng thái tài khoản ─────────────────────────────────────────────────
    is_active = models.BooleanField(
        default=True,
        verbose_name='Đang hoạt động',
        help_text='Bỏ chọn để khóa tài khoản người dùng.',
    )

    class Meta:
        managed = True
        db_table = 'customers'
        verbose_name = 'Khách hàng'
        verbose_name_plural = 'Khách hàng'

    def __str__(self):
        return f"{self.full_name} ({self.get_role_display()})"

    @property
    def status(self):
        """Trả về trạng thái dạng chuỗi để tương thích với serializer cũ."""
        return 'active' if self.is_active else 'locked'