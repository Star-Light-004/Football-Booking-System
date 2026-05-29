from django.db import models
from django.contrib.auth.models import User
from apps.bookings.models import Bookings
from apps.fields.models import FootballFields


class Reviews(models.Model):

    id = models.AutoField(primary_key=True)  # 🔥 integer

    user = models.ForeignKey(
        'users.Customers',
        models.DO_NOTHING,
        db_column='user_id'
    )

    field = models.ForeignKey(
        FootballFields,
        models.DO_NOTHING,
        db_column='field_id'
    )

    booking = models.OneToOneField(
        Bookings,
        models.DO_NOTHING,
        db_column='booking_id'
    )

    rating = models.IntegerField()
    comment = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'reviews'

