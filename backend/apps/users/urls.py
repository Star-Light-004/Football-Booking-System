from django.urls import path

from .views import register, login, get_users, get_profile

urlpatterns = [
    path('register/', register),
    path('login/', login),
    path('', get_users),
    path('profile/', get_profile),
]