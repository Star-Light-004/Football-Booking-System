from rest_framework import serializers
from .models import Voucher, CustomerVoucher


class VoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voucher
        fields = [
            'id', 'code', 'title', 'description', 'discount_type',
            'discount_value', 'max_discount', 'min_booking_price',
            'expiry_days', 'is_system_reward', 'is_active', 'created_at'
        ]


class AdminVoucherSerializer(serializers.ModelSerializer):
    total_issued = serializers.SerializerMethodField()
    total_used = serializers.SerializerMethodField()

    class Meta:
        model = Voucher
        fields = [
            'id', 'code', 'title', 'description', 'discount_type',
            'discount_value', 'max_discount', 'min_booking_price',
            'expiry_days', 'usage_limit', 'is_system_reward', 'is_active',
            'total_issued', 'total_used', 'created_at', 'updated_at'
        ]

    def get_total_issued(self, obj):
        if obj.is_system_reward:
            return obj.customer_instances.count()
        return obj.usage_limit if obj.usage_limit is not None else 0

    def get_total_used(self, obj):
        try:
            from django.db.models import Q
            from apps.bookings.models import Bookings
            
            # 1. Tập hợp mã gốc và tất cả mã con được cấp phát (ví dụ FB-XXXXXX)
            child_codes = list(obj.customer_instances.values_list('code', flat=True))
            all_codes = list(set([obj.code] + child_codes))
            
            # 2. Xây dựng truy vấn case-insensitive cho PostgreSQL
            q = Q()
            for c in all_codes:
                q |= Q(voucher_code__iexact=c)

            # 3. Đếm số đơn đặt sân hoàn thành (PostgreSQL enum booking_status='Completed')
            booking_used_count = Bookings.objects.filter(q, status='Completed').count()
            
            # 4. Đếm thêm customer_instances is_used=True chưa liên kết completed booking (dự phòng)
            direct_cv_used = obj.customer_instances.filter(is_used=True).exclude(used_booking__status='Completed').count()
            
            return booking_used_count + direct_cv_used
        except Exception:
            return obj.customer_instances.filter(is_used=True).count()


class CustomerVoucherSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='voucher.title', read_only=True)
    description = serializers.CharField(source='voucher.description', read_only=True)
    discount_type = serializers.CharField(source='voucher.discount_type', read_only=True)
    discount_value = serializers.FloatField(source='voucher.discount_value', read_only=True)
    max_discount = serializers.FloatField(source='voucher.max_discount', read_only=True)
    min_booking_price = serializers.FloatField(source='voucher.min_booking_price', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_valid_to_use = serializers.BooleanField(read_only=True)

    class Meta:
        model = CustomerVoucher
        fields = [
            'id', 'code', 'title', 'description', 'discount_type',
            'discount_value', 'max_discount', 'min_booking_price',
            'discount_amount', 'is_used', 'used_at', 'valid_until',
            'is_expired', 'is_valid_to_use', 'created_at'
        ]


class AdminCustomerVoucherSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)

    voucher_code = serializers.CharField(source='voucher.code', read_only=True)
    voucher_title = serializers.CharField(source='voucher.title', read_only=True)
    discount_type = serializers.CharField(source='voucher.discount_type', read_only=True)
    discount_value = serializers.FloatField(source='voucher.discount_value', read_only=True)

    source_booking_code = serializers.SerializerMethodField()
    used_booking_code = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = CustomerVoucher
        fields = [
            'id', 'code', 'customer_name', 'customer_phone', 'customer_email',
            'voucher_code', 'voucher_title', 'discount_type', 'discount_value',
            'source_booking_code', 'used_booking_code',
            'discount_amount', 'is_used', 'used_at', 'valid_until',
            'is_expired', 'created_at'
        ]

    def get_source_booking_code(self, obj):
        if obj.source_booking:
            return f"#BK{str(obj.source_booking.id)[:8].upper()}"
        return None

    def get_used_booking_code(self, obj):
        if obj.used_booking:
            return f"#BK{str(obj.used_booking.id)[:8].upper()}"
        return None
