from django.urls import path
from .views import (
    register,
    check_user_exists,
    social_auth,
    create_guest_user,
    login,
    get_users,
    get_profile,
    update_user,
    change_password,
    delete_user,
    toggle_status,
    role_permissions_view,
    reset_role_permissions_view,
)

urlpatterns = [
    path('register/', register),
    path('check-exists/', check_user_exists),
    path('social-auth/', social_auth),
    path('create-guest/', create_guest_user),
    path('login/', login),
    path('roles/permissions/', role_permissions_view),
    path('roles/permissions/reset/', reset_role_permissions_view),
    path('', get_users),
    path('profile/', get_profile),
    path('<uuid:user_id>/update/', update_user),
    path('<uuid:user_id>/change-password/', change_password),
    path('<uuid:user_id>/toggle-status/', toggle_status),
    path('<uuid:user_id>/delete/', delete_user),
]