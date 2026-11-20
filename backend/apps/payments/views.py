import os
import re
import uuid
import urllib.parse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from apps.bookings.models import Bookings, TournamentRequests
from apps.users.models import Customers
from django.db.models import Sum, Count, Q
from .models import Payments

# Ngân hàng hỗ trợ tên đầy đủ
BANK_NAMES = {
    'VCB': 'Vietcombank (Ngân hàng Ngoại Thương)',
    'MB': 'MBBank (Ngân hàng Quân Đội)',
    'MBBank': 'MBBank (Ngân hàng Quân Đội)',
    'ACB': 'ACB (Ngân hàng Á Châu)',
    'TCB': 'Techcombank (Kỹ Thương Việt Nam)',
    'TPB': 'TPBank (Tiên Phong)',
    'VPB': 'VPBank (Việt Nam Thịnh Vượng)',
    'ICB': 'VietinBank (Công Thương Việt Nam)',
    'BIDV': 'BIDV (Đầu tư và Phát triển VN)',
}


def get_db_payment_status_values():
    """
    Lấy danh sách các giá trị hợp lệ của enum payment_status trong PostgreSQL
    """
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT enumlabel 
                FROM pg_enum 
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
                WHERE pg_type.typname = 'payment_status';
            """)
            rows = cursor.fetchall()
            labels = [r[0] for r in rows]
            if labels:
                print(">>> [DEBUG DB] pg_enum payment_status labels:", labels)
            return labels
    except Exception as e:
        print(">>> [DEBUG DB] Lỗi lấy pg_enum:", e)
        return []


def get_status_val(desired):
    """
    Lấy đúng giá trị enum có trong PostgreSQL:
    desired: 'pending' hoặc 'completed'
    """
    labels = get_db_payment_status_values()
    if not labels:
        return 'Paid' if desired == 'completed' else 'Pending'

    desired_lower = desired.lower()
    if desired_lower in ['completed', 'paid', 'success']:
        for candidate in ['Paid', 'paid', 'PAID', 'Success', 'success', 'Completed', 'completed', 'COMPLETED']:
            if candidate in labels:
                return candidate
        return labels[-1]  # lấy nhãn cuối nếu không có
    elif desired_lower in ['pending', 'unpaid']:
        for candidate in ['Pending', 'pending', 'PENDING', 'Unpaid', 'unpaid']:
            if candidate in labels:
                return candidate
        return labels[0]

    return labels[0]


@api_view(['POST'])
@permission_classes([AllowAny])
def create_qr_payment(request):
    """
    Tạo thông tin thanh toán VietQR động cho đơn đặt sân
    """
    try:
        data = request.data
        booking_id = data.get('booking_id')
        tournament_id = data.get('tournament_id') or data.get('tournament_request_id')

        # Hỗ trợ thanh toán QR cho Giải đấu (Tournament Request)
        tour_req = None
        if tournament_id:
            tour_req = TournamentRequests.objects.filter(id=tournament_id).first()
        elif booking_id and not Bookings.objects.filter(id=booking_id).exists():
            tour_req = TournamentRequests.objects.filter(id=booking_id).first()

        if tour_req:
            total_budget = int(float(tour_req.estimated_budget or 0))
            amount = data.get('amount')
            if amount is None:
                amount = int(float(tour_req.deposit_amount or total_budget))
            try:
                amount = int(float(amount))
            except (ValueError, TypeError):
                amount = total_budget

            short_id = str(tour_req.id)[:8].upper()
            payment_code = f"TR{short_id}"

            bank_code = os.environ.get('BANK_CODE', 'VCB').strip()
            account_no = os.environ.get('BANK_ACCOUNT_NO', '9974090779').strip()
            account_name = os.environ.get('BANK_ACCOUNT_NAME', 'TRUONG DINH BAC').strip()

            safe_acc_name = urllib.parse.quote(account_name)
            safe_content = urllib.parse.quote(payment_code)
            qr_url = f"https://qr.sepay.vn/img?acc={account_no}&bank={bank_code}&amount={amount}&des={safe_content}&template=compact"

            is_deposit = amount < total_budget
            tour_req.payment_method = 'deposit' if is_deposit else 'full'
            tour_req.transaction_id = payment_code
            if is_deposit:
                tour_req.deposit_amount = amount
                tour_req.remaining_amount = max(0, total_budget - amount)
            else:
                tour_req.deposit_amount = 0
                tour_req.remaining_amount = 0
            tour_req.save()

            bank_full_name = BANK_NAMES.get(bank_code.upper(), f"{bank_code} Bank")
            return Response({
                "success": True,
                "tournament_id": str(tour_req.id),
                "booking_id": str(tour_req.id),
                "payment_code": payment_code,
                "amount": amount,
                "total_budget": total_budget,
                "is_deposit": is_deposit,
                "bank_code": bank_code,
                "bank_name": bank_full_name,
                "account_no": account_no,
                "account_name": account_name,
                "qr_url": qr_url,
                "status": tour_req.payment_status
            })

        if not booking_id:
            return Response({"error": "Thiếu mã đơn đặt sân booking_id"}, status=status.HTTP_400_BAD_REQUEST)

        booking = Bookings.objects.filter(id=booking_id).first()
        if not booking:
            return Response({"error": "Không tìm thấy đơn đặt sân"}, status=status.HTTP_404_NOT_FOUND)

        # Số tiền cần thanh toán
        amount = data.get('amount')
        if amount is None:
            amount = booking.total_price or 0
        try:
            amount = int(float(amount))
        except (ValueError, TypeError):
            amount = int(float(booking.total_price or 0))

        # Mã thanh toán ngắn gọn: BK + 8 ký tự đầu của booking_id (In hoa)
        short_id = str(booking.id)[:8].upper()
        payment_code = f"BK{short_id}"

        # Cấu hình tài khoản ngân hàng từ .env
        bank_code = os.environ.get('BANK_CODE', 'VCB').strip()
        account_no = os.environ.get('BANK_ACCOUNT_NO', '9974090779').strip()
        account_name = os.environ.get('BANK_ACCOUNT_NAME', 'TRUONG DINH BAC').strip()

        # Tạo link ảnh mã VietQR chuẩn Napas 24/7 (img.vietqr.io)
        safe_acc_name = urllib.parse.quote(account_name)
        safe_content = urllib.parse.quote(payment_code)
        qr_url = f"https://qr.sepay.vn/img?acc={account_no}&bank={bank_code}&amount={amount}&des={safe_content}&template=compact"

        # Tạo hoặc cập nhật bản ghi Payments
        pending_val = get_status_val('pending')
        is_deposit = amount < int(float(booking.total_price or 0))
        pm_name = 'Đặt cọc 50% (SePay)' if is_deposit else 'Chuyển khoản SePay'

        payment, created = Payments.objects.get_or_create(
            booking=booking,
            defaults={
                'id': uuid.uuid4(),
                'customer': booking.customer,
                'amount': amount,
                'payment_method': pm_name,
                'status': pending_val,
                'transaction_id': payment_code,
                'payment_date': None
            }
        )
        if not created:
            payment.amount = amount
            payment.payment_method = pm_name
            payment.transaction_id = payment_code
            if str(payment.status).lower() not in ['paid', 'completed', 'success']:
                payment.status = pending_val
            payment.save()

        bank_full_name = BANK_NAMES.get(bank_code.upper(), f"{bank_code} Bank")

        return Response({
            "success": True,
            "payment_id": str(payment.id),
            "booking_id": str(booking.id),
            "payment_code": payment_code,
            "amount": amount,
            "bank_code": bank_code,
            "bank_name": bank_full_name,
            "account_no": account_no,
            "account_name": account_name,
            "qr_url": qr_url,
            "status": payment.status
        })

    except Exception as e:
        print("Lỗi tạo thanh toán QR:", str(e))
        return Response({"error": f"Lỗi hệ thống: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def check_payment_status(request, booking_id):
    """
    API kiểm tra trạng thái thanh toán theo booking_id hoặc tournament_id (Frontend Polling mỗi 2-3s)
    """
    try:
        # Kiểm tra nếu là giải đấu (Tournament Request)
        tour_req = TournamentRequests.objects.filter(id=booking_id).first()
        if tour_req:
            p_status = str(tour_req.payment_status or "Unpaid").strip().lower()
            is_completed = p_status in ['paid', 'completed', 'deposit_paid', 'partial_paid']
            return Response({
                "tournament_id": str(tour_req.id),
                "booking_id": str(tour_req.id),
                "tournament_status": tour_req.status,
                "booking_status": tour_req.status,
                "payment_status": tour_req.payment_status,
                "is_paid": is_completed,
                "amount": float(tour_req.paid_amount or tour_req.deposit_amount or tour_req.estimated_budget or 0),
                "remaining_amount": float(tour_req.remaining_amount or 0)
            })

        booking = Bookings.objects.filter(id=booking_id).first()
        if not booking:
            return Response({"error": "Không tìm thấy đơn đặt sân hoặc giải đấu"}, status=status.HTTP_404_NOT_FOUND)

        payment = Payments.objects.filter(booking=booking).order_by('-payment_date').first()

        is_completed = False
        if payment and str(payment.status).strip().lower() in ['completed', 'success', 'paid']:
            is_completed = True

        return Response({
            "booking_id": str(booking.id),
            "booking_status": booking.status,
            "payment_status": payment.status if payment else "Pending",
            "is_paid": is_completed,
            "amount": float(payment.amount) if payment else float(booking.total_price or 0)
        })

    except Exception as e:
        print("Lỗi kiểm tra trạng thái thanh toán:", str(e))
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def sepay_webhook(request):
    """
    Endpoint tiếp nhận Webhook biến động số dư từ SePay
    Tự động nhận diện thanh toán dựa trên nội dung chuyển khoản chứa mã đơn 'BK...'
    """
    try:
        payload = request.data
        print("--- [SEPAY WEBHOOK RECEIVED] ---")
        print(payload)

        # Lấy các trường thông tin từ payload của SePay
        transfer_type = str(payload.get('transferType', '')).lower()
        if transfer_type and transfer_type != 'in':
            # Chỉ xử lý tiền vào (in)
            return Response({"success": True, "message": "Bỏ qua giao dịch tiền ra"}, status=status.HTTP_200_OK)

        content = str(payload.get('content') or payload.get('description') or '')
        transfer_amount = payload.get('transferAmount') or 0
        sepay_transaction_id = str(payload.get('id') or payload.get('referenceCode') or '')

        # 1. Kiểm tra nếu là giải đấu (mã TR...)
        match_tr = re.search(r'TR[_\-]?([A-Za-z0-9]{6,12})', content, re.IGNORECASE)
        if match_tr:
            matched_code = match_tr.group(1).upper()
            target_tour = None
            for t in TournamentRequests.objects.all().order_by('-created_at')[:100]:
                if str(t.id).replace('-', '').upper().startswith(matched_code) or str(t.id)[:8].upper() == matched_code:
                    target_tour = t
                    break
            if target_tour:
                now = timezone.now()
                total = float(target_tour.estimated_budget or 0)
                is_deposit = (target_tour.payment_method == 'deposit')
                amt = float(transfer_amount or (round(total * 0.5) if is_deposit else total))

                target_tour.payment_status = 'Deposit_Paid' if is_deposit else 'Paid'
                target_tour.paid_amount = amt
                target_tour.remaining_amount = max(0, total - amt) if is_deposit else 0
                target_tour.transaction_id = sepay_transaction_id or f"TR{matched_code}"
                target_tour.payment_date = now
                target_tour.save()

                print(f"XÁC THỰC THÀNH CÔNG: Giải đấu {target_tour.id} ({target_tour.tournament_name}) đã thanh toán {amt}đ qua SePay!")
                return Response({
                    "success": True,
                    "message": f"Xác nhận thanh toán giải đấu '{target_tour.tournament_name}' thành công!",
                    "tournament_id": str(target_tour.id),
                    "payment_status": target_tour.payment_status,
                    "paid_amount": target_tour.paid_amount
                }, status=status.HTTP_200_OK)

        # 2. Tìm mã đơn BK... trong nội dung chuyển khoản (Ví dụ: BK9F8A12 hoặc BK-9F8A12)
        # Hỗ trợ cả BK in hoa lẫn thường, độ dài từ 6 đến 12 ký tự hex/alphanumeric
        match = re.search(r'BK[_\-]?([A-Za-z0-9]{6,12})', content, re.IGNORECASE)
        
        target_booking = None
        matched_code = ""

        if match:
            matched_code = match.group(1).upper()
            # Tìm booking có UUID bắt đầu bằng matched_code
            for b in Bookings.objects.all().order_by('-created_at')[:100]:
                if str(b.id).replace('-', '').upper().startswith(matched_code) or str(b.id)[:8].upper() == matched_code:
                    target_booking = b
                    break

        # Nếu không match regex, thử tìm booking qua payment.transaction_id có trong content
        if not target_booking:
            payments = Payments.objects.filter(status='Pending').order_by('-id')[:50]
            for p in payments:
                if p.transaction_id and p.transaction_id.upper() in content.upper():
                    target_booking = p.booking
                    matched_code = p.transaction_id
                    break

        if not target_booking:
            print(f"Không tìm thấy đơn đặt sân phù hợp với nội dung: '{content}'")
            return Response({
                "success": False,
                "message": f"Không tìm thấy mã đơn đặt sân trong nội dung: '{content}'"
            }, status=status.HTTP_200_OK)

        # Cập nhật Payment
        payment = Payments.objects.filter(booking=target_booking).first()
        now = timezone.now()
        paid_val = get_status_val('completed')

        if not payment:
            payment = Payments.objects.create(
                id=uuid.uuid4(),
                booking=target_booking,
                customer=target_booking.customer,
                amount=transfer_amount or target_booking.total_price or 0,
                payment_method='Chuyển khoản SePay',
                status=paid_val,
                transaction_id=sepay_transaction_id or matched_code,
                payment_date=now
            )
        else:
            payment.status = paid_val
            payment.transaction_id = sepay_transaction_id or payment.transaction_id or matched_code
            payment.payment_date = now
            payment.save()

        # Cập nhật Booking trạng thái Confirmed
        target_booking.status = 'Confirmed'
        target_booking.save(update_fields=['status'])

        # Cập nhật TimeSlot thành 'booked' nếu chưa
        try:
            from apps.timeslots.models import TimeSlots
            TimeSlots.objects.filter(
                field_id=target_booking.field_id,
                slot_date=target_booking.booking_date,
                start_time=target_booking.start_time
            ).update(status='booked')
            # 🔹 Nếu đơn này thuộc nhóm đặt nhiều khung giờ, xác nhận các đơn còn lại trong nhóm
            if target_booking.notes and '[Mã nhóm:' in target_booking.notes:
                match = re.search(r'\[Mã nhóm:\s*([a-f0-9\-]+)\]', target_booking.notes)
                if match:
                    group_id = match.group(1)
                    siblings = Bookings.objects.filter(notes__contains=f"[Mã nhóm: {group_id}]").exclude(id=target_booking.id)
                    for sib in siblings:
                        sib.status = 'Confirmed'
                        sib.save(update_fields=['status'])
                        TimeSlots.objects.filter(
                            field_id=sib.field_id,
                            slot_date=sib.booking_date,
                            start_time=sib.start_time
                        ).update(status='booked')
        except Exception as ts_e:
            print("Lỗi update timeslot:", ts_e)

        print(f"XÁC THỰC THÀNH CÔNG: Đơn {target_booking.id} đã thanh toán {transfer_amount}đ qua SePay!")

        return Response({
            "success": True,
            "message": "Xác nhận thanh toán thành công",
            "booking_id": str(target_booking.id),
            "payment_id": str(payment.id)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print("Lỗi xử lý SePay webhook:", str(e))
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def simulate_payment_test(request):
    """
    API giả lập thanh toán thành công tức thì (Dành riêng cho Test/Demo đồ án)
    Hỗ trợ cả đơn đặt sân thường lẫn đơn giải đấu.
    """
    try:
        data = request.data
        booking_id = data.get('booking_id')
        tournament_id = data.get('tournament_id') or data.get('tournament_request_id')

        target_tour = None
        if tournament_id:
            target_tour = TournamentRequests.objects.filter(id=tournament_id).first()
        elif booking_id:
            target_tour = TournamentRequests.objects.filter(id=booking_id).first()

        if target_tour:
            now = timezone.now()
            total = float(target_tour.estimated_budget or 0)
            is_deposit = (target_tour.payment_method == 'deposit')
            pay_amt = float(target_tour.deposit_amount or round(total * 0.5)) if is_deposit else total

            target_tour.payment_status = 'Deposit_Paid' if is_deposit else 'Paid'
            target_tour.paid_amount = pay_amt
            target_tour.remaining_amount = max(0, total - pay_amt) if is_deposit else 0
            target_tour.payment_date = now
            target_tour.transaction_id = f"TEST-TR-{uuid.uuid4().hex[:8].upper()}"
            target_tour.save()

            return Response({
                "success": True,
                "message": f"Giả lập thanh toán giải đấu thành công! ({'Đã cọc 50%' if is_deposit else 'Đã trả 100%'})",
                "tournament_id": str(target_tour.id),
                "booking_id": str(target_tour.id),
                "payment_status": target_tour.payment_status,
                "paid_amount": target_tour.paid_amount,
                "remaining_amount": target_tour.remaining_amount
            })

        if not booking_id:
            return Response({"error": "Thiếu booking_id hoặc tournament_id"}, status=status.HTTP_400_BAD_REQUEST)

        booking = Bookings.objects.filter(id=booking_id).first()
        if not booking:
            return Response({"error": "Không tìm thấy đơn đặt sân"}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        paid_val = get_status_val('completed')
        payment, _ = Payments.objects.get_or_create(
            booking=booking,
            defaults={
                'id': uuid.uuid4(),
                'customer': booking.customer,
                'amount': booking.total_price or 0,
                'payment_method': 'SePay (Test Simulation)',
                'status': paid_val,
                'transaction_id': f"TEST-{uuid.uuid4().hex[:8].upper()}",
                'payment_date': now
            }
        )
        payment.status = paid_val
        payment.payment_date = now
        payment.save()

        booking.status = 'Confirmed'
        booking.save(update_fields=['status'])

        # Cập nhật TimeSlot
        try:
            from apps.timeslots.models import TimeSlots
            TimeSlots.objects.filter(
                field_id=booking.field_id,
                slot_date=booking.booking_date,
                start_time=booking.start_time
            ).update(status='booked')

            # 🔹 Nếu đơn này thuộc nhóm đặt nhiều khung giờ, xác nhận các đơn còn lại trong nhóm
            if booking.notes and '[Mã nhóm:' in booking.notes:
                match = re.search(r'\[Mã nhóm:\s*([a-f0-9\-]+)\]', booking.notes)
                if match:
                    group_id = match.group(1)
                    siblings = Bookings.objects.filter(notes__contains=f"[Mã nhóm: {group_id}]").exclude(id=booking.id)
                    for sib in siblings:
                        sib.status = 'Confirmed'
                        sib.save(update_fields=['status'])
                        TimeSlots.objects.filter(
                            field_id=sib.field_id,
                            slot_date=sib.booking_date,
                            start_time=sib.start_time
                        ).update(status='booked')
        except Exception:
            pass

        return Response({
            "success": True,
            "message": "Đã mô phỏng thanh toán thành công!",
            "booking_id": str(booking.id)
        })

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_revenue_analytics(request):
    """
    API Thống kê doanh thu thực tế toàn hệ thống cho trang Admin Revenue
    Hỗ trợ lọc theo:
    - year (mặc định năm hiện tại)
    - month (tùy chọn)
    - field_id (tùy chọn)
    - start_date & end_date (tùy chọn)
    """
    try:
        now = timezone.now()
        current_year = now.year
        current_month = now.month
        today_date = now.date()

        req_year = request.GET.get('year')
        try:
            selected_year = int(req_year) if req_year else current_year
        except ValueError:
            selected_year = current_year

        req_field_id = request.GET.get('field_id')
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')

        # Base query cho Bookings
        bookings_qs = Bookings.objects.select_related('customer', 'field', 'field__field_type').all()

        if req_field_id and req_field_id != 'all':
            bookings_qs = bookings_qs.filter(field_id=req_field_id)

        if start_date_str and end_date_str:
            try:
                bookings_qs = bookings_qs.filter(
                    booking_date__gte=start_date_str,
                    booking_date__lte=end_date_str
                )
            except Exception:
                pass

        # Chỉ tính các đơn đã HOÀN THÀNH ('Completed') vào doanh thu thực tế (theo chuẩn ENUM DB)
        all_completed_bookings = bookings_qs.filter(status='Completed')
        
        # Tổng doanh thu thực tế (chỉ tính đơn hoàn thành)
        total_revenue = all_completed_bookings.aggregate(total=Sum('total_price'))['total'] or 0

        # Doanh thu dự kiến (toàn bộ trừ Cancelled)
        expected_revenue = bookings_qs.exclude(status='Cancelled').aggregate(total=Sum('total_price'))['total'] or 0

        # Doanh thu hôm nay (chỉ tính đơn hoàn thành hôm nay)
        today_revenue = all_completed_bookings.filter(booking_date=today_date).aggregate(total=Sum('total_price'))['total'] or 0

        # Doanh thu tháng này (chỉ tính đơn hoàn thành trong tháng)
        this_month_completed = all_completed_bookings.filter(
            booking_date__year=current_year,
            booking_date__month=current_month
        )
        this_month_revenue = this_month_completed.aggregate(total=Sum('total_price'))['total'] or 0

        # Doanh thu tháng trước
        last_month = current_month - 1 if current_month > 1 else 12
        last_month_year = current_year if current_month > 1 else current_year - 1
        last_month_completed = all_completed_bookings.filter(
            booking_date__year=last_month_year,
            booking_date__month=last_month
        )
        last_month_revenue = last_month_completed.aggregate(total=Sum('total_price'))['total'] or 0

        # Tỷ lệ tăng trưởng so với tháng trước
        if last_month_revenue > 0:
            growth_pct = round(((float(this_month_revenue) - float(last_month_revenue)) / float(last_month_revenue)) * 100, 1)
        elif this_month_revenue > 0:
            growth_pct = 100.0
        else:
            growth_pct = 0.0

        total_orders_count = bookings_qs.count()
        successful_orders_count = all_completed_bookings.count()
        cancelled_orders_count = bookings_qs.filter(status='Cancelled').count()
        pending_orders_count = bookings_qs.filter(status='Pending').count()

        avg_order_value = round(float(total_revenue) / successful_orders_count) if successful_orders_count > 0 else 0
        total_discount = bookings_qs.aggregate(total=Sum('discount_amount'))['total'] or 0

        # 2. DOANH THU THEO 12 THÁNG TRONG NĂM ĐƯỢC CHỌN (CHỈ TÍNH HOÀN THÀNH)
        year_bookings = all_completed_bookings.filter(booking_date__year=selected_year)
        monthly_stats = []
        max_month_rev = 1

        for m in range(1, 13):
            m_bks = year_bookings.filter(booking_date__month=m)
            m_rev = float(m_bks.aggregate(t=Sum('total_price'))['t'] or 0)
            m_count = m_bks.count()
            if m_rev > max_month_rev:
                max_month_rev = m_rev
            monthly_stats.append({
                'month': m,
                'label': f"T{m}",
                'revenue': m_rev,
                'count': m_count,
                'is_current': (selected_year == current_year and m == current_month),
                'is_future': (selected_year == current_year and m > current_month)
            })

        for item in monthly_stats:
            if max_month_rev > 0 and item['revenue'] > 0:
                pct = max(15, round((item['revenue'] / max_month_rev) * 100))
                item['height'] = f"{pct}%"
            else:
                item['height'] = "8%"

        # 3. CƠ CẤU DOANH THU THEO LOẠI SÂN (DONUT CHART - CHỈ TÍNH HOÀN THÀNH)
        type_agg = {}
        for b in all_completed_bookings:
            ft_name = "Khác"
            if b.field:
                if hasattr(b.field, 'field_type') and b.field.field_type:
                    ft_name = b.field.field_type.name or "Sân tiêu chuẩn"
                elif hasattr(b.field, 'field_name'):
                    fn = str(b.field.field_name).lower()
                    if '5' in fn: ft_name = "Sân 5 người"
                    elif '7' in fn: ft_name = "Sân 7 người"
                    elif '11' in fn: ft_name = "Sân 11 người"
                    else: ft_name = "Sân cỏ nhân tạo"

            val = float(b.total_price or 0)
            if ft_name not in type_agg:
                type_agg[ft_name] = {'name': ft_name, 'revenue': 0, 'count': 0}
            type_agg[ft_name]['revenue'] += val
            type_agg[ft_name]['count'] += 1

        type_list = list(type_agg.values())
        type_list.sort(key=lambda x: x['revenue'], reverse=True)

        type_total_rev = sum(x['revenue'] for x in type_list) or 1
        donut_segments = []
        palette = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']
        offset = 0

        for i, t in enumerate(type_list):
            share = round((t['revenue'] / type_total_rev) * 100)
            donut_segments.append({
                'label': t['name'],
                'revenue': t['revenue'],
                'count': t['count'],
                'pct': f"{share}%",
                'color': palette[i % len(palette)],
                'strokeArray': f"{share} 100",
                'strokeOffset': -offset
            })
            offset += share

        if not donut_segments:
            donut_segments = [
                {'label': 'Sân 5 người', 'revenue': 0, 'count': 0, 'pct': '50%', 'color': '#10b981', 'strokeArray': '50 100', 'strokeOffset': 0},
                {'label': 'Sân 7 người', 'revenue': 0, 'count': 0, 'pct': '35%', 'color': '#3b82f6', 'strokeArray': '35 100', 'strokeOffset': -50},
                {'label': 'Sân 11 người', 'revenue': 0, 'count': 0, 'pct': '15%', 'color': '#f59e0b', 'strokeArray': '15 100', 'strokeOffset': -85},
            ]

        # 4. DANH SÁCH GIAO DỊCH / HÓA ĐƠN GẦN NHẤT
        recent_bookings = bookings_qs.order_by('-booking_date', '-created_at')[:50]
        payments_map = {str(p.booking_id): p for p in Payments.objects.filter(booking__in=recent_bookings)}

        transactions_list = []
        for b in recent_bookings:
            short_code = f"BK{str(b.id)[:8].upper()}"
            cust_name = b.customer.full_name if b.customer else "Khách vãng lai"
            cust_phone = b.customer.phone if b.customer else ""
            p_obj = payments_map.get(str(b.id))

            pm_method = p_obj.payment_method if p_obj else "Tại sân"
            if not pm_method or pm_method.lower() == 'cash':
                pm_method = "Tiền mặt tại sân"
            elif 'vietqr' in pm_method.lower() or 'sepay' in pm_method.lower():
                pm_method = "Chuyển khoản VietQR"

            st_raw = str(b.status).strip()
            if st_raw in ['Completed', 'completed', 'Hoàn thành', 'hoàn thành', 'Đã hoàn thành', 'da hoan thanh']:
                st_class = 'success'
                st_label = 'Đã hoàn thành'
            elif st_raw in ['Confirmed', 'confirmed', 'Checked_in', 'đã xác nhận']:
                st_class = 'info'
                st_label = 'Đã xác nhận'
            elif st_raw in ['Cancelled', 'cancelled', 'Đã hủy', 'da huy']:
                st_class = 'cancelled'
                st_label = 'Đã hủy'
            else:
                st_class = 'pending'
                st_label = 'Chờ xử lý'

            transactions_list.append({
                'id': short_code,
                'full_id': str(b.id),
                'name': cust_name,
                'phone': cust_phone,
                'field': b.field.field_name if b.field else "Sân tiêu chuẩn",
                'date': f"{b.booking_date.strftime('%d/%m/%Y')} - {str(b.start_time)[:5]}",
                'booking_date': str(b.booking_date),
                'price': float(b.total_price or 0),
                'discount': float(b.discount_amount or 0),
                'payment_method': pm_method,
                'status_class': st_class,
                'status_label': st_label,
                'created_at': b.created_at.isoformat() if b.created_at else None
            })

        # Danh sách các năm có giao dịch
        try:
            db_years = set(Bookings.objects.dates('booking_date', 'year').values_list('booking_date__year', flat=True))
        except Exception:
            db_years = set()
        all_years = sorted(list(db_years | {current_year, 2024, 2025, 2026}), reverse=True)

        return Response({
            "success": True,
            "selected_year": selected_year,
            "available_years": all_years,
            "summary": {
                "total_revenue": float(total_revenue),
                "expected_revenue": float(expected_revenue),
                "today_revenue": float(today_revenue),
                "this_month_revenue": float(this_month_revenue),
                "last_month_revenue": float(last_month_revenue),
                "growth_pct": growth_pct,
                "total_orders": total_orders_count,
                "successful_orders": successful_orders_count,
                "cancelled_orders": cancelled_orders_count,
                "pending_orders": pending_orders_count,
                "avg_order_value": avg_order_value,
                "total_discount": float(total_discount)
            },
            "monthly_stats": monthly_stats,
            "donut_segments": donut_segments,
            "transactions": transactions_list
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": f"Lỗi tính toán doanh thu: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

