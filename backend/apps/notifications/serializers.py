from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    booking_id = serializers.SerializerMethodField()
    field_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'title', 'message', 'is_read', 'created_at', 'booking_id', 'field_name']
        read_only_fields = ['id', 'created_at']
    
    def get_booking_id(self, obj):
        if obj.booking:
            return str(obj.booking.id)
        return None
    
    def get_field_name(self, obj):
        if obj.booking and obj.booking.field:
            return obj.booking.field.field_name
        return None
