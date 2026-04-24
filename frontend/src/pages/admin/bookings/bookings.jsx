import { Link, useLocation } from "react-router-dom";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './bookings.css';
/* ── Data ── */
const navLinks = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: 'stadium', label: 'Fields', path: '/admin/fields' },
  { icon: 'event_available', label: 'Bookings', path: '/admin/bookings' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'payments', label: 'Revenue', path: '/admin/revenue' },
  { icon: 'settings', label: 'Settings', path: '/admin/settings' },
];
const statusMap = {
  Confirmed: "Đã xác nhận",
  Cancelled: "Đã hủy",
  Pending: "Chờ xác nhận",
  Completed: "Hoàn thành"
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
            className={`nav-link ${
              location.pathname === path ? "active" : ""
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
 
function TopHeader() {
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
        <button className="btn-new-booking">New Booking</button>
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
  // cancelled
  return <span className="action-note">{note}</span>;
}
 
function BookingsTable({ bookings }) {
  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Sân</th>
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
                    {b.id}
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
 
                {/* Date & time */}
                <td>
                  <p className={`booking-date${b.status === 'cancelled' ? ' struck' : ''}`}>
                    {new Date(b.date).toLocaleDateString("vi-VN")}
                  </p>
                  <p className="booking-time">{b.time}</p>
                </td>
 
                {/* Price */}
                <td><span className="price">{Number(b.price).toLocaleString("vi-VN")}đ</span></td>
 
                {/* Status */}
                <td className="status-cell">
                  <span className={`status-badge ${b.status?.toLowerCase()}`}>
                    {b.status === 'pending' && <span className="dot" />}
                    {statusMap[b.status] || b.status}
                  </span>
                </td>
 
                {/* Actions */}
                <td className="action-cell">
                  <ActionButtons type={b.status?.toLowerCase()} />
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
 
/* ── Main Bookings Component ── */
export default function Bookings() {


  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, []);
  
 useEffect(() => {
    console.log("DATA:", bookings);
  }, [bookings]);

  const fetchBookings = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/bookings/");
      setBookings(res.data);
    } catch (err) {
      console.log("Lỗi load bookings:", err);
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
 
      <TopHeader />
 
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
          <BookingsTable bookings={bookings} />
 
          {/* Stats */}
          <StatsOverview />
        </div>
      </main>
    </>
  );
}