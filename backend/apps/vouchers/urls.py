from django.urls import path
from . import views

app_name = 'vouchers'

urlpatterns = [
    path('', views.get_public_vouchers, name='public_vouchers'),
    path('my-vouchers/', views.get_customer_vouchers, name='my_vouchers'),
    path('validate/', views.validate_voucher, name='validate_voucher'),
    path('admin/', views.admin_get_all_vouchers, name='admin_all_vouchers'),
    path('admin/issued-history/', views.admin_get_customer_vouchers, name='admin_customer_vouchers'),
    path('admin/create/', views.admin_create_voucher, name='admin_create_voucher'),
    path('admin/<uuid:voucher_id>/update/', views.admin_update_voucher, name='admin_update_voucher'),
    path('admin/<uuid:voucher_id>/delete/', views.admin_delete_voucher, name='admin_delete_voucher'),
]
