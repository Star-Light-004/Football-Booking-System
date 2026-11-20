from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vouchers', '0002_voucher_usage_limit'),
    ]

    operations = [
        migrations.AddField(
            model_name='voucher',
            name='applicable_to',
            field=models.CharField(
                choices=[
                    ('field_only', 'Chỉ giảm giá giờ sân'),
                    ('all', 'Giảm cả giờ sân và dịch vụ đi kèm')
                ],
                default='all',
                max_length=20
            ),
        ),
    ]
