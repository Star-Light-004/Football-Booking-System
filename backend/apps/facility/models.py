import uuid
from django.db import models


class PitchCleaning(models.Model):
    """
    Nhật ký và trạng thái dọn dẹp vệ sinh từng sân bóng sau ca đá
    """
    STATUS_CHOICES = [
        ('clean', 'Đã dọn sạch'),
        ('in_progress', 'Đang dọn dẹp'),
        ('needs_clean', 'Cần dọn dẹp'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    field = models.ForeignKey(
        'fields.FootballFields',
        on_delete=models.CASCADE,
        related_name='cleaning_logs',
        null=True,
        blank=True
    )
    field_name = models.CharField(max_length=150, blank=True, null=True, verbose_name="Tên sân")
    booking = models.ForeignKey(
        'bookings.Bookings',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cleaning_records',
        verbose_name="Ca đá liên quan"
    )
    cleaner = models.ForeignKey(
        'users.Customers',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cleaning_assignments',
        verbose_name="Nhân viên dọn dẹp"
    )
    cleaner_name = models.CharField(max_length=150, default="Nhân viên vệ sinh", verbose_name="Tên người dọn")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='clean', verbose_name="Trạng thái vệ sinh")
    status_text = models.CharField(max_length=255, blank=True, null=True, verbose_name="Mô tả trạng thái")
    start_time = models.CharField(max_length=30, blank=True, null=True, verbose_name="Giờ bắt đầu")
    end_time = models.CharField(max_length=30, blank=True, null=True, verbose_name="Giờ hoàn thành")
    duration_minutes = models.IntegerField(null=True, blank=True, verbose_name="Thời gian dọn (phút)")
    cleaned_match_time = models.CharField(max_length=100, blank=True, null=True, verbose_name="Khung giờ ca đá")
    cleaned_match_customer = models.CharField(max_length=150, blank=True, null=True, verbose_name="Khách đá ca đó")
    notes = models.TextField(blank=True, null=True, verbose_name="Ghi chú vệ sinh")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'facility_pitch_cleaning'
        ordering = ['-created_at']
        verbose_name = 'Nhật ký vệ sinh sân'
        verbose_name_plural = 'Nhật ký vệ sinh sân'

    def __str__(self):
        return f"{self.field_name or 'Sân'} - {self.get_status_display()} ({self.start_time or ''})"


class MaintenanceIssue(models.Model):
    """
    Quản lý sự cố, hỏng hóc và bảo trì thiết bị, cơ sở vật chất sân bóng
    """
    PRIORITY_CHOICES = [
        ('Khẩn cấp', 'Khẩn cấp'),
        ('Cao', 'Cao'),
        ('Bình thường', 'Bình thường'),
        ('Trung bình', 'Trung bình'),
        ('Thấp', 'Thấp'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Chờ xử lý / Đang hỏng'),
        ('fixing', 'Đang sửa chữa'),
        ('done', 'Đã sửa xong'),
        ('resolved', 'Đã khắc phục'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    field = models.ForeignKey(
        'fields.FootballFields',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_issues',
        verbose_name="Sân bóng"
    )
    field_name = models.CharField(max_length=150, blank=True, null=True, verbose_name="Tên sân")
    category = models.CharField(max_length=100, default="Đèn chiếu sáng cao áp", verbose_name="Loại thiết bị / Hạng mục")
    priority = models.CharField(max_length=30, choices=PRIORITY_CHOICES, default='Khẩn cấp', verbose_name="Mức độ khẩn cấp")
    description = models.TextField(verbose_name="Mô tả sự cố chi tiết")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending', verbose_name="Trạng thái xử lý")
    reported_by = models.ForeignKey(
        'users.Customers',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_maintenance_issues',
        verbose_name="Người báo cáo"
    )
    reported_by_name = models.CharField(max_length=150, default="Nhân viên sân", verbose_name="Tên người báo")
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Chi phí bảo trì dự kiến (VNĐ)")
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Chi phí sửa chữa thực tế (VNĐ)")
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="Thời điểm hoàn thành sửa")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'facility_maintenance_issues'
        ordering = ['-created_at']
        verbose_name = 'Sự cố & Bảo trì thiết bị'
        verbose_name_plural = 'Sự cố & Bảo trì thiết bị'

    def __str__(self):
        return f"[{self.priority}] {self.category} tại {self.field_name or 'Sân'} ({self.get_status_display()})"


class LostFoundItem(models.Model):
    """
    Quản lý đồ đạc khách để quên trên sân bóng (Lost & Found)
    """
    STATUS_CHOICES = [
        ('pending', 'Đang giữ tại quầy (Chờ khách lấy)'),
        ('contacted', 'Đã liên hệ (Hẹn ngày lấy)'),
        ('returned', 'Đã bàn giao lại cho khách'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    field = models.ForeignKey(
        'fields.FootballFields',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lost_items',
        verbose_name="Sân bóng"
    )
    field_name = models.CharField(max_length=150, blank=True, null=True, verbose_name="Tên sân")
    booking = models.ForeignKey(
        'bookings.Bookings',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lost_items',
        verbose_name="Ca đá nghi vấn"
    )
    item_type = models.CharField(max_length=150, verbose_name="Loại / Tên món đồ")
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả đặc điểm nhận dạng")
    location = models.CharField(max_length=150, default="Băng ghế chờ khán đài", verbose_name="Vị trí tìm thấy")
    booking_date = models.CharField(max_length=30, blank=True, null=True, verbose_name="Ngày đặt / Ngày đá")
    guest_info = models.CharField(max_length=150, blank=True, null=True, verbose_name="Khách ca đá nghi vấn")
    customer_phone = models.CharField(max_length=30, blank=True, null=True, verbose_name="Số điện thoại liên hệ")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending', verbose_name="Trạng thái xử lý")
    return_note = models.TextField(blank=True, null=True, verbose_name="Ghi chú bàn giao")
    returned_at = models.CharField(max_length=100, blank=True, null=True, verbose_name="Thời điểm bàn giao")
    reported_by = models.CharField(max_length=150, default="Nhân viên dọn dẹp", verbose_name="Người ghi nhận")
    time = models.CharField(max_length=50, blank=True, null=True, verbose_name="Thời gian nhặt được")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'facility_lost_found_items'
        ordering = ['-created_at']
        verbose_name = 'Đồ khách bỏ quên'
        verbose_name_plural = 'Đồ khách bỏ quên (Lost & Found)'

    def __str__(self):
        return f"{self.item_type} ({self.field_name or 'Sân'}) - {self.get_status_display()}"

