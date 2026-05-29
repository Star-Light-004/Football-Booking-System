from rest_framework import serializers
from .models import FootballFields, FieldTypes, FieldSchedules

class FootballFieldsSerializer(serializers.ModelSerializer):
    field_type = serializers.CharField(source='field_type.name', read_only=True, allow_null=True)
    image = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    price_per_hour = serializers.FloatField()
    rating_avg = serializers.SerializerMethodField()
    
    class Meta:
        model = FootballFields
        fields = ['id', 'field_name', 'field_type', 'location', 'price_per_hour', 'is_available', 'created_at', 'image', 'image_url', 'booking_count', 'rating_avg', 'description', 'phone']

    def get_image(self, obj):
        return obj.image.url if obj.image else None

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_rating_avg(self, obj):
        if hasattr(obj, 'avg_from_reviews'):
            return round(float(obj.avg_from_reviews), 1) if obj.avg_from_reviews is not None else 0
        return float(obj.rating_avg) if obj.rating_avg else 0
