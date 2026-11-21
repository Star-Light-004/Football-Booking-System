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

        # Lấy danh sách dịch vụ
        if is_admin:
            services = ServicesAdd.objects.all()
        elif field_id:
            from django.db.models import Q
            has_field_services = ServicesAdd.objects.filter(is_active=True, fields__id=field_id).exists()
            if has_field_services:
                services = ServicesAdd.objects.filter(
                    Q(is_active=True) & (Q(fields__id=field_id) | Q(fields__isnull=True))
                ).distinct()
            else:
                services = ServicesAdd.objects.filter(is_active=True)
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
        # Gỡ liên kết trong booking_services để không bị chặn bởi khóa ngoại
        try:
            BookingServices.objects.filter(service=service).update(service=None)
        except Exception as bs_err:
            print("Lỗi gỡ service khỏi booking_services:", bs_err)

        if service.image:
            try:
                if os.path.isfile(service.image.path):
                    os.remove(service.image.path)
            except Exception:
                pass
        service.delete()
        return Response({"message": "Xóa thành công"})

@api_view(['POST'])
def create_booking_service(request):
    try:
        data = request.data
        service_id = data.get('service_id')
        qty = int(data.get('quantity', 1))
        
        service_obj = ServicesAdd.objects.filter(id=service_id).first()
        if not service_obj:
            return Response({"error": "Không tìm thấy dịch vụ tương ứng."}, status=404)

        # 🔹 Kiểm tra tồn kho
        if qty > service_obj.stock:
            return Response({
                "error": f"Dịch vụ '{service_obj.name}' chỉ còn {service_obj.stock} sản phẩm trong kho (bạn đã chọn {qty}). Vui lòng không chọn quá số lượng tồn kho."
            }, status=400)

        booking_service = BookingServices.objects.create(
            id=uuid.uuid4(),
            booking_id=data.get('booking_id'),
            service_id=service_id,
            quantity=qty,
            total_price=data.get('total_price'),
            shoe_size=data.get('shoe_size'),
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


# ================= ĐỒNG BỘ TỒN KHO DỊCH VỤ =================
def sync_booking_services_stock(booking, new_status, old_status=None):
    """
    Đồng bộ tồn kho dịch vụ theo trạng thái đơn đặt sân:
    1. Đơn hoàn thành ('completed', 'hoàn thành'):
       - Trừ số lượng dịch vụ tương ứng ở mục tồn kho nếu chưa trừ (status != 'deducted').
       - Cập nhật BookingServices.status = 'deducted'.
    2. Đơn hủy ('cancelled', 'canceled', 'rejected', 'hủy', 'da huy'):
       - Hoàn lại số lượng dịch vụ tương ứng vào tồn kho nếu đã bị trừ (status == 'deducted').
       - Cập nhật BookingServices.status = 'refunded'.
    3. Đơn chuyển từ 'completed' về trạng thái khác (Pending, Confirmed):
       - Hoàn lại số lượng dịch vụ tương ứng vào tồn kho.
       - Cập nhật BookingServices.status = 'active'.
    """
    if not booking:
        return

    new_st = str(new_status or '').strip().lower()
    old_st = str(old_status or '').strip().lower() if old_status else None

    booking_services = BookingServices.objects.filter(booking=booking).select_related('service')

    # 1. Trạng thái Hoàn thành -> Trừ tồn kho
    if new_st in ['completed', 'hoàn thành']:
        for bs in booking_services:
            if bs.status != 'deducted' and bs.service:
                srv = bs.service
                qty = max(1, bs.quantity or 1)
                srv.stock = max(0, (srv.stock or 0) - qty)
                srv.save(update_fields=['stock'])
                bs.status = 'deducted'
                bs.save(update_fields=['status'])
                print(f"📦 [Stock] Đơn #{booking.id} hoàn thành: Trừ {qty} '{srv.name}', tồn kho còn {srv.stock}")

    # 2. Trạng thái Hủy -> Hoàn lại tồn kho nếu đã từng trừ
    elif new_st in ['cancelled', 'canceled', 'rejected', 'hủy', 'da huy']:
        for bs in booking_services:
            if bs.status == 'deducted' and bs.service:
                srv = bs.service
                qty = max(1, bs.quantity or 1)
                srv.stock = (srv.stock or 0) + qty
                srv.save(update_fields=['stock'])
                bs.status = 'refunded'
                bs.save(update_fields=['status'])
                print(f"🔄 [Stock] Đơn #{booking.id} bị hủy: Hoàn lại {qty} '{srv.name}', tồn kho mới: {srv.stock}")

    # 3. Chuyển từ Hoàn thành về trạng thái khác (Pending, Confirmed, Checked_in) -> Hoàn lại tồn kho
    elif old_st in ['completed', 'hoàn thành'] and new_st not in ['completed', 'hoàn thành']:
        for bs in booking_services:
            if bs.status == 'deducted' and bs.service:
                srv = bs.service
                qty = max(1, bs.quantity or 1)
                srv.stock = (srv.stock or 0) + qty
                srv.save(update_fields=['stock'])
                bs.status = 'active'
                bs.save(update_fields=['status'])
                print(f"🔄 [Stock] Đơn #{booking.id} chuyển từ hoàn thành sang '{new_st}': Hoàn lại {qty} '{srv.name}', tồn kho mới: {srv.stock}")


def refund_booking_services_stock(booking):
    """
    Hoàn lại tồn kho cho tất cả dịch vụ đã trừ của booking này.
    Dùng khi xóa booking hoặc khi ghi đè lại danh sách dịch vụ của đơn đã hoàn thành.
    """
    if not booking:
        return
    booking_services = BookingServices.objects.filter(booking=booking).select_related('service')
    for bs in booking_services:
        if bs.status == 'deducted' and bs.service:
            srv = bs.service
            qty = max(1, bs.quantity or 1)
            srv.stock = (srv.stock or 0) + qty
            srv.save(update_fields=['stock'])
            bs.status = 'refunded'
            bs.save(update_fields=['status'])
            print(f"🔄 [Stock] Hoàn lại {qty} '{srv.name}' (tồn kho mới: {srv.stock}) khi xóa/reset đơn #{booking.id}")


@api_view(['GET'])
def get_services_stats(request):
    """
    Thống kê dịch vụ & tiện ích cho Admin Web và Mobile App:
    - Phân định rõ ràng: Nước, thực phẩm -> Bán lẻ (Sale); Giày, trọng tài, áo bib -> Cho thuê (Rental)
    - today: Số lượng dùng hôm nay, chi tiết bán ra và cho thuê
    - this_week, this_month, all_time
    - orders: Lịch sử ca đá với trạng thái chuẩn (Hoàn thành / Đang thuê / Đang phục vụ / Đã hủy)
    """
    from django.utils import timezone
    import datetime

    def is_rental_item(name, cat):
        s = f"{name} {cat}".lower()
        return any(k in s for k in ['giày', 'giay', 'thuê', 'thue', 'trọng tài', 'trong tai', 'referee', 'áo bib', 'ao bib', 'bóng', 'bong', 'tủ đồ', 'tu do'])

    now = timezone.now()
    today = now.date()
    week_start = today - datetime.timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    bs_qs = BookingServices.objects.select_related(
        'service', 'booking', 'booking__field', 'booking__customer'
    ).order_by('-created_at')

    today_sales = {}
    today_rentals = {}
    today_qty = 0
    today_revenue = 0.0

    week_qty = 0
    week_revenue = 0.0

    month_qty = 0
    month_revenue = 0.0

    all_items = {}
    all_qty = 0
    all_revenue = 0.0

    orders = []

    for bs in bs_qs:
        qty = int(bs.quantity or 1)
        price = float(bs.total_price or 0.0)
        s_name = bs.service.name if bs.service else 'Dịch vụ khác'
        s_cat = bs.service.category if bs.service else 'Khác'
        bs_date = bs.created_at.date() if bs.created_at else None
        is_rental = is_rental_item(s_name, s_cat)
        action_type = 'rental' if is_rental else 'sale'
        action_label = 'Cho thuê' if is_rental else 'Bán lẻ'

        # Tổng hợp từng sản phẩm
        all_qty += qty
        all_revenue += price
        if s_name not in all_items:
            all_items[s_name] = {
                'name': s_name,
                'category': s_cat,
                'action_type': action_type,
                'action_label': action_label,
                'quantity': 0,
                'revenue': 0.0,
                'price': float(bs.service.price) if (bs.service and bs.service.price) else 0.0
            }
        all_items[s_name]['quantity'] += qty
        all_items[s_name]['revenue'] += price

        # Hôm nay
        if bs_date == today:
            today_qty += qty
            today_revenue += price
            target_dict = today_rentals if is_rental else today_sales
            if s_name not in target_dict:
                target_dict[s_name] = {'name': s_name, 'category': s_cat, 'quantity': 0, 'revenue': 0.0}
            target_dict[s_name]['quantity'] += qty
            target_dict[s_name]['revenue'] += price

        # Tuần này
        if bs_date and bs_date >= week_start:
            week_qty += qty
            week_revenue += price

        # Tháng này
        if bs_date and bs_date >= month_start:
            month_qty += qty
            month_revenue += price

        # Xác định trạng thái chuẩn hóa cho lịch sử ca đá
        booking_st = str(bs.booking.status or '').strip().lower() if bs.booking else ''
        if booking_st in ['completed', 'hoàn thành'] or bs.status == 'deducted':
            status_code = 'completed'
            status_label = 'Hoàn thành'
        elif booking_st in ['cancelled', 'canceled', 'rejected', 'đã hủy', 'da huy'] or bs.status == 'refunded':
            status_code = 'cancelled'
            status_label = 'Đã hủy'
        else:
            status_code = 'active'
            status_label = 'Đang thuê' if is_rental else 'Đang phục vụ'

        # Thông tin ca đá
        field_name = 'Sân chung'
        customer_name = 'Khách vãng lai'
        booking_code = ''
        if bs.booking:
            booking_code = str(bs.booking.id)[:8].upper()
            if bs.booking.field:
                field_name = bs.booking.field.field_name
            if bs.booking.customer:
                customer_name = bs.booking.customer.full_name or bs.booking.customer.username

        orders.append({
            'id': str(bs.id),
            'booking_id': str(bs.booking.id) if bs.booking else None,
            'booking_code': booking_code,
            'field_name': field_name,
            'customer_name': customer_name,
            'service_name': s_name,
            'service_category': s_cat,
            'action_type': action_type,
            'action_label': action_label,
            'quantity': qty,
            'total_price': price,
            'status': bs.status or 'active',
            'status_code': status_code,
            'status_label': status_label,
            'shoe_size': bs.shoe_size or '',
            'created_at': bs.created_at.strftime('%d/%m/%Y %H:%M') if bs.created_at else ''
        })

    # Tạo text tóm tắt hôm nay phân biệt bán và cho thuê
    today_parts = []
    if today_sales:
        sales_str = ", ".join([f"{v['name']}: {v['quantity']}" for v in today_sales.values()])
        today_parts.append(f"Đã bán: {sales_str}")
    if today_rentals:
        rentals_str = ", ".join([f"{v['name']}: {v['quantity']}" for v in today_rentals.values()])
        today_parts.append(f"Cho thuê: {rentals_str}")

    today_summary_text = "  •  ".join(today_parts) if today_parts else "Chưa có phát sinh hôm nay"

    return Response({
        'today': {
            'date': today.strftime('%d/%m/%Y'),
            'total_quantity': today_qty,
            'total_revenue': today_revenue,
            'sales_items': list(today_sales.values()),
            'rentals_items': list(today_rentals.values()),
            'summary_text': today_summary_text
        },
        'this_week': {
            'total_quantity': week_qty,
            'total_revenue': week_revenue,
        },
        'this_month': {
            'total_quantity': month_qty,
            'total_revenue': month_revenue,
        },
        'all_time': {
            'total_quantity': all_qty,
            'total_revenue': all_revenue,
            'items': list(all_items.values())
        },
        'orders': orders
    })
