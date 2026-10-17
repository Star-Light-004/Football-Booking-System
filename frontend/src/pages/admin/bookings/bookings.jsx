import { Link, useLocation } from "react-router-dom";
import React, { useEffect, useState } from 'react';
import { getBookings, createBooking, updateBooking, deleteBooking } from "../../../api/bookingsApi";
import { getFields } from "../../../api/fieldsApi";
import { getUsers } from "../../../api/usersApi";
import timeslotsApi from "../../../api/timeslotsApi";
import { BASE_URL, SERVER_URL } from "../../../config";
import AdminScheduleOverview from "../../../components/AdminScheduleOverview/AdminScheduleOverview";
import './bookings.css';
import './BookingModals.css';
import { useToast, ToastContainer } from "../../../components/Toast/Toast";
import { hasPermission } from "../../../utils/permissionUtils";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
/* ── Sidebar ── dùng AdminSidebar component chung */

const statusMap = {
  Confirmed: "Đã xác nhận",
  Cancelled: "Đã hủy",
  Pending: "Chờ xác nhận",
  Completed: "Hoàn thành",
  Checked_in: "Đã check-in"
};

const isShoeService = (service) => /giày|giay|shoe/i.test(`${service.name || service.service_name || ''} ${service.category || ''}`);

/* ── Sub-components ── */

function NotificationDropdown({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="notification-dropdown-wrapper">
      <button
        className="icon-btn notification-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Thông báo</h3>
            {unreadCount > 0 && (
              <button
                className="mark-all-read-btn"
                onClick={() => {
                  onMarkAllAsRead();
                  setIsOpen(false);
                }}
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="notification-dropdown-content">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="material-symbols-outlined">notifications_none</span>
                <p>Không có thông báo mới</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => {
                    if (!notif.is_read) {
                      onMarkAsRead(notif.id);
                    }
                  }}
                >
                  <div className="notification-icon">
                    <span className="material-symbols-outlined">
                      {notif.notification_type === 'booking_cancelled' ? 'cancel' : 'info'}
                    </span>
                  </div>
                  <div className="notification-content">
                    <h4>{notif.title}</h4>
                    <p>{notif.message}</p>
                    <small>{new Date(notif.created_at).toLocaleString('vi-VN')}</small>
                  </div>
                  {!notif.is_read && <div className="notification-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="notification-dropdown-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

function TopHeader({
  onAdd,
  unreadCount,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  searchQuery,
  onSearchChange,
}) {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          placeholder="Tìm kiếm đơn đặt, số điện thoại, tên khách..."
          value={searchQuery || ""}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
      </div>

      <div className="header-actions">
        <div className="icon-group">
          <NotificationDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
          />
          <button className="icon-btn">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
        <div className="header-divider" />
        <button className="btn-support">Hỗ trợ</button>
        <button className="btn-new-booking" onClick={onAdd}><span className="material-symbols-outlined">add</span>Thêm đơn đặt</button>
      </div>
    </header>
  );
}

/* ── Modern KPI Stats Overview ── */
function KpiStatsOverview({ bookings, todayCount }) {
  const totalCount = bookings.length;
  const guestCount = bookings.filter((b) => b.is_guest).length;
  const pendingCount = bookings.filter(
    (b) => String(b.status || "").toLowerCase() === "pending"
  ).length;
  const confirmedCount = bookings.filter((b) =>
    ["confirmed", "checked_in"].includes(String(b.status || "").toLowerCase())
  ).length;
  const guestPct = totalCount ? Math.round((guestCount / totalCount) * 100) : 0;

  return (
    <div className="kpi-stats-grid">
      {/* 1. Tổng đơn */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Tổng đơn đặt sân</span>
          <div className="kpi-icon-wrap">
            <span className="material-symbols-outlined">event_note</span>
          </div>
        </div>
        <div className="kpi-val-row">
          <span className="kpi-val">{totalCount}</span>
          <span className="kpi-unit">lượt đặt</span>
        </div>
        <div className="kpi-sub">
          <span>{confirmedCount} đơn đã xác nhận / check-in</span>
        </div>
      </div>

      {/* 2. Đơn hôm nay */}
      <div className="kpi-card kpi-today">
        <div className="kpi-header">
          <span className="kpi-title">Lượt đá hôm nay</span>
          <div className="kpi-icon-wrap green">
            <span className="material-symbols-outlined">today</span>
          </div>
        </div>
        <div className="kpi-val-row">
          <span className="kpi-val" style={{ color: "#059669" }}>
            {todayCount}
          </span>
          <span className="kpi-unit">đơn trong ngày</span>
        </div>
        <div className="kpi-sub">
          <span>Cần theo dõi và đón tiếp tại sân</span>
        </div>
      </div>

      {/* 3. Khách vãng lai */}
      <div className="kpi-card kpi-guest">
        <div className="kpi-header">
          <span className="kpi-title">Khách vãng lai</span>
          <div className="kpi-icon-wrap blue">
            <span className="material-symbols-outlined">directions_walk</span>
          </div>
        </div>
        <div className="kpi-val-row">
          <span className="kpi-val" style={{ color: "#0284c7" }}>
            {guestCount}
          </span>
          <span className="kpi-unit">đơn ({guestPct}%)</span>
        </div>
        <div className="kpi-sub">
          <span>Đặt qua quầy / website không có tài khoản</span>
        </div>
      </div>

      {/* 4. Chờ duyệt */}
      <div className="kpi-card kpi-pending">
        <div className="kpi-header">
          <span className="kpi-title">Chờ duyệt / xác nhận</span>
          <div className="kpi-icon-wrap amber">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
        </div>
        <div className="kpi-val-row">
          <span
            className="kpi-val"
            style={{ color: pendingCount > 0 ? "#d97706" : "#64748b" }}
          >
            {pendingCount}
          </span>
          <span className="kpi-unit">đơn chờ</span>
        </div>
        <div className="kpi-sub">
          {pendingCount > 0 ? (
            <span style={{ color: "#dc2626", fontWeight: 600 }}>
              • Cần nhân viên kiểm tra duyệt đơn
            </span>
          ) : (
            <span>Tất cả đơn đều đã được xử lý</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Filter Tabs Bar ── */
function FilterTabsBar({ activeTab, onTabChange, counts }) {
  const tabs = [
    { key: "all", label: "Tất cả", count: counts.all },
    { key: "today", label: "Hôm nay", count: counts.today },
    {
      key: "pending",
      label: "Chờ xác nhận",
      count: counts.pending,
      urgent: counts.pending > 0,
    },
    { key: "guest", label: "Khách vãng lai", count: counts.guest, isGuest: true },
    { key: "confirmed", label: "Đã xác nhận", count: counts.confirmed },
    { key: "completed", label: "Hoàn thành", count: counts.completed },
    { key: "cancelled", label: "Đã hủy", count: counts.cancelled },
  ];

  return (
    <div className="filter-tabs-bar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`filter-tab-btn ${activeTab === tab.key ? "active" : ""} ${
            tab.isGuest ? "guest-tab" : ""
          }`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.isGuest && (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "1rem", verticalAlign: "middle" }}
            >
              directions_walk
            </span>
          )}
          {tab.label}
          <span
            className={`filter-tab-count ${tab.urgent ? "urgent" : ""}`}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── Filter Controls Panel ── */
function BookingsFilterPanel({
  searchQuery,
  onSearchChange,
  selectedField,
  onFieldChange,
  guestFilter,
  onGuestFilterChange,
  selectedDate,
  onDateChange,
  fields,
  onReset,
  hasActiveFilters,
}) {
  return (
    <div className="bookings-filter-panel">
      <div className="filter-panel-row">
        {/* Search Input */}
        <div className="search-field-wrap">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Tìm theo Mã đơn #BK..., Tên khách, SĐT..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => onSearchChange("")}
              title="Xóa tìm kiếm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
                close
              </span>
            </button>
          )}
        </div>

        {/* Field Dropdown */}
        <div className="filter-dropdown-wrap">
          <select
            value={selectedField}
            onChange={(e) => onFieldChange(e.target.value)}
          >
            <option value="">Tất cả các sân bóng</option>
            {fields.map((f) => (
              <option key={f.id} value={f.field_name}>
                {f.field_name}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Type Dropdown */}
        <div className="filter-dropdown-wrap">
          <select
            value={guestFilter}
            onChange={(e) => onGuestFilterChange(e.target.value)}
          >
            <option value="all">Tất cả loại khách</option>
            <option value="guest">Chỉ khách vãng lai (không tài khoản)</option>
            <option value="member">Chỉ thành viên đã có tài khoản</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="filter-date-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            title="Lọc theo ngày đá"
          />
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            type="button"
            className="btn-reset-filter"
            onClick={onReset}
            title="Xóa tất cả bộ lọc"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
              filter_alt_off
            </span>
            Đặt lại
          </button>
        )}
      </div>
    </div>
  );
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

  if (services.length === 0) return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>Không có</span>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {services.map(s => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #d1fae5' }}>
          {s.service_image && (
            <img src={s.service_image} alt={s.service_name} style={{ width: '18px', height: '18px', objectFit: 'cover', borderRadius: '2px' }} />
          )}
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#059669', whiteSpace: 'nowrap' }}>
            {s.service_name}{s.shoe_size ? ` - sz${s.shoe_size}` : ''} x{s.quantity}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Optimized Bookings Table ── */
function BookingsTable({
  bookings,
  onEdit,
  onDelete,
  onQuickApprove,
  currentPage,
  totalPages,
  onPageChange,
  totalFilteredCount,
}) {
  if (bookings.length === 0) {
    return (
      <div className="empty-bookings-state">
        <span className="material-symbols-outlined">event_busy</span>
        <h4>Không tìm thấy đơn đặt sân nào</h4>
        <p>Vui lòng thử điều chỉnh lại bộ lọc tìm kiếm, ngày tháng hoặc trạng thái đơn.</p>
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString("en-CA");

  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng &amp; Phân loại</th>
              <th>Sân bóng</th>
              <th>Ngày &amp; Khung giờ</th>
              <th>Dịch vụ &amp; Ghi chú</th>
              <th className="right">Tổng tiền</th>
              <th className="center">Trạng thái</th>
              <th className="right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const isToday = String(b.date || "").slice(0, 10) === todayStr;
              const isGuest = Boolean(b.is_guest);
              const formattedDate = b.date
                ? new Date(b.date).toLocaleDateString("vi-VN")
                : "—";

              return (
                <tr key={b.id} className={b.status === "cancelled" ? "cancelled" : ""}>
                  {/* Mã đơn */}
                  <td>
                    <span
                      className={`booking-id ${
                        b.status === "cancelled" ? "cancelled" : ""
                      }`}
                      style={{ fontSize: "0.85rem", letterSpacing: "0.03em" }}
                    >
                      #BK{String(b.id || "").substring(0, 8).toUpperCase()}
                    </span>
                  </td>

                  {/* Khách hàng + Note Khách Vãng Lai */}
                  <td>
                    <div className="customer-cell">
                      <div
                        className={`avatar ${isGuest ? "blue" : "green"}`}
                        style={{
                          background: isGuest ? "#e0f2fe" : "#d1fae5",
                          color: isGuest ? "#0369a1" : "#047857",
                          fontWeight: 700,
                        }}
                      >
                        {(b.name || "K").trim().charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <strong className="customer-name" style={{ color: "#0f172a" }}>
                            {b.name || "Khách hàng"}
                          </strong>

                          {/* ── NOTE KHÁCH VÃNG LAI ── */}
                          {isGuest ? (
                            <span className="tag-guest" title="Khách đặt sân không có tài khoản hệ thống">
                              <span className="material-symbols-outlined">directions_walk</span>
                              Vãng lai
                            </span>
                          ) : (
                            <span className="tag-member" title="Thành viên đã đăng ký tài khoản">
                              <span className="material-symbols-outlined">verified</span>
                              Thành viên
                            </span>
                          )}
                        </div>

                        <div className="customer-phone" style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "0.85rem", color: "#94a3b8" }}>call</span>
                          <span>{b.phone || "Chưa có SĐT"}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Sân */}
                  <td>
                    <span className="field-name" style={{ fontWeight: 600, color: "#1e293b" }}>
                      {b.field}
                    </span>
                  </td>

                  {/* Ngày & Giờ */}
                  <td>
                    <div style={{ lineHeight: 1.3 }}>
                      <span className={`date-pill ${isToday ? "is-today" : ""}`}>
                        {formattedDate}
                        {isToday && <span className="today-label-badge">Hôm nay</span>}
                      </span>
                      <p className="booking-time" style={{ fontSize: "0.775rem", fontWeight: 600, color: "#475569", marginTop: "2px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "0.85rem", verticalAlign: "middle", marginRight: "3px" }}>schedule</span>
                        {b.time}
                      </p>
                    </div>
                  </td>

                  {/* Dịch vụ thêm & Note ghi chú */}
                  <td>
                    <BookingServiceRowItems bookingId={b.id} />
                    {b.notes && (
                      <div className="booking-notes-pill" title={b.notes}>
                        <span className="material-symbols-outlined">edit_note</span>
                        <span>{b.notes}</span>
                      </div>
                    )}
                  </td>

                  {/* Giá */}
                  <td className="right">
                    <span className="price" style={{ color: "#0f172a", fontSize: "0.95rem" }}>
                      {Number(b.price || 0).toLocaleString("vi-VN")}đ
                    </span>
                  </td>

                  {/* Trạng thái */}
                  <td className="status-cell">
                    <span className={`status-badge ${String(b.status || "").toLowerCase()}`}>
                      {String(b.status || "").toLowerCase() === "pending" && <span className="dot" />}
                      {statusMap[b.status] || b.status}
                    </span>
                  </td>

                  {/* Thao tác */}
                  <td className="action-cell">
                    <div className="action-group">
                      {/* Nút duyệt nhanh nếu đang Chờ xác nhận */}
                      {String(b.status || "").toLowerCase() === "pending" && (
                        <button
                          className="action-btn approve"
                          title="Xác nhận duyệt đơn ngay"
                          onClick={() => onQuickApprove(b.id)}
                        >
                          <span className="material-symbols-outlined">check_circle</span>
                        </button>
                      )}

                      <button
                        className="action-btn edit"
                        title="Chỉnh sửa đơn"
                        onClick={() => onEdit(b)}
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>

                      <button
                        className="action-btn delete"
                        title="Xóa đơn"
                        onClick={() => onDelete(b.id)}
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="table-footer">
        <p>
          Hiển thị {bookings.length} trong tổng số <b>{totalFilteredCount}</b> đơn đặt
        </p>
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                chevron_left
              </span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`page-btn ${currentPage === page ? "active" : ""}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                chevron_right
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


/* ── Helpers ── */
const getUserDisplayName = (u) => u?.name || u?.full_name || u?.username || u?.email || 'Khách hàng';
const getServiceImg = (img) => !img ? null : (String(img).startsWith('http') ? img : `${SERVER_URL}${img}`);

/* ── Modern Grid Service Selector ── */
function ServiceSelector({ availableServices, selectedServices, setSelectedServices }) {
  if (availableServices.length === 0) {
    return (
      <div className="services-empty-state">
        <span className="material-symbols-outlined">inventory_2</span>
        <p>Không có dịch vụ nào khả dụng</p>
      </div>
    );
  }

  const toggleService = (s) => {
    const isSelected = selectedServices.some((x) => x.service_id === s.id);
    if (isSelected) {
      setSelectedServices(selectedServices.filter((x) => x.service_id !== s.id));
    } else {
      setSelectedServices([
        ...selectedServices,
        { service_id: s.id, quantity: 1, price: s.price, shoe_size: "" },
      ]);
    }
  };

  const updateQuantity = (serviceId, delta) => {
    setSelectedServices(
      selectedServices.map((x) => {
        if (x.service_id === serviceId) {
          const newQty = Math.max(1, x.quantity + delta);
          return { ...x, quantity: newQty };
        }
        return x;
      })
    );
  };

  const updateShoeSize = (serviceId, size) => {
    setSelectedServices(
      selectedServices.map((x) =>
        x.service_id === serviceId ? { ...x, shoe_size: size } : x
      )
    );
  };

  return (
    <div className="service-cards-grid">
      {availableServices.map((s) => {
        const selected = selectedServices.find((x) => x.service_id === s.id);
        const imgUrl = getServiceImg(s.image);
        const isShoe = isShoeService(s);

        return (
          <div
            key={s.id}
            className={`service-card ${selected ? "selected" : ""}`}
            onClick={(e) => {
              // Only toggle if not clicking directly on controls
              if (
                e.target.closest(".service-card-controls") ||
                e.target.closest("select") ||
                e.target.closest("button")
              ) {
                return;
              }
              toggleService(s);
            }}
            title={selected ? "Bấm để bỏ chọn dịch vụ này" : "Bấm để thêm dịch vụ này"}
          >
            <div className="service-card-top">
              <div className="service-card-thumb">
                {imgUrl ? (
                  <img src={imgUrl} alt={s.name} />
                ) : (
                  <span className="material-symbols-outlined">
                    {isShoe ? "roller_skating" : "inventory_2"}
                  </span>
                )}
              </div>
              <div className="service-card-meta">
                <span className="service-card-name" title={s.name}>
                  {s.name}
                </span>
                <span className="service-card-price">
                  {Number(s.price).toLocaleString("vi-VN")}đ
                </span>
              </div>
              <div className="service-card-check">
                <span className="material-symbols-outlined">
                  {selected ? "check_circle" : "add_circle"}
                </span>
              </div>
            </div>

            {selected && (
              <div
                className="service-card-controls"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="qty-control-group">
                  <button
                    type="button"
                    className="service-qty-btn"
                    onClick={() => updateQuantity(s.id, -1)}
                    disabled={selected.quantity <= 1}
                    title="Giảm số lượng"
                  >
                    −
                  </button>
                  <span className="service-qty-val">{selected.quantity}</span>
                  <button
                    type="button"
                    className="service-qty-btn"
                    onClick={() => updateQuantity(s.id, 1)}
                    title="Tăng số lượng"
                  >
                    +
                  </button>
                </div>

                {isShoe && (
                  <div className="shoe-size-group">
                    <span className="size-label">Size:</span>
                    <select
                      value={selected.shoe_size || ""}
                      onChange={(e) => updateShoeSize(s.id, e.target.value)}
                      className="service-size-select"
                      title="Chọn size giày"
                    >
                      <option value="">Cỡ</option>
                      {[38, 39, 40, 41, 42, 43, 44].map((size) => (
                        <option value={size} key={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Sleek Dropdown Select for Customer with Down Arrow ── */
function CustomerDropdownSelect({
  users,
  selectedId,
  onSelect,
  userSearch,
  onSearchChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  const selectedUser = users.find((u) => u.id === selectedId);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = (userSearch || "").toLowerCase();
    const displayName = getUserDisplayName(u).toLowerCase();
    const email = (u.email || "").toLowerCase();
    const phone = String(u.phone || "");
    return !q || displayName.includes(q) || email.includes(q) || phone.includes(q);
  });

  return (
    <div className="form-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`form-dropdown-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="dropdown-trigger-content">
          <span className="material-symbols-outlined dropdown-trigger-icon">
            person
          </span>
          {selectedUser ? (
            <div className="dropdown-selected-text">
              <div className="dropdown-selected-title">
                <span>{getUserDisplayName(selectedUser)}</span>
                {selectedUser.is_guest ? (
                  <span
                    className="tag-guest"
                    style={{ fontSize: "10px", padding: "1px 5px" }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "11px" }}
                    >
                      directions_walk
                    </span>
                    Vãng lai
                  </span>
                ) : (
                  <span
                    className="tag-member"
                    style={{ fontSize: "10px", padding: "1px 5px" }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "11px" }}
                    >
                      verified
                    </span>
                    Thành viên
                  </span>
                )}
              </div>
              <span className="dropdown-selected-sub">
                {selectedUser.phone
                  ? `SĐT: ${selectedUser.phone}`
                  : selectedUser.email || "Chưa cập nhật SĐT"}
              </span>
            </div>
          ) : (
            <span className="dropdown-placeholder">
              Bấm để chọn khách hàng đặt sân...
            </span>
          )}
        </div>
        <span className="material-symbols-outlined dropdown-arrow-icon">
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="form-dropdown-menu">
          <div className="dropdown-search-box">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="🔍 Tìm theo tên, SĐT, email..."
              value={userSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="dropdown-items-list">
            {filteredUsers.slice(0, 15).map((u) => {
              const displayName = getUserDisplayName(u);
              const isSelected = selectedId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  className={`dropdown-item-btn ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onSelect(u.id);
                    setIsOpen(false);
                  }}
                >
                  <div
                    className="qs-avatar"
                    style={{
                      background: u.is_guest ? "#e0f2fe" : "#d1fae5",
                      color: u.is_guest ? "#0284c7" : "#047857",
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="qs-info">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span className="qs-name">{displayName}</span>
                      {u.is_guest && (
                        <span
                          className="tag-guest"
                          style={{ fontSize: "9px", padding: "1px 4px" }}
                        >
                          Vãng lai
                        </span>
                      )}
                    </div>
                    <span className="qs-sub">
                      {u.phone || u.email || "Chưa cập nhật SĐT"}
                    </span>
                  </div>
                  {isSelected && (
                    <span
                      className="material-symbols-outlined qs-check"
                      style={{ fontSize: "1.1rem" }}
                    >
                      check
                    </span>
                  )}
                </button>
              );
            })}
            {filteredUsers.length === 0 && (
              <p className="qs-empty">Không tìm thấy khách hàng phù hợp</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sleek Dropdown Select for Field with Down Arrow ── */
function FieldDropdownSelect({
  fields,
  selectedId,
  onSelect,
  fieldSearch,
  onSearchChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  const selectedField = fields.find((f) => f.id === selectedId);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredFields = fields.filter(
    (f) =>
      !fieldSearch ||
      (f.field_name || "")
        .toLowerCase()
        .includes((fieldSearch || "").toLowerCase())
  );

  return (
    <div className="form-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`form-dropdown-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="dropdown-trigger-content">
          <span className="material-symbols-outlined dropdown-trigger-icon">
            sports_soccer
          </span>
          {selectedField ? (
            <div className="dropdown-selected-text">
              <span className="dropdown-selected-title">
                {selectedField.field_name}
              </span>
              <span className="dropdown-selected-sub">
                {selectedField.price_per_hour
                  ? `${Number(selectedField.price_per_hour).toLocaleString(
                      "vi-VN"
                    )}đ/giờ`
                  : ""}{" "}
                {selectedField.location ? `· ${selectedField.location}` : ""}
              </span>
            </div>
          ) : (
            <span className="dropdown-placeholder">
              Bấm để chọn sân bóng thi đấu...
            </span>
          )}
        </div>
        <span className="material-symbols-outlined dropdown-arrow-icon">
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="form-dropdown-menu">
          <div className="dropdown-search-box">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="🔍 Tìm theo tên sân bóng..."
              value={fieldSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="dropdown-items-list">
            {filteredFields.map((f) => {
              const isSelected = selectedId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`dropdown-item-btn ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onSelect(f.id);
                    setIsOpen(false);
                  }}
                >
                  <span
                    className="material-symbols-outlined qs-field-icon"
                    style={{ width: "28px", height: "28px", borderRadius: "6px" }}
                  >
                    sports_soccer
                  </span>
                  <div className="qs-info">
                    <span className="qs-name">{f.field_name}</span>
                    <span className="qs-sub">
                      {f.price_per_hour
                        ? `${Number(f.price_per_hour).toLocaleString(
                            "vi-VN"
                          )}đ/h`
                        : ""}{" "}
                      {f.location ? `· ${f.location}` : ""}
                    </span>
                  </div>
                  {isSelected && (
                    <span
                      className="material-symbols-outlined qs-check"
                      style={{ fontSize: "1.1rem" }}
                    >
                      check
                    </span>
                  )}
                </button>
              );
            })}
            {filteredFields.length === 0 && (
              <p className="qs-empty">Không tìm thấy sân phù hợp</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Always-Visible Optimized Services Section ── */
function ServicesSection({
  availableServices,
  selectedServices,
  setSelectedServices,
}) {
  const selectedCount = selectedServices.length;

  return (
    <div className="modal-section">
      <div className="services-section-header">
        <div className="modal-section-heading">
          <span className="material-symbols-outlined">inventory_2</span>
          Dịch vụ &amp; Tiện ích thêm
          {selectedCount > 0 && (
            <span
              className="tag-guest"
              style={{
                background: "#ecfdf5",
                color: "#059669",
                borderColor: "#a7f3d0",
                marginLeft: "6px",
              }}
            >
              {selectedCount} đã chọn
            </span>
          )}
        </div>
        {selectedCount > 0 && (
          <button
            type="button"
            className="services-clear-btn"
            onClick={() => setSelectedServices([])}
            title="Bỏ chọn tất cả dịch vụ"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>
              close
            </span>
            Bỏ chọn
          </button>
        )}
      </div>

      <div style={{ marginTop: "0.35rem" }}>
        <ServiceSelector
          availableServices={availableServices}
          selectedServices={selectedServices}
          setSelectedServices={setSelectedServices}
        />
      </div>
    </div>
  );
}

// Giữ alias tương thích
const CollapsibleServicesSection = ServicesSection;

function AddBookingModal({ onClose, onSuccess, defaultFieldId, showToast }) {
  const [fields, setFields] = useState([]);
  const [users, setUsers] = useState([]);
  const [fieldId, setFieldId] = useState(defaultFieldId || "");
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeslotsLoading, setTimeslotsLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");

  useEffect(() => {
    getFields()
      .then((res) => setFields(res.data.fields || []))
      .catch(console.error);
    getUsers()
      .then((res) => setUsers(res.data || []))
      .catch(console.error);
    fetch(`${BASE_URL}/services/list/?admin=true`)
      .then((res) => res.json())
      .then((data) => setAvailableServices(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!fieldId || !date) return;
    const load = async () => {
      try {
        setSlotLoading(true);
        const res = await fetch(
          `${BASE_URL}/bookings/booked-slots/?field_id=${fieldId}&date=${date}`
        );
        const data = await res.json();
        setBookedSlots(res.ok ? data.booked_slots || [] : []);
      } catch {
        setBookedSlots([]);
      } finally {
        setSlotLoading(false);
      }
    };
    load();
  }, [fieldId, date]);

  useEffect(() => {
    if (!fieldId || !date) return;
    const loadTimeslots = async () => {
      try {
        setTimeslotsLoading(true);
        const res = await timeslotsApi.getByField(fieldId, date);
        const slots = res.data || [];
        const formattedSlots = slots.map((slot) => ({
          start: slot.start_time?.slice(0, 5) || "",
          end: slot.end_time?.slice(0, 5) || "",
          price: slot.price,
          status: slot.status,
        }));
        setTimeSlots(formattedSlots);
      } catch (error) {
        console.error("Lỗi tải timeslots:", error);
        setTimeSlots([]);
      } finally {
        setTimeslotsLoading(false);
      }
    };
    loadTimeslots();
  }, [fieldId, date]);

  const toMinutesLocal = (t) => {
    const [h, m] = String(t || "").slice(0, 5).split(":").map(Number);
    return h * 60 + m;
  };

  const isSlotBooked = (slot) =>
    bookedSlots.some((r) => {
      const [s, e] = String(r).split(" - ");
      return (
        toMinutesLocal(s) < toMinutesLocal(slot.end) &&
        toMinutesLocal(e) > toMinutesLocal(slot.start)
      );
    });

  const selectedField = fields.find((f) => f.id === fieldId);

  // Auto calculate price based on field price & services
  useEffect(() => {
    if (!selectedField) return;
    const rate = Number(selectedField.price_per_hour || 0);
    let hours = 0;
    if (startTime && endTime) {
      const sh = toMinutesLocal(startTime);
      const eh = toMinutesLocal(endTime);
      hours = Math.max(1, (eh - sh) / 60);
    }
    const servCost = selectedServices.reduce(
      (sum, s) => sum + s.quantity * (Number(s.price) || 0),
      0
    );
    if (rate > 0 && hours > 0) {
      setPrice(rate * hours + servCost);
    } else if (servCost > 0 && !price) {
      setPrice(servCost);
    }
  }, [fieldId, startTime, endTime, selectedServices, selectedField]);

  const handleSubmit = async () => {
    if (!fieldId || !customerId || !date || !startTime || !endTime) {
      showToast("Vui lòng chọn sân, khách hàng, ngày và khung giờ", "warning");
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
        total_price: Number(price) || 0,
        services: selectedServices.map((s) => ({
          service_id: s.service_id,
          quantity: s.quantity,
          total_price: s.quantity * s.price,
          shoe_size: s.shoe_size || null,
        })),
      });
      showToast("Thêm đơn đặt thành công", "success");
      onSuccess();
      onClose();
    } catch (error) {
      console.log(error);
      showToast("Lỗi khi thêm đơn đặt", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="material-symbols-outlined modal-title-icon">
              add_circle
            </span>
            <div>
              <h3>Thêm đơn đặt sân</h3>
              <p className="modal-subtitle">
                Điền thông tin để tạo lịch đặt sân mới
              </p>
            </div>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            title="Đóng"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-body bm-modal-body bm-two-col-grid">
          {/* Left column */}
          <div className="modal-col">
            {/* 1. Chọn Khách hàng (Dropdown có mũi tên nhỏ xuống) */}
            <div className="modal-section">
              <div className="modal-section-heading">
                <span className="material-symbols-outlined">person</span>
                Khách hàng đặt sân
              </div>
              <CustomerDropdownSelect
                users={users}
                selectedId={customerId}
                onSelect={setCustomerId}
                userSearch={userSearch}
                onSearchChange={setUserSearch}
              />
            </div>

            {/* 2. Chọn Sân bóng (Dropdown có mũi tên nhỏ xuống) */}
            <div className="modal-section">
              <div className="modal-section-heading">
                <span className="material-symbols-outlined">stadium</span>
                Sân bóng thi đấu
              </div>
              <FieldDropdownSelect
                fields={fields}
                selectedId={fieldId}
                onSelect={(id) => {
                  setFieldId(id);
                  setStartTime("");
                  setEndTime("");
                }}
                fieldSearch={fieldSearch}
                onSearchChange={setFieldSearch}
              />
            </div>

            {/* 3. Dịch vụ & Tiện ích thêm (Luôn hiển thị với giao diện thẻ card tối ưu) */}
            <ServicesSection
              availableServices={availableServices}
              selectedServices={selectedServices}
              setSelectedServices={setSelectedServices}
            />
          </div>

          {/* Right column */}
          <div className="modal-col">
            <div className="modal-section">
              <div className="form-row-2">
                <div className="form-field-group">
                  <label>
                    <span className="material-symbols-outlined">
                      calendar_today
                    </span>
                    Ngày đặt
                  </label>
                  <input
                    className="form-input"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setStartTime("");
                      setEndTime("");
                    }}
                  />
                </div>
                <div className="form-field-group">
                  <label>
                    <span className="material-symbols-outlined">payments</span>
                    Tổng tiền (VNĐ)
                  </label>
                  <input
                    className="form-input price-input"
                    type="number"
                    placeholder="Nhập số tiền..."
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  {Number(price) > 0 && (
                    <p className="price-preview">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "0.9rem" }}
                      >
                        payments
                      </span>
                      {Number(price).toLocaleString("vi-VN")}đ
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-section">
              <div className="modal-section-heading-row">
                <div className="modal-section-heading">
                  <span className="material-symbols-outlined">schedule</span>
                  Khung giờ đặt sân
                </div>
                <span className="slot-legend">
                  {timeslotsLoading || slotLoading
                    ? "Đang kiểm tra..."
                    : "Đỏ = Đã đặt/Khóa"}
                </span>
              </div>
              {!fieldId ? (
                <div className="slot-hint">
                  <span className="material-symbols-outlined">info</span>
                  Chọn sân bóng ở mục bên cạnh để xem khung giờ trống
                </div>
              ) : timeslotsLoading ? (
                <div className="slot-hint">
                  <span className="material-symbols-outlined">
                    hourglass_empty
                  </span>
                  Đang tải khung giờ...
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="slot-hint">
                  <span className="material-symbols-outlined">info</span>
                  Không có khung giờ khả dụng cho ngày này
                </div>
              ) : (
                <div className="booking-time-slot-grid">
                  {timeSlots.map((slot) => {
                    const isBooked = isSlotBooked(slot);
                    const isBlocked = slot.status === "blocked";
                    const isUnavailable = isBooked || isBlocked;
                    const isSelected =
                      startTime === slot.start && endTime === slot.end;
                    return (
                      <button
                        type="button"
                        key={slot.start}
                        disabled={slotLoading || isUnavailable}
                        className={`booking-time-slot${
                          isUnavailable ? " booked" : ""
                        }${isBlocked ? " blocked" : ""}${
                          isSelected ? " selected" : ""
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setStartTime("");
                            setEndTime("");
                          } else {
                            setStartTime(slot.start);
                            setEndTime(slot.end);
                          }
                        }}
                      >
                        <span>
                          {slot.start} - {slot.end}
                        </span>
                        <small>
                          {isBooked
                            ? "Đã đặt"
                            : isBlocked
                            ? "Đã khóa"
                            : isSelected
                            ? "✓ Đang chọn"
                            : "Trống"}
                        </small>
                      </button>
                    );
                  })}
                </div>
              )}
              {startTime && endTime && (
                <p className="booking-time-selection">
                  <span className="material-symbols-outlined">schedule</span>
                  Khung giờ đã chọn:{" "}
                  <b>
                    {startTime} – {endTime}
                  </b>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} type="button">
            Hủy bỏ
          </button>
          <button
            className="btn-confirm"
            onClick={handleSubmit}
            disabled={loading}
            type="button"
          >
            {loading ? (
              "Đang thêm..."
            ) : (
              <>
                <span className="material-symbols-outlined">add_circle</span>
                Tạo đơn đặt sân
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const normalizeTime = (time) => String(time || "").slice(0, 5);
const toMinutes = (time) => {
  const [hours, minutes] = normalizeTime(time).split(":").map(Number);
  return hours * 60 + minutes;
};

const STATUS_QUICK = [
  { value: 'Pending', label: 'Chờ xác nhận', icon: 'pending_actions', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'Confirmed', label: 'Đã xác nhận', icon: 'check_circle', color: '#059669', bg: '#ecfdf5' },
  { value: 'Checked_in', label: 'Đã check-in', icon: 'login', color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'Completed', label: 'Hoàn thành', icon: 'task_alt', color: '#166534', bg: '#dcfce7' },
  { value: 'Cancelled', label: 'Đã hủy', icon: 'cancel', color: '#dc2626', bg: '#fef2f2' },
];

/* ── Sleek Dropdown Select for Status with Down Arrow ── */
function StatusDropdownSelect({ status, onStatusChange, showToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentStatusInfo =
    STATUS_QUICK.find(
      (s) => s.value.toLowerCase() === String(status || "").toLowerCase()
    ) || STATUS_QUICK[0];

  return (
    <div className="form-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`form-dropdown-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          borderLeft: `4px solid ${currentStatusInfo.color}`,
        }}
      >
        <div className="dropdown-trigger-content">
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: currentStatusInfo.bg,
              color: currentStatusInfo.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "1.2rem" }}
            >
              {currentStatusInfo.icon}
            </span>
          </div>
          <div className="dropdown-selected-text">
            <div className="dropdown-selected-title">
              <span>{currentStatusInfo.label}</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: currentStatusInfo.color,
                  background: currentStatusInfo.bg,
                  padding: "1px 6px",
                  borderRadius: "4px",
                  marginLeft: "4px",
                }}
              >
                Hiện tại
              </span>
            </div>
            <span className="dropdown-selected-sub">Bấm để thay đổi trạng thái</span>
          </div>
        </div>
        <span className="material-symbols-outlined dropdown-arrow-icon">
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="form-dropdown-menu">
          <div className="dropdown-items-list">
            {STATUS_QUICK.map((s) => {
              const isActive =
                String(status || "").toLowerCase() === s.value.toLowerCase();
              const isCancelStatus = s.value.toLowerCase() === "cancelled";
              const canCancel = hasPermission("bookings_cancel");
              const isDisallowed = isCancelStatus && !canCancel;

              return (
                <button
                  key={s.value}
                  type="button"
                  className={`dropdown-item-btn ${isActive ? "selected" : ""}`}
                  style={{
                    opacity: isDisallowed ? 0.45 : 1,
                    cursor: isDisallowed ? "not-allowed" : "pointer",
                  }}
                  onClick={() => {
                    if (isDisallowed) {
                      showToast(
                        "Bạn không có quyền Hủy đơn đặt sân. Chỉ Quản lý hoặc Chủ sân mới có quyền này!",
                        "warning"
                      );
                      return;
                    }
                    onStatusChange(s.value);
                    setIsOpen(false);
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: s.bg,
                      color: s.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "1.1rem" }}
                    >
                      {s.icon}
                    </span>
                  </div>
                  <div className="qs-info" style={{ flex: 1 }}>
                    <span
                      className="qs-name"
                      style={{
                        color: isActive ? s.color : "#1e293b",
                        fontWeight: isActive ? 700 : 600,
                      }}
                    >
                      {s.label}
                    </span>
                    <span className="qs-sub">
                      {isDisallowed
                        ? "Yêu cầu quyền Quản lý/Chủ sân"
                        : isActive
                        ? "Đang áp dụng"
                        : "Chọn để cập nhật"}
                    </span>
                  </div>
                  {isActive && (
                    <span
                      className="material-symbols-outlined qs-check"
                      style={{ color: s.color, fontSize: "1.1rem" }}
                    >
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EditBookingModal({ booking, onClose, onSuccess, showToast }) {
  const [fields, setFields] = useState([]);
  const [date, setDate] = useState(booking.date || "");
  const timeParts = (booking.time || "").split(" - ");
  const [startTime, setStartTime] = useState(normalizeTime(timeParts[0]));
  const [endTime2, setEndTime2] = useState(normalizeTime(timeParts[1]));
  const [price, setPrice] = useState(booking.price || "");
  const [status, setStatus] = useState(booking.status || "Pending");
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeslotsLoading, setTimeslotsLoading] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);

  useEffect(() => {
    getFields().then(res => setFields(res.data.fields || [])).catch(console.error);

    fetch(`${BASE_URL}/services/list/?admin=true`)
      .then(res => res.json())
      .then(data => setAvailableServices(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch(`${BASE_URL}/services/booking-services/${booking.id}/`)
      .then(res => res.json())
      .then(data => {
        setSelectedServices(data.map(s => ({
          service_id: s.service_id,
          quantity: s.quantity,
          price: s.total_price / (s.quantity || 1),
          shoe_size: s.shoe_size || ''
        })));
      })
      .catch(console.error);
  }, [booking.id]);

  const effectiveFieldId = booking.field_id || fields.find(f => f.field_name === booking.field)?.id;

  useEffect(() => {
    if (!effectiveFieldId || !date) return;
    const loadBookedSlots = async () => {
      try {
        setSlotLoading(true);
        const response = await fetch(`${BASE_URL}/bookings/booked-slots/?field_id=${effectiveFieldId}&date=${date}&exclude_booking_id=${booking.id}`);
        const data = await response.json();
        setBookedSlots(response.ok ? (data.booked_slots || []) : []);
      } catch (error) {
        console.error("Lỗi tải khung giờ đã đặt:", error);
        setBookedSlots([]);
      } finally {
        setSlotLoading(false);
      }
    };
    loadBookedSlots();
  }, [effectiveFieldId, booking.id, date]);

  useEffect(() => {
    if (!effectiveFieldId || !date) return;
    const loadTimeslots = async () => {
      try {
        setTimeslotsLoading(true);
        const res = await timeslotsApi.getByField(effectiveFieldId, date);
        const slots = res.data || [];
        // Format all slots regardless of status
        const formattedSlots = slots.map(slot => ({
          start: slot.start_time?.slice(0, 5) || '',
          end: slot.end_time?.slice(0, 5) || '',
          price: slot.price,
          status: slot.status
        }));
        setTimeSlots(formattedSlots);
      } catch (error) {
        console.error("Lỗi tải timeslots:", error);
        setTimeSlots([]);
      } finally {
        setTimeslotsLoading(false);
      }
    };
    loadTimeslots();
  }, [effectiveFieldId, date]);
  const isSlotBooked = (slot) => bookedSlots.some((range) => {
    const [bookedStart, bookedEnd] = String(range).split(" - ");
    return toMinutes(bookedStart) < toMinutes(slot.end) && toMinutes(bookedEnd) > toMinutes(slot.start);
  });

  const handleSubmit = async () => {
    if (!date || !startTime || !endTime2) {
      showToast("Vui lòng chọn ngày và khung giờ đặt sân", "warning");
      return;
    }
    if (bookedSlots.some((range) => toMinutes(range.split(" - ")[0]) < toMinutes(endTime2) && toMinutes(range.split(" - ")[1]) > toMinutes(startTime))) {
      showToast("Khung giờ này đã có lịch đặt. Vui lòng chọn giờ khác.", "warning");
      return;
    }
    try {
      setLoading(true);

      await updateBooking(booking.id, {
        booking_date: date,
        start_time: startTime,
        end_time: endTime2,
        total_price: Number(price) || 0,
        status: status,
        services: selectedServices.map(s => ({
          service_id: s.service_id,
          quantity: s.quantity,
          total_price: s.quantity * s.price,
          shoe_size: s.shoe_size || null
        }))
      });

      showToast("Cập nhật đơn thành công", "success");
      onSuccess();
      onClose();

    } catch (error) {
      console.log("=== FULL ERROR ===", error);
      showToast("Lỗi khi cập nhật", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="material-symbols-outlined modal-title-icon" style={{ color: '#059669' }}>edit_note</span>
            <div>
              <h3>Sửa đơn đặt sân</h3>
              <p className="modal-subtitle">
                <span className="modal-booking-id">#BK{booking.id?.substring(0, 8).toUpperCase()}</span>
                {' · '}{booking.name || 'Khách hàng'} · {booking.field || 'Sân bóng'}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} title="Đóng"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="modal-body bm-modal-body">
          {/* Top banner: Booking Summary */}
          <div className="booking-summary-card" style={{ marginBottom: '1rem' }}>
            <div className="bsc-item">
              <span className="material-symbols-outlined">person</span>
              <div>
                <small>Khách hàng</small>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong>{booking.name || 'Chưa cập nhật'}</strong>
                  {booking.is_guest ? (
                    <span className="tag-guest" style={{ fontSize: '10px', padding: '1px 5px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>directions_walk</span>
                      Vãng lai
                    </span>
                  ) : (
                    <span className="tag-member" style={{ fontSize: '10px', padding: '1px 5px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>verified</span>
                      Thành viên
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="bsc-item">
              <span className="material-symbols-outlined">call</span>
              <div>
                <small>Số điện thoại</small>
                <strong>{booking.phone || 'Chưa có SĐT'}</strong>
              </div>
            </div>
            <div className="bsc-item">
              <span className="material-symbols-outlined">stadium</span>
              <div>
                <small>Sân đặt</small>
                <strong>{booking.field || 'Sân bóng'}</strong>
              </div>
            </div>
          </div>

          <div className="bm-two-col-grid">
            {/* Left column */}
            <div className="modal-col">
              {/* 1. Trạng thái đơn (Dropdown có mũi tên nhỏ xuống) */}
              <div className="modal-section">
                <div className="modal-section-heading">
                  <span className="material-symbols-outlined">flag</span>
                  Trạng thái đơn
                </div>
                <StatusDropdownSelect
                  status={status}
                  onStatusChange={setStatus}
                  showToast={showToast}
                />
              </div>

              {/* 2. Dịch vụ & Tiện ích thêm (Luôn hiển thị với giao diện thẻ card tối ưu) */}
              <ServicesSection
                availableServices={availableServices}
                selectedServices={selectedServices}
                setSelectedServices={setSelectedServices}
              />
            </div>

            {/* Right column */}
            <div className="modal-col">
              <div className="modal-section">
                <div className="form-row-2">
                  <div className="form-field-group">
                    <label><span className="material-symbols-outlined">calendar_today</span>Ngày đặt</label>
                    <input className="form-input" type="date" value={date} onChange={e => { setDate(e.target.value); setStartTime(""); setEndTime2(""); }} />
                  </div>
                  <div className="form-field-group">
                    <label><span className="material-symbols-outlined">payments</span>Tổng tiền (VNĐ)</label>
                    <input className="form-input price-input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Nhập số tiền..." />
                    {Number(price) > 0 && <p className="price-preview"><span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>payments</span>{Number(price).toLocaleString('vi-VN')}đ</p>}
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <div className="modal-section-heading-row">
                  <div className="modal-section-heading"><span className="material-symbols-outlined">schedule</span>Khung giờ đặt sân</div>
                  <span className="slot-legend">{timeslotsLoading || slotLoading ? "Đang kiểm tra..." : "Đỏ = Đã đặt/Khóa"}</span>
                </div>
                {timeslotsLoading ? (
                  <div className="slot-hint"><span className="material-symbols-outlined">hourglass_empty</span>Đang tải khung giờ...</div>
                ) : timeSlots.length === 0 ? (
                  <div className="slot-hint"><span className="material-symbols-outlined">info</span>Không có khung giờ khả dụng cho ngày này</div>
                ) : (
                  <div className="booking-time-slot-grid">
                    {timeSlots.map((slot) => {
                      const isBooked = isSlotBooked(slot);
                      const isBlocked = slot.status === 'blocked';
                      const isUnavailable = isBooked || isBlocked;
                      const isSelected = startTime === slot.start && endTime2 === slot.end;
                      return (
                        <button type="button" key={slot.start} disabled={slotLoading || isUnavailable}
                          className={`booking-time-slot${isUnavailable ? " booked" : ""}${isBlocked ? " blocked" : ""}${isSelected ? " selected" : ""}`}
                          onClick={() => {
                            if (isSelected) {
                              setStartTime("");
                              setEndTime2("");
                            } else {
                              setStartTime(slot.start);
                              setEndTime2(slot.end);
                            }
                          }}>
                          <span>{slot.start} - {slot.end}</span>
                          <small>{isBooked ? "Đã đặt" : isBlocked ? "Đã khóa" : isSelected ? "✓ Đang chọn" : "Trống"}</small>
                        </button>
                      );
                    })}
                  </div>
                )}
                {startTime && endTime2 && (
                  <p className="booking-time-selection">
                    <span className="material-symbols-outlined">schedule</span>Khung giờ: <b>{startTime} – {endTime2}</b>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button className="btn-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang lưu..." : <><span className="material-symbols-outlined">save</span>Lưu thay đổi</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Bookings Component ── */
export default function Bookings() {
  const location = useLocation();

  const [bookings, setBookings] = useState([]);
  const [fields, setFields] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [newBookingField, setNewBookingField] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const { toasts, removeToast, toast } = useToast();

  // URL query pre-fill
  const urlSearch = new URLSearchParams(location.search).get("search") || "";
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedField, setSelectedField] = useState("");
  const [guestFilter, setGuestFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'schedule'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const s = new URLSearchParams(location.search).get("search");
    if (s) {
      setSearchQuery(s);
      setViewMode("table");
    }
  }, [location.search]);

  useEffect(() => {
    fetchBookings();
    fetchNotifications();
    loadFields();

    const notificationInterval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(notificationInterval);
  }, []);

  const loadFields = async () => {
    try {
      const res = await getFields();
      setFields(res.data?.fields || []);
    } catch (err) {
      console.error("Lỗi tải danh sách sân:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const userData = JSON.parse(
        localStorage.getItem("admin_user") || localStorage.getItem("user")
      );
      if (userData?.id) {
        const res = await fetch(
          `${BASE_URL}/notifications/?customer_id=${userData.id}`
        );
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.log("Lỗi load notifications:", err);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await fetch(`${BASE_URL}/notifications/mark-as-read/${notificationId}/`, {
        method: "PUT",
      });
      fetchNotifications();
    } catch (err) {
      console.log("Lỗi đánh dấu đã đọc:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const userData = JSON.parse(
        localStorage.getItem("admin_user") || localStorage.getItem("user")
      );
      if (userData?.id) {
        await fetch(`${BASE_URL}/notifications/mark-all-as-read/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_id: userData.id }),
        });
        fetchNotifications();
      }
    } catch (err) {
      console.log("Lỗi đánh dấu tất cả đã đọc:", err);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await getBookings();
      setBookings(res.data || []);
      fetchNotifications();
    } catch (err) {
      console.log("Lỗi load bookings:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa đơn đặt này không?")) {
      try {
        await deleteBooking(id);
        toast.success("Xóa đơn thành công");
        fetchBookings();
      } catch {
        toast.error("Lỗi khi xóa");
      }
    }
  };

  const handleQuickApprove = async (id) => {
    try {
      await updateBooking(id, { status: "Confirmed" });
      toast.success("Đã xác nhận duyệt đơn thành công!");
      fetchBookings();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Lỗi khi duyệt đơn");
    }
  };

  const openAddBooking = (field = null) => {
    setNewBookingField(field);
    setShowAddModal(true);
  };

  const todayStr = new Date().toLocaleDateString("en-CA");

  const todayCount = bookings.filter((b) => {
    if (!b.date) return false;
    return String(b.date).slice(0, 10) === todayStr;
  }).length;

  // Counts for tabs
  const tabCounts = {
    all: bookings.length,
    today: todayCount,
    pending: bookings.filter(
      (b) => String(b.status || "").toLowerCase() === "pending"
    ).length,
    guest: bookings.filter((b) => Boolean(b.is_guest)).length,
    confirmed: bookings.filter((b) =>
      ["confirmed", "checked_in"].includes(String(b.status || "").toLowerCase())
    ).length,
    completed: bookings.filter(
      (b) => String(b.status || "").toLowerCase() === "completed"
    ).length,
    cancelled: bookings.filter(
      (b) => String(b.status || "").toLowerCase() === "cancelled"
    ).length,
  };

  // Filter bookings based on all criteria
  const filteredBookings = bookings.filter((b) => {
    // 1. Tab filtering
    if (activeTab === "today") {
      if (String(b.date || "").slice(0, 10) !== todayStr) return false;
    } else if (activeTab === "pending") {
      if (String(b.status || "").toLowerCase() !== "pending") return false;
    } else if (activeTab === "guest") {
      if (!b.is_guest) return false;
    } else if (activeTab === "confirmed") {
      if (!["confirmed", "checked_in"].includes(String(b.status || "").toLowerCase()))
        return false;
    } else if (activeTab === "completed") {
      if (String(b.status || "").toLowerCase() !== "completed") return false;
    } else if (activeTab === "cancelled") {
      if (String(b.status || "").toLowerCase() !== "cancelled") return false;
    }

    // 2. Search query (ID, Name, Phone, Notes)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = String(b.id || "").toLowerCase().includes(q);
      const matchName = String(b.name || "").toLowerCase().includes(q);
      const matchPhone = String(b.phone || "").toLowerCase().includes(q);
      const matchNotes = String(b.notes || "").toLowerCase().includes(q);
      if (!matchId && !matchName && !matchPhone && !matchNotes) return false;
    }

    // 3. Field filter
    if (selectedField && b.field !== selectedField) return false;

    // 4. Guest / Member dropdown filter
    if (guestFilter === "guest" && !b.is_guest) return false;
    if (guestFilter === "member" && b.is_guest) return false;

    // 5. Date filter
    if (selectedDate && String(b.date || "").slice(0, 10) !== selectedDate)
      return false;

    return true;
  });

  // Reset page when filters change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleFieldChange = (val) => {
    setSelectedField(val);
    setCurrentPage(1);
  };

  const handleGuestFilterChange = (val) => {
    setGuestFilter(val);
    setCurrentPage(1);
  };

  const handleDateChange = (val) => {
    setSelectedDate(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedField("");
    setGuestFilter("all");
    setSelectedDate("");
    setActiveTab("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedField) ||
    guestFilter !== "all" ||
    Boolean(selectedDate) ||
    activeTab !== "all";

  // Pagination slice
  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AdminSidebar />

      <TopHeader
        onAdd={() => openAddBooking()}
        unreadCount={unreadCount}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      <main className="main-content bookings-admin-main">
        <div className="content-inner">
          {/* Page Header with View Switcher */}
          <div className="page-header">
            <div>
              <span className="booking-admin-eyebrow">
                QUẢN LÝ VẬN HÀNH <span>•</span> LƯỢT ĐẶT SÂN
              </span>
              <h2>Quản lý đặt sân</h2>
              <p>
                Theo dõi, phê duyệt và điều phối toàn bộ lịch đặt sân của thành viên
                và khách vãng lai theo thời gian thực.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {/* Segmented View Switcher */}
              <div className="bookings-view-switch">
                <button
                  type="button"
                  className={`view-switch-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                >
                  <span className="material-symbols-outlined">table_chart</span>
                  Danh sách đơn đặt
                </button>
                <button
                  type="button"
                  className={`view-switch-btn ${viewMode === "schedule" ? "active" : ""}`}
                  onClick={() => setViewMode("schedule")}
                >
                  <span className="material-symbols-outlined">calendar_view_week</span>
                  Sơ đồ theo sân
                </button>
              </div>

              <button
                className="btn-new-booking"
                onClick={() => openAddBooking()}
                type="button"
              >
                <span className="material-symbols-outlined">add</span>
                Thêm đơn mới
              </button>
            </div>
          </div>

          {/* 4 KPI Cards */}
          <KpiStatsOverview bookings={bookings} todayCount={todayCount} />

          {/* Conditional View: Timeline Schedule vs Optimized Table */}
          {viewMode === "schedule" ? (
            <div style={{ marginTop: "1rem" }}>
              <AdminScheduleOverview
                bookings={bookings}
                onAddBooking={openAddBooking}
                onEditBooking={setEditingBooking}
                onDeleteBooking={handleDelete}
              />
            </div>
          ) : (
            <>
              {/* Status Filter Tabs */}
              <FilterTabsBar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                counts={tabCounts}
              />

              {/* Advanced Filter Panel */}
              <BookingsFilterPanel
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                selectedField={selectedField}
                onFieldChange={handleFieldChange}
                guestFilter={guestFilter}
                onGuestFilterChange={handleGuestFilterChange}
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                fields={fields}
                onReset={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
              />

              {/* Data Table */}
              <BookingsTable
                bookings={paginatedBookings}
                onEdit={setEditingBooking}
                onDelete={handleDelete}
                onQuickApprove={handleQuickApprove}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalFilteredCount={filteredBookings.length}
              />
            </>
          )}
        </div>
      </main>

      {showAddModal && (
        <AddBookingModal
          defaultFieldId={newBookingField?.id}
          onClose={() => {
            setShowAddModal(false);
            setNewBookingField(null);
          }}
          onSuccess={fetchBookings}
          showToast={(msg, type) => toast[type || "info"](msg)}
        />
      )}

      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSuccess={fetchBookings}
          showToast={(msg, type) => toast[type || "info"](msg)}
        />
      )}
    </>
  );
}

