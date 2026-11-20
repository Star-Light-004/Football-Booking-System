from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Bookings


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
            print(f"✅ New booking created for customer: {instance.customer.id}")
            return
        
        # Kiểm tra status thay đổi
        old_status = _booking_old_status.get(instance.id)
        new_status = instance.status
        
        print(f"📊 Status check - Old: {old_status}, New: {new_status}")
        
        # Nếu status không thay đổi, không xử lý
        if old_status == new_status:
            print(f"⚠️ Status not actually changed - skipping")
            return
        
        print(f"🔄 Status update detected for booking: {instance.id}")
        
        if new_status and (new_status.lower() == 'approved' or new_status.lower() == 'confirmed'):
            pass
        
        elif new_status and (new_status.lower() == 'rejected' or new_status.lower() == 'cancelled'):
            try:
                from apps.servicesadd.views import sync_booking_services_stock
                sync_booking_services_stock(instance, new_status, old_status)
            except Exception as stock_err:
                print("Lỗi hoàn tồn kho dịch vụ khi hủy booking:", stock_err)
        
        elif new_status and new_status.lower() in ['completed', 'hoàn thành']:
            notification_type = 'booking_completed'
            title = 'Đặt sân hoàn thành'
            message = f'Đặt sân của bạn tại {instance.field.field_name} vào {instance.booking_date} đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!'
            
            # 📦 Trừ số lượng tồn kho dịch vụ đi kèm khi hoàn thành
            try:
                from apps.servicesadd.views import sync_booking_services_stock
                sync_booking_services_stock(instance, new_status, old_status)
            except Exception as stock_err:
                print("Lỗi trừ tồn kho dịch vụ khi hoàn thành booking:", stock_err)

            # 🎁 Tự động tặng voucher cho khách hàng
            try:
                from apps.vouchers.services import award_completion_voucher
                award_completion_voucher(instance)
            except Exception as voucher_err:
                print("Lỗi tặng voucher khi hoàn thành booking:", voucher_err)

            # 🎟️ Cập nhật trạng thái voucher đã sử dụng khi hoàn thành đơn
            if instance.voucher_code:
                try:
                    from apps.vouchers.models import CustomerVoucher
                    from django.utils import timezone
                    cv = CustomerVoucher.objects.filter(code__iexact=instance.voucher_code).first()
                    if cv:
                        cv.is_used = True
                        cv.used_at = timezone.now()
                        cv.used_booking = instance
                        cv.save()
                        print(f"✅ Đã cập nhật voucher {cv.code} sang đã sử dụng cho đơn #{instance.id}")
                except Exception as cv_err:
                    print("Lỗi cập nhật voucher khi completed:", cv_err)
        
        elif new_status and new_status.lower() == 'pending':
            pass

        # Kiểm tra nếu chuyển từ hoàn thành sang trạng thái khác thì hoàn lại tồn kho
        if old_status and str(old_status).lower() in ['completed', 'hoàn thành'] and str(new_status).lower() not in ['completed', 'hoàn thành', 'rejected', 'cancelled']:
            try:
                from apps.servicesadd.views import sync_booking_services_stock
                sync_booking_services_stock(instance, new_status, old_status)
            except Exception as stock_err:
                print("Lỗi hoàn tồn kho khi chuyển trạng thái:", stock_err)

        # Cleanup
        _booking_old_status.pop(instance.id, None)
    
    except Exception as e:
        print(f"❌ Error creating notification: {e}")
        import traceback
        traceback.print_exc()
