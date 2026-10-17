from rest_framework import serializers
from .models import Customers


class CustomersSerializer(serializers.ModelSerializer):
    name   = serializers.CharField(source='full_name', read_only=True)
    status = serializers.SerializerMethodField()
    is_guest = serializers.SerializerMethodField()
    booking_count = serializers.SerializerMethodField()

    class Meta:
        model  = Customers
        fields = ['id', 'name', 'email', 'phone', 'role', 'status', 'created_at', 'is_guest', 'booking_count']

    def get_status(self, obj):
        return 'active' if obj.is_active else 'locked'

    def get_is_guest(self, obj):
        # Không có mật khẩu đăng nhập -> Khách vãng lai
        return not bool(obj.password_hash)

    def get_booking_count(self, obj):
        try:
            return obj.bookings_set.count()
        except Exception:
            return 0


class ProfileSerializer(serializers.ModelSerializer):
    fullname = serializers.CharField(source='full_name', read_only=True)

    class Meta:
        model  = Customers
        fields = ['id', 'fullname', 'email', 'phone', 'role', 'is_active']
