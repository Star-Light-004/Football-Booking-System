from django.contrib import admin
from .models import ServicesAdd, BookingServices

@admin.register(ServicesAdd)
class ServicesAddAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'category', 'stock', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'description')

@admin.register(BookingServices)
class BookingServicesAdmin(admin.ModelAdmin):
    list_display = ('booking', 'service', 'quantity', 'total_price', 'status')
    list_filter = ('status',)
    search_fields = ('booking__id', 'service__name')
