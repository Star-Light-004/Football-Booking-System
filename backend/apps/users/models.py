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
        CUSTOMER      = 'customer',      'Người dùng'
        FIELD_OWNER   = 'field_owner',   'Chủ sân'
        FIELD_MANAGER = 'field_manager', 'Người quản lý sân'
        RECEPTIONIST  = 'receptionist',  'Lễ tân'
        CASHIER       = 'cashier',       'Nhân viên thu ngân'
        CLEANER       = 'cleaner',       'Nhân viên dọn dẹp'
        SERVICE_STAFF = 'service_staff', 'Nhân viên dịch vụ'
        MAINTENANCE   = 'maintenance',   'Nhân viên bảo trì sân'
        ADMIN         = 'admin',         'Quản trị viên'


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
        max_length=30,
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


class RolePermission(models.Model):
    role = models.CharField(max_length=50, unique=True, verbose_name='Vai trò')
    permissions = models.JSONField(default=list, verbose_name='Danh sách quyền')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Cập nhật lúc')

    class Meta:
        managed = True
        db_table = 'role_permissions'
        verbose_name = 'Phân quyền vai trò'
        verbose_name_plural = 'Phân quyền vai trò'

    def __str__(self):
        return f"{self.role}: {len(self.permissions)} quyền"