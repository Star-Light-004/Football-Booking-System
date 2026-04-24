import React, { useEffect, useState } from 'react';
import { NavLink } from "react-router-dom";
import axios from "axios";
import './dashboard.css';
/* ── Data ── */

 
const bars = [
  { heightClass: 'h-40', label: 'Th2' },
  { heightClass: 'h-65', label: 'Th3' },
  { heightClass: 'h-50', label: 'Th4' },
  { heightClass: 'h-90', label: 'Th5' },
  { heightClass: 'h-75', label: 'Th6' },
  { heightClass: 'h-85', label: 'Th7' },
  { heightClass: 'h-60', label: 'CN' },
];
 

 
const bookings = [
  {
    id: '#BK-9021',
    initials: 'NL',
    name: 'Nguyễn Văn Long',
    field: 'Sân cỏ nhân tạo A1',
    time: '19:00 - 20:30, Hôm nay',
    status: 'confirmed',
    statusLabel: 'Confirmed',
  },
  {
    id: '#BK-9022',
    initials: 'HT',
    name: 'Hoàng Minh Tuấn',
    field: 'Sân cỏ tự nhiên B2',
    time: '20:00 - 21:00, Hôm nay',
    status: 'pending',
    statusLabel: 'Pending',
  },
  {
    id: '#BK-9023',
    initials: 'TQ',
    name: 'Trần Thanh Quang',
    field: 'Sân Futsal C3',
    time: '17:30 - 19:00, 24/10',
    status: 'confirmed',
    statusLabel: 'Confirmed',
  },
  {
    id: '#BK-9024',
    initials: 'LD',
    name: 'Lê Anh Duy',
    field: 'Sân cỏ nhân tạo A2',
    time: '18:00 - 20:00, 24/10',
    status: 'confirmed',
    statusLabel: 'Confirmed',
  },
  {
    id: '#BK-9025',
    initials: 'VH',
    name: 'Võ Thanh Hải',
    field: 'Sân cỏ tự nhiên B1',
    time: '21:00 - 22:30, 25/10',
    status: 'pending',
    statusLabel: 'Pending',
  },
];
 
const navLinks = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: 'stadium', label: 'Fields', path: '/admin/fields' },
  { icon: 'event_available', label: 'Bookings', path: '/admin/bookings' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'payments', label: 'Revenue', path: '/admin/revenue' },
];
 
/* ── Sub-components ── */
function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Pitch & Pulse</h1>
        <p>Admin Console</p>
      </div>

      <nav className="sidebar-nav">
        {navLinks.map(({ icon, label, path }) => (
          <NavLink
            key={label}
            to={path}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-profile">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCN8B1_XgT-gyh6hViClDnURmdEgMriI9tLL5MirBkzBqNDwUjaetJrOYSkH7rBKA25sr4LDP9m5cJoj4D6NM_H_r1SlNQ8_MhW9rS_ehEYjU7bTXPFF5sEq0e8xVMpbvktPsKgkAMsGGieA3DhoaZGVvdvBXTmeuBFMgk4IhWhmxMknWIj3Mvk7w6yRnl6hMqbw2Ls8ufDqptzZeLNQ5wSEep5KZjz1FMQVz1O028ND-V_miwWbNAIB16XihsBLMcPSWYNV-6e0us"
          alt="Admin Profile"
        />
        <div>
          <p className="profile-name">Admin Panel</p>
          <p className="profile-role">System Manager</p>
        </div>
      </div>
    </aside>
  );
}
 
function TopHeader() {
  return (
    <header className="top-header">
      <div className="search-wrapper">
        <div className="search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input type="text" placeholder="Tìm kiếm nhanh..." />
        </div>
      </div>
 
      <div className="header-actions">
        <button className="icon-btn">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="icon-btn">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <button className="btn-new-booking">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
          New Booking
        </button>
      </div>
    </header>
  );
}
 
function StatCard({ icon, iconClass, badge, badgeClass, label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className={`stat-icon ${iconClass}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={`stat-badge ${badgeClass}`}>{badge}</span>
      </div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}
 
function RevenueCard() {
  return (
    <div className="revenue-card">
      <div className="revenue-content">
        <div className="rev-header">
          <p className="rev-label">Doanh thu hôm nay</p>
          <span className="material-symbols-outlined">payments</span>
        </div>
        <p className="rev-main">2.4M <span>VND</span></p>
        <div className="rev-divider">
          <p className="rev-sub-label">Tháng này</p>
          <p className="rev-sub-value">45.8M <span>VND</span></p>
        </div>
      </div>
      <div className="blob1" />
      <div className="blob2" />
    </div>
  );
}
 
function BarChart() {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Lượt đặt sân theo ngày</h3>
          <p className="chart-subtitle">Thống kê 7 ngày gần nhất</p>
        </div>
        <select className="chart-select">
          <option>Tuần này</option>
          <option>Tuần trước</option>
        </select>
      </div>
 
      <div className="bar-chart">
        <div className="bar-chart-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bar-chart-grid-line" />
          ))}
        </div>
 
        {bars.map(({ heightClass, label }) => (
          <div key={label} className="bar-col">
            <div className={`bar-fill ${heightClass}`} />
            <span className="bar-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
 
function DonutChart({ donutLegend, total }) {
  return (
    <div className="donut-card">
      <h3 className="chart-title">Tỉ lệ loại sân</h3>

      <div className="donut-wrapper">
        <div className="donut-ring">
          <div className="donut-center">
            <p className="donut-num">{total}</p>
            <p className="donut-sub">Sân</p>
          </div>
        </div>
      </div>

      <div className="donut-legend">

        {donutLegend.map((d) => (

          <div key={d.label} className="donut-legend-item">

            <div className="donut-legend-label">

              <span className="legend-dot dark-green" />

              <span>{d.label}</span>

            </div>

            <span className="donut-legend-pct">
              {d.pct}
            </span>

          </div>

        ))}

      </div>
    </div>
  );
}
 
function BookingsTable() {
  return (
    <div className="bookings-card">
      <div className="bookings-header">
        <h3>Lượt đặt gần nhất</h3>
        <button className="btn-view-all">Xem tất cả</button>
      </div>
 
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mã đặt sân</th>
              <th>Khách hàng</th>
              <th>Sân</th>
              <th>Thời gian</th>
              <th className="text-right">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td><span className="booking-id">{b.id}</span></td>
                <td>
                  <div className="customer-cell">
                    <div className="avatar">{b.initials}</div>
                    <span className="customer-name">{b.name}</span>
                  </div>
                </td>
                <td><span className="field-name">{b.field}</span></td>
                <td><span className="booking-time">{b.time}</span></td>
                <td className="status-cell">
                  <span className={`badge ${b.status}`}>
                    <span className="badge-dot" />
                    {b.statusLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
/* ── Main Dashboard Component ── */
export default function Dashboard() {

  const [fields, setFields] = useState([]);
  const [stats, setStats] = useState([]);
  const [donutLegend, setDonutLegend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const fetchData = async () => {

      try {

        const res = await axios.get(
          "http://127.0.0.1:8000/api/football-fields/"
        );

        const fieldData = res.data.fields;

        setFields(fieldData);

        /* ---- Stats ---- */

        const totalFields = fieldData.length;

        const activeFields = fieldData.filter(
          f => f.is_available
        ).length;

        setStats([
          {
            icon: 'stadium',
            iconClass: 'green',
            badge: `${activeFields} đang hoạt động`,
            badgeClass: 'badge-green',
            label: 'Tổng số sân',
            value: totalFields,
          },
          {
            icon: 'event_available',
            iconClass: 'blue',
            badge: 'Từ hệ thống',
            badgeClass: 'badge-blue',
            label: 'Sân khả dụng',
            value: activeFields,
          },
          {
            icon: 'group',
            iconClass: 'purple',
            badge: 'Database',
            badgeClass: 'badge-purple',
            label: 'Tổng dữ liệu sân',
            value: fieldData.length,
          },
        ]);

        /* ---- Donut ---- */

        const typeCount = {};

        fieldData.forEach(field => {

          const type = field.field_type;

          if (!typeCount[type]) {
            typeCount[type] = 0;
          }

          typeCount[type]++;

        });

        const donutData = Object.keys(typeCount).map(type => {

          const percent = Math.round(
            (typeCount[type] / totalFields) * 100
          );

          return {
            dotClass: 'dark-green',
            label: type,
            pct: percent + "%"
          };
        });

        setDonutLegend(donutData);

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);
      }
    };

    fetchData();

  }, []);

  if (loading) {
    return <h2 style={{ padding: 20 }}>Đang tải dữ liệu...</h2>;
  }

  return (
    <>
      <Sidebar />

      <main className="main-content">

        <TopHeader />

        <div className="content-area">

          <div className="page-heading">
            <h2>Tổng quan hệ thống</h2>
            <p>Chào mừng trở lại! Dưới đây là hiệu suất sân cỏ hôm nay.</p>
          </div>

          {/* Stats */}
          <div className="stats-grid">

            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}

            <RevenueCard />

          </div>

          {/* Charts */}
          <div className="charts-grid">

            <BarChart />

            <DonutChart donutLegend={donutLegend} total={fields.length} />

          </div>

          <BookingsTable />

        </div>
      </main>

      <button className="fab">
        <span className="material-symbols-outlined">
          add_box
        </span>
      </button>
    </>
  );
}