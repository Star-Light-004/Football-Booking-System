from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Notification
from .serializers import NotificationSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_notifications(request):
    """Lấy thông báo của user hiện tại"""
    try:
        # Lấy customer_id từ request
        customer_id = request.query_params.get('customer_id')
        
        if not customer_id:
            return Response({'error': 'customer_id is required'}, status=400)
        
        notifications = Notification.objects.filter(user_id=customer_id).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)
        
        # Đếm số unread
        unread_count = Notification.objects.filter(user_id=customer_id, is_read=False).count()
        
        return Response({
            'notifications': serializer.data,
            'unread_count': unread_count
        })
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['GET'])
def get_notifications(request):
    """Lấy thông báo của user (không cần authentication)"""
    try:
        customer_id = request.query_params.get('customer_id')
        print(f"📢 [API] Get notifications for customer_id: {customer_id}")
        
        if not customer_id:
            print("❌ customer_id is missing")
            return Response({'error': 'customer_id is required'}, status=400)
        
        notifications = Notification.objects.filter(user_id=customer_id).order_by('-created_at')
        print(f"✅ Found {notifications.count()} notifications")
        serializer = NotificationSerializer(notifications, many=True)
        
        # Đếm số unread
        unread_count = Notification.objects.filter(user_id=customer_id, is_read=False).count()
        print(f"📊 Unread count: {unread_count}")
        
        return Response({
            'notifications': serializer.data,
            'unread_count': unread_count
        })
    except Exception as e:
        print(f"❌ Error in get_notifications: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=400)


@api_view(['PUT'])
def mark_notification_as_read(request, notification_id):
    """Đánh dấu thông báo đã đọc"""
    try:
        notification = get_object_or_404(Notification, id=notification_id)
        notification.is_read = True
        notification.save()
        return Response({'message': 'Notification marked as read'})
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['PUT'])
def mark_all_notifications_as_read(request):
    """Đánh dấu tất cả thông báo đã đọc"""
    try:
        customer_id = request.data.get('customer_id')
        
        if not customer_id:
            return Response({'error': 'customer_id is required'}, status=400)
        
        Notification.objects.filter(user_id=customer_id, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read'})
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['DELETE'])
def delete_notification(request, notification_id):
    """Xóa thông báo"""
    try:
        notification = get_object_or_404(Notification, id=notification_id)
        notification.delete()
        return Response({'message': 'Notification deleted'})
    except Exception as e:
        return Response({'error': str(e)}, status=400)
