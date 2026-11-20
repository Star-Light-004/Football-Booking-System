import uuid
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
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True, null=True)
    voucher_code = models.CharField(max_length=50, blank=True, null=True)
    status = models.TextField(blank=True, null=True)  # This field type is a guess.
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'bookings'


class BookingLogs(models.Model):
    id = models.UUIDField(primary_key=True)
    booking = models.ForeignKey(
    'Bookings',
    models.DO_NOTHING,
    null=True,
    blank=True
)
    action = models.CharField(max_length=50, blank=True, null=True)
    performed_by = models.CharField(max_length=150, blank=True, null=True)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'booking_logs'


class TournamentRequests(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey('users.Customers', models.SET_NULL, null=True, blank=True)
    contact_name = models.CharField(max_length=150)
    contact_phone = models.CharField(max_length=20)
    contact_email = models.CharField(max_length=150, blank=True, null=True)
    tournament_name = models.CharField(max_length=255)
    organization = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    expected_teams = models.IntegerField(default=8)
    selected_fields_info = models.TextField(blank=True, null=True)
    time_slots_info = models.TextField(blank=True, null=True)
    services_requested = models.TextField(blank=True, null=True)
    estimated_budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=30, default='Pending')  # Pending, Contacted, Approved, Rejected, Cancelled
    admin_notes = models.TextField(blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)  # 'full', 'deposit'
    payment_status = models.CharField(max_length=30, default='Unpaid')  # 'Unpaid', 'Deposit_Paid', 'Paid'
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, default=0)
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, default=0)
    payment_date = models.DateTimeField(blank=True, null=True)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        managed = True
        db_table = 'tournament_requests'
