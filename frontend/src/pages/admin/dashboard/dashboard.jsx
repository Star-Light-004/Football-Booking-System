import React, { useEffect, useState } from 'react';
import { NavLink } from "react-router-dom";
import { getFields } from "../../../api/fieldsApi";
import { getBookings } from "../../../api/bookingsApi";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import './dashboard.css';

/* ── Data ── */
const statusMap = {
  "pending": "Chờ xác nhận",
  "confirmed": "Đã xác nhận",
  "completed": "Hoàn thành",
  "cancelled": "Đã hủy"
};

const statusClassMap = {
  "pending": "pending",
  "confirmed": "confirmed",
  "completed": "confirmed",
  "cancelled": "cancelled"
};



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
        <button className="btn-new-booking" type="button">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
          Đặt sân mới
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

function LineChart({ data }) {
  if (!data || data.length === 0) return null;

  const width = 800;
  const height = 300;
  const paddingX = 50;
  const paddingY = 40;

  const maxCount = Math.max(...data.map(d => d.count), 5);
  const chartHeight = height - paddingY * 2;
  const chartWidth = width - paddingX * 2;

  const xStep = chartWidth / (data.length - 1);

  const points = data.map((d, i) => {
    const x = paddingX + i * xStep;
    const y = height - paddingY - (d.count / maxCount) * chartHeight;
    return { x, y, label: d.label, count: d.count };
  });

  const pathD = `M ${points[0].x} ${points[0].y} ` +
    points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

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

      <div className="line-chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = height - paddingY - ratio * chartHeight;
            return (
              <g key={ratio}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="2" />
                <text x={paddingX - 15} y={y + 4} textAnchor="end" fontSize="12" fill="#94a3b8" fontWeight="600" fontFamily="sans-serif">
                  {Math.round(ratio * maxCount)}
                </text>
              </g>
            );
          })}

          {/* Area */}
          <path d={areaD} fill="url(#areaGradient)" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="4" filter="url(#shadow)" />

          {/* Points & Labels */}
          {points.map((p, i) => (
            <g key={i} className="chart-point-group">
              <circle cx={p.x} cy={p.y} r="6" fill="#fff" stroke="#3b82f6" strokeWidth="3" className="chart-point" />
              <circle cx={p.x} cy={p.y} r="12" fill="transparent" className="chart-point-hover" />
              <text x={p.x} y={height - paddingY + 25} textAnchor="middle" fontSize="13" fill="#64748b" fontWeight="600" fontFamily="sans-serif">
                {p.label}
              </text>
              <text x={p.x} y={p.y - 15} textAnchor="middle" fontSize="14" fill="#0f172a" fontWeight="800" fontFamily="sans-serif" className="chart-point-value">
                {p.count}
              </text>
            </g>
          ))}
        </svg>
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

function BookingsTable({ bookings }) {
  return (
    <div className="bookings-card">
      <div className="bookings-header">
        <h3>Lượt đặt gần nhất</h3>
        <NavLink to="/admin/bookings" className="btn-view-all">Xem tất cả lượt đặt <span className="material-symbols-outlined">arrow_forward</span></NavLink>
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
            {bookings.length > 0 ? bookings.map((b) => (
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
                  <span className={`badge ${b.statusClass}`}>
                    <span className="badge-dot" />
                    {b.statusLabel}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>Chưa có lượt đặt nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main Dashboard Component ── */
export default function Dashboard() {

  const [fields, setFields] = useState([]);
  const [barsData, setBarsData] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [stats, setStats] = useState([]);
  const [donutLegend, setDonutLegend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res, bkRes] = await Promise.all([getFields(), getBookings()]);
        const fieldData = res.data.fields || res.data;
        const allBookings = bkRes.data || [];

        setFields(fieldData);

        /* ---- Bookings Table (Recent 5) ---- */
        const recent = allBookings.slice(0, 5).map(b => {
          const dateStr = new Date(b.date).toLocaleDateString("vi-VN");
          return {
            id: b.id ? `#BK${b.id.substring(0, 8).toUpperCase()}` : '#BK-0000',
            initials: b.name ? b.name.charAt(0).toUpperCase() : 'U',
            name: b.name || 'Unknown',
            field: b.field,
            time: `${b.time}, ${dateStr}`,
            statusClass: statusClassMap[b.status] || 'pending',
            statusLabel: statusMap[b.status] || b.status
          };
        });
        setRecentBookings(recent);

        /* ---- Bar Chart (Last 7 Days) ---- */
        const days = [];
        const labels = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push(d.toISOString().split('T')[0]);
          labels.push(d.toLocaleDateString('vi-VN', { weekday: 'short' })); // T2, T3...
        }

        const counts = days.map(d => allBookings.filter(b => b.date === d).length);
        const maxCount = Math.max(...counts, 5);

        const chartData = counts.map((c, i) => ({
          heightPct: `${Math.round((c / maxCount) * 100)}%`,
          label: labels[i],
          count: c
        }));
        setBarsData(chartData);

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
            icon: 'event_note',
            iconClass: 'purple',
            badge: 'Toàn hệ thống',
            badgeClass: 'badge-purple',
            label: 'Tổng lượt đặt',
            value: allBookings.length,
          },
          {
            icon: 'construction',
            iconClass: 'amber',
            badge: `${totalFields - activeFields} cần kiểm tra`,
            badgeClass: 'badge-amber',
            label: 'Sân chưa khả dụng',
            value: totalFields - activeFields,
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

  return (
    <>
      <AdminSidebar />

      <main className="main-content admin-dashboard-main">
        <TopHeader />

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <h2>Đang tải dữ liệu...</h2>
          </div>
        ) : (
          <div className="content-area">

          <div className="page-heading">
            <div className="page-heading-copy">
              <span className="dashboard-eyebrow">VẬN HÀNH CƠ SỞ <span>›</span> TỔNG QUAN HỆ THỐNG</span>
              <h2>Chào mừng trở lại, <span>Quản trị viên!</span></h2>
              <p>Hiệu suất vận hành sân cỏ hôm nay và tình hình đặt sân toàn hệ thống.</p>
            </div>
            <div className="dashboard-heading-actions">
              <span className="dashboard-date"><span className="material-symbols-outlined">calendar_today</span>{new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
              <button type="button" className="dashboard-period">Hôm nay <span className="material-symbols-outlined">expand_more</span></button>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          <RevenueCard />

          {/* Charts */}
          <div className="charts-grid">
            <LineChart data={barsData} />
            <DonutChart donutLegend={donutLegend} total={fields.length} />
          </div>

          <BookingsTable bookings={recentBookings} />

        </div>
        )}
      </main>

    </>
  );
}