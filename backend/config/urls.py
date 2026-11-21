from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve 
from apps.bookings import notification_views

urlpatterns = [
    path('api/', include('apps.fields.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/reviews/', include('apps.reviews.urls')),
    path('api/timeslots/', include('apps.timeslots.urls')),
    path('api/services/', include('apps.servicesadd.urls')),
    path('api/notifications/', notification_views.get_dynamic_notifications, name='get_dynamic_notifications'),
    path('api/notifications/mark-as-read/<str:notification_id>/', notification_views.mark_notification_read, name='mark_notification_read'),
    path('api/notifications/mark-all-as-read/', notification_views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('api/notifications/delete/<str:notification_id>/', notification_views.delete_notification, name='delete_notification'),
    path('api/vouchers/', include('apps.vouchers.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/facility/', include('apps.facility.urls')),
]

def serve_media_cached(request, path, document_root=None):
    response = serve(request, path, document_root=document_root)
    if response.status_code == 200:
        response['Cache-Control'] = 'public, max-age=604800, immutable'
    return response

# 👇 FIX MEDIA WITH BROWSER CACHING
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve_media_cached, {
        'document_root': settings.MEDIA_ROOT,
    }),
]