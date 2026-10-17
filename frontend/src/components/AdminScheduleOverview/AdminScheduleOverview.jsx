import React, { useEffect, useMemo, useState } from 'react';
import { getFields } from '../../api/fieldsApi';
import timeslotsApi from '../../api/timeslotsApi';
import { SERVER_URL, BASE_URL } from '../../config';
import './AdminScheduleOverview.css';

const currentDate = () => new Date().toLocaleDateString('en-CA');
const statusMap = {
  Confirmed: "Đã xác nhận",
  Cancelled: "Đã hủy",
  Pending: "Chờ xác nhận",
  Completed: "Hoàn thành",
  Checked_in: "Đã check-in"
};
const imageUrl = field => field.image_url || (field.image ? `${SERVER_URL}${field.image}` : '');
const hour = time => Number(String(time || '00:00').slice(0, 2));

function Services({ bookingId }) {
  const [items, setItems] = useState([]);
  useEffect(() => { if (bookingId) fetch(`${BASE_URL}/services/booking-services/${bookingId}/`).then(r => r.json()).then(d => setItems(d || [])).catch(console.error); }, [bookingId]);
  return items.length ? <div className="aso-booking-services">{items.map(s => <span key={s.id} className="aso-service-tag">{s.service_name}{s.shoe_size ? ` (size ${s.shoe_size})` : ''} x{s.quantity}</span>)}</div> : null;
}

function Slots({ bookings, timeslots }) {
  // Sắp xếp khung giờ theo thứ tự từ sáng đến tối (thời gian bắt đầu sớm nhất xếp trước)
  const sortedTimeslots = [...(timeslots || [])].sort((a, b) => {
    const timeA = String(a.start_time || '').slice(0, 5);
    const timeB = String(b.start_time || '').slice(0, 5);
    return timeA.localeCompare(timeB);
  });

  const slots = sortedTimeslots.map(slot => {
    const start = slot.start_time?.slice(0, 5) || '';
    const end = slot.end_time?.slice(0, 5) || '';
    const item = bookings.find(b => { const [from, to] = String(b.time || '').split(' - '); return hour(from) < hour(end) && hour(to) > hour(start); });
    const label = `${start} - ${end}`;
    // Determine slot status based on timeslot status and booking
    let slotStatus = slot.status; // available, booked, blocked
    if (item) slotStatus = 'booked'; // Override with booking if exists
    return { label, item, slotStatus };
  });
  return (
    <div className="aso-availability">
      <div className="aso-detail-title">
        <h3>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '6px', color: '#059669' }}>schedule</span>
          Khung giờ trong ngày 
        </h3>
        <p><i className="aso-dot booked" />Đã đặt <i className="aso-dot free" />Còn trống <i className="aso-dot blocked" />Đã khóa</p>
      </div>
      <div className="aso-slot-grid">
        {slots.length === 0 ? <p className="aso-empty-message">Không có khung giờ khả dụng cho ngày này</p> : slots.map(slot => {
          const statusClass = slot.slotStatus === 'booked' ? 'booked' : slot.slotStatus === 'blocked' ? 'blocked' : 'free';
          const statusText = slot.slotStatus === 'booked' ? (slot.item?.name || 'Đã có khách đặt') : slot.slotStatus === 'blocked' ? 'Đã khóa' : 'Còn trống';
          return (
            <div key={slot.label} className={`aso-slot ${statusClass}`}>
              <strong>{slot.label}</strong>
              <span>{statusText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const statusLabel = (status) => ({
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', checked_in: 'Đã check-in',
  completed: 'Hoàn thành', cancelled: 'Đã hủy'
})[String(status).toLowerCase()] || status;

const statusBadgeClass = (status) => ({
  pending: 'cal-badge-pending', confirmed: 'cal-badge-confirmed',
  checked_in: 'cal-badge-checkin', completed: 'cal-badge-completed', cancelled: 'cal-badge-cancelled'
})[String(status).toLowerCase()] || '';

const formatTime = (time) => {
  if (!time) return '';
  const parts = String(time).split(' - ');
  if (parts.length === 2) {
    const format = (t) => String(t || '').slice(0, 5).replace(':', 'h');
    return `${format(parts[0])} - ${format(parts[1])}`;
  }
  return String(time).slice(0, 5).replace(':', 'h');
};

export default function AdminScheduleOverview({ bookings, onAddBooking, onEditBooking, onDeleteBooking }) {
  const [fields, setFields] = useState([]);
  const [date, setDate] = useState(currentDate());
  const [selected, setSelected] = useState(null);
  const [timeslots, setTimeslots] = useState([]);
  const [timeslotsLoading, setTimeslotsLoading] = useState(false);

  useEffect(() => { getFields({ params: { show_all: true } }).then(r => setFields(r.data.fields || r.data || [])).catch(console.error); }, []);

  useEffect(() => {
    if (!selected || !date) {
      setTimeslots([]);
      return;
    }
    const loadTimeslots = async () => {
      try {
        setTimeslotsLoading(true);
        const res = await timeslotsApi.getByField(selected.id, date);
        setTimeslots(res.data || []);
      } catch (error) {
        console.error("Lỗi tải timeslots:", error);
        setTimeslots([]);
      } finally {
        setTimeslotsLoading(false);
      }
    };
    loadTimeslots();
  }, [selected, date]);

  const schedules = useMemo(() => (bookings || []).filter(b => b.date === date).reduce((map, b) => ({ ...map, [b.field]: [...(map[b.field] || []), b] }), {}), [bookings, date]);
  const totalSchedules = useMemo(() => (bookings || []).filter(b => b.date === date).reduce((map, b) => ({ ...map, [b.field]: (map[b.field] || 0) + 1 }), {}), [bookings, date]);

  // Sắp xếp sân: Sân nào có càng nhiều lượt đặt trong ngày thì xếp lên đầu
  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => {
      const countA = (schedules[a.field_name] || []).length;
      const countB = (schedules[b.field_name] || []).length;
      if (countB !== countA) {
        return countB - countA; // Sân nhiều lượt đặt hơn lên đầu
      }
      return (a.field_name || '').localeCompare(b.field_name || '');
    });
  }, [fields, schedules]);

  // Sắp xếp danh sách đặt sân của sân được chọn theo thứ tự từ sáng đến tối
  const selectedBookings = useMemo(() => {
    if (!selected) return [];
    const list = schedules[selected.field_name] || [];
    return [...list].sort((a, b) => {
      const getStartTime = (booking) => {
        const timeStr = String(booking.time || '').trim();
        const startPart = timeStr.split(' - ')[0] || timeStr;
        return startPart.slice(0, 5);
      };
      return getStartTime(a).localeCompare(getStartTime(b));
    });
  }, [selected, schedules]);

  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const openEdit = booking => { setSelected(null); onEditBooking?.(booking); };

  return (
    <section className="aso-section" id="field-schedule-overview">
      <div className="aso-heading">
        <div>
          <p className="aso-eyebrow">TỔNG QUAN THEO SÂN</p>
          <h2>Sân nào đang có lịch?</h2>
          <span>Sân có nhiều lượt đặt nhất trong ngày được tự động ưu tiên xếp lên đầu.</span>
        </div>
        <label className="aso-date">
          <span className="material-symbols-outlined">calendar_today</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
      </div>

      <div className="aso-gallery">
        {sortedFields.map((field, idx) => {
          const items = schedules[field.field_name] || [];
          const totalCount = totalSchedules[field.field_name] || 0;
          const isTop = items.length > 0 && idx === 0;
          return (
            <article className={`aso-field-card ${isTop ? 'top-booked' : ''}`} key={field.id}>
              <div className="aso-image">
                {imageUrl(field) ? <img src={imageUrl(field)} alt={field.field_name} /> : <span className="material-symbols-outlined">stadium</span>}
                {isTop && <span className="aso-top-tag">🔥 Đặt nhiều nhất ({items.length})</span>}
                <span className={`aso-status ${items.length ? 'booked' : 'free'}`}>{items.length ? `${items.length} lịch đặt` : 'Trống cả ngày'}</span>
              </div>
              <div className="aso-field-info">
                <h3>{field.field_name || 'Sân chưa đặt tên'}</h3>
                <p><span className="material-symbols-outlined">location_on</span>{field.location || 'Chưa cập nhật địa điểm'}</p>
                <small><span className="material-symbols-outlined">group</span>{items.length ? `${items.length} lượt khách trong ngày` : 'Chưa có lượt đặt'}</small>
                <small className="aso-total-count"><span className="material-symbols-outlined">event_note</span>Tổng lượt đặt hôm nay: <strong>{totalCount}</strong></small>
                <div className="aso-card-actions">
                  <button className="secondary" type="button" onClick={() => onAddBooking?.(field)}>Thêm lịch</button>
                  <button type="button" onClick={() => setSelected(field)}>Xem lịch <span className="material-symbols-outlined">arrow_forward</span></button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {selected && (
        <div className="aso-overlay" onClick={() => setSelected(null)}>
          <div className="aso-modal" onClick={e => e.stopPropagation()}>
            <header>
              <div>
                <p>LỊCH ĐẶT SÂN</p>
                <h2>{selected.field_name}</h2>
                <span>{displayDate}</span>
              </div>
              <button onClick={() => setSelected(null)}><span className="material-symbols-outlined">close</span></button>
            </header>
            <div className="aso-modal-body">
              <Slots bookings={selectedBookings} timeslots={timeslots} />
              <div className="aso-bookings-list">
                <div className="aso-detail-title">
                  <h3>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '6px', color: '#059669' }}>schedule</span>
                    Người đã đặt sân 
                  </h3>
                  <p>{selectedBookings.length} lượt đặt</p>
                </div>
                {selectedBookings.length ? (
                  selectedBookings.map(booking => (
                    <div key={booking.id} className="aso-booking-item">
                      <div className="aso-avatar">{booking.name?.charAt(0) || '?'}</div>
                      <div className="aso-booking-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong>{booking.name || 'Khách hàng chưa cập nhật'}</strong>
                          {booking.is_guest && (
                            <span className="tag-guest" style={{ fontSize: '10px', padding: '1px 5px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>directions_walk</span>
                              Vãng lai
                            </span>
                          )}
                        </div>
                        <span>{booking.phone || 'Chưa có số điện thoại'}</span>
                        <p><span className="material-symbols-outlined">schedule</span>{formatTime(booking.time)}</p>
                        <Services bookingId={booking.id} />
                      </div>
                      <div className="aso-booking-status">
                        <span className={`cal-status-badge ${statusBadgeClass(booking.status)}`}>{statusLabel(booking.status)}</span>
                        <p className="aso-price"><span className="material-symbols-outlined">payments</span>{Number(booking.price || 0).toLocaleString('vi-VN')}đ</p>
                      </div>
                      <div className="aso-actions">
                        <button type="button" onClick={() => openEdit(booking)}><span className="material-symbols-outlined">edit</span>Sửa</button>
                        <button type="button" onClick={() => onDeleteBooking?.(booking.id)}><span className="material-symbols-outlined">delete</span>Xóa</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="aso-empty">
                    <span className="material-symbols-outlined aso-empty-icon">event_available</span>
                    <strong>Sân trống cả ngày</strong>
                    <p>Chưa có khách đặt sân này vào ngày đã chọn.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
