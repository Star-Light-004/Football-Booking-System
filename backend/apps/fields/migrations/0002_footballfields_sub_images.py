from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fields', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='footballfields',
            name='sub_image_1',
            field=models.ImageField(blank=True, null=True, upload_to='fields/'),
        ),
        migrations.AddField(
            model_name='footballfields',
            name='sub_image_2',
            field=models.ImageField(blank=True, null=True, upload_to='fields/'),
        ),
        migrations.AddField(
            model_name='footballfields',
            name='sub_image_3',
            field=models.ImageField(blank=True, null=True, upload_to='fields/'),
        ),
    ]
