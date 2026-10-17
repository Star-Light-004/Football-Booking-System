# Generated manually for RolePermission model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_update_role_choices'),
    ]

    operations = [
        migrations.CreateModel(
            name='RolePermission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(max_length=50, unique=True, verbose_name='Vai trò')),
                ('permissions', models.JSONField(default=list, verbose_name='Danh sách quyền')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Cập nhật lúc')),
            ],
            options={
                'verbose_name': 'Phân quyền vai trò',
                'verbose_name_plural': 'Phân quyền vai trò',
                'db_table': 'role_permissions',
                'managed': True,
            },
        ),
    ]
