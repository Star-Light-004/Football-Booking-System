from django.urls import path
from .views import (
    create_qr_payment,
    check_payment_status,
    sepay_webhook,
    simulate_payment_test,
    get_revenue_analytics
)

urlpatterns = [
    path('qr/create/', create_qr_payment, name='create_qr_payment'),
    path('status/<str:booking_id>/', check_payment_status, name='check_payment_status'),
    path('webhook/sepay/', sepay_webhook, name='sepay_webhook'),
    path('webhook/sepay', sepay_webhook, name='sepay_webhook_no_slash'),
    path('simulate/', simulate_payment_test, name='simulate_payment_test'),
    path('revenue-analytics/', get_revenue_analytics, name='get_revenue_analytics'),
]