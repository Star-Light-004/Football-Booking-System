from django.urls import path
from . import views

urlpatterns = [
    path('list/', views.manage_services, name='manage_services'),
    path('list/<uuid:pk>/', views.service_detail, name='service_detail'),
    path('booking-services/add/', views.create_booking_service, name='create_booking_service'),
    path('booking-services/<uuid:booking_id>/', views.get_booking_services, name='get_booking_services'),
]
