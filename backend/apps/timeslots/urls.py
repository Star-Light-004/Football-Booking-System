from django.urls import path
from . import views

urlpatterns = [
    path('', views.timeslot_list, name='timeslot_list'),
    path('generate-slots/', views.generate_slots, name='generate_slots'),
    path('delete-all/', views.delete_all_slots, name='delete_all_slots'),
    path('get-by-field/', views.get_timeslots_by_field, name='get_timeslots_by_field'),
    path('<uuid:pk>/', views.timeslot_detail, name='timeslot_detail'),
]
