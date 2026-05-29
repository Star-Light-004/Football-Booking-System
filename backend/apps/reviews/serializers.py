from rest_framework import serializers
from .models import Reviews

class ReviewsSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Reviews
        fields = ['id', 'username', 'rating', 'comment', 'created_at']
