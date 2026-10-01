import React, { useEffect, useMemo, useState } from 'react';
import { getFields } from '../../api/fieldsApi';
import { SERVER_URL, BASE_URL } from '../../config';
import './AdminScheduleOverview.css';

const currentDate = () => new Date().toLocaleDateString('en-CA');
const active = status => ['pending', 'confirmed', 'checked_in'].includes(String(status).toLowerCase());
const imageUrl = field => field.image_url || (field.image ? `${SERVER_URL}${field.image}` : '');
const hour = time => Number(String(time || '00:00').slice(0, 2));

const BookingServiceRowItems = ({ bookingId }) => {
  const [services, setServices] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${BASE_URL}/services/booking-services/${bookingId}/`);
        const data = await res.json();
        setServices(data || []);
      } catch (err) {
        console.error("Lỗi lấy dịch vụ:", err);
      }
    };
    if (bookingId) fetchServices();
  }, [bookingId]);

  if (services.length === 0) return null;

  return (
    <div className="aso-booking-services">
      {services.map(s => (
        <span key={s.id} className="aso-service-tag">
          {s.service_name}{s.shoe_size ? ` (size ${s.shoe_size})` : ''} x{s.quantity}
        </span>
      ))}
    </div>
  );
};

function Slots({ bookings }) {
  return <div className="aso-availability"><div className="aso-detail-title"><h3>Lịch giờ trong ngày</h3><p><i className="aso-dot booked" />Đã đặt <i className="aso-dot free" />Còn trống</p></div><div className="aso-slot-grid">{Array.from({ length: 16 }, (_, index) => { const start = index + 6; const end = start + 1; const item = bookings.find(b => { const [from, to] = String(b.time || '').split(' - '); return hour(from) < end && hour(to) > start; }); const label = `${String(start).padStart(2, '0')}:00 - ${String(end).padStart(2, '0')}:00`; return <div key={label} className={`aso-slot ${item ? 'booked' : 'free'}`}><strong>{label}</strong><span>{item ? item.name || 'Đã có khách đặt' : 'Còn trống'}</span></div>; })}</div></div>;
}

export default function AdminScheduleOverview({ bookings, onAddBooking, onEditBooking, onDeleteBooking }) {
  const [fields, setFields] = useState([]);
  const [date, setDate] = useState(currentDate());
  const [selected, setSelected] = useState(null);
  useEffect(() => { getFields({ params: { show_all: true } }).then(res => setFields(res.data.fields || res.data || [])).catch(console.error); }, []);
  const schedules = useMemo(() => (bookings || []).filter(b => b.date === date && active(b.status)).reduce((map, b) => ({ ...map, [b.field]: [...(map[b.field] || []), b] }), {}), [bookings, date]);
  const selectedBookings = selected ? schedules[selected.field_name] || [] : [];
  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return <section className="aso-section" id="field-schedule-overview"><div className="aso-heading"><div><p className="aso-eyebrow">TỔNG QUAN THEO SÂN</p><h2>Sân nào đang có lịch?</h2><span>Chọn sân để xem người đặt và các khung giờ còn trống.</span></div><label className="aso-date"><span className="material-symbols-outlined">calendar_today</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label></div><div className="aso-gallery">{fields.map(field => { const items = schedules[field.field_name] || []; return <article className="aso-field-card" key={field.id}><div className="aso-image">{imageUrl(field) ? <img src={imageUrl(field)} alt={field.field_name} /> : <span className="material-symbols-outlined">stadium</span>}<span className={`aso-status ${items.length ? 'booked' : 'free'}`}>{items.length ? `${items.length} lịch đặt` : 'Trống cả ngày'}</span></div><div className="aso-field-info"><h3>{field.field_name || 'Sân chưa đặt tên'}</h3><p><span className="material-symbols-outlined">location_on</span>{field.location || 'Chưa cập nhật địa điểm'}</p><small><span className="material-symbols-outlined">group</span>{items.length ? `${items.length} lượt khách trong ngày` : 'Chưa có lượt đặt'}</small><div className="aso-card-actions"><button className="secondary" type="button" onClick={() => onAddBooking?.(field)}>Thêm lịch</button><button type="button" onClick={() => setSelected(field)}>Xem lịch <span className="material-symbols-outlined">arrow_forward</span></button></div></div></article>; })}</div>{selected && <div className="aso-overlay" onClick={() => setSelected(null)}><div className="aso-modal" onClick={e => e.stopPropagation()}><header><div><p>LỊCH ĐẶT SÂN · {displayDate}</p><h2>{selected.field_name || 'Sân chưa đặt tên'}</h2><span>{selected.location || 'Chưa cập nhật địa điểm'}</span></div><div className="aso-modal-actions"><button className="aso-add-button" type="button" onClick={() => onAddBooking?.(selected)}><span className="material-symbols-outlined">add</span>Thêm lịch</button><button type="button" onClick={() => setSelected(null)}><span className="material-symbols-outlined">close</span></button></div></header><div className="aso-modal-body"><Slots bookings={selectedBookings} /><aside className="aso-customers"><div className="aso-detail-title"><h3>Thông tin người đặt</h3><p>{selectedBookings.length} lượt đặt</p></div>{selectedBookings.length ? selectedBookings.map(b => <div className="aso-customer" key={b.id}><b>{b.name?.charAt(0) || '?'}</b><div><strong>{b.name || 'Khách hàng chưa cập nhật'}</strong><span>{b.phone || 'Chưa có số điện thoại'}</span><small>Mã đơn: BK{b.id?.slice(0, 8).toUpperCase()}</small><BookingServiceRowItems bookingId={b.id} /></div><time><span className="material-symbols-outlined">schedule</span>{b.time}</time><div className="aso-booking-actions"><button type="button" onClick={() => onEditBooking?.(b)}><span className="material-symbols-outlined">edit</span></button><button type="button" onClick={() => onDeleteBooking?.(b.id)}><span className="material-symbols-outlined">delete</span></button></div></div>) : <div className="aso-no-bookings"><span className="material-symbols-outlined">event_available</span><strong>Sân đang trống</strong><p>Chưa có khách đặt sân này trong ngày đã chọn.</p></div>}</aside></div></div></div>}</section>;
}
