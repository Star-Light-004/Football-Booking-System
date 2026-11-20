from rest_framework import serializers
from .models import PitchCleaning, MaintenanceIssue, LostFoundItem


class PitchCleaningSerializer(serializers.ModelSerializer):
    fieldName = serializers.CharField(source='field_name', required=False, allow_blank=True, allow_null=True)
    cleanerName = serializers.CharField(source='cleaner_name', required=False, allow_blank=True)
    cleaner = serializers.CharField(source='cleaner_name', required=False, allow_blank=True)
    time = serializers.CharField(source='start_time', required=False, allow_blank=True, allow_null=True)
    startTime = serializers.CharField(source='start_time', required=False, allow_blank=True, allow_null=True)
    endTime = serializers.CharField(source='end_time', required=False, allow_blank=True, allow_null=True)
    durationMinutes = serializers.IntegerField(source='duration_minutes', required=False, allow_null=True)
    statusText = serializers.CharField(source='status_text', required=False, allow_blank=True, allow_null=True)
    cleanedMatchTime = serializers.CharField(source='cleaned_match_time', required=False, allow_blank=True, allow_null=True)
    cleanedMatchCustomer = serializers.CharField(source='cleaned_match_customer', required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = PitchCleaning
        fields = '__all__'


class MaintenanceIssueSerializer(serializers.ModelSerializer):
    fieldName = serializers.CharField(source='field_name', required=False, allow_blank=True, allow_null=True)
    reportedByName = serializers.CharField(source='reported_by_name', required=False, allow_blank=True)
    reportedBy = serializers.CharField(source='reported_by_name', required=False, allow_blank=True)
    estimatedCost = serializers.DecimalField(source='estimated_cost', max_digits=12, decimal_places=2, required=False)
    resolvedAt = serializers.SerializerMethodField()
    createdAt = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceIssue
        fields = '__all__'

    def get_createdAt(self, obj):
        if obj.created_at:
            return obj.created_at.strftime("%d/%m/%Y, %H:%M")
        return "Vừa xong"

    def get_resolvedAt(self, obj):
        if obj.resolved_at:
            return obj.resolved_at.strftime("%d/%m/%Y, %H:%M")
        return None

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'field_name' in data and 'fieldName' not in data:
            data['fieldName'] = data['field_name']
        if 'estimated_cost' in data and 'estimatedCost' not in data:
            data['estimatedCost'] = data['estimated_cost']
        if 'reported_by_name' in data and 'reportedByName' not in data:
            data['reportedByName'] = data['reported_by_name']
        if 'reportedBy' in data and 'reportedByName' not in data:
            data['reportedByName'] = data['reportedBy']
        return super().to_internal_value(data)


class LostFoundItemSerializer(serializers.ModelSerializer):
    fieldName = serializers.CharField(source='field_name', required=False, allow_blank=True, allow_null=True)
    itemType = serializers.CharField(source='item_type', required=False, allow_blank=True, allow_null=True)
    bookingDate = serializers.CharField(source='booking_date', required=False, allow_blank=True, allow_null=True)
    guestInfo = serializers.CharField(source='guest_info', required=False, allow_blank=True, allow_null=True)
    customerPhone = serializers.CharField(source='customer_phone', required=False, allow_blank=True, allow_null=True)
    returnNote = serializers.CharField(source='return_note', required=False, allow_blank=True, allow_null=True)
    returnedAt = serializers.CharField(source='returned_at', required=False, allow_blank=True, allow_null=True)
    reportedBy = serializers.CharField(source='reported_by', required=False, allow_blank=True)

    class Meta:
        model = LostFoundItem
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'item_type' in data and 'itemType' not in data:
            data['itemType'] = data['item_type']
        if 'field_name' in data and 'fieldName' not in data:
            data['fieldName'] = data['field_name']
        if 'booking_date' in data and 'bookingDate' not in data:
            data['bookingDate'] = data['booking_date']
        if 'guest_info' in data and 'guestInfo' not in data:
            data['guestInfo'] = data['guest_info']
        if 'customer_phone' in data and 'customerPhone' not in data:
            data['customerPhone'] = data['customer_phone']
        if 'reported_by' in data and 'reportedBy' not in data:
            data['reportedBy'] = data['reported_by']
        if 'return_note' in data and 'returnNote' not in data:
            data['returnNote'] = data['return_note']
        if 'returned_at' in data and 'returnedAt' not in data:
            data['returnedAt'] = data['returned_at']
        return super().to_internal_value(data)
