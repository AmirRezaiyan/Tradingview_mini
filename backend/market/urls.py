from django.urls import path
from .views import MarketDataView , LatestPriceView

urlpatterns = [
    # مسیر دریافت کندل‌ها (crypto یا forex)
    path('<str:market_type>/', MarketDataView.as_view(), name='market-data'),
    path('<str:market_type>/latest_price/', LatestPriceView.as_view(), name='latest-price'),
]