from django.urls import path
from .views import create_booking, get_bookings, get_user_bookings, lookup_booking, get_booked_slots

urlpatterns = [
    path('create/', create_booking),
    path('', get_bookings),
    path('user/<uuid:user_id>/', get_user_bookings),
    path("lookup/", lookup_booking),
    path("booked-slots/", get_booked_slots),
]