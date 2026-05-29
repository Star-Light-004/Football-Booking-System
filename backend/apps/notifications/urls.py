from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    path('', views.get_notifications, name='get_notifications'),
    path('user/', views.get_user_notifications, name='get_user_notifications'),
    path('mark-as-read/<str:notification_id>/', views.mark_notification_as_read, name='mark_as_read'),
    path('mark-all-as-read/', views.mark_all_notifications_as_read, name='mark_all_as_read'),
    path('delete/<str:notification_id>/', views.delete_notification, name='delete_notification'),
]
