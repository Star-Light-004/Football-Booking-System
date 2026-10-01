from django.urls import path
from .views import register, login, get_users, get_profile, update_user, delete_user, toggle_status

urlpatterns = [
    path('register/', register),
    path('login/', login),
    path('', get_users),
    path('profile/', get_profile),
    path('<uuid:user_id>/update/', update_user),
    path('<uuid:user_id>/toggle-status/', toggle_status),
    path('<uuid:user_id>/delete/', delete_user),
]