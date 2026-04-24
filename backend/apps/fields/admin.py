from django.contrib import admin
from .models import FootballFields, FieldTypes, FieldSchedules

admin.site.register(FootballFields)
admin.site.register(FieldTypes)
admin.site.register(FieldSchedules)
