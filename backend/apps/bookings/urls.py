from django.urls import path
from .views import (
    create_booking,
    get_bookings,
    get_user_bookings,
    lookup_booking,
    get_booked_slots,
    get_customer_booking_limits,
    update_booking,
    delete_booking,
    create_tournament_request,
    get_tournament_requests,
    update_tournament_request,
    cancel_tournament_request,
    delete_tournament_request,
)

urlpatterns = [
    path('create/', create_booking),
    path('', get_bookings),
    path('user/<uuid:user_id>/', get_user_bookings),
    path("lookup/", lookup_booking),
    path("booked-slots/", get_booked_slots),
    path("customer-limits/", get_customer_booking_limits),
    path("<uuid:booking_id>/update/", update_booking),
    path("<uuid:booking_id>/delete/", delete_booking),
    path("tournaments/request/", create_tournament_request),
    path("tournaments/requests/", get_tournament_requests),
    path("tournaments/requests/<uuid:pk>/", update_tournament_request),
    path("tournaments/requests/<uuid:pk>/cancel/", cancel_tournament_request),
    path("tournaments/requests/<uuid:pk>/delete/", delete_tournament_request),
]