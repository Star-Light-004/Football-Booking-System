import React, { useState } from 'react';
import { Link, useLocation } from "react-router-dom";
import './revenue.css';
 
/* ── Data ── */
const navLinks = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: 'stadium', label: 'Fields', path: '/admin/fields' },
  { icon: 'event_available', label: 'Bookings', path: '/admin/bookings' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'payments', label: 'Revenue', path: '/admin/revenue' },
  { icon: 'settings', label: 'Settings', path: '/admin/settings' },
];

const barData = [
  { label: 'Jan', height: '45%', type: 'light',  faded: false },
  { label: 'Feb', height: '60%', type: 'light',  faded: false },
  { label: 'Mar', height: '55%', type: 'light',  faded: false },
  { label: 'Apr', height: '80%', type: 'light',  faded: false },
  { label: 'May', height: '95%', type: 'active', faded: false, activeLabel: true },
  { label: 'Jun', height: '20%', type: 'future', faded: true,  dashed: true },
  { label: 'Jul', height: '0%',  type: 'none',   faded: true,  dashed: true },
];
 
const donutSegments = [
  { label: 'Sân 7 người',  dotClass: 'green',       pct: '65%', strokeArray: '65, 100', strokeOffset: '0'   },
  { label: 'Sân 5 người',  dotClass: 'light-green',  pct: '25%', strokeArray: '25, 100', strokeOffset: '-65' },
  { label: 'Sân 11 người', dotClass: 'secondary',    pct: '10%', strokeArray: '10, 100', strokeOffset: '-90' },
];
 
const donutColors = ['#10b981', '#6ee7b7', '#3b683e'];
 
const transactions = [
  {
    id: '#INV-8821',
    avatarClass: 'green',
    initials: 'NA',
    name: 'Nguyễn Anh Tuấn',
    field: 'Sân A2 - 7 người',
    date: '24/05/2024, 18:30',
    price: '450.000 đ',
    statusClass: 'success',
    statusLabel: 'Thành công',
  },
  {
    id: '#INV-8822',
    avatarClass: 'blue',
    initials: 'LM',
    name: 'Lê Minh',
    field: 'Sân B1 - 5 người',
    date: '24/05/2024, 20:00',
    price: '300.000 đ',
    statusClass: 'success',
    statusLabel: 'Thành công',
  },
  {
    id: '#INV-8823',
    avatarClass: 'zinc',
    initials: 'TH',
    name: 'Trần Huy',
    field: 'Sân C - 11 người',
    date: '25/05/2024, 17:00',
    price: '1.200.000 đ',
    statusClass: 'pending',
    statusLabel: 'Chờ thanh toán',
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
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLiCYpgt5GJMbyFGFVf4YJqRw6dm4cgkTseIG-1F3mP1AqG1_7nIa4tqQKmw0Psla6CvxhVW2gOSZCwz03EABUu-fEgN6l4SUMV6RKGSzcr2PbISzH5d_4yfjhu7g3sF00crS1zT0OHbwHI-8Hv2NYLBU_MzxUK8wTei8tKEdZwM0w5VvdVTduBDiudMVq816PDK0HHYEtfKOv_G70KjkAlchAx8GtrQDbMfG1UbKg4oPAzenDStiUUuvHlODQAl3vte9nLNYDy8A"
            alt="Admin"
          />
          <div>
            <p className="profile-name">Test</p>
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
      <div className="search-pill">
        <span className="material-symbols-outlined">search</span>
        <input type="text" placeholder="Tìm kiếm giao dịch, hóa đơn..." />
      </div>
 
      <div className="header-right">
        <div className="icon-group">
          <button className="icon-btn">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="icon-btn">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
        <div className="header-divider" />
        <button className="btn-new-booking">
          <span className="material-symbols-outlined">add</span>
          New Booking
        </button>
      </div>
    </header>
  );
}
 
function SummaryCards() {
  return (
    <div className="summary-grid">
      {/* Actual Revenue */}
      <div className="card-actual">
        <div className="card-content">
          <div className="card-header">
            <div className="card-icon-wrap white-glass">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
            <span className="card-badge white-glass">Thực tế</span>
          </div>
          <p className="card-label">Doanh thu thực tế</p>
          <h3 className="card-value">
            1,240,500,000 <span className="unit">đ</span>
          </h3>
        </div>
        <div className="card-blob" />
      </div>
 
      {/* Expected Revenue */}
      <div className="card-white">
        <div>
          <div className="card-header">
            <div className="card-icon-wrap green-light">
              <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)' }}>insights</span>
            </div>
            <span className="card-badge green-soft">Dự kiến</span>
          </div>
          <p className="card-label">Doanh thu dự kiến</p>
          <h3 className="card-value">
            1,500,000,000 <span className="unit">đ</span>
          </h3>
        </div>
        <div className="progress-wrap">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '82.7%' }} />
          </div>
          <span className="progress-pct">82.7%</span>
        </div>
      </div>
 
      {/* Growth Rate */}
      <div className="card-white">
        <div>
          <div className="card-header">
            <div className="card-icon-wrap pink-light">
              <span className="material-symbols-outlined" style={{ color: 'var(--color-tertiary)' }}>trending_up</span>
            </div>
            <span className="card-badge pink-soft">Tăng trưởng</span>
          </div>
          <p className="card-label">Tỷ lệ tăng trưởng</p>
          <h3 className="card-value">+12.4%</h3>
        </div>
        <p className="card-italic">So với cùng kỳ tháng trước (T4/2024)</p>
      </div>
    </div>
  );
}
 
function BarChart() {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h4 className="chart-title">Xu hướng doanh thu</h4>
          <p className="chart-subtitle">Thống kê doanh thu theo tháng trong năm 2024</p>
        </div>
        <select className="chart-select">
          <option>Năm 2024</option>
          <option>Năm 2023</option>
        </select>
      </div>
 
      <div className="bar-chart">
        {barData.map(({ label, height, type, faded, dashed, activeLabel }) => (
          <div key={label} className={`bar-col${faded ? ' faded' : ''}`}>
            <div className={`bar-track${dashed ? ' dashed' : ''}`}>
              {type !== 'none' && (
                <div className={`bar-fill ${type}`} style={{ height }} />
              )}
            </div>
            <span className={`bar-label${activeLabel ? ' active' : ''}`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
 
function DonutChart() {
  const CIRCUMFERENCE = 100;
  const cx = 18, cy = 18, r = 15.9155;
 
  return (
    <div className="donut-card">
      <h4 className="chart-title">Cơ cấu doanh thu</h4>
      <p className="donut-subtitle">Phân loại theo loại hình sân</p>
 
      <div className="donut-chart-wrap">
        <div className="donut-svg-wrap">
          <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            {/* Background track */}
            <path
              d={`M ${cx} 2.0845 a ${r} ${r} 0 0 1 0 31.831 a ${r} ${r} 0 0 1 0 -31.831`}
              fill="none" stroke="#f4f4f5"
              strokeWidth="4" strokeDasharray="100, 100"
            />
            {/* Segments */}
            {donutSegments.map(({ label, strokeArray, strokeOffset }, i) => (
              <path
                key={label}
                d={`M ${cx} 2.0845 a ${r} ${r} 0 0 1 0 31.831 a ${r} ${r} 0 0 1 0 -31.831`}
                fill="none"
                stroke={donutColors[i]}
                strokeWidth="4"
                strokeDasharray={strokeArray}
                strokeDashoffset={strokeOffset}
              />
            ))}
          </svg>
          <div className="donut-center-label">
            <span className="donut-center-value">100%</span>
            <span className="donut-center-sub">Tổng thể</span>
          </div>
        </div>
 
        <div className="donut-legend">
          {donutSegments.map(({ label, dotClass, pct }) => (
            <div key={label} className="donut-legend-row">
              <div className="donut-legend-label">
                <span className={`legend-dot ${dotClass}`} />
                {label}
              </div>
              <span className="donut-legend-pct">{pct}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
 
function TransactionTable() {
  return (
    <section className="tx-section">
      <div className="tx-header">
        <h4>Lịch sử giao dịch gần đây</h4>
        <button className="btn-view-all">Xem tất cả</button>
      </div>
 
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mã hóa đơn</th>
              <th>Khách hàng</th>
              <th>Sân bãi</th>
              <th>Ngày đặt</th>
              <th>Tổng tiền</th>
              <th className="right">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td><span className="inv-id">{t.id}</span></td>
                <td>
                  <div className="customer-cell">
                    <div className={`avatar ${t.avatarClass}`}>{t.initials}</div>
                    <span className="customer-name">{t.name}</span>
                  </div>
                </td>
                <td><span className="field-badge">{t.field}</span></td>
                <td><span className="tx-date">{t.date}</span></td>
                <td><span className="tx-price">{t.price}</span></td>
                <td className="tx-status-cell">
                  <span className={`tx-badge ${t.statusClass}`}>{t.statusLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
 
function ExportFAB() {
  const [open, setOpen] = useState(false);
 
  return (
    <div className="fab-container">
      <div className={`export-menu ${open ? 'visible' : 'hidden'}`}>
        <button className="export-menu-btn">
          <span className="material-symbols-outlined pdf">picture_as_pdf</span>
          Xuất PDF (A4)
        </button>
        <button className="export-menu-btn">
          <span className="material-symbols-outlined excel">table_view</span>
          Xuất Excel (.xlsx)
        </button>
      </div>
      <button className="fab-btn" onClick={() => setOpen((v) => !v)}>
        <span className="material-symbols-outlined">download_for_offline</span>
      </button>
    </div>
  );
}
 
/* ── Main Revenue Component ── */
export default function Revenue() {
  return (
    <>
      <Sidebar />
      <TopHeader />
 
      <main className="main-content">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h2>Báo cáo doanh thu</h2>
            <p>Phân tích chi tiết hiệu quả hoạt động kinh doanh sân bãi.</p>
          </div>
          <div className="date-picker-wrap">
            <div className="date-range-display">
              <span className="material-symbols-outlined">calendar_today</span>
              <span>01/05/2024 - 31/05/2024</span>
            </div>
            <button className="btn-expand">
              <span className="material-symbols-outlined">expand_more</span>
            </button>
            <button className="btn-export">
              <span className="material-symbols-outlined">file_download</span>
              Xuất báo cáo
            </button>
          </div>
        </div>
 
        {/* Summary Cards */}
        <SummaryCards />
 
        {/* Charts */}
        <div className="charts-grid">
          <BarChart />
          <DonutChart />
        </div>
 
        {/* Transactions */}
        <TransactionTable />
      </main>
 
      {/* FAB */}
      <ExportFAB />
    </>
  );
}