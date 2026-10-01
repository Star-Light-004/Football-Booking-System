import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getBookings } from '../../../api/bookingsApi';
import { getFields } from '../../../api/fieldsApi';
import { SERVER_URL } from '../../../config';
import './bookings.css';
import './BookingCalendar.css';

const todayValue = () => new Date().toLocaleDateString('en-CA');
const activeBooking = (status) => ['pending', 'confirmed', 'checked_in'].includes(String(status).toLowerCase());
const navLinks = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' }, { icon: 'stadium', label: 'Fields', path: '/admin/fields' },
  { icon: 'event_available', label: 'Bookings', path: '/admin/bookings' }, { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'payments', label: 'Revenue', path: '/admin/revenue' }, { icon: 'calendar_month', label: 'Time Slots', path: '/admin/timeslots' },
  { icon: 'inventory_2', label: 'Services', path: '/admin/services' }, { icon: 'settings', label: 'Settings', path: '/admin/settings' },
];

const imageUrl = (field) => field.image_url || (field.image ? `${SERVER_URL}${field.image}` : '');
const hour = (time) => Number(String(time || '00:00').slice(0, 2));

function AdminSidebar() {
  const location = useLocation();
  return <aside className="sidebar"><div className="sidebar-logo"><h1>Pitch &amp; Pulse</h1><p>Admin Console</p></div><nav className="sidebar-nav">
    {navLinks.map(({ icon, label, path }) => <Link key={label} to={path} className={`nav-link ${path === '/admin/bookings' ? 'active' : location.pathname === path ? 'active' : ''}`}><span className="material-symbols-outlined">{icon}</span><span>{label}</span></Link>)}
  </nav><div className="sidebar-profile"><div className="sidebar-profile-inner"><div><p className="profile-name">Admin</p><p className="profile-role">Super Admin</p></div></div></div></aside>;
}

function TimeAvailability({ bookings }) {
  const slots = Array.from({ length: 16 }, (_, index) => {
    const start = index + 6;
    const end = start + 1;
    const booking = bookings.find(item => hour(item.time?.split(' - ')[0]) < end && hour(item.time?.split(' - ')[1]) > start);
    return { label: `${String(start).padStart(2, '0')}:00 - ${String(end).padStart(2, '0')}:00`, booking };
  });
  return <div className="availability-section"><div className="detail-section-heading"><h3>Khung giờ trong ngày</h3><p><span className="legend booked" />Đã đặt <span className="legend free" />Còn trống</p></div><div className="availability-grid">
    {slots.map(slot => <div className={`time-slot ${slot.booking ? 'booked' : 'free'}`} key={slot.label}><span>{slot.label}</span><small>{slot.booking ? (slot.booking.name || 'Đã có khách đặt') : 'Trống'}</small></div>)}
  </div></div>;
}

export default function BookingCalendar() {
  const [date, setDate] = useState(todayValue());
  const [fields, setFields] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getFields({ params: { show_all: true } }), getBookings()])
      .then(([fieldsRes, bookingsRes]) => {
        setFields(fieldsRes.data.fields || fieldsRes.data || []);
        setBookings(bookingsRes.data || []);
      })
      .catch(() => setError('Không thể tải dữ liệu lịch đặt sân. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, []);

  const schedule = useMemo(() => bookings.filter(item => item.date === date && activeBooking(item.status)).reduce((result, item) => ({ ...result, [item.field]: [...(result[item.field] || []), item] }), {}), [bookings, date]);
  const selectedField = fields.find(field => field.id === selectedFieldId);
  const selectedBookings = selectedField ? (schedule[selectedField.field_name] || []) : [];
  const bookedFieldCount = fields.filter(field => schedule[field.field_name]?.length).length;
  const displayDate = date && new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return <><AdminSidebar /><main className="booking-calendar-page"><div className="booking-calendar-content">
    <Link className="back-to-bookings" to="/admin/bookings"><span className="material-symbols-outlined">arrow_back</span>Quay lại quản lý đặt sân</Link>
    <header className="calendar-header"><div><h1>Lịch đặt sân</h1><p>Chọn sân để xem người đặt, khung giờ đã kín và giờ còn trống.</p></div><label className="calendar-date-input"><span className="material-symbols-outlined">calendar_today</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label></header>
    <section className="calendar-summary"><div><span>Ngày đang xem</span><strong>{displayDate}</strong></div><div><span>Sân đã có lịch</span><strong>{bookedFieldCount} / {fields.length} sân</strong></div><div><span>Sân còn trống cả ngày</span><strong className="available-text">{fields.length - bookedFieldCount} sân</strong></div></section>
    {loading && <p className="calendar-message">Đang tải lịch đặt sân...</p>}{error && <p className="calendar-message error">{error}</p>}
    {!loading && !error && <><section className="field-gallery-heading"><div><h2>Danh sách sân</h2><p>Nhấn vào một sân để xem lịch chi tiết.</p></div><span>{fields.length} sân</span></section><section className="field-gallery">
      {fields.map(field => { const fieldBookings = schedule[field.field_name] || []; const selected = field.id === selectedFieldId; return <button type="button" key={field.id} onClick={() => setSelectedFieldId(field.id)} className={`field-image-card ${selected ? 'selected' : ''}`}>
        <div className="field-image-wrap">{imageUrl(field) ? <img src={imageUrl(field)} alt={field.field_name} /> : <div className="field-image-placeholder"><span className="material-symbols-outlined">stadium</span></div>}<span className={`field-image-status ${fieldBookings.length ? 'booked' : 'free'}`}>{fieldBookings.length ? `${fieldBookings.length} lịch đặt` : 'Trống cả ngày'}</span></div>
        <div className="field-image-info"><strong>{field.field_name}</strong><span>{field.location || 'Chưa cập nhật địa điểm'}</span><small>{fieldBookings.length ? `${fieldBookings.length} khung giờ có khách` : 'Có thể nhận đặt sân'}</small></div>
      </button>; })}
      {!fields.length && <p className="calendar-message">Chưa có sân nào trong hệ thống.</p>}
    </section>
    {selectedField && <section className="field-detail-panel"><div className="selected-field-title"><div>{imageUrl(selectedField) ? <img src={imageUrl(selectedField)} alt="" /> : <span className="material-symbols-outlined">stadium</span>}<div><p>Lịch chi tiết</p><h2>{selectedField.field_name}</h2><span>{selectedField.location || 'Chưa cập nhật địa điểm'} · {displayDate}</span></div></div><button type="button" onClick={() => setSelectedFieldId(null)} aria-label="Đóng lịch chi tiết"><span className="material-symbols-outlined">close</span></button></div>
      <div className="detail-layout"><TimeAvailability bookings={selectedBookings} /><div className="customer-bookings"><div className="detail-section-heading"><h3>Người đã đặt sân</h3><p>{selectedBookings.length} lượt đặt</p></div>{selectedBookings.length ? selectedBookings.map(booking => <div className="customer-booking" key={booking.id}><div className="customer-avatar">{booking.name?.charAt(0) || '?'}</div><div><strong>{booking.name || 'Khách hàng chưa cập nhật'}</strong><span>{booking.phone || 'Chưa có số điện thoại'}</span></div><p><span className="material-symbols-outlined">schedule</span>{booking.time}</p></div>) : <div className="no-bookings"><span className="material-symbols-outlined">event_available</span><strong>Sân trống cả ngày</strong><p>Chưa có khách đặt sân này vào ngày đã chọn.</p></div>}</div></div>
    </section>}</>}
  </div></main></>;
}
