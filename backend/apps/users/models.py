import uuid
from django.db import models


class Admin(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(unique=True, max_length=15)
    password_hash = models.TextField()
    role = models.TextField()
    is_active = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'admins'


class Customers(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'Admin',
        models.DO_NOTHING,
        db_column='user_id',
        blank=True,
        null=True
    )
    full_name = models.CharField(max_length=150)
    password_hash = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    email = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'customers'