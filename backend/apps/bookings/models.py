from django.db import models
from apps.users.models import Customers
from apps.fields.models import FootballFields


class Bookings(models.Model):
    id = models.UUIDField(primary_key=True)
    customer = models.ForeignKey('users.Customers', models.DO_NOTHING)
    field = models.ForeignKey('fields.FootballFields', models.DO_NOTHING)
    booking_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    status = models.TextField(blank=True, null=True)  # This field type is a guess.
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'bookings'


class BookingLogs(models.Model):
    id = models.UUIDField(primary_key=True)
    booking = models.ForeignKey('Bookings', models.DO_NOTHING)
    action = models.CharField(max_length=50, blank=True, null=True)
    performed_by = models.CharField(max_length=150, blank=True, null=True)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'booking_logs'
