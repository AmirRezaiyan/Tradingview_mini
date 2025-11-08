from rest_framework import serializers
from .models import Note

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "symbol", "content", "created_at"]
        read_only_fields = ["id", "created_at"]
