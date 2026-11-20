from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import date, datetime
from django.db import models
from .models import PitchCleaning, MaintenanceIssue, LostFoundItem
from .serializers import PitchCleaningSerializer, MaintenanceIssueSerializer, LostFoundItemSerializer


class PitchCleaningViewSet(viewsets.ModelViewSet):
    queryset = PitchCleaning.objects.all()
    serializer_class = PitchCleaningSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        field_id = self.request.query_params.get('field_id')
        status_param = self.request.query_params.get('status')
        if field_id:
            qs = qs.filter(field_id=field_id)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def create(self, request, *args, **kwargs):
        """
        Ngăn chặn tạo bản ghi trùng lặp và đồng bộ trạng thái:
        1. Khi dọn xong (status == 'clean'): Cập nhật bản ghi needs_clean đang chờ của sân này thành clean.
        2. Nếu đã có bản ghi cùng trạng thái và cùng ca trong ngày, cập nhật thay vì sinh thêm bản ghi rác.
        """
        data = request.data
        field_id = data.get('field')
        field_name = data.get('field_name')
        new_status = data.get('status')
        match_time = data.get('cleaned_match_time')
        today = date.today()

        existing = PitchCleaning.objects.filter(created_at__date=today)
        if field_id:
            existing = existing.filter(field_id=field_id)
        elif field_name:
            existing = existing.filter(field_name__iexact=str(field_name).strip())

        # 1. Khi bấm dọn xong (clean): tìm ticket needs_clean của sân hôm nay để chuyển thành clean
        if new_status == 'clean':
            pending = existing.filter(status='needs_clean')
            target_pending = None
            if match_time:
                target_pending = pending.filter(cleaned_match_time=match_time).first()
            if not target_pending:
                target_pending = pending.order_by('-created_at').first()

            if target_pending:
                serializer = self.get_serializer(target_pending, data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)

        # 2. Nếu đã có cùng status và ca đá hôm nay
        status_existing = existing.filter(status=new_status)
        if match_time:
            match_existing = status_existing.filter(cleaned_match_time=match_time).first()
            if match_existing:
                serializer = self.get_serializer(match_existing, data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        field = serializer.validated_data.get('field')
        field_name = serializer.validated_data.get('field_name')
        if not field and field_name:
            from apps.fields.models import FootballFields
            matched = FootballFields.objects.filter(field_name__iexact=str(field_name).strip()).first()
            if matched:
                serializer.save(field=matched)
                return
        elif field and not field_name:
            serializer.save(field_name=field.field_name)
            return
        serializer.save()

    @action(detail=False, methods=['get'])
    def current_status(self, request):
        """
        Lấy trạng thái dọn dẹp mới nhất của từng sân bóng
        """
        records = PitchCleaning.objects.order_by('field_id', '-created_at').distinct('field_id')
        serializer = self.get_serializer(records, many=True)
        return Response(serializer.data)


class MaintenanceIssueViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceIssue.objects.all()
    serializer_class = MaintenanceIssueSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        field_id = self.request.query_params.get('field_id')
        year = self.request.query_params.get('year')
        if status_param:
            qs = qs.filter(status=status_param)
        if priority:
            qs = qs.filter(priority=priority)
        if field_id and field_id != 'all':
            qs = qs.filter(field_id=field_id)
        if year:
            qs = qs.filter(created_at__year=year)
        return qs

    def perform_create(self, serializer):
        field = serializer.validated_data.get('field')
        field_name = serializer.validated_data.get('field_name')
        if not field and field_name:
            from apps.fields.models import FootballFields
            matched = FootballFields.objects.filter(field_name__iexact=field_name.strip()).first()
            if matched:
                serializer.save(field=matched)
                return
        elif field and not field_name:
            serializer.save(field_name=field.field_name)
            return
        serializer.save()

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status in ['done', 'resolved']:
            if not instance.resolved_at:
                instance.resolved_at = datetime.now()
                instance.save(update_fields=['resolved_at'])
        else:
            if instance.resolved_at:
                instance.resolved_at = None
                instance.save(update_fields=['resolved_at'])

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        issue = self.get_object()
        new_status = request.data.get('status')
        cost = request.data.get('cost')
        estimated_cost = request.data.get('estimated_cost') or request.data.get('estimatedCost')

        if new_status:
            issue.status = new_status
            if new_status in ['done', 'resolved']:
                if not issue.resolved_at:
                    issue.resolved_at = datetime.now()
            else:
                issue.resolved_at = None
        if cost is not None:
            issue.cost = cost
        if estimated_cost is not None:
            issue.estimated_cost = estimated_cost

        issue.save()
        return Response(self.get_serializer(issue).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Thống kê tổng chi phí bảo trì thực tế, chi phí dự kiến, số lượng phiếu
        """
        qs = self.get_queryset()
        total_actual_cost = qs.filter(status__in=['done', 'resolved']).aggregate(total=models.Sum('cost'))['total'] or 0
        total_estimated_cost = qs.aggregate(total=models.Sum('estimated_cost'))['total'] or 0
        total_tickets = qs.count()
        done_tickets = qs.filter(status__in=['done', 'resolved']).count()
        fixing_tickets = qs.filter(status='fixing').count()
        pending_tickets = qs.filter(status='pending').count()

        return Response({
            'total_actual_cost': float(total_actual_cost),
            'total_estimated_cost': float(total_estimated_cost),
            'total_tickets': total_tickets,
            'done_tickets': done_tickets,
            'fixing_tickets': fixing_tickets,
            'pending_tickets': pending_tickets,
        })


class LostFoundItemViewSet(viewsets.ModelViewSet):
    queryset = LostFoundItem.objects.all()
    serializer_class = LostFoundItemSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        query = self.request.query_params.get('q')

        if status_param:
            qs = qs.filter(status=status_param)
        if query:
            qs = qs.filter(
                models.Q(item_type__icontains=query) |
                models.Q(description__icontains=query) |
                models.Q(field_name__icontains=query) |
                models.Q(guest_info__icontains=query) |
                models.Q(customer_phone__icontains=query)
            )
        return qs

    @action(detail=True, methods=['post', 'patch'])
    def toggle_status(self, request, pk=None):
        item = self.get_object()
        new_status = request.data.get('status')
        return_note = request.data.get('returnNote') or request.data.get('return_note')

        if new_status:
            item.status = new_status
        else:
            item.status = 'returned' if item.status != 'returned' else 'pending'

        if return_note is not None:
            item.return_note = return_note

        if item.status == 'returned' and not item.returned_at:
            now = datetime.now()
            item.returned_at = now.strftime("%H:%M %d/%m/%Y")

        item.save()
        return Response(self.get_serializer(item).data)
