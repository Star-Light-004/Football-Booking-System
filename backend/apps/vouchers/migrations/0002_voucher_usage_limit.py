from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vouchers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='voucher',
            name='usage_limit',
            field=models.IntegerField(blank=True, default=100, null=True),
        ),
    ]
