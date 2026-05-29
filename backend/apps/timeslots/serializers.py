from rest_framework import serializers
from .models import TimeSlots

class TimeSlotsSerializer(serializers.ModelSerializer):
    field_id = serializers.CharField(source='field.id', read_only=True, allow_null=True)
    field_name = serializers.SerializerMethodField()
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()
    price = serializers.FloatField()
    slot_date = serializers.DateField(format="%Y-%m-%d")

    class Meta:
        model = TimeSlots
        fields = ['id', 'field_id', 'field_name', 'slot_date', 'start_time', 'end_time', 'price', 'status']

    def get_field_name(self, obj):
        return obj.field.field_name if obj.field else "Sân không xác định"

    def get_start_time(self, obj):
        return obj.start_time.strftime("%H:%M") if obj.start_time else None

    def get_end_time(self, obj):
        return obj.end_time.strftime("%H:%M") if obj.end_time else None

class TimeSlotSimpleSerializer(serializers.ModelSerializer):
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()
    price = serializers.FloatField()

    class Meta:
        model = TimeSlots
        fields = ['id', 'start_time', 'end_time', 'price', 'status']

    def get_start_time(self, obj):
        return obj.start_time.strftime("%H:%M") if obj.start_time else None

    def get_end_time(self, obj):
        return obj.end_time.strftime("%H:%M") if obj.end_time else None
