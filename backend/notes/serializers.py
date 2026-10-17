from rest_framework import serializers
from .models import Note

class NoteSerializer(serializers.ModelSerializer):
    symbol = serializers.CharField(max_length=64, trim_whitespace=True)
    content = serializers.CharField(max_length=5000, trim_whitespace=True)

    class Meta:
        model = Note
        fields = ["id", "symbol", "content", "created_at"]
        read_only_fields = ["id", "created_at"]
