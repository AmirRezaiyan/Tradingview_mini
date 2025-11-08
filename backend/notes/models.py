from django.db import models

class Note(models.Model):
    symbol = models.CharField(max_length=64, help_text="Symbol or pair, e.g. BTCUSDT or OANDA:EUR_USD")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.symbol} - {self.created_at.isoformat()}"
