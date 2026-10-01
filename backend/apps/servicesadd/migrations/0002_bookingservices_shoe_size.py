from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('servicesadd', '0001_initial')]

    operations = [
        migrations.AddField(
            model_name='bookingservices',
            name='shoe_size',
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
    ]
