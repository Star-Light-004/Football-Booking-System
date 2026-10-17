from rest_framework import serializers
from .models import Bookings
from apps.reviews.models import Reviews

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
    notes = serializers.CharField(read_only=True)
    discount_amount = serializers.FloatField(read_only=True)
    voucher_code = serializers.CharField(read_only=True)

    class Meta:
        model = Bookings
        fields = ['id', 'name', 'phone', 'email', 'is_guest', 'field', 'field_id', 'date', 'time', 'price', 'discount_amount', 'voucher_code', 'status', 'notes', 'created_at']

    def get_time(self, obj):
        return f"{obj.start_time} - {obj.end_time}"

    def get_is_guest(self, obj):
        if not obj.customer:
            return True
        return not bool(obj.customer.password_hash)

class UserBookingsSerializer(serializers.ModelSerializer):
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

    class Meta:
        model = Bookings
        fields = ['id', 'fieldName', 'fieldAddress', 'bookingDate', 'timeSlot', 'customerName', 'phone', 'price', 'discountAmount', 'voucherCode', 'status', 'image', 'is_reviewed']

    def get_timeSlot(self, obj):
        return f"{obj.start_time} - {obj.end_time}"

    def get_image(self, obj):
        if obj.field and obj.field.image:
            return obj.field.image.url
        return None

    def get_is_reviewed(self, obj):
        return Reviews.objects.filter(booking_id=obj.id).exists()

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
