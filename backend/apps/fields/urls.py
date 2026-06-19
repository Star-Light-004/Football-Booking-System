from django.urls import path
from . import views

urlpatterns = [

    path('football-fields/', views.get_football_fields),

    path('football-fields/create/', views.create_football_field),

    path('football-fields/<uuid:id>/', views.get_football_field_detail),

    path('football-fields/<uuid:id>/update/', views.update_football_field),

    path('football-fields/<uuid:id>/delete/', views.delete_football_field),
    path('seed-field-types/', views.seed_field_types),
    path('check-media/', views.check_media),
    path('test-image/', views.test_image),
    path('debug-media/', views.debug_media),
    path("debug-path/", views.debug_path),
    

]