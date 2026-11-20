from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.bookings.models import Bookings
from django.utils import timezone


@api_view(['GET'])
@permission_classes([AllowAny])
def get_dynamic_notifications(request):
    """
    Sinh danh sách thông báo động từ bảng Bookings và Vouchers thực tế.
    Không cần lưu bảng Notifications riêng trong DB, tự động đồng bộ đa thiết bị khi deploy.
    """
    customer_id = request.query_params.get('customer_id')
    role = request.query_params.get('role', '').lower()

    notifications = []

    # 1. Nếu là Admin hoặc xem thông báo quản trị viên
    if role in ['admin', 'staff', 'manager', 'receptionist'] or customer_id in ['admin', 'staff']:
        # Lấy các đơn cần chú ý: pending, cancelled gần đây, confirmed gần đây
        recent_bookings = Bookings.objects.select_related('customer', 'field').order_by('-updated_at', '-created_at')[:15]
        for b in recent_bookings:
            status_lower = str(b.status or '').lower()
            field_name = b.field.field_name if b.field else "Sân bóng"
            c_name = b.customer.full_name if (b.customer and b.customer.full_name) else (b.customer.phone if b.customer else "Khách vãng lai")
            time_str = f"{str(b.start_time)[:5]} - {str(b.end_time)[:5]}" if b.start_time and b.end_time else ""
            date_str = str(b.booking_date or "")
            booking_code = str(b.id)[:8].upper()

            if status_lower == 'pending':
                notifications.append({
                    'id': f"notif_adm_pen_{b.id}",
                    'notification_type': 'booking_pending',
                    'title': f'Đơn đặt sân mới #{booking_code}',
                    'message': f'Khách {c_name} vừa đặt {field_name} ngày {date_str} ({time_str}). Đang chờ duyệt.',
                    'booking_id': str(b.id),
                    'created_at': (b.created_at or timezone.now()).isoformat(),
                    'is_read': False
                })
            elif status_lower in ['cancelled', 'canceled']:
                notifications.append({
                    'id': f"notif_adm_can_{b.id}",
                    'notification_type': 'booking_cancelled',
                    'title': f'Đơn đặt sân bị hủy #{booking_code}',
                    'message': f'Đơn #{booking_code} tại {field_name} ngày {date_str} ({time_str}) đã được cập nhật trạng thái hủy.',
                    'booking_id': str(b.id),
                    'created_at': (b.updated_at or b.created_at or timezone.now()).isoformat(),
                    'is_read': False
                })
            elif status_lower in ['confirmed', 'approved']:
                notifications.append({
                    'id': f"notif_adm_con_{b.id}",
                    'notification_type': 'booking_approved',
                    'title': f'Đã duyệt đơn #{booking_code}',
                    'message': f'Đơn #{booking_code} của khách {c_name} tại {field_name} ({date_str} {time_str}) đã được xác nhận thành công.',
                    'booking_id': str(b.id),
                    'created_at': (b.updated_at or b.created_at or timezone.now()).isoformat(),
                    'is_read': False
                })

    # 2. Nếu là Khách hàng (có customer_id hợp lệ)
    elif customer_id:
        try:
            # Lấy các đơn đặt sân của khách hàng
            user_bookings = Bookings.objects.filter(customer_id=customer_id).select_related('field').order_by('-updated_at', '-created_at')[:10]
            for b in user_bookings:
                status_lower = str(b.status or '').lower()
                field_name = b.field.field_name if b.field else "Sân bóng"
                time_str = f"{str(b.start_time)[:5]} - {str(b.end_time)[:5]}" if b.start_time and b.end_time else ""
                date_str = str(b.booking_date or "")
                booking_code = str(b.id)[:8].upper()

                if status_lower in ['confirmed', 'approved']:
                    notifications.append({
                        'id': f"notif_cus_con_{b.id}",
                        'notification_type': 'booking_approved',
                        'title': 'Đặt sân được duyệt thành công',
                        'message': f'Đơn đặt sân #{booking_code} tại {field_name} ngày {date_str} ({time_str}) đã được xác nhận. Vui lòng đến đúng giờ để thi đấu!',
                        'booking_id': str(b.id),
                        'created_at': (b.updated_at or b.created_at or timezone.now()).isoformat(),
                        'is_read': False
                    })
                elif status_lower == 'pending':
                    notifications.append({
                        'id': f"notif_cus_pen_{b.id}",
                        'notification_type': 'booking_pending',
                        'title': 'Đặt sân đang chờ xác nhận',
                        'message': f'Đơn #{booking_code} tại {field_name} ngày {date_str} ({time_str}) đã ghi nhận và đang chờ quản trị viên duyệt.',
                        'booking_id': str(b.id),
                        'created_at': (b.created_at or timezone.now()).isoformat(),
                        'is_read': False
                    })
                elif status_lower in ['cancelled', 'canceled']:
                    notifications.append({
                        'id': f"notif_cus_can_{b.id}",
                        'notification_type': 'booking_cancelled',
                        'title': 'Lượt đặt sân đã bị hủy',
                        'message': f'Đơn đặt sân #{booking_code} tại {field_name} ngày {date_str} ({time_str}) đã được hủy.',
                        'booking_id': str(b.id),
                        'created_at': (b.updated_at or b.created_at or timezone.now()).isoformat(),
                        'is_read': False
                    })
                elif status_lower in ['completed', 'hoàn thành']:
                    notifications.append({
                        'id': f"notif_cus_com_{b.id}",
                        'notification_type': 'booking_completed',
                        'title': 'Trận đấu hoàn thành',
                        'message': f'Ca thi đấu #{booking_code} tại {field_name} ngày {date_str} ({time_str}) đã hoàn tất. Cảm ơn bạn đã thi đấu tại sân!',
                        'booking_id': str(b.id),
                        'created_at': (b.updated_at or b.created_at or timezone.now()).isoformat(),
                        'is_read': False
                    })

            # Kiểm tra xem khách có voucher được tặng nào không
            try:
                from apps.vouchers.models import CustomerVoucher
                vouchers = CustomerVoucher.objects.filter(customer_id=customer_id, is_used=False).order_by('-assigned_at')[:3]
                for v in vouchers:
                    notifications.append({
                        'id': f"notif_vch_{v.id}",
                        'notification_type': 'system_message',
                        'title': '🎁 Tặng bạn Voucher ưu đãi!',
                        'message': f'Bạn có mã giảm giá {v.code} (Hạn dùng đến {v.valid_until}). Hãy áp dụng khi đặt sân nhé!',
                        'created_at': (v.assigned_at or timezone.now()).isoformat(),
                        'is_read': False
                    })
            except Exception as v_err:
                pass

        except Exception as e:
            print("Lỗi truy vấn dynamic notifications khách hàng:", e)

    # Thêm thông báo chào mừng nếu danh sách rỗng
    if not notifications:
        notifications.append({
            'id': f"notif_welcome_{customer_id or 'guest'}",
            'notification_type': 'system_message',
            'title': 'Chào mừng bạn đến với Football Booking!',
            'message': 'Hệ thống đặt sân bóng online tiện lợi, nhanh chóng và hỗ trợ đặt dịch vụ đi kèm.',
            'created_at': timezone.now().isoformat(),
            'is_read': False
        })

    # Sắp xếp giảm dần theo thời gian tạo
    notifications.sort(key=lambda x: x.get('created_at', ''), reverse=True)

    return Response({
        'notifications': notifications,
        'unread_count': len([n for n in notifications if not n.get('is_read')])
    })


@api_view(['PUT', 'POST', 'GET'])
@permission_classes([AllowAny])
def mark_notification_read(request, notification_id=None):
    return Response({'message': 'Marked as read successfully'})


@api_view(['PUT', 'POST', 'GET'])
@permission_classes([AllowAny])
def mark_all_notifications_read(request):
    return Response({'message': 'All notifications marked as read'})


@api_view(['DELETE', 'POST', 'GET'])
@permission_classes([AllowAny])
def delete_notification(request, notification_id=None):
    return Response({'message': 'Notification deleted successfully'})

