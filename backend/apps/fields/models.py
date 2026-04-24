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