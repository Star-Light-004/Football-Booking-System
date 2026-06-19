from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [

    path('api/', include('apps.fields.urls')),
    path('api/users/', include('apps.users.urls')), 
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/reviews/', include('apps.reviews.urls')),
    path('api/timeslots/', include('apps.timeslots.urls')),
    path('api/services/', include('apps.servicesadd.urls')),
    path('api/notifications/', include('apps.notifications.urls')),

]


urlpatterns += static(
    settings.MEDIA_URL,
    document_root=settings.MEDIA_ROOT
)