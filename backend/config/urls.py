from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [

    path('api/', include('apps.fields.urls')),
    path('api/users/', include('apps.users.urls')), 
    path('api/bookings/', include('apps.bookings.urls')),

]


if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )