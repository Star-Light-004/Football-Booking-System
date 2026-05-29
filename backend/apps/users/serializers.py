from rest_framework import serializers
from .models import Customers

class CustomersSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='full_name', read_only=True)
    role = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Customers
        fields = ['id', 'name', 'email', 'phone', 'role', 'status']

    def get_role(self, obj):
        return "customer"

    def get_status(self, obj):
        return "active"

class ProfileSerializer(serializers.ModelSerializer):
    fullname = serializers.CharField(source='full_name', read_only=True)
    class Meta:
        model = Customers
        fields = ['id', 'fullname', 'email', 'phone']
