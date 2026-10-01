from rest_framework import serializers
from .models import Customers


class CustomersSerializer(serializers.ModelSerializer):
    name   = serializers.CharField(source='full_name', read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model  = Customers
        fields = ['id', 'name', 'email', 'phone', 'role', 'status', 'created_at']

    def get_status(self, obj):
        return 'active' if obj.is_active else 'locked'


class ProfileSerializer(serializers.ModelSerializer):
    fullname = serializers.CharField(source='full_name', read_only=True)

    class Meta:
        model  = Customers
        fields = ['id', 'fullname', 'email', 'phone', 'role', 'is_active']
