from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Bookings
from apps.notifications.models import Notification


# Lưu trữ status cũ trước khi save
_booking_old_status = {}

@receiver(pre_save, sender=Bookings)
def store_booking_old_status(sender, instance, **kwargs):
    """Lưu status cũ trước khi booking được save"""
    try:
        if instance.id:
            old_booking = Bookings.objects.get(id=instance.id)
            _booking_old_status[instance.id] = old_booking.status
            print(f"🔍 [Signal] Pre-save - Stored old status for {instance.id}: {old_booking.status}")
    except Bookings.DoesNotExist:
        _booking_old_status[instance.id] = None


@receiver(post_save, sender=Bookings)
def create_notification_on_booking_update(sender, instance, created, update_fields, **kwargs):
    """
    Tạo notification khi booking được tạo mới hoặc status thay đổi
    """
    try:
        print(f"🔔 [Signal] Booking post_save triggered - created: {created}, update_fields: {update_fields}")
        
        # Nếu là lần đầu tạo booking
        if created:
            print(f"✅ Creating new booking notification for customer: {instance.customer.id}")
            Notification.objects.create(
                user=instance.customer,
                booking=instance,
                notification_type='booking_pending',
                title='Đặt sân thành công',
                message=f'Đặt sân của bạn tại {instance.field.field_name} vào {instance.booking_date} đã được ghi nhận. Chờ xác nhận từ quản trị viên.',
                is_read=False
            )
            print(f"✅ Notification created successfully")
            return
        
        # Kiểm tra status thay đổi
        old_status = _booking_old_status.get(instance.id)
        new_status = instance.status
        
        print(f"📊 Status check - Old: {old_status}, New: {new_status}")
        
        # Nếu status không thay đổi, không tạo notification
        if old_status == new_status:
            print(f"⚠️ Status not actually changed - skipping notification")
            return
        
        print(f"🔄 Status update detected for booking: {instance.id}")
        
        # Tạo notification tương ứng với status mới
        notification_type = None
        message = None
        title = None
        
        if new_status and (new_status.lower() == 'approved' or new_status.lower() == 'confirmed'):
            notification_type = 'booking_approved'
            title = 'Đặt sân được duyệt'
            message = f'Đặt sân của bạn tại {instance.field.field_name} vào {instance.booking_date} ({instance.start_time} - {instance.end_time}) đã được duyệt. Vui lòng thanh toán để hoàn tất.'
        
        elif new_status and (new_status.lower() == 'rejected' or new_status.lower() == 'cancelled'):
            notification_type = 'booking_rejected'
            title = 'Đặt sân bị từ chối'
            message = f'Đặt sân của bạn tại {instance.field.field_name} vào {instance.booking_date} đã bị từ chối. Liên hệ quản trị viên để biết thêm chi tiết.'
        
        elif new_status and new_status.lower() == 'completed':
            notification_type = 'booking_completed'
            title = 'Đặt sân hoàn thành'
            message = f'Đặt sân của bạn tại {instance.field.field_name} vào {instance.booking_date} đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!'
        
        elif new_status and new_status.lower() == 'pending':
            notification_type = 'booking_pending'
            title = 'Đặt sân đang chờ xác nhận'
            message = f'Đặt sân của bạn tại {instance.field.field_name} vào {instance.booking_date} đang chờ xác nhận từ quản trị viên.'
        
        # Tạo notification nếu có type
        if notification_type and message and title:
            print(f"✅ Creating notification: {notification_type}")
            Notification.objects.create(
                user=instance.customer,
                booking=instance,
                notification_type=notification_type,
                title=title,
                message=message,
                is_read=False
            )
            print(f"✅ Notification created successfully")
            # Cleanup
            _booking_old_status.pop(instance.id, None)
        else:
            print(f"⚠️ No notification type matched for status: {new_status}")
    
    except Exception as e:
        print(f"❌ Error creating notification: {e}")
        import traceback
        traceback.print_exc()
