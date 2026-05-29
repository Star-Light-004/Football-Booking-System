from django.urls import path
from .views import create_booking, get_bookings, get_user_bookings, lookup_booking, get_booked_slots, update_booking, delete_booking

urlpatterns = [
    path('create/', create_booking),
    path('', get_bookings),
    path('user/<uuid:user_id>/', get_user_bookings),
    path("lookup/", lookup_booking),
    path("booked-slots/", get_booked_slots),
    path("<uuid:booking_id>/update/", update_booking),
    path("<uuid:booking_id>/delete/", delete_booking),
]