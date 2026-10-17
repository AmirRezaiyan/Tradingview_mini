from rest_framework import viewsets
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from .models import Note
from .serializers import NoteSerializer

class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    throttle_scope = "notes"
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]

    def get_queryset(self):
        queryset = super().get_queryset()
        symbol = self.request.query_params.get("symbol", "").strip()
        if symbol:
            return queryset.filter(symbol__iexact=symbol)
        return queryset
