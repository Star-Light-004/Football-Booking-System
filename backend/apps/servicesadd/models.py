from django.db import models
import uuid

class ServicesAdd(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='services/', blank=True, null=True)
    category = models.CharField(max_length=50, blank=True, null=True)
    stock = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # New: Relationship with fields
    fields = models.ManyToManyField('fields.FootballFields', related_name='services', db_table='service_field_mapping')

    class Meta:
        managed = True
        db_table = 'servicesadd' 
        verbose_name_plural = "ServicesAdd"

    def __str__(self):
        return self.name

class BookingServices(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
    'bookings.Bookings',
    on_delete=models.CASCADE,
    related_name='booking_services',
    null=True,
    blank=True
)
    service = models.ForeignKey(
    ServicesAdd,
    on_delete=models.CASCADE,
    related_name='service_bookings',
    null=True,
    blank=True
)
    quantity = models.IntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'booking_services'
        verbose_name_plural = "Booking Services"
