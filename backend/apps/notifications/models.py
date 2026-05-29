from django.db import models
import uuid


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('booking_approved', 'Đặt sân được duyệt'),
        ('booking_rejected', 'Đặt sân bị từ chối'),
        ('booking_pending', 'Đặt sân đang chờ duyệt'),
        ('booking_completed', 'Đặt sân hoàn thành'),
        ('booking_cancelled', 'Đặt sân bị hủy'),
        ('system_message', 'Tin nhắn hệ thống'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.Customers', on_delete=models.CASCADE, related_name='notifications')
    booking = models.ForeignKey('bookings.Bookings', on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['is_read']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.phone}"
