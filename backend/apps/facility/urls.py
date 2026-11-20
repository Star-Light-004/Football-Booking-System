from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PitchCleaningViewSet, MaintenanceIssueViewSet, LostFoundItemViewSet

router = DefaultRouter()
router.register(r'cleaning', PitchCleaningViewSet, basename='cleaning')
router.register(r'maintenance', MaintenanceIssueViewSet, basename='maintenance')
router.register(r'lost-found', LostFoundItemViewSet, basename='lost-found')

urlpatterns = [
    path('', include(router.urls)),
]

