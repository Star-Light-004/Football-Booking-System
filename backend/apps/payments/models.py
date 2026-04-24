from django.db import models
from apps.bookings.models import Bookings
from apps.users.models import Customers


class Payments(models.Model):
    id = models.UUIDField(primary_key=True)
    booking = models.ForeignKey(Bookings, models.DO_NOTHING)
    customer = models.ForeignKey(Customers, models.DO_NOTHING)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    status = models.TextField(blank=True, null=True)  # This field type is a guess.
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    payment_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payments'
