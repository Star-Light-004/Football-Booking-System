import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('bookings', '0002_bookings_discount_amount_bookings_voucher_code'),
    ]

    operations = [
        migrations.CreateModel(
            name='TournamentRequests',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('contact_name', models.CharField(max_length=150)),
                ('contact_phone', models.CharField(max_length=20)),
                ('contact_email', models.CharField(blank=True, max_length=150, null=True)),
                ('tournament_name', models.CharField(max_length=255)),
                ('organization', models.CharField(blank=True, max_length=255, null=True)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('expected_teams', models.IntegerField(default=8)),
                ('selected_fields_info', models.TextField(blank=True, null=True)),
                ('time_slots_info', models.TextField(blank=True, null=True)),
                ('services_requested', models.TextField(blank=True, null=True)),
                ('estimated_budget', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('status', models.CharField(default='Pending', max_length=30)),
                ('admin_notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True, null=True)),
                ('customer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='users.customers')),
            ],
            options={
                'db_table': 'tournament_requests',
                'managed': True,
            },
        ),
    ]
