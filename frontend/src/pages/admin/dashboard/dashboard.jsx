import React, { useState, useEffect, useMemo, useRef } from "react";
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

function RevenueCard({ periodRevenue = 0, monthRevenue = 0, periodLabel = "Doanh thu thực tế" }) {
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

function LineChart({ data, title = "Lượt đặt sân theo ngày" }) {
  const [hoverIndex, setHoverIndex] = useState(null);

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
    return { x, y, label: d.label, dateStr: d.dateStr, count: d.count };
  });

  const pathD = `M ${points[0].x} ${points[0].y} ` +
    points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">{title}</h3>
        </div>
      </div>

      <div className="line-chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
            </linearGradient>
            <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.18" />
            </filter>
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
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active hover vertical guide line */}
          {hovered && (
            <line
              x1={hovered.x}
              y1={paddingY}
              x2={hovered.x}
              y2={height - paddingY}
              stroke="#059669"
              strokeWidth="1.8"
              strokeDasharray="3 3"
            />
          )}

          {/* Points */}
          {points.map((p, i) => {
            const isHovered = hoverIndex === i;
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 7.5 : 5}
                  fill={isHovered ? "#059669" : "#fff"}
                  stroke="#059669"
                  strokeWidth={isHovered ? 3.5 : 2.5}
                  style={{ transition: "all 0.15s ease" }}
                />
                <text
                  x={p.x}
                  y={p.y - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#1e293b"
                >
                  {p.count}
                </text>
                <text
                  x={p.x}
                  y={height - paddingY + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? "800" : "500"}
                  fill={isHovered ? "#059669" : "#64748b"}
                >
                  {p.label}
                </text>

                {/* Larger hit-target for hover */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="24"
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            );
          })}

          {/* Interactive Tooltip on hover */}
          {hovered && (
            <g
              transform={`translate(${Math.min(Math.max(hovered.x, 80), width - 80)}, ${Math.max(hovered.y - 48, 20)})`}
              filter="url(#shadowFilter)"
              style={{ pointerEvents: "none" }}
            >
              <rect
                x="-75"
                y="-32"
                width="150"
                height="42"
                rx="8"
                fill="#0f172a"
              />
              <text x="0" y="-15" textAnchor="middle" fill="#94a3b8" fontSize="10.5" fontWeight="600">
                {hovered.dateStr || hovered.label}
              </text>
              <text x="0" y="3" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="800">
                {hovered.count} lượt đặt sân
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

function DonutChart({ donutLegend = [], total = 0 }) {
  // SVG Donut metrics
  const size = 150;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const slices = donutLegend.map((item, idx) => {
    const pct = parseFloat(item.pct) || 0;
    const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercent / 100) * circumference);
    cumulativePercent += pct;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      color: item.color || (idx === 0 ? "#059669" : idx === 1 ? "#3b82f6" : "#f59e0b"),
    };
  });

  return (
    <div className="donut-card">
      <div className="donut-header">
        <h3 className="chart-title">Phân loại sân</h3>
        <span className="donut-total">{total} Sân</span>
      </div>

      <div className="donut-body-wrapper">
        <div className="donut-visual-container">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg-graphic">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            {/* Segments */}
            {slices.map((slice, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dashoffset 0.4s ease" }}
              />
            ))}
          </svg>
          <div className="donut-visual-center">
            <strong>{total}</strong>
            <small>Sân bóng</small>
          </div>
        </div>

        <div className="donut-legend-list">
          {donutLegend.map((d, i) => (
            <div key={i} className="donut-legend-row">
              <div className="donut-legend-label-col">
                <span className="donut-legend-bullet" style={{ background: d.color }} />
                <span className="donut-legend-text">{d.label}</span>
              </div>
              <div className="donut-legend-value-col">
                <strong className="donut-legend-count">{d.count} sân</strong>
                <span className="donut-legend-pct">({d.pct})</span>
              </div>
            </div>
          ))}
        </div>
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

  // Danh sách các ngày đã qua để hiển thị dropdown tiện lợi
  const pastDatesList = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i <= 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const [year, month, day] = iso.split("-");
      let label = "";
      if (i === 0) label = `Hôm nay (${day}/${month}/${year})`;
      else if (i === 1) label = `Hôm qua (${day}/${month}/${year})`;
      else label = `${i} ngày trước (${day}/${month}/${year})`;
      list.push({ iso, label, displayDate: `${day}/${month}/${year}` });
    }
    return list;
  }, []);

  // Lấy thông tin user hiện tại và quyền
  const currentUser = getCurrentUser();
  const canViewRevenue = hasPermission("revenue_view", currentUser);
  const userRoleLabel = ROLE_LABELS[currentUser?.role] || "Quản trị viên";
  const displayName = currentUser?.full_name || currentUser?.fullname || userRoleLabel;

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent && fields.length === 0 && rawBookings.length === 0) setLoading(true);
      const [res, bkRes] = await Promise.all([
        getFields(), // Sân bóng hiếm khi đổi, ưu tiên dùng cache để giảm tải server
        getBookings({ skipCache: isSilent })
      ]);
      const fieldData = res.data.fields || res.data || [];
      const allBookings = bkRes.data || [];

      setFields(fieldData);
      setRawBookings(allBookings);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);

    const cleanupSync = onSyncEvent((event) => {
      if (event.type?.startsWith("booking_") || event.type?.startsWith("tournament_")) {
        fetchData(true);
      }
    });

    // 20s poll thay vì 5s để Render Free không bị quá tải CPU
    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    }, 20000);

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
    barsData,
    recentTableBookings,
    pendingBookings,
    stats,
    donutLegend,
  } = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const isMatchDate = (bDateStr, targetISO) => {
      if (!bDateStr) return false;
      return bDateStr.startsWith(targetISO);
    };

    let filtered = [];

    if (datePeriod === "today") {
      filtered = rawBookings.filter((b) => isMatchDate(b.date, todayISO));
    } else if (datePeriod === "custom") {
      filtered = rawBookings.filter((b) => isMatchDate(b.date, selectedDate));
    } else if (datePeriod === "week") {
      const now = new Date();
      const dayOfWeek = now.getDay() || 7;
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
    } else if (datePeriod === "month") {
      filtered = rawBookings.filter((b) => {
        if (!b.date) return false;
        const bd = new Date(b.date);
        return bd.getFullYear() === currentYear && bd.getMonth() === currentMonth;
      });
    } else if (datePeriod === "year") {
      filtered = rawBookings.filter((b) => {
        if (!b.date) return false;
        const bd = new Date(b.date);
        return bd.getFullYear() === currentYear;
      });
    } else {
      // "all"
      filtered = [...rawBookings];
    }

    // Tính Doanh thu
    let pRevenue = 0;
    let mRevenue = 0;

    rawBookings.forEach((b) => {
      const s = String(b.status || "").trim().toLowerCase();
      const isCompleted = ["completed", "hoàn thành", "hoan thanh", "đã hoàn thành", "da hoan thanh"].includes(s);
      if (!isCompleted) return;

      const price = Number(b.price || b.total_price || 0);

      // Doanh thu tháng này
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

    // Biểu đồ 7 ngày với thông tin ngày đầy đủ
    const anchorDate = (datePeriod === "custom" && selectedDate) ? new Date(selectedDate) : new Date();
    const chartDays = [];
    const chartLabels = [];
    const chartDateStrs = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      chartDays.push(iso);
      chartLabels.push(d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }));
      chartDateStrs.push(
        d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })
      );
    }

    const counts = chartDays.map((d) => rawBookings.filter((b) => isMatchDate(b.date, d)).length);
    const maxCount = Math.max(...counts, 5);
    const bData = counts.map((c, i) => ({
      heightPct: `${Math.round((c / maxCount) * 100)}%`,
      label: chartLabels[i],
      dateStr: chartDateStrs[i],
      count: c,
    }));

    // Bảng đặt sân
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

    // Đơn chờ duyệt
    const pBookings = rawBookings
      .filter((b) => b.status === "pending")
      .map((b) => ({
        id: b.id,
        name: b.name || "Khách hàng",
        field: b.field || b.fieldName || "Sân",
        time: `${b.time || ""} (${b.date || ""})`,
        phone: b.phone || "",
      }));

    // KPI stats - không hiển thị chữ (hôm nay) hay (toàn thời gian)
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
        badge: `${filtered.length} lượt`,
        badgeClass: "badge-purple",
        label: "Lượt đặt sân",
        value: filtered.length,
      },
      {
        icon: "construction",
        iconClass: "amber",
        badge: `${totalFields - activeFields} sân`,
        badgeClass: "badge-amber",
        label: "Sân bảo trì / tạm dừng",
        value: totalFields - activeFields,
      },
    ];

    // Donut phân loại sân
    const typeCount = {};
    const typeColors = {
      "Sân 5 người": "#059669",
      "5 vs 5": "#059669",
      "Sân 7 người": "#3b82f6",
      "7 vs 7": "#3b82f6",
      "Sân 11 người": "#f59e0b",
      "11 vs 11": "#f59e0b",
    };

    fields.forEach((field) => {
      let type = field.field_type || "Sân cỏ nhân tạo";
      if (type === "5 vs 5") type = "Sân 5 người";
      else if (type === "7 vs 7") type = "Sân 7 người";
      else if (type === "11 vs 11") type = "Sân 11 người";

      if (!typeCount[type]) typeCount[type] = 0;
      typeCount[type]++;
    });

    const dLegend = Object.keys(typeCount).map((type, idx) => {
      const count = typeCount[type];
      const percent = totalFields > 0 ? Math.round((count / totalFields) * 100) : 0;
      return {
        label: type,
        count: count,
        pct: percent + "%",
        color: typeColors[type] || (idx === 0 ? "#059669" : idx === 1 ? "#3b82f6" : "#f59e0b"),
      };
    });

    return {
      filteredBookings: filtered,
      periodRevenue: pRevenue,
      monthRevenue: mRevenue,
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
            {/* Page Heading gọn gàng: đã bỏ nhãn calendar_today, Toàn thời gian, check_circle */}
            <div className="page-heading">
              <div className="page-heading-copy">
                <span className="dashboard-eyebrow">
                  VẬN HÀNH CƠ SỞ <span>›</span> TỔNG QUAN HỆ THỐNG
                </span>
                <h2>
                  Chào mừng trở lại, <span>{displayName}!</span>
                </h2>
                <p>
                  Vai trò: <strong>{userRoleLabel}</strong> • Báo cáo vận hành sân bóng.
                </p>
              </div>
            </div>

            {/* Cảnh báo đơn chờ duyệt nếu có */}
            <PendingApprovalsCard pendingBookings={pendingBookings} />

            {/* 1. 4 Ô THỐNG KÊ NHANH KPI NẰM TRÊN */}
            <div className="stats-grid">
              {stats.map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>

            {/* 2. BỘ LỌC MỐC THỜI GIAN VÀ CHỌN NGÀY NẰM DƯỚI 4 Ô THÔNG TIN */}
            <section className="dashboard-filter-bar" aria-label="Bộ lọc thời gian">
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

              {/* Ô chọn ngày nằm riêng, click ra list ngày đã qua, không thêm chữ "chọn ngày" */}
              <div className="dashboard-past-date-selector">
                <span className="material-symbols-outlined date-icon">event</span>
                <select
                  className="dashboard-past-date-select"
                  value={datePeriod === "custom" || datePeriod === "today" ? selectedDate : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setSelectedDate(val);
                      setDatePeriod(val === todayISO ? "today" : "custom");
                    }
                  }}
                  title="Chọn ngày trong danh sách những ngày đã qua"
                >
                  <option value="" disabled>Lịch sử ngày đã qua</option>
                  {pastDatesList.map((item) => (
                    <option key={item.iso} value={item.iso}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="dashboard-date-quick-input"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      setDatePeriod(e.target.value === todayISO ? "today" : "custom");
                    }
                  }}
                  title="Chọn ngày tự do từ lịch"
                />
              </div>
            </section>

            {/* 3. THẺ DOANH THU */}
            {canViewRevenue && (
              <RevenueCard
                periodRevenue={periodRevenue}
                monthRevenue={monthRevenue}
                periodLabel="Doanh thu thực tế"
              />
            )}

            {/* 4. BIỂU ĐỒ PHÂN TÍCH */}
            <div className="charts-grid">
              <LineChart data={barsData} title="Lượt đặt sân theo ngày" />
              <DonutChart donutLegend={donutLegend} total={fields.length} />
            </div>

            {/* 5. BẢNG ĐẶT SÂN GẦN NHẤT */}
            <BookingsTable
              bookings={recentTableBookings}
              periodTitle="Lượt đặt sân"
            />
          </div>
        )}
      </main>
    </>
  );
}
