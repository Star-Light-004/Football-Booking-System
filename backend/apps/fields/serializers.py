from rest_framework import serializers
from .models import FootballFields, FieldTypes, FieldSchedules

class FootballFieldsSerializer(serializers.ModelSerializer):
    field_type = serializers.CharField(source='field_type.name', read_only=True, allow_null=True)
    image = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    sub_image_1 = serializers.SerializerMethodField()
    sub_image_1_url = serializers.SerializerMethodField()
    sub_image_2 = serializers.SerializerMethodField()
    sub_image_2_url = serializers.SerializerMethodField()
    sub_image_3 = serializers.SerializerMethodField()
    sub_image_3_url = serializers.SerializerMethodField()
    price_per_hour = serializers.FloatField()
    min_price = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()
    
    class Meta:
        model = FootballFields
        fields = [
            'id', 'field_name', 'field_type', 'location', 'price_per_hour', 'min_price',
            'is_available', 'created_at', 'image', 'image_url',
            'sub_image_1', 'sub_image_1_url',
            'sub_image_2', 'sub_image_2_url',
            'sub_image_3', 'sub_image_3_url',
            'booking_count', 'rating_avg', 'description', 'phone',
            'latitude', 'longitude', 'address', 'open_time', 'close_time'
        ]

    def get_image(self, obj):
        return obj.image.url if obj.image else None

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_sub_image_1(self, obj):
        return obj.sub_image_1.url if obj.sub_image_1 else None

    def get_sub_image_1_url(self, obj):
        request = self.context.get('request')
        if obj.sub_image_1 and request:
            return request.build_absolute_uri(obj.sub_image_1.url)
        return None

    def get_sub_image_2(self, obj):
        return obj.sub_image_2.url if obj.sub_image_2 else None

    def get_sub_image_2_url(self, obj):
        request = self.context.get('request')
        if obj.sub_image_2 and request:
            return request.build_absolute_uri(obj.sub_image_2.url)
        return None

    def get_sub_image_3(self, obj):
        return obj.sub_image_3.url if obj.sub_image_3 else None

    def get_sub_image_3_url(self, obj):
        request = self.context.get('request')
        if obj.sub_image_3 and request:
            return request.build_absolute_uri(obj.sub_image_3.url)
        return None

    def get_min_price(self, obj):
        if hasattr(obj, 'annotated_min_price') and obj.annotated_min_price is not None:
            return float(obj.annotated_min_price)

        try:
            from apps.timeslots.models import TimeSlots
            from django.db.models import Min
            from datetime import datetime
            now = datetime.now()
            today = now.date()
            current_time = now.time()

            min_slot = TimeSlots.objects.filter(
                field=obj,
                slot_date=today,
                status='available',
                price__gt=0,
                start_time__gte=current_time
            ).aggregate(Min('price'))['price__min']

            if min_slot is not None and float(min_slot) > 0:
                return float(min_slot)
        except Exception:
            pass

        return float(obj.price_per_hour or 0)

    def get_rating_avg(self, obj):
        if hasattr(obj, 'avg_from_reviews'):
            return round(float(obj.avg_from_reviews), 1) if obj.avg_from_reviews is not None else 0
        return float(obj.rating_avg) if obj.rating_avg else 0
