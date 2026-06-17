from django.apps import AppConfig


class FieldsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.fields'

    def ready(self):
        from .models import FieldTypes

        if not FieldTypes.objects.exists():
            FieldTypes.objects.create(name="Sân 5")
            FieldTypes.objects.create(name="Sân 7")
            FieldTypes.objects.create(name="Sân 11")