from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import ServicesAdd, BookingServices
from django.conf import settings
import uuid
import os

@api_view(['GET', 'POST'])
@parser_classes([MultiPartParser, FormParser])
def manage_services(request):
    if request.method == 'GET':
        category = request.GET.get('category')
        is_admin = request.GET.get('admin') == 'true'
        field_id = request.GET.get('field_id')
        
        if is_admin:
            services = ServicesAdd.objects.all()
        elif field_id:
            # Filter services that are active AND associated with this field
            services = ServicesAdd.objects.filter(is_active=True, fields__id=field_id)
        else:
            services = ServicesAdd.objects.filter(is_active=True)
        
        if category:
            services = services.filter(category=category)
            
        from .serializers import ServicesAddSerializer
        serializer = ServicesAddSerializer(services, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        try:
            data = request.data
            
            # Explicit casting to handle multipart string data
            price_val = data.get('price')
            stock_val = data.get('stock')
            field_ids = request.POST.getlist('field_ids')
            
            service = ServicesAdd.objects.create(
                id=uuid.uuid4(),
                name=data.get('name'),
                price=float(price_val) if price_val else 0,
                description=data.get('description'),
                image=request.FILES.get('image'),
                category=data.get('category'),
                stock=int(stock_val) if stock_val else 0,
                is_active=data.get('is_active') == 'true'
            )
            
            if field_ids:
                service.fields.set(field_ids)
                
            return Response({
                "message": "Thêm dịch vụ thành công",
                "id": str(service.id)
            }, status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

@api_view(['GET', 'PUT', 'DELETE'])
@parser_classes([MultiPartParser, FormParser])
def service_detail(request, pk):
    try:
        service = ServicesAdd.objects.get(pk=pk)
    except ServicesAdd.DoesNotExist:
        return Response({"error": "Dịch vụ không tồn tại"}, status=404)

    if request.method == 'GET':
        from .serializers import ServicesAddSerializer
        serializer = ServicesAddSerializer(service, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'PUT':
        try:
            data = request.data
            service.name = data.get('name', service.name)
            
            if 'price' in data:
                service.price = float(data.get('price'))
            
            service.description = data.get('description', service.description)
            service.category = data.get('category', service.category)
            
            if 'stock' in data:
                service.stock = int(data.get('stock'))
                
            service.is_active = data.get('is_active') == 'true'
            
            if 'image' in request.FILES:
                service.image = request.FILES['image']
            
            # Update fields relationship
            field_ids = request.POST.getlist('field_ids')
            if field_ids:
                service.fields.set(field_ids)
            
            service.save()
            return Response({"message": "Cập nhật thành công"})
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    elif request.method == 'DELETE':
        # Optional: delete the file from storage
        if service.image:
            if os.path.isfile(service.image.path):
                os.remove(service.image.path)
        service.delete()
        return Response({"message": "Xóa thành công"})

@api_view(['POST'])
def create_booking_service(request):
    try:
        data = request.data
        booking_service = BookingServices.objects.create(
            id=uuid.uuid4(),
            booking_id=data.get('booking_id'),
            service_id=data.get('service_id'),
            quantity=data.get('quantity', 1),
            total_price=data.get('total_price'),
            status='active'
        )
        return Response({
            "message": "Thêm dịch vụ vào đơn đặt thành công",
            "id": str(booking_service.id)
        })
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
def get_booking_services(request, booking_id):
    booking_services = BookingServices.objects.filter(booking_id=booking_id)
    from .serializers import BookingServicesSerializer
    serializer = BookingServicesSerializer(booking_services, many=True, context={'request': request})
    return Response(serializer.data)
