import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBookings } from '../../../api/bookingsApi';
import { getFields } from '../../../api/fieldsApi';
import timeslotsApi from '../../../api/timeslotsApi';
import { SERVER_URL } from '../../../config';
import AdminSidebar from '../../../components/AdminSidebar/AdminSidebar';
import './bookings.css';
import './BookingCalendar.css';

const todayValue = () => new Date().toLocaleDateString('en-CA');
const activeBooking = (status) => ['pending', 'confirmed', 'checked_in', 'completed'].includes(String(status).toLowerCase());
const statusLabel = (status) => ({
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', checked_in: 'Đã check-in',
  completed: 'Hoàn thành', cancelled: 'Đã hủy'
})[String(status).toLowerCase()] || status;
const statusBadgeClass = (status) => ({
  pending: 'cal-badge-pending', confirmed: 'cal-badge-confirmed',
  checked_in: 'cal-badge-checkin', completed: 'cal-badge-completed', cancelled: 'cal-badge-cancelled'
})[String(status).toLowerCase()] || '';


const imageUrl = (field) => field.image_url || (field.image ? `${SERVER_URL}${field.image}` : '');
const hour = (time) => Number(String(time || '00:00').slice(0, 2));

function TimeAvailability({ bookings, timeslots }) {
  // Sắp xếp khung giờ theo thứ tự từ sáng đến tối
  const sortedTimeslots = [...(timeslots || [])].sort((a, b) => {
    const timeA = String(a.start_time || '').slice(0, 5);
    const timeB = String(b.start_time || '').slice(0, 5);
    return timeA.localeCompare(timeB);
  });

  const slots = sortedTimeslots.map(slot => {
    const start = slot.start_time?.slice(0, 5) || '';
    const end = slot.end_time?.slice(0, 5) || '';
    const booking = bookings.find(item => hour(item.time?.split(' - ')[0]) < hour(end) && hour(item.time?.split(' - ')[1]) > hour(start));
    let slotStatus = slot.status;
    if (booking) slotStatus = 'booked';
    return { label: `${start} - ${end}`, booking, slotStatus };
  });

  return (
    <div className="availability-section">
      <div className="detail-section-heading">
        <h3>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '6px', color: '#059669' }}>schedule</span>
          Khung giờ trong ngày (sáng → tối)
        </h3>
        <p><span className="legend booked" />Đã đặt <span className="legend free" />Còn trống <span className="legend blocked" />Đã khóa</p>
      </div>
      <div className="availability-grid">
        {slots.length === 0 ? (
          <p className="calendar-message">Không có khung giờ khả dụng cho ngày này</p>
        ) : slots.map(slot => {
          const statusClass = slot.slotStatus === 'booked' ? 'booked' : slot.slotStatus === 'blocked' ? 'blocked' : 'free';
          const statusText = slot.booking ? (slot.booking.name || 'Đã có khách đặt') : slot.slotStatus === 'blocked' ? 'Đã khóa' : 'Trống';
          return (
            <div className={`time-slot ${statusClass}`} key={slot.label}>
              <span>{slot.label}</span>
              <small>{statusText}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function BookingCalendar() {
  const [date, setDate] = useState(todayValue());
  const [fields, setFields] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [timeslots, setTimeslots] = useState([]);
  const [timeslotsLoading, setTimeslotsLoading] = useState(false);
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

  useEffect(() => {
    if (!selectedFieldId || !date) {
      setTimeslots([]);
      return;
    }
    const loadTimeslots = async () => {
      try {
        setTimeslotsLoading(true);
        const res = await timeslotsApi.getByField(selectedFieldId, date);
        setTimeslots(res.data || []);
      } catch (error) {
        console.error("Lỗi tải timeslots:", error);
        setTimeslots([]);
      } finally {
        setTimeslotsLoading(false);
      }
    };
    loadTimeslots();
  }, [selectedFieldId, date]);

  const schedule = useMemo(() => {
    return bookings.filter(item => item.date === date && activeBooking(item.status)).reduce((result, item) => ({
      ...result,
      [item.field]: [...(result[item.field] || []), item]
    }), {});
  }, [bookings, date]);

  // Sắp xếp sân: Sân có nhiều lượt đặt nhất trong ngày được xếp lên đầu
  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => {
      const countA = (schedule[a.field_name] || []).length;
      const countB = (schedule[b.field_name] || []).length;
      if (countB !== countA) {
        return countB - countA; // Sân nhiều lượt đặt hơn lên đầu
      }
      return (a.field_name || '').localeCompare(b.field_name || '');
    });
  }, [fields, schedule]);

  const selectedField = fields.find(field => field.id === selectedFieldId);

  // Sắp xếp danh sách đặt sân của sân được chọn theo thứ tự từ sáng đến tối
  const selectedBookings = useMemo(() => {
    if (!selectedField) return [];
    const list = schedule[selectedField.field_name] || [];
    return [...list].sort((a, b) => {
      const startA = String(a.time || '').split(' - ')[0].trim();
      const startB = String(b.time || '').split(' - ')[0].trim();
      return startA.localeCompare(startB);
    });
  }, [selectedField, schedule]);

  const bookedFieldCount = fields.filter(field => schedule[field.field_name]?.length).length;
  const displayDate = date && new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <>
      <AdminSidebar />
      <main className="booking-calendar-page">
        <div className="booking-calendar-content">
          <Link className="back-to-bookings" to="/admin/bookings">
            <span className="material-symbols-outlined">arrow_back</span>Quay lại quản lý đặt sân
          </Link>
          <header className="calendar-header">
            <div>
              <h1>Lịch đặt sân</h1>
              <p>Sân có nhiều lượt đặt nhất trong ngày được tự động ưu tiên xếp lên đầu.</p>
            </div>
            <label className="calendar-date-input">
              <span className="material-symbols-outlined">calendar_today</span>
              <input type="date" value={date} onChange={event => setDate(event.target.value)} />
            </label>
          </header>
          <section className="calendar-summary">
            <div><span>Ngày đang xem</span><strong>{displayDate}</strong></div>
            <div><span>Sân đã có lịch</span><strong>{bookedFieldCount} / {fields.length} sân</strong></div>
            <div><span>Sân còn trống cả ngày</span><strong className="available-text">{fields.length - bookedFieldCount} sân</strong></div>
          </section>
          {loading && <p className="calendar-message">Đang tải lịch đặt sân...</p>}
          {error && <p className="calendar-message error">{error}</p>}
          {!loading && !error && (
            <>
              <section className="field-gallery-heading">
                <div>
                  <h2>Danh sách sân</h2>
                  <p>Sân nhiều đơn đặt nhất đứng đầu • Nhấn vào sân để xem lịch chi tiết từ sáng đến tối.</p>
                </div>
                <span>{fields.length} sân</span>
              </section>
              <section className="field-gallery">
                {sortedFields.map((field, idx) => {
                  const fieldBookings = schedule[field.field_name] || [];
                  const selected = field.id === selectedFieldId;
                  const isTop = fieldBookings.length > 0 && idx === 0;
                  return (
                    <button
                      type="button"
                      key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`field-image-card ${selected ? 'selected' : ''} ${isTop ? 'top-booked' : ''}`}
                    >
                      <div className="field-image-wrap">
                        {imageUrl(field) ? (
                          <img src={imageUrl(field)} alt={field.field_name} />
                        ) : (
                          <div className="field-image-placeholder">
                            <span className="material-symbols-outlined">stadium</span>
                          </div>
                        )}
                        {isTop && <span className="aso-top-tag">🔥 Đặt nhiều nhất ({fieldBookings.length})</span>}
                        <span className={`field-image-status ${fieldBookings.length ? 'booked' : 'free'}`}>
                          {fieldBookings.length ? `${fieldBookings.length} lịch đặt` : 'Trống cả ngày'}
                        </span>
                      </div>
                      <div className="field-image-info">
                        <strong>{field.field_name}</strong>
                        <span>{field.location || 'Chưa cập nhật địa điểm'}</span>
                        <small>{fieldBookings.length ? `${fieldBookings.length} khung giờ có khách` : 'Có thể nhận đặt sân'}</small>
                      </div>
                    </button>
                  );
                })}
                {!fields.length && <p className="calendar-message">Chưa có sân nào trong hệ thống.</p>}
              </section>
              {selectedField && (
                <section className="field-detail-panel">
                  <div className="selected-field-title">
                    <div>
                      {imageUrl(selectedField) ? (
                        <img src={imageUrl(selectedField)} alt="" />
                      ) : (
                        <span className="material-symbols-outlined">stadium</span>
                      )}
                      <div>
                        <p>Lịch chi tiết (từ sáng đến tối)</p>
                        <h2>{selectedField.field_name}</h2>
                        <span>{selectedField.location || 'Chưa cập nhật địa điểm'} · {displayDate}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelectedFieldId(null)} aria-label="Đóng lịch chi tiết">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="detail-layout">
                    <TimeAvailability bookings={selectedBookings} timeslots={timeslots} />
                    <div className="customer-bookings">
                      <div className="detail-section-heading">
                        <h3>
                          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '6px', color: '#059669' }}>schedule</span>
                          Người đã đặt sân 
                        </h3>
                        <p>{selectedBookings.length} lượt đặt</p>
                      </div>
                      {selectedBookings.length ? (
                        selectedBookings.map(booking => (
                          <div className="customer-booking" key={booking.id}>
                            <div className="customer-avatar">{booking.name?.charAt(0) || '?'}</div>
                            <div>
                              <strong>{booking.name || 'Khách hàng chưa cập nhật'}</strong>
                              <span>{booking.phone || 'Chưa có số điện thoại'}</span>
                            </div>
                            <p><span className="material-symbols-outlined">schedule</span>{booking.time}</p>
                            <span className={`cal-status-badge ${statusBadgeClass(booking.status)}`}>{statusLabel(booking.status)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="no-bookings">
                          <span className="material-symbols-outlined">event_available</span>
                          <strong>Sân trống cả ngày</strong>
                          <p>Chưa có khách đặt sân này vào ngày đã chọn.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
