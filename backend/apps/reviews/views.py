from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db import connection
import datetime

@api_view(['GET'])
@permission_classes([AllowAny])
def get_reviews(request, field_id):
    try:
        from .models import Reviews
        reviews = Reviews.objects.filter(field_id=field_id).select_related('user').order_by('-created_at')
        from .serializers import ReviewsSerializer
        serializer = ReviewsSerializer(reviews, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def create_review(request):
    data = request.data
    booking_id = data.get('booking_id')
    rating = data.get('rating')
    comment = data.get('comment', '')
    user_id = data.get('user_id') # Đây là UUID của khách hàng

    if not booking_id or not rating or not user_id:
        return Response({"error": "booking_id, rating và user_id là bắt buộc"}, status=400)

    try:
        with connection.cursor() as cursor:
            # Lấy thông tin booking và field_id
            cursor.execute("SELECT id, field_id FROM bookings WHERE id = %s", [booking_id])
            booking_row = cursor.fetchone()
            if not booking_row:
                return Response({"error": "Booking không tồn tại"}, status=404)
            
            field_id = booking_row[1]

            # Kiểm tra xem booking này đã được review chưa
            cursor.execute("SELECT id FROM reviews WHERE booking_id = %s", [booking_id])
            if cursor.fetchone():
                return Response({"error": "Booking này đã được đánh giá"}, status=400)

            # Insert review sử dụng trực tiếp user_id (UUID)
            insert_query = """
                INSERT INTO reviews (user_id, field_id, booking_id, rating, comment, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            cursor.execute(insert_query, [user_id, field_id, booking_id, rating, comment, datetime.datetime.now()])
            new_id = cursor.fetchone()[0]

            # 🔹 Tự động cập nhật rating_avg cho sân bóng
            try:
                cursor.execute("SELECT AVG(rating) FROM reviews WHERE field_id = %s", [field_id])
                avg_row = cursor.fetchone()
                if avg_row and avg_row[0] is not None:
                    new_avg = round(float(avg_row[0]), 1)
                    cursor.execute("UPDATE football_fields SET rating_avg = %s WHERE id = %s", [new_avg, field_id])
            except Exception as update_err:
                print("Lỗi cập nhật rating_avg:", update_err)

        return Response({"message": "Tạo đánh giá thành công", "id": new_id}, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
