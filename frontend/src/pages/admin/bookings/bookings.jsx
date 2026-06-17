import { Link, useLocation } from "react-router-dom";
import React, { useEffect, useState } from 'react';
import { getBookings, createBooking, updateBooking, deleteBooking } from "../../../api/bookingsApi";
import { getFields } from "../../../api/fieldsApi";
import { getUsers } from "../../../api/usersApi";
import './bookings.css';
/* ── Data ── */
const navLinks = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: 'stadium', label: 'Fields', path: '/admin/fields' },
  { icon: 'event_available', label: 'Bookings', path: '/admin/bookings' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'payments', label: 'Revenue', path: '/admin/revenue' },
  { icon: 'calendar_month', label: 'Time Slots', path: '/admin/timeslots' },
  { icon: 'inventory_2', label: 'Services', path: '/admin/services' },
  { icon: 'settings', label: 'Settings', path: '/admin/settings' },
];
const statusMap = {
  Confirmed: "Đã xác nhận",
  Cancelled: "Đã hủy",
  Pending: "Chờ xác nhận",
  Completed: "Hoàn thành",
  Checked_in: "Đã check-in"
};

const statsCards = [
  {
    chipClass: 'green',
    chip: 'Cần xử lý',
    value: '12 Đơn',
    desc: 'Các lượt đặt đang chờ bạn xác nhận',
    icon: 'pending_actions',
    dark: false,
  },
  {
    chipClass: 'gray',
    chip: 'Thành công',
    value: '89%',
    desc: 'Tỷ lệ xác nhận đơn trong tuần này',
    icon: 'check_circle',
    dark: false,
  },
  {
    chipClass: 'em',
    chip: 'Giờ cao điểm',
    value: '18:00 - 21:00',
    desc: 'Các sân thường được đặt kín chỗ',
    icon: 'rocket_launch',
    dark: true,
  },
];

/* ── Sub-components ── */
function Sidebar() {

  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Pitch & Pulse</h1>
        <p>Admin Console</p>
      </div>

      <nav className="sidebar-nav">
        {navLinks.map(({ icon, label, path }) => (
          <Link
            key={label}
            to={path}
            className={`nav-link ${location.pathname === path ? "active" : ""
              }`}
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-profile">
        <div className="sidebar-profile-inner">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbtTOzZUEspcIZtP_NrcVT_RpRIsxBXVtIHw8I_z9TgtDhtU851BPV7SC_PG4zamnMZ0emALIOpJfCvL4MfAfXJLhkDRRdQcH6A_UDRc5BrAhVSENkXZ9XrrsdW2tWheVauhO0S_7K-mN-e1Pi0zlx4fQSvAsYLRqw3gc2HLoB28R5Uyr5amlw666kMQbXZKr4W9xFKHYwHyKACWk7PPyUZp11_PnL1gqkvBWKJ76lcQn3HNAOO689oZ25n_R9O-JmkV3Rp_g1qao"
            alt="Admin"
          />
          <div>
            <p className="profile-name">Admin Name</p>
            <p className="profile-role">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopHeader({ onAdd }) {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm đơn đặt, số điện thoại..." />
      </div>

      <div className="header-actions">
        <div className="icon-group">
          <button className="icon-btn">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="icon-btn">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
        <div className="header-divider" />
        <button className="btn-support">Support</button>
        <button className="btn-new-booking" onClick={onAdd}>New Booking</button>
      </div>
    </header>
  );
}

function FilterBar({ todayCount }) {
  return (
    <div className="filter-grid">
      {/* Date range */}
      <div className="filter-card col-5">
        <label className="filter-label">Khoảng thời gian</label>
        <div className="date-range">
          <div className="date-input-wrap">
            <span className="material-symbols-outlined">calendar_today</span>
            <input type="date" />
          </div>
          <span className="arrow">→</span>
          <div className="date-input-wrap">
            <span className="material-symbols-outlined">calendar_today</span>
            <input type="date" />
          </div>
        </div>
      </div>

      {/* Status filter */}
      <div className="filter-card col-4">
        <label className="filter-label">Trạng thái</label>
        <select className="status-select">
          <option>Tất cả trạng thái</option>
          <option>Chờ xác nhận</option>
          <option>Đã xác nhận</option>
          <option>Đã check-in</option>
          <option>Hoàn thành</option>
          <option>Đã hủy</option>
        </select>
      </div>

      {/* Today count */}
      <div className="today-card">
        <div className="today-info">
          <p className="today-label">Tổng đơn hôm nay</p>
          <p className="today-count">{todayCount}</p>
        </div>
        <div className="today-icon">
          <span className="material-symbols-outlined">analytics</span>
        </div>
      </div>
    </div>
  );
}

function ActionButtons({ type, note }) {
  if (type === 'pending') {
    return (
      <div className="action-group">
        <button className="action-btn approve" title="Duyệt đơn">
          <span className="material-symbols-outlined">check_circle</span>
        </button>
        <button className="action-btn reject" title="Hủy đơn">
          <span className="material-symbols-outlined">cancel</span>
        </button>
        <button className="action-btn more">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>
    );
  }
  if (type === 'confirmed') {
    return (
      <div className="action-group">
        <button className="btn-detail">Chi tiết</button>
        <button className="action-btn more">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>
    );
  }
  return <span className="action-note">{note}</span>;
}

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

  if (services.length === 0) return <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '12px' }}>Không</span>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {services.map(s => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #d1fae5' }}>
          {s.service_image && (
            <img src={s.service_image} alt={s.service_name} style={{ width: '20px', height: '20px', objectFit: 'cover', borderRadius: '2px' }} />
          )}
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', whiteSpace: 'nowrap' }}>
            {s.service_name} x{s.quantity}
          </span>
        </div>
      ))}
    </div>
  );
};

function BookingsTable({ bookings, onEdit, onDelete }) {
  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Sân</th>
              <th>Dịch vụ thêm</th>
              <th>Ngày &amp; Giờ</th>
              <th className="right">Tổng tiền</th>
              <th className="center">Trạng thái</th>
              <th className="right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className={b.status === 'cancelled' ? 'cancelled' : ''}>
                {/* ID */}
                <td>
                  <span className={`booking-id${b.status === 'cancelled' ? ' cancelled' : ''}`}>
                    #BK{b.id?.substring(0, 8).toUpperCase()}
                  </span>
                </td>

                {/* Customer */}
                <td>
                  <div className="customer-cell">
                    <div className="avatar">
                      {b.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="customer-name">{b.name}</p>
                      <p className="customer-phone">{b.phone}</p>
                    </div>
                  </div>
                </td>

                {/* Field */}
                <td><span className="field-name">{b.field}</span></td>

                {/* Services */}
                <td><BookingServiceRowItems bookingId={b.id} /></td>

                {/* Date & time */}
                <td>
                  <p className={`booking-date${b.status === 'cancelled' ? ' struck' : ''}`}>
                    {new Date(b.date).toLocaleDateString("vi-VN")}
                  </p>
                  <p className="booking-time">{b.time}</p>
                </td>

                {/* Price */}
                <td className="right"><span className="price">{Number(b.price).toLocaleString("vi-VN")}đ</span></td>

                {/* Status */}
                <td className="status-cell">
                  <span className={`status-badge ${b.status?.toLowerCase()}`}>
                    {b.status === 'pending' && <span className="dot" />}
                    {statusMap[b.status] || b.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="action-cell">
                  <div className="action-group">
                    <button className="action-btn edit" title="Sửa đơn" onClick={() => onEdit(b)}>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button className="action-btn delete" title="Xóa đơn" onClick={() => onDelete(b.id)}>
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="table-footer">
        <p>Hiển thị 1-4 trong số 124 đơn đặt</p>
        <div className="pagination">
          <button className="page-btn" disabled>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_left</span>
          </button>
          <button className="page-btn active">1</button>
          <button className="page-btn">2</button>
          <button className="page-btn">3</button>
          <button className="page-btn">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsOverview() {
  return (
    <div className="stats-grid">
      {statsCards.map(({ chipClass, chip, value, desc, icon, dark }) => (
        <div key={chip} className={`stats-card${dark ? ' dark' : ''}`}>
          <div className="stats-card-bg-icon">
            <span className="material-symbols-outlined">{icon}</span>
          </div>
          <p className={`stats-chip ${chipClass}`}>{chip}</p>
          <h3 className="stats-value">{value}</h3>
          <p className="stats-desc">{desc}</p>
        </div>
      ))}
    </div>
  );
}

function AddBookingModal({ onClose, onSuccess }) {
  const [fields, setFields] = useState([]);
  const [users, setUsers] = useState([]);
  const [fieldId, setFieldId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);

  useEffect(() => {
    getFields().then(res => setFields(res.data.fields || [])).catch(console.error);
    getUsers().then(res => setUsers(res.data || [])).catch(console.error);
    fetch('${BASE_URL}/services/list/?admin=true')
      .then(res => res.json())
      .then(data => setAvailableServices(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const handleSubmit = async () => {
    if (!fieldId || !customerId || !date || !startTime || !endTime || !price) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    try {
      setLoading(true);
      await createBooking({
        field_id: fieldId,
        customer_id: customerId,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        total_price: price,
        services: selectedServices.map(s => ({
          service_id: s.service_id,
          quantity: s.quantity,
          total_price: s.quantity * s.price
        }))
      });
      alert("Thêm đơn đặt thành công");
      onSuccess();
      onClose();
    } catch (error) {
      console.log(error);
      alert("Lỗi khi thêm đơn đặt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Thêm đơn đặt sân</h3>
          <button className="modal-close" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Khách hàng</label>
              <select className="form-select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">-- Chọn khách hàng --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email || u.username}</option>)}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Sân bóng</label>
              <select className="form-select" value={fieldId} onChange={e => setFieldId(e.target.value)}>
                <option value="">-- Chọn sân --</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.field_name}</option>)}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Dịch vụ thêm</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '8px', minHeight: '48px', maxHeight: '150px', overflowY: 'auto' }}>
                {availableServices.length === 0 ? (
                  <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Không có dịch vụ nào</span>
                ) : availableServices.map(s => {
                  const selected = selectedServices.find(x => x.service_id === s.id);
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <input type="checkbox" checked={!!selected} onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServices([...selectedServices, { service_id: s.id, quantity: 1, price: s.price }]);
                          } else {
                            setSelectedServices(selectedServices.filter(x => x.service_id !== s.id));
                          }
                        }} />
                        {s.image && <img src={s.image} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />}
                        {s.name} ({Number(s.price).toLocaleString('vi-VN')}đ)
                      </label>
                      {selected && (
                        <input type="number" min="1" value={selected.quantity} onChange={(e) => {
                          const q = parseInt(e.target.value) || 1;
                          setSelectedServices(selectedServices.map(x => x.service_id === s.id ? { ...x, quantity: q } : x));
                        }} style={{ width: '50px', padding: '2px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ngày đặt</label>
              <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tổng tiền (VNĐ)</label>
              <input className="form-input" type="number" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ bắt đầu</label>
              <input className="form-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ kết thúc</label>
              <input className="form-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button className="btn-confirm" onClick={handleSubmit} disabled={loading}>{loading ? "Đang thêm..." : "Thêm đơn"}</button>
        </div>
      </div>
    </div>
  );
}

function EditBookingModal({ booking, onClose, onSuccess }) {
  const [date, setDate] = useState(booking.date || "");
  const timeParts = (booking.time || "").split(" - ");
  const [startTime, setStartTime] = useState(timeParts[0] || "");
  const [endTime, setStartTime1] = useState(timeParts[1] || "");
  // fix syntax variable naming conflict
  const [endTime2, setEndTime2] = useState(timeParts[1] || "");
  const [price, setPrice] = useState(booking.price || "");
  const [status, setStatus] = useState(booking.status || "Pending");
  const [loading, setLoading] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);

  useEffect(() => {
    fetch('${BASE_URL}/services/list/?admin=true')
      .then(res => res.json())
      .then(data => setAvailableServices(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch(`${BASE_URL}/services/booking-services/${booking.id}/`)
      .then(res => res.json())
      .then(data => {
        setSelectedServices(data.map(s => ({
          service_id: s.service_id,
          quantity: s.quantity,
          price: s.total_price / s.quantity // reconstruct individual price
        })));
      })
      .catch(console.error);
  }, [booking.id]);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      await updateBooking(booking.id, {
        booking_date: date,
        start_time: startTime,
        end_time: endTime2,
        total_price: Number(price),
        status: status,
        services: selectedServices.map(s => ({
          service_id: s.service_id,
          quantity: s.quantity,
          total_price: s.quantity * s.price
        }))
      });

      alert("Cập nhật đơn thành công");
      onSuccess();
      onClose();

    } catch (error) {
      console.log("=== FULL ERROR ===", error);
      alert("Lỗi khi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Sửa đơn đặt sân #BK{booking.id?.substring(0, 8).toUpperCase()}</h3>
          <button className="modal-close" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="Pending">Chờ xác nhận</option>
                <option value="Confirmed">Đã xác nhận</option>
                <option value="Checked_in">Đã check-in</option>
                <option value="Completed">Hoàn thành</option>
                <option value="Cancelled">Đã hủy</option>
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Dịch vụ thêm</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '8px', minHeight: '48px', maxHeight: '150px', overflowY: 'auto' }}>
                {availableServices.length === 0 ? (
                  <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Không có dịch vụ nào</span>
                ) : availableServices.map(s => {
                  const selected = selectedServices.find(x => x.service_id === s.id);
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <input type="checkbox" checked={!!selected} onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServices([...selectedServices, { service_id: s.id, quantity: 1, price: s.price }]);
                          } else {
                            setSelectedServices(selectedServices.filter(x => x.service_id !== s.id));
                          }
                        }} />
                        {s.image && <img src={s.image} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />}
                        {s.name} ({Number(s.price).toLocaleString('vi-VN')}đ)
                      </label>
                      {selected && (
                        <input type="number" min="1" value={selected.quantity} onChange={(e) => {
                          const q = parseInt(e.target.value) || 1;
                          setSelectedServices(selectedServices.map(x => x.service_id === s.id ? { ...x, quantity: q } : x));
                        }} style={{ width: '50px', padding: '2px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ngày đặt</label>
              <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tổng tiền (VNĐ)</label>
              <input className="form-input" type="number" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ bắt đầu</label>
              <input className="form-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ kết thúc</label>
              <input className="form-input" type="time" value={endTime2} onChange={e => setEndTime2(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button className="btn-confirm" onClick={handleSubmit} disabled={loading}>{loading ? "Đang cập nhật..." : "Lưu thay đổi"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Bookings Component ── */
export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    console.log("DATA:", bookings);
  }, [bookings]);

  const fetchBookings = async () => {
    try {
      const res = await getBookings();
      setBookings(res.data);
    } catch (err) {
      console.log("Lỗi load bookings:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa đơn đặt này không?")) {
      try {
        await deleteBooking(id);
        alert("Xóa thành công");
        fetchBookings();
      } catch (err) {
        alert("Lỗi khi xóa");
      }
    }
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCount = bookings.filter((b) => {
    if (!b.date) return false;

    const bookingDate = new Date(b.date);
    bookingDate.setHours(0, 0, 0, 0);

    return bookingDate.getTime() === today.getTime();
  }).length;


  return (
    <>
      <Sidebar />

      <TopHeader onAdd={() => setShowAddModal(true)} />

      <main className="main-content">
        <div className="content-inner">
          {/* Page Header */}
          <div className="page-header">
            <div>
              <h2>Quản lý đặt sân</h2>
              <p>Theo dõi và quản lý các lượt đặt sân trong hệ thống</p>
            </div>
            <button className="btn-export">
              <span className="material-symbols-outlined">file_download</span>
              Xuất báo cáo
            </button>
          </div>

          {/* Filter Bar */}
          <FilterBar todayCount={todayCount} />

          {/* Table */}
          <BookingsTable bookings={bookings} onEdit={setEditingBooking} onDelete={handleDelete} />

          {/* Stats */}
          <StatsOverview />
        </div>
      </main>

      {showAddModal && <AddBookingModal onClose={() => setShowAddModal(false)} onSuccess={fetchBookings} />}
      {editingBooking && <EditBookingModal booking={editingBooking} onClose={() => setEditingBooking(null)} onSuccess={fetchBookings} />}
    </>
  );
}