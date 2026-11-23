import React, { useState, useEffect, useMemo } from "react";
import { Link, NavLink } from "react-router-dom";
import { getFields } from "../../../api/fieldsApi";
import { getBookings } from "../../../api/bookingsApi";
import { onSyncEvent } from "../../../utils/realtimeSync";
import { getCurrentUser, hasPermission } from "../../../utils/permissionUtils";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import "./dashboard.css";

const statusMap = {
  confirmed: "Đã xác nhận",
  pending: "Chờ duyệt",
  cancelled: "Đã hủy",
  completed: "Hoàn thành"
};

const statusClassMap = {
  confirmed: "confirmed",
  pending: "pending",
  cancelled: "cancelled",
  completed: "completed"
};

const ROLE_LABELS = {
  admin: "Quản trị viên",
  field_owner: "Chủ sân",
  field_manager: "Quản lý sân",
  receptionist: "Lễ tân",
  cashier: "Thu ngân",
  cleaner: "Nhân viên vệ sinh",
  service_staff: "Nhân viên dịch vụ",
  maintenance: "Kỹ thuật bảo trì",
};

function TopHeader() {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm nhanh thông số, giao dịch..." />
      </div>

      <div className="header-actions">
        <button className="icon-btn" title="Thông báo" type="button">
          <span className="material-symbols-outlined">notifications</span>
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

function RevenueCard({ periodRevenue = 0, monthRevenue = 0, periodLabel = "Doanh thu hôm nay" }) {
  const formatCompact = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return `${val}`;
  };

  return (
    <div className="revenue-card">
      <div className="revenue-content">
        <div className="rev-col rev-col-today">
          <div className="rev-icon-box">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div className="rev-info">
            <span className="rev-label">{periodLabel}</span>
            <div className="rev-amount-wrap">
              <strong className="rev-val">{formatCompact(periodRevenue)}</strong>
              <span className="rev-currency">VND</span>
              <span className="rev-detail">({Number(periodRevenue).toLocaleString('vi-VN')}đ)</span>
            </div>
          </div>
        </div>

        <div className="rev-separator" />

        <div className="rev-col rev-col-month">
          <div className="rev-icon-box">
            <span className="material-symbols-outlined">calendar_month</span>
          </div>
          <div className="rev-info">
            <span className="rev-label">Doanh thu tháng này</span>
            <div className="rev-amount-wrap">
              <strong className="rev-val">{formatCompact(monthRevenue)}</strong>
              <span className="rev-currency">VND</span>
              <span className="rev-detail">({Number(monthRevenue).toLocaleString('vi-VN')}đ)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LineChart({ data, title = "Lượt đặt sân theo ngày", subtitle = "Thống kê 7 ngày" }) {
  if (!data || data.length === 0) return null;

  const width = 800;
  const height = 300;
  const paddingX = 50;
  const paddingY = 40;

  const maxCount = Math.max(...data.map(d => d.count), 5);
  const chartHeight = height - paddingY * 2;
  const chartWidth = width - paddingX * 2;

  const xStep = chartWidth / (data.length - 1 || 1);

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
          <h3 className="chart-title">{title}</h3>
          <p className="chart-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="line-chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = height - paddingY - pct * chartHeight;
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#areaGradient)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#059669"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & Labels */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#fff"
                stroke="#059669"
                strokeWidth="2.5"
              />
              <text
                x={p.x}
                y={p.y - 12}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#334155"
              >
                {p.count}
              </text>
              <text
                x={p.x}
                y={height - paddingY + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function DonutChart({ donutLegend = [], total = 0 }) {
  return (
    <div className="donut-card">
      <div className="donut-header">
        <h3 className="chart-title">Phân loại sân</h3>
        <span className="donut-total">{total} Sân</span>
      </div>

      <div className="donut-legend">
        {donutLegend.map((d, i) => (
          <div key={i} className="donut-legend-item">
            <div className="donut-legend-info">
              <span className={`donut-legend-dot ${d.dotClass}`} />
              <span className="donut-legend-label">{d.label}</span>
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

/* ── Pending Approvals Card ── */
function PendingApprovalsCard({ pendingBookings = [] }) {
  if (pendingBookings.length === 0) return null;

  return (
    <div className="pending-approvals-card">
      <div className="pending-approvals-header">
        <div className="pending-alert-badge">
          <span className="material-symbols-outlined">pending_actions</span>
          <span>{pendingBookings.length} đơn đặt sân đang chờ xác nhận</span>
        </div>
        <Link to="/admin/bookings" className="btn-resolve-pending">
          Xử lý ngay <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </div>

      <div className="pending-items-list">
        {pendingBookings.slice(0, 3).map((b) => (
          <div key={b.id} className="pending-item">
            <div className="pending-item-info">
              <span className="pending-customer">{b.name}</span>
              <span className="pending-sub">
                <span className="material-symbols-outlined">stadium</span> {b.field} | {b.time}
              </span>
            </div>
            <Link to="/admin/bookings" className="btn-quick-verify">
              Xem đơn
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingsTable({ bookings, periodTitle = "Lượt đặt gần nhất" }) {
  return (
    <div className="bookings-card">
      <div className="bookings-header">
        <div>
          <h3>{periodTitle} ({bookings.length})</h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
            Danh sách đơn đặt sân tương ứng với khoảng thời gian đã chọn
          </p>
        </div>
        <NavLink to="/admin/bookings" className="btn-view-all">
          Xem tất cả lượt đặt <span className="material-symbols-outlined">arrow_forward</span>
        </NavLink>
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
            {bookings.length > 0 ? bookings.slice(0, 8).map((b) => (
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
                <td colSpan="5" style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '6px' }}>
                    event_busy
                  </span>
                  Không có lượt đặt sân nào trong khoảng thời gian đã chọn.
                </td>
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
  const [rawBookings, setRawBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc ngày tháng: mặc định "today" và ngày hiện tại
  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [datePeriod, setDatePeriod] = useState("today");
  const [selectedDate, setSelectedDate] = useState(todayISO);

  // Lấy thông tin user hiện tại và quyền
  const currentUser = getCurrentUser();
  const canViewRevenue = hasPermission("revenue_view", currentUser);
  const userRoleLabel = ROLE_LABELS[currentUser?.role] || "Quản trị viên";
  const displayName = currentUser?.full_name || currentUser?.fullname || userRoleLabel;

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [res, bkRes] = await Promise.all([getFields(), getBookings()]);
      const fieldData = res.data.fields || res.data || [];
      const allBookings = bkRes.data || [];

      setFields(fieldData);
      setRawBookings(allBookings);
    } catch (error) {
      console.log(error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);

    const cleanupSync = onSyncEvent((event) => {
      if (event.type?.startsWith("booking_") || event.type?.startsWith("tournament_")) {
        fetchData(true);
      }
    });

    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cleanupSync();
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  /* ── Xử lý tính toán lọc theo thời gian ── */
  const {
    filteredBookings,
    periodRevenue,
    monthRevenue,
    periodLabel,
    periodDisplay,
    barsData,
    recentTableBookings,
    pendingBookings,
    stats,
    donutLegend,
  } = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // 1. Phân loại theo bộ lọc thời gian
    let filtered = [];
    let label = "Doanh thu hôm nay";
    let display = "Hôm nay";

    const isMatchDate = (bDateStr, targetISO) => {
      if (!bDateStr) return false;
      return bDateStr.startsWith(targetISO);
    };

    if (datePeriod === "today") {
      filtered = rawBookings.filter((b) => isMatchDate(b.date, todayISO));
      label = "Doanh thu hôm nay";
      display = "Hôm nay";
    } else if (datePeriod === "custom") {
      filtered = rawBookings.filter((b) => isMatchDate(b.date, selectedDate));
      const [y, m, d] = (selectedDate || todayISO).split("-");
      label = `Doanh thu ngày ${d}/${m}/${y}`;
      display = `Ngày ${d}/${m}/${y}`;
    } else if (datePeriod === "week") {
      const now = new Date();
      const dayOfWeek = now.getDay() || 7; // Monday = 1, Sunday = 7
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      filtered = rawBookings.filter((b) => {
        if (!b.date) return false;
        const bd = new Date(b.date);
        return bd >= monday && bd <= sunday;
      });
      label = "Doanh thu tuần này";
      display = "Tuần này";
    } else if (datePeriod === "month") {
      filtered = rawBookings.filter((b) => {
        if (!b.date) return false;
        const bd = new Date(b.date);
        return bd.getFullYear() === currentYear && bd.getMonth() === currentMonth;
      });
      label = "Doanh thu tháng này";
      display = "Tháng này";
    } else if (datePeriod === "year") {
      filtered = rawBookings.filter((b) => {
        if (!b.date) return false;
        const bd = new Date(b.date);
        return bd.getFullYear() === currentYear;
      });
      label = "Doanh thu năm nay";
      display = "Năm nay";
    } else {
      // "all"
      filtered = [...rawBookings];
      label = "Tổng doanh thu tích lũy";
      display = "Toàn thời gian";
    }

    // 2. Tính Doanh thu
    let pRevenue = 0;
    let mRevenue = 0;

    rawBookings.forEach((b) => {
      const s = String(b.status || "").trim().toLowerCase();
      const isCompleted = ["completed", "hoàn thành", "hoan thanh", "đã hoàn thành", "da hoan thanh"].includes(s);
      if (!isCompleted) return;

      const price = Number(b.price || b.total_price || 0);

      // Doanh thu tháng hiện tại
      if (b.date) {
        const bd = new Date(b.date);
        if (bd.getFullYear() === currentYear && bd.getMonth() === currentMonth) {
          mRevenue += price;
        }
      }
    });

    filtered.forEach((b) => {
      const s = String(b.status || "").trim().toLowerCase();
      const isCompleted = ["completed", "hoàn thành", "hoan thanh", "đã hoàn thành", "da hoan thanh"].includes(s);
      if (isCompleted) {
        pRevenue += Number(b.price || b.total_price || 0);
      }
    });

    // 3. Biểu đồ 7 ngày kết thúc tại ngày được chọn (hoặc hôm nay)
    const anchorDate = (datePeriod === "custom" && selectedDate) ? new Date(selectedDate) : new Date();
    const chartDays = [];
    const chartLabels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      chartDays.push(iso);
      chartLabels.push(d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }));
    }

    const counts = chartDays.map((d) => rawBookings.filter((b) => isMatchDate(b.date, d)).length);
    const maxCount = Math.max(...counts, 5);
    const bData = counts.map((c, i) => ({
      heightPct: `${Math.round((c / maxCount) * 100)}%`,
      label: chartLabels[i],
      count: c,
    }));

    // 4. Danh sách đặt sân cho bảng hiển thị
    const tableList = (filtered.length > 0 ? filtered : rawBookings).slice(0, 10).map((b) => {
      const dateStr = b.date ? new Date(b.date).toLocaleDateString("vi-VN") : "";
      return {
        id: b.id ? `#BK${String(b.id).substring(0, 8).toUpperCase()}` : "#BK-0000",
        initials: b.name ? b.name.charAt(0).toUpperCase() : "U",
        name: b.name || "Khách hàng",
        field: b.field || b.fieldName || "Sân bóng",
        time: `${b.time || ""}, ${dateStr}`,
        statusClass: statusClassMap[b.status] || "pending",
        statusLabel: statusMap[b.status] || b.status,
      };
    });

    // 5. Đơn chờ duyệt
    const pBookings = rawBookings
      .filter((b) => b.status === "pending")
      .map((b) => ({
        id: b.id,
        name: b.name || "Khách hàng",
        field: b.field || b.fieldName || "Sân",
        time: `${b.time || ""} (${b.date || ""})`,
        phone: b.phone || "",
      }));

    // 6. Stats KPI
    const totalFields = fields.length;
    const activeFields = fields.filter((f) => f.is_available !== false).length;

    const kpiStats = [
      {
        icon: "stadium",
        iconClass: "green",
        badge: `${activeFields} đang hoạt động`,
        badgeClass: "badge-green",
        label: "Tổng số sân",
        value: totalFields,
      },
      {
        icon: "event_available",
        iconClass: "blue",
        badge: "Khả dụng đón khách",
        badgeClass: "badge-blue",
        label: "Sân khả dụng",
        value: activeFields,
      },
      {
        icon: "event_note",
        iconClass: "purple",
        badge: display,
        badgeClass: "badge-purple",
        label: `Lượt đặt (${display})`,
        value: filtered.length,
      },
      {
        icon: "construction",
        iconClass: "amber",
        badge: `${totalFields - activeFields} cần bảo trì`,
        badgeClass: "badge-amber",
        label: "Sân bảo trì / tạm dừng",
        value: totalFields - activeFields,
      },
    ];

    // 7. Donut
    const typeCount = {};
    fields.forEach((field) => {
      const type = field.field_type || "Sân cỏ nhân tạo";
      if (!typeCount[type]) typeCount[type] = 0;
      typeCount[type]++;
    });

    const dLegend = Object.keys(typeCount).map((type) => {
      const percent = totalFields > 0 ? Math.round((typeCount[type] / totalFields) * 100) : 0;
      return {
        dotClass: "dark-green",
        label: type,
        pct: percent + "%",
      };
    });

    return {
      filteredBookings: filtered,
      periodRevenue: pRevenue,
      monthRevenue: mRevenue,
      periodLabel: label,
      periodDisplay: display,
      barsData: bData,
      recentTableBookings: tableList,
      pendingBookings: pBookings,
      stats: kpiStats,
      donutLegend: dLegend,
    };
  }, [rawBookings, fields, datePeriod, selectedDate, todayISO]);

  return (
    <>
      <AdminSidebar />
      <TopHeader />

      <main className="main-content admin-dashboard-main">
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 48, animation: "spin 1s linear infinite" }}
            >
              autorenew
            </span>
            <h2 style={{ marginTop: 12 }}>Đang tải dữ liệu vận hành...</h2>
          </div>
        ) : (
          <div className="content-area">
            {/* Page Heading với vai trò động */}
            <div className="page-heading">
              <div className="page-heading-copy">
                <span className="dashboard-eyebrow">
                  VẬN HÀNH CƠ SỞ <span>›</span> TỔNG QUAN HỆ THỐNG
                </span>
                <h2>
                  Chào mừng trở lại, <span>{displayName}!</span>
                </h2>
                <p>
                  Vai trò: <strong>{userRoleLabel}</strong> • Đang xem dữ liệu: <strong>{periodDisplay}</strong>.
                </p>
              </div>
              <div className="dashboard-heading-actions">
                <span className="dashboard-date">
                  <span className="material-symbols-outlined">calendar_today</span>
                  {selectedDate ? (
                    new Date(selectedDate).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  ) : (
                    new Date().toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  )}
                </span>
                <span className="dashboard-period">
                  {periodDisplay} <span className="material-symbols-outlined">check_circle</span>
                </span>
              </div>
            </div>

            {/* Thanh chọn mốc thời gian và ngày cụ thể */}
            <section className="dashboard-filter-bar" aria-label="Bộ lọc thời gian tổng quan">
              <div className="dashboard-period-tags">
                <span className="filter-period-label">
                  <span className="material-symbols-outlined">calendar_month</span>
                  Mốc thời gian:
                </span>
                {[
                  { key: "today", label: "Hôm nay" },
                  { key: "week", label: "Tuần này" },
                  { key: "month", label: "Tháng này" },
                  { key: "year", label: "Năm nay" },
                  { key: "all", label: "Tất cả" },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`dashboard-period-tag ${datePeriod === p.key ? "active" : ""}`}
                    onClick={() => {
                      setDatePeriod(p.key);
                      if (p.key === "today") {
                        setSelectedDate(todayISO);
                      }
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="dashboard-custom-date">
                <label className="dashboard-date-picker-wrap" title="Chọn ngày cụ thể để xem lại những ngày đã qua">
                  <span className="material-symbols-outlined">event</span>
                  <span className="dashboard-date-picker-text">Chọn ngày:</span>
                  <input
                    type="date"
                    className="dashboard-date-input"
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedDate(e.target.value);
                        setDatePeriod("custom");
                      }
                    }}
                  />
                </label>
              </div>
            </section>

            {/* Cảnh báo đơn chờ duyệt nếu có */}
            <PendingApprovalsCard pendingBookings={pendingBookings} />

            {/* Thống kê nhanh KPI */}
            <div className="stats-grid">
              {stats.map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>

            {/* Thẻ Doanh thu: CHỈ HIỂN THỊ KHI CÓ QUYỀN revenue_view */}
            {canViewRevenue && (
              <RevenueCard
                periodRevenue={periodRevenue}
                monthRevenue={monthRevenue}
                periodLabel={periodLabel}
              />
            )}

            {/* Biểu đồ phân tích */}
            <div className="charts-grid">
              <LineChart
                data={barsData}
                title={`Lượt đặt sân theo ngày (${periodDisplay})`}
                subtitle={`Thống kê 7 ngày kết thúc tại ${
                  selectedDate
                    ? new Date(selectedDate).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : "hôm nay"
                }`}
              />
              <DonutChart donutLegend={donutLegend} total={fields.length} />
            </div>

            {/* Bảng đặt sân */}
            <BookingsTable
              bookings={recentTableBookings}
              periodTitle={`Lượt đặt sân (${periodDisplay})`}
            />
          </div>
        )}
      </main>
    </>
  );
}
