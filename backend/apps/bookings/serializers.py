from rest_framework import serializers
from .models import Bookings, TournamentRequests
from apps.reviews.models import Reviews

def build_payment_info(obj):
    prefetched = getattr(obj, 'prefetched_payments', None)
    if prefetched is not None:
        payment = prefetched[0] if len(prefetched) > 0 else None
    else:
        from apps.payments.models import Payments
        payment = Payments.objects.filter(booking=obj).order_by('-payment_date', '-id').first()
    total = float(obj.total_price or 0)

    # 1. Nếu có bản ghi thanh toán
    if payment:
        amount = float(payment.amount or 0)
        pm_raw = str(payment.payment_method or "").strip()
        p_status = str(payment.status or "").strip().lower()
        is_paid = p_status in ['paid', 'completed', 'success']
        is_deposit = ('cọc' in pm_raw.lower() or 'deposit' in pm_raw.lower() or (amount > 0 and amount < total))

        if is_paid:
            if is_deposit and amount < total:
                remaining = max(0, total - amount)
                return {
                    "method": "Đặt cọc (SePay)",
                    "method_code": "deposit",
                    "status": "partial_paid",
                    "status_label": f"Đã cọc {int(amount):,}đ".replace(",", "."),
                    "deposit_amount": amount,
                    "remaining_amount": remaining,
                    "sub_label": f"Còn lại: {int(remaining):,}đ (tại sân)".replace(",", "."),
                    "badge_type": "deposit_paid"
                }
            else:
                return {
                    "method": "Chuyển khoản SePay",
                    "method_code": "qr",
                    "status": "full_paid",
                    "status_label": "Đã thanh toán 100%",
                    "deposit_amount": amount,
                    "remaining_amount": 0,
                    "sub_label": f"{int(total):,}đ (SePay)".replace(",", "."),
                    "badge_type": "full_paid"
                }
        else:
            # Chưa thanh toán
            if is_deposit:
                remaining = max(0, total - amount)
                return {
                    "method": "Đặt cọc 50% (SePay)",
                    "method_code": "deposit",
                    "status": "unpaid",
                    "status_label": f"Chờ cọc {int(amount):,}đ".replace(",", "."),
                    "deposit_amount": amount,
                    "remaining_amount": remaining,
                    "sub_label": "Chưa nhận chuyển khoản",
                    "badge_type": "pending_deposit"
                }
            else:
                return {
                    "method": "Chuyển khoản SePay",
                    "method_code": "qr",
                    "status": "unpaid",
                    "status_label": "Chờ chuyển khoản",
                    "deposit_amount": 0,
                    "remaining_amount": total,
                    "sub_label": f"Cần thanh toán {int(total):,}đ".replace(",", "."),
                    "badge_type": "pending_full"
                }

    # 2. Không có bản ghi payment hoặc là Thanh toán tại sân
    is_completed = str(obj.status).strip().lower() in ['completed', 'hoàn thành']
    if is_completed:
        return {
            "method": "Tiền mặt tại sân",
            "method_code": "cash",
            "status": "full_paid",
            "status_label": "Đã thu tại sân",
            "deposit_amount": 0,
            "remaining_amount": 0,
            "sub_label": f"{int(total):,}đ (Tiền mặt)".replace(",", "."),
            "badge_type": "full_paid"
        }

    return {
        "method": "Thanh toán tại sân",
        "method_code": "cash",
        "status": "unpaid",
        "status_label": "Thanh toán tại sân",
        "deposit_amount": 0,
        "remaining_amount": total,
        "sub_label": f"Chưa thu ({int(total):,}đ)".replace(",", "."),
        "badge_type": "pay_at_field"
    }

class BookingsSerializer(serializers.ModelSerializer):
    field_id = serializers.UUIDField(source='field.id', read_only=True)
    name = serializers.CharField(source='customer.full_name', read_only=True)
    phone = serializers.CharField(source='customer.phone', read_only=True)
    email = serializers.CharField(source='customer.email', read_only=True)
    is_guest = serializers.SerializerMethodField()
    field = serializers.CharField(source='field.field_name', read_only=True)
    date = serializers.DateField(source='booking_date', read_only=True)
    time = serializers.SerializerMethodField()
    price = serializers.FloatField(source='total_price', read_only=True)
    notes = serializers.SerializerMethodField()
    discount_amount = serializers.FloatField(read_only=True)
    voucher_code = serializers.CharField(read_only=True)
    payment_info = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()

    class Meta:
        model = Bookings
        fields = [
            'id', 'name', 'phone', 'email', 'is_guest', 'field', 'field_id',
            'date', 'time', 'price', 'discount_amount', 'voucher_code',
            'status', 'notes', 'payment_info', 'services', 'created_at'
        ]

    def get_services(self, obj):
        try:
            prefetched = getattr(obj, 'prefetched_services', None)
            if prefetched is not None:
                from apps.servicesadd.serializers import BookingServicesSerializer
                return BookingServicesSerializer(prefetched, many=True, context=self.context).data

            from apps.servicesadd.models import BookingServices
            from apps.servicesadd.serializers import BookingServicesSerializer
            booking_services = BookingServices.objects.filter(booking_id=obj.id).select_related('service')
            return BookingServicesSerializer(booking_services, many=True, context=self.context).data
        except Exception:
            return []

    def get_notes(self, obj):
        import re
        if not obj.notes:
            return ""
        clean = re.sub(r'\[Mã nhóm:[^\]]+\]', '', obj.notes)
        clean = re.sub(r'\[Gộp cùng[^\]]+\]', '', clean)
        return clean.strip()

    def get_time(self, obj):
        st = obj.start_time.strftime('%H:%M') if hasattr(obj.start_time, 'strftime') else str(obj.start_time)[:5]
        et = obj.end_time.strftime('%H:%M') if hasattr(obj.end_time, 'strftime') else str(obj.end_time)[:5]
        return f"{st} - {et}"

    def get_is_guest(self, obj):
        if not obj.customer:
            return True
        return not bool(obj.customer.password_hash)

    def get_payment_info(self, obj):
        return build_payment_info(obj)

class UserBookingsSerializer(serializers.ModelSerializer):
    field_id = serializers.UUIDField(source='field.id', read_only=True)
    fieldName = serializers.CharField(source='field.field_name', read_only=True)
    fieldAddress = serializers.CharField(source='field.location', read_only=True)
    bookingDate = serializers.DateField(source='booking_date', read_only=True)
    timeSlot = serializers.SerializerMethodField()
    customerName = serializers.CharField(source='customer.full_name', read_only=True)
    phone = serializers.CharField(source='customer.phone', read_only=True)
    price = serializers.FloatField(source='total_price', read_only=True)
    discountAmount = serializers.FloatField(source='discount_amount', read_only=True)
    voucherCode = serializers.CharField(source='voucher_code', read_only=True)
    image = serializers.SerializerMethodField()
    is_reviewed = serializers.SerializerMethodField()
    payment_info = serializers.SerializerMethodField()

    class Meta:
        model = Bookings
        fields = ['id', 'field_id', 'fieldName', 'fieldAddress', 'bookingDate', 'timeSlot', 'customerName', 'phone', 'price', 'discountAmount', 'voucherCode', 'status', 'image', 'is_reviewed', 'payment_info']

    def get_timeSlot(self, obj):
        st = obj.start_time.strftime('%H:%M') if hasattr(obj.start_time, 'strftime') else str(obj.start_time)[:5]
        et = obj.end_time.strftime('%H:%M') if hasattr(obj.end_time, 'strftime') else str(obj.end_time)[:5]
        return f"{st} - {et}"

    def get_image(self, obj):
        if obj.field and obj.field.image:
            return obj.field.image.url
        return None

    def get_is_reviewed(self, obj):
        if hasattr(obj, 'reviews'):
            try:
                return obj.reviews is not None
            except Exception:
                pass
        return Reviews.objects.filter(booking_id=obj.id).exists()

    def get_payment_info(self, obj):
        return build_payment_info(obj)

class LookupBookingSerializer(UserBookingsSerializer):
    booking_id_short = serializers.SerializerMethodField()
    fieldImage = serializers.SerializerMethodField()
    customer_id = serializers.CharField(source='customer.id', read_only=True)
    createdAt = serializers.SerializerMethodField()

    class Meta:
        model = Bookings
        fields = ['id', 'booking_id_short', 'fieldName', 'fieldAddress', 'fieldImage', 'bookingDate', 'timeSlot', 'customerName', 'customer_id', 'phone', 'price', 'status', 'createdAt', 'is_reviewed']

    def get_booking_id_short(self, obj):
        return str(obj.id)[:8].upper()

    def get_fieldImage(self, obj):
        return self.get_image(obj)

    def get_timeSlot(self, obj):
        return f"{obj.start_time.strftime('%H:%M')} - {obj.end_time.strftime('%H:%M')}"

    def get_createdAt(self, obj):
        return obj.created_at.strftime('%H:%M - %d/%m/%Y') if obj.created_at else None


class TournamentRequestsSerializer(serializers.ModelSerializer):
    request_id_short = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    payment_info = serializers.SerializerMethodField()

    class Meta:
        model = TournamentRequests
        fields = '__all__'

    def get_request_id_short(self, obj):
        return f"#TR-{str(obj.id)[:8].upper()}"

    def get_payment_info(self, obj):
        total = float(obj.estimated_budget or 0)
        p_status = str(obj.payment_status or "Unpaid").strip().lower()
        method = str(obj.payment_method or "").strip().lower()
        paid = float(obj.paid_amount or 0)
        deposit = float(obj.deposit_amount or 0)
        remaining = float(obj.remaining_amount or 0)

        if p_status in ['paid', 'completed', 'success', 'full_paid']:
            return {
                "method": "Thanh toán toàn bộ (SePay)" if method == 'full' else "Chuyển khoản SePay",
                "method_code": "full",
                "status": "full_paid",
                "status_label": "Đã thanh toán 100%",
                "paid_amount": paid or total,
                "deposit_amount": 0,
                "remaining_amount": 0,
                "sub_label": f"{int(paid or total):,}đ (SePay)".replace(",", "."),
                "badge_type": "full_paid",
                "transaction_id": obj.transaction_id,
                "payment_date": obj.payment_date.strftime('%H:%M %d/%m/%Y') if obj.payment_date else None,
            }
        elif p_status in ['deposit_paid', 'partial_paid', 'deposit']:
            rem = remaining if remaining > 0 else max(0, total - paid)
            return {
                "method": "Đặt cọc trước 50% (SePay)",
                "method_code": "deposit",
                "status": "deposit_paid",
                "status_label": f"Đã cọc {int(paid):,}đ (50%)".replace(",", "."),
                "paid_amount": paid,
                "deposit_amount": deposit or paid,
                "remaining_amount": rem,
                "sub_label": f"Còn lại: {int(rem):,}đ (tại sân)".replace(",", "."),
                "badge_type": "deposit_paid",
                "transaction_id": obj.transaction_id,
                "payment_date": obj.payment_date.strftime('%H:%M %d/%m/%Y') if obj.payment_date else None,
            }
        else:
            return {
                "method": "Đặt cọc trước 50% (SePay)" if method == 'deposit' else "Thanh toán toàn bộ (SePay)",
                "method_code": method or "full",
                "status": "unpaid",
                "status_label": "Chưa thanh toán",
                "paid_amount": 0,
                "deposit_amount": deposit or round(total * 0.5),
                "remaining_amount": total,
                "sub_label": "Chờ chuyển khoản",
                "badge_type": "unpaid",
                "transaction_id": obj.transaction_id,
                "payment_date": None,
            }


