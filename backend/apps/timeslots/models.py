import uuid
from django.db import models
from apps.fields.models import FootballFields

class TimeSlots(models.Model):
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

    slot_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    status = models.CharField(
        max_length=20,
        default='available'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        blank=True,
        null=True
    )

    class Meta:
        managed = False
        db_table = 'time_slots'
        unique_together = (('field', 'slot_date', 'start_time'),)

    def __str__(self):
        return f"{self.field.field_name} | {self.slot_date} | {self.start_time} - {self.end_time}"
