from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0004_emailjob_companycontact_emailed_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='userresume',
            name='resume_cloudinary_url',
            field=models.URLField(blank=True, default=''),
        ),
    ]
