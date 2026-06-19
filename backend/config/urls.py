from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve 

urlpatterns = [
    path('api/', include('apps.fields.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/reviews/', include('apps.reviews.urls')),
    path('api/timeslots/', include('apps.timeslots.urls')),
    path('api/services/', include('apps.servicesadd.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
]

# 👇 FIX MEDIA
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {
        'document_root': settings.MEDIA_ROOT,
    }),
]