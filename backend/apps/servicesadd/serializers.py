from rest_framework import serializers
from .models import ServicesAdd, BookingServices

class ServicesAddSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    field_ids = serializers.SerializerMethodField()
    price = serializers.FloatField()

    class Meta:
        model = ServicesAdd
        fields = ['id', 'name', 'price', 'description', 'image', 'category', 'stock', 'is_active', 'field_ids']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_field_ids(self, obj):
        return [str(fid) for fid in obj.fields.values_list('id', flat=True)]

class BookingServicesSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_id = serializers.CharField(source='service.id', read_only=True)
    service_image = serializers.SerializerMethodField()
    total_price = serializers.FloatField()

    class Meta:
        model = BookingServices
        fields = ['id', 'service_id', 'service_name', 'service_image', 'quantity', 'total_price', 'status']

    def get_service_image(self, obj):
        request = self.context.get('request')
        if obj.service and obj.service.image:
            if request:
                return request.build_absolute_uri(obj.service.image.url)
            return f"http://127.0.0.1:8000{obj.service.image.url}"
        return None
