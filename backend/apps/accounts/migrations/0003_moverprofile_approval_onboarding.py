# Generated manually for mover approval, onboarding and SMS verification fields

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_add_mover_geo_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="moverprofile",
            name="facebook_url",
            field=models.URLField(blank=True, verbose_name="Facebook URL"),
        ),
        migrations.AddField(
            model_name="moverprofile",
            name="verification_status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("suspended", "Suspended"),
                ],
                default="pending",
                max_length=20,
                verbose_name="verification status",
            ),
        ),
        migrations.AddField(
            model_name="moverprofile",
            name="rejection_reason",
            field=models.TextField(blank=True, verbose_name="rejection reason"),
        ),
        migrations.AddField(
            model_name="moverprofile",
            name="verified_at",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="verified at"
            ),
        ),
        migrations.AddField(
            model_name="moverprofile",
            name="verification_code",
            field=models.CharField(
                blank=True, max_length=6, verbose_name="verification code"
            ),
        ),
        migrations.AddField(
            model_name="moverprofile",
            name="verification_code_expires",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="verification code expires"
            ),
        ),
        migrations.AddField(
            model_name="moverprofile",
            name="verification_attempts",
            field=models.IntegerField(
                default=0, verbose_name="verification attempts"
            ),
        ),
        migrations.AddField(
            model_name="moverprofile",
            name="onboarding_completed",
            field=models.BooleanField(
                default=False, verbose_name="onboarding completed"
            ),
        ),
        migrations.AddField(
            model_name="moverprofile",
            name="onboarding_step",
            field=models.IntegerField(
                default=0,
                help_text="0=not started, 1=pricing, 2=service area, 3=phone, 4=complete",
                verbose_name="onboarding step",
            ),
        ),
        migrations.AlterField(
            model_name="moverprofile",
            name="is_verified",
            field=models.BooleanField(
                default=False,
                help_text="Admin verified business — synced from verification_status",
                verbose_name="verified",
            ),
        ),
    ]
