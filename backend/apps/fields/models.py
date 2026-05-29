import uuid
from django.db import models


class FieldTypes(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'field_types'


class FootballFields(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    field_name = models.CharField(max_length=150)

    field_type = models.ForeignKey(
        FieldTypes,
        models.DO_NOTHING,
        db_column='field_type_id',
        blank=True,
        null=True
    )

    location = models.TextField(
        blank=True,
        null=True
    )

    price_per_hour = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True
    )

    image = models.ImageField(      # thêm dòng này
        upload_to='fields/',
        blank=True,
        null=True
    )

    is_available = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    booking_count = models.IntegerField(
        default=0,
        blank=True, 
        null=True
    )

    description = models.TextField(blank=True, null=True)
    rating_avg = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    open_time = models.TimeField(blank=True, null=True)
    close_time = models.TimeField(blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    peak_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    off_peak_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'football_fields'

# 🔹 Thêm method trả JSON có image.url
    def to_dict(self):
        return {
            "id": str(self.id),
            "field_name": self.field_name,
            "field_type": self.field_type.name if self.field_type else None,
            "location": self.location,
            "price_per_hour": float(self.price_per_hour) if self.price_per_hour else None,
            "is_available": self.is_available,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "image": self.image.url if self.image else None,  # 🔹 trả URL đầy đủ
            "booking_count": self.booking_count or 0,
            "description": self.description,
            "rating_avg": float(self.rating_avg) if self.rating_avg else 0,
            "phone": self.phone,
            "open_time": self.open_time.strftime("%H:%M:%S") if self.open_time else None,
            "close_time": self.close_time.strftime("%H:%M:%S") if self.close_time else None,
            "status": self.status,
            "address": self.address,
            "latitude": float(self.latitude) if self.latitude else None,
            "longitude": float(self.longitude) if self.longitude else None,
            "peak_price": float(self.peak_price) if self.peak_price else None,
            "off_peak_price": float(self.off_peak_price) if self.off_peak_price else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }




class FieldSchedules(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    field = models.ForeignKey(
        FootballFields,
        models.DO_NOTHING,
        db_column='field_id'
    )

    work_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'field_schedules'