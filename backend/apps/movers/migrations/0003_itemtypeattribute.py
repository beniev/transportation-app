"""
Migration to add ItemTypeAttribute model for item-type-specific attribute links.
"""
import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('movers', '0002_add_item_attributes_variants_system'),
    ]

    operations = [
        # Drop the table if it exists (cleanup from any failed previous attempts)
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS item_type_attributes CASCADE;",
            reverse_sql="",
        ),
        # Create the model properly
        migrations.CreateModel(
            name='ItemTypeAttribute',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_required', models.BooleanField(default=True, help_text='Whether this attribute must be specified', verbose_name='required')),
                ('display_order', models.IntegerField(default=0, verbose_name='display order')),
                ('attribute', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='item_type_links', to='movers.itemattribute', verbose_name='attribute')),
                ('item_type', models.ForeignKey(limit_choices_to={'is_generic': True}, on_delete=django.db.models.deletion.CASCADE, related_name='item_attributes', to='movers.itemtype', verbose_name='item type')),
            ],
            options={
                'verbose_name': 'item type attribute',
                'verbose_name_plural': 'item type attributes',
                'db_table': 'item_type_attributes',
                'ordering': ['item_type', 'display_order'],
                'unique_together': {('item_type', 'attribute')},
            },
        ),
    ]
