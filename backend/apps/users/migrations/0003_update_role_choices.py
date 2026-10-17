# Generated manually - update Role choices to include all actor types

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_add_role_and_is_active_to_customers'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customers',
            name='role',
            field=models.CharField(
                choices=[
                    ('customer',        'Người dùng'),
                    ('field_owner',     'Chủ sân'),
                    ('field_manager',   'Người quản lý sân'),
                    ('receptionist',    'Lễ tân'),
                    ('cashier',         'Nhân viên thu ngân'),
                    ('cleaner',         'Nhân viên dọn dẹp'),
                    ('service_staff',   'Nhân viên dịch vụ'),
                    ('maintenance',     'Nhân viên bảo trì sân'),
                    ('admin',           'Quản trị viên'),
                ],
                default='customer',
                max_length=30,
                verbose_name='Vai trò',
            ),
        ),
    ]
