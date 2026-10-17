from django.contrib import admin
from .models import Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
	list_display = ("symbol", "created_at")
	search_fields = ("symbol", "content")
	readonly_fields = ("created_at",)
