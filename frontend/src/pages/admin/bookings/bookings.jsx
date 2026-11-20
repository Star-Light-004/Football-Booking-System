import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useEffect, useState, useRef } from 'react';
import { getBookings, createBooking, updateBooking, deleteBooking, getCustomerBookingLimits } from "../../../api/bookingsApi";
import { getFields } from "../../../api/fieldsApi";
import { getUsers } from "../../../api/usersApi";
import timeslotsApi from "../../../api/timeslotsApi";
import notificationsApi from "../../../api/notificationsApi";
import { BASE_URL, SERVER_URL } from "../../../config";
import AdminScheduleOverview from "../../../components/AdminScheduleOverview/AdminScheduleOverview";
import { broadcastSyncEvent, onSyncEvent } from "../../../utils/realtimeSync";
import './bookings.css';
import './BookingModals.css';
import { useToast, ToastContainer } from "../../../components/Toast/Toast";
import { hasPermission, getCurrentUser } from "../../../utils/permissionUtils";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import { isSlotExpired, getLocalDateString } from "../../../utils/timeslotUtils";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import { LostFoundBookingPanel } from "./LostFoundPanel";
import {
  getLostFoundItems,
  updateLostFoundItem,
  deleteLostFoundItem,
  getMaintenanceIssues,
  createMaintenanceIssue,
  createCleaningLog,
  getCleaningLogs,
} from "../../../api/facilityApi";
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

function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onDeleteAll,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="notification-dropdown-wrapper">
      <button
        className="icon-btn notification-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Thông báo"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Thông báo</h3>
              {unreadCount > 0 ? (
                <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 7px", borderRadius: "10px", background: "#fee2e2", color: "#dc2626" }}>
                  {unreadCount} mới
                </span>
              ) : (
                <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 7px", borderRadius: "10px", background: "#f1f5f9", color: "#64748b" }}>
                  {notifications.length}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {unreadCount > 0 && (
                  <button
                    className="mark-all-read-btn"
                    onClick={() => onMarkAllAsRead && onMarkAllAsRead()}
                    title="Đọc tất cả"
                    style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.75rem", fontWeight: 600, color: "#059669", background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: "6px" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "0.95rem" }}>done_all</span>
                    Đọc tất cả
                  </button>
                )}
                {unreadCount > 0 && <span style={{ color: "#cbd5e1" }}>|</span>}
                <button
                  type="button"
                  onClick={() => onDeleteAll && onDeleteAll()}
                  title="Xóa tất cả"
                  style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.75rem", fontWeight: 600, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: "6px" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "0.95rem" }}>delete_sweep</span>
                  Xóa tất cả
                </button>
              </div>
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
                  className={`notification-item ${!notif.is_read ? "unread" : ""}`}
                  onClick={() => {
                    if (!notif.is_read && onMarkAsRead) {
                      onMarkAsRead(notif.id);
                    }
                  }}
                  style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", position: "relative" }}
                >
                  <div className="notification-icon">
                    <span
                      className="material-symbols-outlined"
                      style={{
                        color:
                          notif.notification_type === "booking_cancelled"
                            ? "#ef4444"
                            : notif.notification_type === "booking_approved"
                            ? "#16a34a"
                            : notif.notification_type === "booking_pending"
                            ? "#f59e0b"
                            : "#3b82f6",
                      }}
                    >
                      {notif.notification_type === "booking_cancelled"
                        ? "cancel"
                        : notif.notification_type === "booking_approved"
                        ? "check_circle"
                        : notif.notification_type === "booking_pending"
                        ? "schedule"
                        : "info"}
                    </span>
                  </div>
                  <div className="notification-content" style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: "0 0 2px 0", fontSize: "0.85rem", fontWeight: 700 }}>{notif.title}</h4>
                    <p style={{ margin: "0 0 4px 0", fontSize: "0.78rem", color: "#475569", lineHeight: 1.4 }}>{notif.message}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: "#94a3b8" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "0.82rem" }}>schedule</span>
                      <span>{new Date(notif.created_at).toLocaleString("vi-VN")}</span>
                      {!notif.is_read && <span style={{ color: "#16a34a", fontWeight: 600 }}>• Chưa đọc</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDelete) onDelete(notif.id);
                    }}
                    title="Xóa thông báo này"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "2px",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>close</span>
                  </button>
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
  onDelete,
  onDeleteAll,
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
            onDelete={onDelete}
            onDeleteAll={onDeleteAll}
          />
          <button className="icon-btn" type="button" title="Trợ giúp">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
        <div className="header-divider" />
        <button className="btn-new-booking" type="button" onClick={onAdd}>
          <span className="material-symbols-outlined">add</span>
          Đặt sân mới
        </button>
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
    { key: "lost_found", label: "Đồ khách quên", count: counts.lost_found || 0, isLost: true },
  ];

  return (
    <div className="filter-tabs-bar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`filter-tab-btn ${activeTab === tab.key ? "active" : ""} ${
            tab.isGuest ? "guest-tab" : ""
          } ${tab.isLost ? "lost-tab" : ""}`}
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
          {tab.isLost && (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "1rem", verticalAlign: "middle" }}
            >
              luggage
            </span>
          )}
          {tab.label}
          <span
            className={`filter-tab-count ${tab.urgent ? "urgent" : ""} ${
              tab.isLost && counts.lost_found > 0 ? "urgent" : ""
            }`}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── LostFoundBookingPanel & EditLostItemModal được tách sang module ./LostFoundPanel.jsx dùng chung cho Đặt Sân & Vệ Sinh ── */

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
  datePeriod,
  onDatePeriodChange,
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

      {/* Date Period Quick Filter Pills */}
      <div className="filter-period-row">
        <div className="filter-period-pills">
          <span className="filter-period-label">
            <span className="material-symbols-outlined">calendar_month</span>
            Khoảng thời gian:
          </span>
          {[
            { key: "all", label: "Tất cả" },
            { key: "today", label: "Hôm nay" },
            { key: "week", label: "Tuần này" },
            { key: "month", label: "Tháng này" },
            { key: "year", label: "Năm nay" },
          ].map((p) => (
            <button
              key={p.key}
              type="button"
              className={`filter-period-btn ${datePeriod === p.key ? "active" : ""}`}
              onClick={() => onDatePeriodChange(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const BookingServiceRowItems = ({ bookingId, hasNotes }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${BASE_URL}/services/booking-services/${bookingId}/`);
        const data = await res.json();
        setServices(data || []);
      } catch (err) {
        console.error("Lỗi lấy dịch vụ:", err);
      } finally {
        setLoading(false);
      }
    };
    if (bookingId) fetchServices();
  }, [bookingId]);

  if (loading) return null;

  if (services.length === 0) {
    if (hasNotes) return null; // Nếu đã có ghi chú thì không hiển thị 'Không có' để tránh chồng chéo
    return <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>;
  }

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
  onCompleteMatch,
  onViewNote,
  currentPage,
  totalPages,
  onPageChange,
  totalFilteredCount,
  pitchCleaningStatus,
  pitchMaintenanceIssues,
  onRequestMaintenance,
  fields,
  cleaningLogs = [],
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
              <th style={{ width: "9%" }}>Mã đơn</th>
              <th style={{ width: "18%" }}>Khách hàng</th>
              <th style={{ width: "12%" }}>Sân bóng</th>
              <th style={{ width: "13%" }}>Thời gian</th>
              <th style={{ width: "12%" }}>Dịch vụ &amp; Ghi chú</th>
              <th className="right" style={{ width: "14%" }}>Tổng tiền</th>
              <th className="center" style={{ width: "11%" }}>Trạng thái</th>
              <th className="right" style={{ width: "11%" }}>Thao tác</th>
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
                      className={`booking-id ${b.status === "cancelled" ? "cancelled" : ""
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
                        {(() => {
                          const raw = String(b.time || "");
                          return raw
                            .split("-")
                            .map((p) => {
                              const trimmed = p.trim();
                              const m = trimmed.match(/^(\d{1,2}:\d{2})/);
                              return m ? m[1] : trimmed;
                            })
                            .join(" - ");
                        })()}
                      </p>
                    </div>
                  </td>

                  {/* Dịch vụ thêm & Note ghi chú */}
                  <td style={{ width: "12%" }}>
                    {(() => {
                      const cleanNote = String(b.notes || "")
                        .replace(/\[Mã nhóm:[^\]]+\]/gi, "")
                        .replace(/\[Gộp cùng[^\]]+\]/gi, "")
                        .trim();
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-start" }}>
                          <BookingServiceRowItems bookingId={b.id} hasNotes={Boolean(cleanNote)} />
                          {cleanNote && (
                            <button
                              type="button"
                              className="btn-view-customer-note"
                              title="Bấm để xem ghi chú của khách hàng"
                              onClick={() =>
                                onViewNote &&
                                onViewNote({
                                  name: b.name,
                                  phone: b.phone,
                                  note: cleanNote,
                                  field: b.field,
                                  time: b.time,
                                  date: b.date,
                                  id: b.id,
                                })
                              }
                            >
                              <span className="material-symbols-outlined">
                                description
                              </span>
                              <span>Xem ghi chú</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Tổng tiền & Thông tin thanh toán */}
                  <td className="right" style={{ whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span className="price" style={{ color: "#0f172a", fontSize: "0.95rem", fontWeight: 700 }}>
                        {Number(b.price || 0).toLocaleString("vi-VN")}đ
                      </span>

                      {/* Thông tin thanh toán & Tiền cọc */}
                      {(() => {
                        const pay = b.payment_info || {};
                        const badgeType = pay.badge_type || "pay_at_field";
                        const iconMap = {
                          deposit_paid: "payments",
                          full_paid: "verified",
                          pending_deposit: "hourglass_top",
                          pending_full: "hourglass_top",
                          pay_at_field: "storefront",
                        };
                        const icon = iconMap[badgeType] || "payments";

                        return (
                          <div className="pay-badge-wrapper" style={{ alignItems: "flex-end" }}>
                            <span className={`pay-badge pay-badge--${badgeType}`}>
                              <span className="material-symbols-outlined">{icon}</span>
                              <span>{pay.status_label || "Thanh toán tại sân"}</span>
                            </span>
                            {pay.sub_label && (
                              <span
                                className={`pay-subtext ${
                                  badgeType === "deposit_paid"
                                    ? "pay-subtext--warning"
                                    : badgeType.startsWith("pending")
                                    ? "pay-subtext--amber"
                                    : "pay-subtext--muted"
                                }`}
                              >
                                {pay.sub_label}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
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
                      {/* Nút icon chổi báo dọn vệ sinh khẩn cấp: ẨN KHI ĐÃ BẤM DỌN XONG Ở TRANG VỆ SINH SÂN */}
                      {(() => {
                        const s = String(b.status || "").toLowerCase();
                        if (!["confirmed", "checked_in"].includes(s)) return null;

                        const bId = String(b.id || "");
                        const bField = (b.field || "").trim().toLowerCase();
                        const bTime = (b.time || "").trim();

                        // 1. Kiểm tra từ CSDL cleaningLogs: nếu ca này đã có bản ghi status = 'clean' (đã dọn xong) -> ẨN NÚT ICON CHỔI!
                        const isCleanedInLogs = (cleaningLogs || []).some((log) => {
                          if (log.status !== "clean") return false;
                          const logBId = String(log.booking_id || log.booking || "");
                          if (logBId && bId) {
                            return logBId === bId;
                          }

                          const logField = String(log.field_name || log.fieldName || "").trim().toLowerCase();
                          const logTime = String(log.cleaned_match_time || "").trim();
                          const logDate = String(log.created_at || "").slice(0, 10);
                          const bDate = String(b.date || b.booking_date || "").trim();
                          if (bField && logField === bField && bTime && logTime === bTime) {
                            if (bDate && logDate) {
                              return logDate === bDate;
                            }
                          }

                          return false;
                        });
                        if (isCleanedInLogs) return null;

                        // 2. Kiểm tra từ pitchCleaningStatus (localStorage): nếu sân đã ghi nhận dọn xong ca này
                        const fieldStatus = pitchCleaningStatus[b.field] || (b.field_id && pitchCleaningStatus[b.field_id]);
                        if (fieldStatus) {
                          if (fieldStatus.cleanedSessions && fieldStatus.cleanedSessions.some((cs) => cs.time === bTime)) {
                            return null;
                          }
                          if (fieldStatus.cleanedBookingKey && fieldStatus.cleanedBookingKey.includes(bTime)) {
                            return null;
                          }
                        }

                        return (
                          <button
                            className="action-btn cleaning report-cleaning"
                            title="Báo dọn vệ sinh khẩn cấp cho sân ca này"
                            onClick={() => onCompleteMatch && onCompleteMatch(b)}
                          >
                            <span className="material-symbols-outlined">cleaning_services</span>
                          </button>
                        );
                      })()}

                      {/* Nút icon bảo trì khẩn cấp cho Quản lý đặt sân (bên phải nút chổi clean): ẨN KHI ĐÃ SỬA XONG */}
                      {(() => {
                        const bField = (b.field || "").trim().toLowerCase();
                        const bTime = (b.time || "").trim();
                        const matchIssue = (pitchMaintenanceIssues || []).find((i) => {
                          const isSameField = (i.fieldName || i.field_name || "").trim().toLowerCase() === bField;
                          const isSameBooking = i.bookingId && String(i.bookingId) === String(b.id);
                          const isSameTime = (i.bookingTime && i.bookingTime === bTime) || (i.description && i.description.includes(bTime));
                          return isSameField && (isSameBooking || isSameTime);
                        });

                        const isMatchHasActiveIssue = Boolean(matchIssue && matchIssue.status !== "done" && matchIssue.status !== "resolved");
                        const isMatchRepaired = Boolean(matchIssue && (matchIssue.status === "done" || matchIssue.status === "resolved"));

                        // Nếu đã sửa xong thì mất nút icon bảo trì đi theo yêu cầu của user
                        if (isMatchRepaired) return null;

                        return ["confirmed", "checked_in"].includes(String(b.status || "").toLowerCase()) ? (
                          <button
                            className={`action-btn maintenance report-maintenance ${isMatchHasActiveIssue ? "has-alert" : ""}`}
                            title={
                              isMatchHasActiveIssue
                                ? `Sân ca này đang có sự cố: ${matchIssue.category} (Đang chờ kỹ thuật sửa)`
                                : "Báo sự cố & Bảo trì khẩn cấp cho sân ca này"
                            }
                            onClick={() => onRequestMaintenance && onRequestMaintenance(b, matchIssue)}
                          >
                            <span className="material-symbols-outlined">
                              {isMatchHasActiveIssue ? "warning" : "construction"}
                            </span>
                          </button>
                        ) : null;
                      })()}

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
                        onClick={() => onDelete(b)}
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
function ServiceSelector({ availableServices, selectedServices, setSelectedServices, showToast }) {
  if (availableServices.length === 0) {
    return (
      <div className="services-empty-state">
        <span className="material-symbols-outlined">inventory_2</span>
        <p>Không có dịch vụ nào khả dụng</p>
      </div>
    );
  }

  const notify = (msg, type = "warning") => {
    if (typeof showToast === "function") {
      showToast(msg, type);
    } else {
      console.warn(msg);
    }
  };

  const toggleService = (s) => {
    const isSelected = selectedServices.some((x) => x.service_id === s.id);
    if (isSelected) {
      setSelectedServices(selectedServices.filter((x) => x.service_id !== s.id));
    } else {
      const stock = s.stock !== undefined ? Number(s.stock) : 999;
      if (stock <= 0) {
        notify(`Dịch vụ "${s.name}" hiện đã hết hàng trong kho!`);
        return;
      }
      setSelectedServices([
        ...selectedServices,
        { service_id: s.id, quantity: 1, price: s.price, shoe_size: "" },
      ]);
    }
  };

  const updateQuantity = (serviceId, delta) => {
    const s = availableServices.find((x) => x.id === serviceId);
    const stock = s?.stock !== undefined ? Number(s.stock) : 999;

    setSelectedServices(
      selectedServices.map((x) => {
        if (x.service_id === serviceId) {
          if (delta > 0 && x.quantity >= stock) {
            notify(`Dịch vụ "${s?.name || ''}" chỉ còn ${stock} sản phẩm trong kho! Không thể chọn thêm.`);
            return x;
          }
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
        const stock = s.stock !== undefined ? Number(s.stock) : 0;
        const isOutOfStock = stock <= 0;

        return (
          <div
            key={s.id}
            className={`service-card ${selected ? "selected" : ""} ${isOutOfStock ? "out-of-stock" : ""}`}
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
            title={
              isOutOfStock
                ? `Dịch vụ "${s.name}" đã hết hàng trong kho`
                : selected
                ? "Bấm để bỏ chọn dịch vụ này"
                : `Bấm để thêm dịch vụ này (Tồn kho: ${stock})`
            }
            style={isOutOfStock ? { opacity: 0.6, cursor: "not-allowed" } : {}}
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
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: "0.72rem",
                      color: isOutOfStock ? "#dc2626" : stock <= 3 ? "#e11d48" : "#4b5563",
                      fontWeight: 600,
                    }}
                  >
                    · {isOutOfStock ? "Hết hàng" : `Kho: ${stock}`}
                  </span>
                </span>
              </div>
              <div className="service-card-check">
                <span className="material-symbols-outlined">
                  {isOutOfStock ? "block" : selected ? "check_circle" : "add_circle"}
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
                    disabled={selected.quantity >= stock}
                    title={selected.quantity >= stock ? `Tồn kho tối đa: ${stock}` : "Tăng số lượng"}
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
                {selectedField.min_price || selectedField.price_per_hour
                  ? `Giá từ ${Number(selectedField.min_price || selectedField.price_per_hour).toLocaleString(
                    "vi-VN"
                  )}đ/giờ`
                  : ""}{" "}
                {selectedField.location ? `· ${selectedField.location}` : ""}
              </span>
            </div>
          ) : (
            <span className="dropdown-placeholder">
              {fields.length === 0
                ? "Không có sân nào mở khung giờ trong ngày này"
                : "Bấm để chọn sân bóng thi đấu..."}
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
              const displayPrice = f.min_price || f.price_per_hour;
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
                      {displayPrice
                        ? `Giá từ ${Number(displayPrice).toLocaleString(
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
              <p className="qs-empty">
                {fields.length === 0
                  ? "Không có sân nào mở khung giờ trong ngày này"
                  : "Không tìm thấy sân phù hợp"}
              </p>
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
  showToast,
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
          showToast={showToast}
        />
      </div>
    </div>
  );
}

// Giữ alias tương thích
const CollapsibleServicesSection = ServicesSection;

// Định dạng tiền tệ với dấu chấm phân tách hàng nghìn (VD: 1500000 -> 1.500.000)
const formatPriceWithDots = (val) => {
  if (val === "" || val === null || val === undefined) return "";
  const raw = String(val).replace(/\D/g, "");
  if (!raw) return "";
  return Number(raw).toLocaleString("vi-VN");
};

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
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [customerLimits, setCustomerLimits] = useState({
    same_field_booked_count: 0,
    same_field_slots: [],
    other_field_slots: [],
    max_slots_per_day: 3,
  });

  useEffect(() => {
    getUsers()
      .then((res) => setUsers(res.data || []))
      .catch(console.error);
    fetch(`${BASE_URL}/services/list/?admin=true`)
      .then((res) => res.json())
      .then((data) => setAvailableServices(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  // 🔹 Chỉ hiển thị các sân đang được tạo khung giờ trong ngày đó
  useEffect(() => {
    if (!date) return;
    getFields({ params: { date, only_with_slots: true } })
      .then((res) => {
        const fList = res.data.fields || [];
        setFields(fList);
        // Nếu sân đã chọn không còn trong danh sách có slot của ngày này, reset chọn sân
        if (fieldId && !fList.some((f) => f.id === fieldId)) {
          setFieldId("");
          setSelectedSlots([]);
          setStartTime("");
          setEndTime("");
        }
      })
      .catch((err) => {
        console.error("Lỗi tải danh sách sân theo ngày:", err);
        setFields([]);
      });
  }, [date]);

  const todayStr = getLocalDateString();

  const handleDateChange = async (newDate) => {
    if (!newDate) return;
    if (newDate < todayStr) {
      showToast("Không được chọn ngày trong quá khứ!", "warning");
      return;
    }
    if (fieldId) {
      try {
        setTimeslotsLoading(true);
        const res = await timeslotsApi.getByField(fieldId, newDate);
        const slots = res.data || [];
        if (slots.length === 0) {
          showToast("Sân này không có mở khung giờ (slot) trong ngày được chọn. Vui lòng chọn ngày khác!", "warning");
          return;
        }
      } catch (err) {
        console.error("Lỗi kiểm tra slot ngày mới:", err);
      } finally {
        setTimeslotsLoading(false);
      }
    }
    setDate(newDate);
    setSelectedSlots([]);
    setStartTime("");
    setEndTime("");
  };

  // Lấy giới hạn đặt sân của khách hàng
  useEffect(() => {
    if (!fieldId || !date) return;
    setSelectedSlots([]);
    setStartTime("");
    setEndTime("");
    if (customerId) {
      getCustomerBookingLimits({
        fieldId,
        date,
        customerId,
      })
        .then((res) => {
          if (res.data) setCustomerLimits(res.data);
        })
        .catch(() => { });
    }
  }, [fieldId, date, customerId]);

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
    const rate = Number(selectedField.min_price || selectedField.price_per_hour || 0);
    const count = selectedSlots.length > 0 ? selectedSlots.length : (startTime && endTime ? 1 : 0);
    const servCost = selectedServices.reduce(
      (sum, s) => sum + s.quantity * (Number(s.price) || 0),
      0
    );
    if (rate > 0 && count > 0) {
      setPrice(rate * count + servCost);
    } else if (servCost > 0 && !price) {
      setPrice(servCost);
    }
  }, [fieldId, selectedSlots, startTime, endTime, selectedServices, selectedField]);

  const handleSelectSlotAdmin = (slot) => {
    const isPast = isSlotExpired(date, slot.start);
    const isBooked = isSlotBooked(slot);
    const isBlocked = slot.status === "blocked";
    if (isBooked || isBlocked || isPast) return;

    const tr = `${slot.start} - ${slot.end}`;
    const otherConflict = customerLimits.other_field_slots?.find(
      (o) => o.start_time === slot.start || o.time === tr
    );
    if (otherConflict) {
      showToast(
        `Khách hàng đã đặt khung giờ ${tr} tại ${otherConflict.field_name}. Không thể đặt tiếp khung giờ đó ở sân khác.`,
        "warning"
      );
      return;
    }

    const existingIndex = selectedSlots.findIndex(
      (s) => s.start === slot.start && s.end === slot.end
    );

    let next = [];
    if (existingIndex !== -1) {
      next = selectedSlots.filter((_, idx) => idx !== existingIndex);
    } else {
      const bookedCount = customerLimits.same_field_booked_count || 0;
      if (selectedSlots.length + bookedCount >= 3) {
        showToast(
          bookedCount > 0
            ? `Khách hàng chỉ được đặt tối đa 3 khung giờ/ngày/sân (đã đặt ${bookedCount} khung giờ trước đó).`
            : "Chỉ được chọn tối đa 3 khung giờ!",
          "warning"
        );
        return;
      }
      next = [...selectedSlots, slot].sort((a, b) => a.start.localeCompare(b.start));
    }

    setSelectedSlots(next);
    if (next.length > 0) {
      setStartTime(next[0].start);
      setEndTime(next[next.length - 1].end);
    } else {
      setStartTime("");
      setEndTime("");
    }
  };

  const handleSubmit = async () => {
    if (!fieldId || !customerId || !date || selectedSlots.length === 0) {
      showToast("Vui lòng chọn sân, khách hàng, ngày và ít nhất một khung giờ (tối đa 3)", "warning");
      return;
    }
    if (date < todayStr) {
      showToast("Không được chọn ngày trong quá khứ!", "warning");
      return;
    }

    // 🔹 Kiểm tra tồn kho cho các dịch vụ đã chọn
    for (const s of selectedServices) {
      const match = availableServices.find((x) => x.id === s.service_id);
      const stock = match?.stock !== undefined ? Number(match.stock) : 999;
      if (s.quantity > stock) {
        showToast(
          stock <= 0
            ? `Dịch vụ "${match?.name || ''}" hiện đã hết hàng trong kho!`
            : `Dịch vụ "${match?.name || ''}" chỉ còn tồn kho ${stock} sản phẩm (bạn đã chọn ${s.quantity}).`,
          "warning"
        );
        return;
      }
    }
    try {
      setLoading(true);
      await createBooking({
        field_id: fieldId,
        customer_id: customerId,
        booking_date: date,
        status: "Confirmed",
        is_admin: true,
        start_time: selectedSlots[0].start,
        end_time: selectedSlots[0].end,
        slots: selectedSlots.map((s) => ({
          start_time: s.start,
          end_time: s.end,
          price: Number(s.price) || Number(selectedField?.min_price || selectedField?.price_per_hour || 0),
        })),
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
      const msg = error.response?.data?.error || error.response?.data?.message || "Lỗi khi thêm đơn đặt";
      showToast(msg, "error");
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
              showToast={showToast}
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
                    min={todayStr}
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                </div>
                <div className="form-field-group">
                  <label>
                    <span className="material-symbols-outlined">payments</span>
                    Tổng tiền (VNĐ)
                  </label>
                  <div className="price-input-wrapper">
                    <input
                      className="form-input price-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="Nhập số tiền..."
                      value={formatPriceWithDots(price)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setPrice(raw ? Number(raw) : "");
                      }}
                    />
                    <span className="price-unit-suffix">VNĐ</span>
                  </div>
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
                    const isPast = isSlotExpired(date, slot.start);
                    const isBooked = isSlotBooked(slot);
                    const isBlocked = slot.status === "blocked";
                    const tr = `${slot.start} - ${slot.end}`;
                    const otherConflict = customerLimits.other_field_slots?.find(
                      (o) => o.start_time === slot.start || o.time === tr
                    );
                    const isUnavailable = isBooked || isBlocked || isPast || Boolean(otherConflict);
                    const isSelected = selectedSlots.some(
                      (s) => s.start === slot.start && s.end === slot.end
                    );
                    const slotPrice = Number(slot.price || selectedField?.min_price || selectedField?.price_per_hour || 0);

                    return (
                      <button
                        type="button"
                        key={slot.start}
                        disabled={slotLoading || isUnavailable}
                        className={`booking-time-slot${isUnavailable ? " booked" : ""
                          }${isBlocked ? " blocked" : ""}${isPast ? " expired" : ""}${otherConflict ? " booked-other" : ""}${isSelected ? " selected" : ""
                          }`}
                        onClick={() => handleSelectSlotAdmin(slot)}
                        title={
                          isPast
                            ? "Khung giờ đã qua hoặc đang diễn ra"
                            : otherConflict
                              ? `Khách đã đặt khung giờ này tại ${otherConflict.field_name}`
                              : isBooked
                                ? "Khung giờ này đã có người đặt"
                                : isBlocked
                                  ? "Khung giờ đã bị khóa"
                                  : "Bấm để chọn/bỏ chọn (tối đa 3)"
                        }
                      >
                        <span className="slot-time-text">
                          {slot.start} - {slot.end}
                        </span>
                        <span className="slot-price-text">
                          {slotPrice > 0 ? `${slotPrice.toLocaleString("vi-VN")}đ` : "Miễn phí"}
                        </span>
                        <small>
                          {isPast
                            ? "Đã qua"
                            : isBooked
                              ? "Đã đặt"
                              : isBlocked
                                ? "Đã khóa"
                                : otherConflict
                                  ? `Đã đặt ở ${otherConflict.field_name}`
                                  : isSelected
                                    ? "✓ Đang chọn"
                                    : "Trống"}
                        </small>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedSlots.length > 0 && (
                <p className="booking-time-selection">
                  <span className="material-symbols-outlined">schedule</span>
                  Khung giờ đã chọn:{" "}
                  <b>
                    {selectedSlots.map((s) => `${s.start} - ${s.end}`).join(", ")}
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
  const [fieldId, setFieldId] = useState(booking.field_id || "");
  const [fieldSearch, setFieldSearch] = useState("");
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
  const [basePitchPrice, setBasePitchPrice] = useState(Number(booking.price || 0));
  const [isServicesInitialized, setIsServicesInitialized] = useState(false);
  const [customerLimits, setCustomerLimits] = useState({ same_field_booked_count: 0, same_field_slots: [], other_field_slots: [] });

  useEffect(() => {
    fetch(`${BASE_URL}/services/list/?admin=true`)
      .then(res => res.json())
      .then(data => setAvailableServices(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch(`${BASE_URL}/services/booking-services/${booking.id}/`)
      .then(res => res.json())
      .then(data => {
        const loadedServices = (Array.isArray(data) ? data : []).map(s => ({
          service_id: s.service_id,
          quantity: Number(s.quantity || 1),
          price: Number(s.total_price && s.quantity ? s.total_price / s.quantity : s.price || 0),
          shoe_size: s.shoe_size || ''
        }));
        setSelectedServices(loadedServices);
        const initServCost = loadedServices.reduce((sum, s) => sum + s.quantity * s.price, 0);
        const rawBookingPrice = Number(booking.price || 0);
        const calculatedBase = Math.max(0, rawBookingPrice - initServCost);
        setBasePitchPrice(calculatedBase);
        setIsServicesInitialized(true);
      })
      .catch((err) => {
        console.error(err);
        setBasePitchPrice(Number(booking.price || 0));
        setIsServicesInitialized(true);
      });
  }, [booking.id, booking.price]);

  // 🔹 Tự động cộng hoặc trừ tiền dịch vụ vào tổng tiền cần thanh toán
  useEffect(() => {
    if (!isServicesInitialized) return;
    const servCost = selectedServices.reduce(
      (sum, s) => sum + (Number(s.quantity) || 0) * (Number(s.price) || 0),
      0
    );
    setPrice(basePitchPrice + servCost);
  }, [selectedServices, basePitchPrice, isServicesInitialized]);

  // 🔹 Chỉ hiển thị các sân đang được tạo khung giờ trong ngày đó (kèm sân hiện tại của đơn)
  useEffect(() => {
    if (!date) return;
    getFields({ params: { date, only_with_slots: true, include_field_id: booking.field_id } })
      .then((res) => {
        const fList = res.data.fields || [];
        setFields(fList);
        if (!fieldId) {
          const found = booking.field_id || fList.find((f) => f.field_name === booking.field)?.id;
          if (found) setFieldId(found);
        }
      })
      .catch((err) => {
        console.error("Lỗi tải danh sách sân theo ngày:", err);
        setFields([]);
      });
  }, [date, booking.field_id, booking.field]);

  const todayStr = getLocalDateString();

  const handleDateChange = async (newDate) => {
    if (!newDate) return;
    if (newDate < todayStr) {
      showToast("Không được đổi sang ngày trong quá khứ!", "warning");
      return;
    }
    if (fieldId) {
      try {
        setTimeslotsLoading(true);
        const res = await timeslotsApi.getByField(fieldId, newDate);
        const slots = res.data || [];
        if (slots.length === 0) {
          showToast("Sân này không có mở khung giờ (slot) trong ngày được chọn. Vui lòng chọn ngày khác!", "warning");
          return;
        }
      } catch (err) {
        console.error("Lỗi kiểm tra slot ngày mới:", err);
      } finally {
        setTimeslotsLoading(false);
      }
    }
    setDate(newDate);
    setStartTime("");
    setEndTime2("");
  };

  const handleFieldChange = (newFId) => {
    if (newFId === fieldId) return;
    const oldFieldObj = fields.find(f => f.id === fieldId || f.field_name === booking.field);
    const newFieldObj = fields.find(f => f.id === newFId);
    setFieldId(newFId);

    // Tự động cập nhật lại tổng tiền nếu đơn giá giờ giữa 2 sân có chênh lệch
    const oldPrice = Number(oldFieldObj?.min_price || oldFieldObj?.price_per_hour || 0);
    const newPrice = Number(newFieldObj?.min_price || newFieldObj?.price_per_hour || 0);
    if (newFieldObj && oldFieldObj && newPrice !== oldPrice) {
      const priceDiff = newPrice - oldPrice;
      setBasePitchPrice(prev => Math.max(0, prev + priceDiff));
      showToast(`Đã chọn ${newFieldObj.field_name}. Đã cập nhật lại tổng tiền theo giá sân mới.`, "info");
    }
  };

  useEffect(() => {
    if (!fieldId || !date) return;
    const loadBookedSlots = async () => {
      try {
        setSlotLoading(true);
        const isCurrentBookingField = (fieldId === (booking.field_id || fields.find(f => f.field_name === booking.field)?.id));
        const excludeParam = isCurrentBookingField ? `&exclude_booking_id=${booking.id}` : '';
        const response = await fetch(`${BASE_URL}/bookings/booked-slots/?field_id=${fieldId}&date=${date}${excludeParam}`);
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
  }, [fieldId, booking.id, date, fields]);

  useEffect(() => {
    if (!fieldId || !date) return;
    const custId = booking.customer_id || booking.customer?.id;
    const ph = booking.phone;
    if (custId || ph) {
      getCustomerBookingLimits({
        fieldId,
        date,
        customerId: custId,
        phone: ph,
      })
        .then((res) => {
          if (res.data) setCustomerLimits(res.data);
        })
        .catch(() => { });
    }
  }, [fieldId, date, booking]);

  useEffect(() => {
    if (!fieldId || !date) return;
    const loadTimeslots = async () => {
      try {
        setTimeslotsLoading(true);
        const res = await timeslotsApi.getByField(fieldId, date);
        const slots = res.data || [];
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
  }, [fieldId, date]);

  const isSlotBooked = (slot) => bookedSlots.some((range) => {
    const [bookedStart, bookedEnd] = String(range).split(" - ");
    return toMinutes(bookedStart) < toMinutes(slot.end) && toMinutes(bookedEnd) > toMinutes(slot.start);
  });

  const isCurrentBookingSlot = (slot) => {
    const isCurrentField = (fieldId === (booking.field_id || fields.find(f => f.field_name === booking.field)?.id));
    return isCurrentField && (date === booking.date) && (slot.start === normalizeTime(timeParts[0]));
  };

  // Kiểm tra khung giờ hiện tại khi đổi sang sân mới hoặc ngày mới
  useEffect(() => {
    if (!fieldId || timeslotsLoading || slotLoading || !startTime || !endTime2) return;
    const isCurrentField = (fieldId === (booking.field_id || fields.find(f => f.field_name === booking.field)?.id));
    const isSelfSlot = isCurrentField && (date === booking.date) && (startTime === normalizeTime(timeParts[0]));

    if (!isSelfSlot && timeSlots.length > 0) {
      const match = timeSlots.find(s => s.start === startTime && s.end === endTime2);
      if (!match) {
        showToast(`Sân mới không mở khung giờ ${startTime} - ${endTime2}. Vui lòng chọn khung giờ trống có mở slot.`, "warning");
        setStartTime("");
        setEndTime2("");
        return;
      }
      if (match.status === 'blocked') {
        showToast(`Khung giờ ${startTime} - ${endTime2} trên sân mới đang bị khóa/bảo trì. Vui lòng chọn khung giờ khác.`, "warning");
        setStartTime("");
        setEndTime2("");
        return;
      }
      const isBooked = isSlotBooked(match) || match.status === 'booked';
      if (isBooked) {
        showToast(`Khung giờ ${startTime} - ${endTime2} trên sân mới đã có người đặt. Vui lòng chọn khung giờ khác.`, "warning");
        setStartTime("");
        setEndTime2("");
        return;
      }
    }
  }, [fieldId, date, timeSlots, bookedSlots, timeslotsLoading, slotLoading]);

  const handleSubmit = async () => {
    if (!fieldId) {
      showToast("Vui lòng chọn sân bóng thi đấu", "warning");
      return;
    }
    if (!date || !startTime || !endTime2) {
      showToast("Vui lòng chọn ngày và khung giờ đặt sân", "warning");
      return;
    }
    if (date !== booking.date && date < todayStr) {
      showToast("Không được đổi sang ngày trong quá khứ!", "warning");
      return;
    }

    // 🔹 1. Ràng buộc: Sân đó PHẢI CÓ MỞ SLOT trong khung giờ đó
    const matchedSlot = timeSlots.find(s => s.start === startTime && s.end === endTime2);
    if (!matchedSlot) {
      showToast("Sân này chưa mở slot trong khung giờ đã chọn. Vui lòng chọn khung giờ có mở slot.", "warning");
      return;
    }
    if (matchedSlot.status === 'blocked') {
      showToast("Khung giờ này tại sân đang bị khóa hoặc bảo trì. Vui lòng chọn khung giờ khác.", "warning");
      return;
    }

    // 🔹 2. Ràng buộc: Sân đó CHƯA CÓ AI ĐẶT trong khung giờ đó
    const isSelfSlot = isCurrentBookingSlot(matchedSlot);
    if (!isSelfSlot) {
      if (isSlotBooked(matchedSlot) || matchedSlot.status === 'booked') {
        showToast("Khung giờ này tại sân đã có người đặt. Vui lòng chọn khung giờ khác.", "warning");
        return;
      }
    }

    // 🔹 Kiểm tra tồn kho cho các dịch vụ đã chọn
    for (const s of selectedServices) {
      const match = availableServices.find((x) => x.id === s.service_id);
      const stock = match?.stock !== undefined ? Number(match.stock) : 999;
      if (s.quantity > stock) {
        showToast(
          stock <= 0
            ? `Dịch vụ "${match?.name || ''}" hiện đã hết hàng trong kho!`
            : `Dịch vụ "${match?.name || ''}" chỉ còn tồn kho ${stock} sản phẩm (bạn đã chọn ${s.quantity}).`,
          "warning"
        );
        return;
      }
    }
    try {
      setLoading(true);

      await updateBooking(booking.id, {
        field_id: fieldId,
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

      // Nếu chuyển sang Hoàn thành (Completed), tự động báo sân CẦN DỌN GẤP và thêm tag đỏ ở vệ sinh sân
      if (String(status).toLowerCase() === "completed") {
        try {
          const CLEANING_KEY = "pitch_cleaning_status";
          const LOGS_KEY = "pitch_cleaning_logs";
          const savedStatus = localStorage.getItem(CLEANING_KEY);
          let statusObj = savedStatus ? JSON.parse(savedStatus) : {};
          const fKey = fieldId || booking.field_id || booking.field;
          const currentFieldName = fields.find(f => f.id === fieldId)?.field_name || booking.field || "Sân bóng";
          const timeSlot = `${startTime} - ${endTime2}`;
          statusObj[fKey] = {
            status: "needs_clean",
            cleaningReason: "urgent",
            reportedBy: "Quản lý đặt sân",
            lastCleaned: `Ca ${timeSlot} hoàn thành - Cần dọn gấp`,
            notes: `Quản lý đặt sân báo ca ${timeSlot} (${booking.name || "khách"}) vừa hoàn thành. Cần dọn gấp!`,
            completedMatch: {
              time: timeSlot,
              name: booking.name,
              phone: booking.phone,
              date: date,
              issueType: "Ca đá vừa hoàn thành - Cần dọn gấp",
              notes: `Khách ca ${timeSlot} vừa hoàn tất trận đấu, cần dọn dẹp vệ sinh ngay!`,
            },
          };
          if (currentFieldName) {
            statusObj[currentFieldName] = { ...statusObj[fKey] };
          }
          localStorage.setItem(CLEANING_KEY, JSON.stringify(statusObj));

          const savedLogs = localStorage.getItem(LOGS_KEY);
          let logsList = savedLogs ? JSON.parse(savedLogs) : [];
          const newLog = {
            id: Date.now(),
            fieldName: currentFieldName,
            time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            statusText: `Ca đá ${timeSlot} hoàn thành - Cần dọn gấp`,
            cleaner: "Chờ nhân viên dọn",
          };
          localStorage.setItem(LOGS_KEY, JSON.stringify([newLog, ...logsList.slice(0, 9)]));

          // Gửi trực tiếp vào CSDL backend facility để App và Web đồng bộ tức thì
          createCleaningLog({
            field: typeof fKey === "string" && fKey.includes("-") ? fKey : null,
            field_name: currentFieldName,
            booking: booking.id,
            status: "needs_clean",
            status_text: `Ca đá ${timeSlot} hoàn thành - Cần dọn gấp`,
            cleaned_match_time: timeSlot,
            cleaned_match_customer: booking.name || "",
            notes: `Ca đá ${timeSlot} vừa hoàn thành. Cần dọn gấp chuẩn bị đón ca tiếp theo!`,
          }).catch(() => {});

          broadcastSyncEvent("pitch_cleaning_needed", {
            fieldId: fKey,
            fieldName: currentFieldName,
            time: timeSlot,
            status: "needs_clean",
            cleaningReason: "urgent",
          });
          broadcastSyncEvent("booking_completed", { id: booking.id, field: currentFieldName, time: timeSlot });
        } catch (e) {}
      }

      showToast("Cập nhật đơn thành công", "success");
      onSuccess();
      onClose();

    } catch (error) {
      console.log("=== FULL ERROR ===", error);
      const msg = error.response?.data?.error || error.response?.data?.message || "Lỗi khi cập nhật";
      showToast(msg, "error");
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
                {' · '}{booking.name || 'Khách hàng'} · {fields.find(f => f.id === fieldId)?.field_name || booking.field || 'Sân bóng'}
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
                <strong>{fields.find(f => f.id === fieldId)?.field_name || booking.field || 'Sân bóng'}</strong>
                {fieldId && fieldId !== (booking.field_id || fields.find(f => f.field_name === booking.field)?.id) && (
                  <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                    (Đổi từ {booking.field})
                  </div>
                )}
              </div>
            </div>
            <div className="bsc-item">
              <span className="material-symbols-outlined">payments</span>
              <div>
                <small>Thanh toán &amp; Cọc</small>
                <strong
                  style={{
                    color:
                      booking.payment_info?.badge_type === 'full_paid'
                        ? '#16a34a'
                        : booking.payment_info?.badge_type === 'deposit_paid'
                        ? '#0284c7'
                        : '#d97706',
                  }}
                >
                  {booking.payment_info?.status_label || 'Thanh toán tại sân'}
                </strong>
                {booking.payment_info?.sub_label && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    {booking.payment_info.sub_label}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bm-two-col-grid">
            {/* Left column */}
            <div className="modal-col">
              {/* 1. Sân bóng thi đấu (Đổi sân) */}
              <div className="modal-section">
                <div className="modal-section-heading">
                  <span className="material-symbols-outlined">stadium</span>
                  Sân bóng thi đấu
                  {fieldId && fieldId !== (booking.field_id || fields.find(f => f.field_name === booking.field)?.id) && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      Đổi sân
                    </span>
                  )}
                </div>
                <FieldDropdownSelect
                  fields={fields}
                  selectedId={fieldId}
                  onSelect={handleFieldChange}
                  fieldSearch={fieldSearch}
                  onSearchChange={setFieldSearch}
                />
              </div>

              {/* 2. Trạng thái đơn (Dropdown có mũi tên nhỏ xuống) */}
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

              {/* 3. Dịch vụ & Tiện ích thêm (Luôn hiển thị với giao diện thẻ card tối ưu) */}
              <ServicesSection
                availableServices={availableServices}
                selectedServices={selectedServices}
                setSelectedServices={setSelectedServices}
                showToast={showToast}
              />
            </div>

            {/* Right column */}
            <div className="modal-col">
              <div className="modal-section">
                <div className="form-row-2">
                  <div className="form-field-group">
                    <label><span className="material-symbols-outlined">calendar_today</span>Ngày đặt</label>
                    <input
                      className="form-input"
                      type="date"
                      min={todayStr}
                      value={date}
                      onChange={(e) => handleDateChange(e.target.value)}
                    />
                  </div>
                  <div className="form-field-group">
                    <label><span className="material-symbols-outlined">payments</span>Tổng tiền (VNĐ)</label>
                    <div className="price-input-wrapper">
                      <input
                        className="form-input price-input"
                        type="text"
                        inputMode="numeric"
                        value={formatPriceWithDots(price)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          const num = raw ? Number(raw) : 0;
                          setPrice(raw ? num : "");
                          const servCost = selectedServices.reduce(
                            (sum, s) => sum + (Number(s.quantity) || 0) * (Number(s.price) || 0),
                            0
                          );
                          setBasePitchPrice(Math.max(0, num - servCost));
                        }}
                        placeholder="Nhập số tiền..."
                      />
                      <span className="price-unit-suffix">VNĐ</span>
                    </div>
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
                      const isSelf = isCurrentBookingSlot(slot);
                      const isBooked = !isSelf && (isSlotBooked(slot) || slot.status === 'booked');
                      const isBlocked = slot.status === 'blocked';
                      const isPast = !isSelf && isSlotExpired(date, slot.start);
                      const tr = `${slot.start} - ${slot.end}`;
                      const otherConflict = customerLimits.other_field_slots?.find(
                        (o) => o.start_time === slot.start || o.time === tr
                      );
                      const isUnavailable = isBooked || isBlocked || isPast || Boolean(otherConflict);
                      const isSelected = startTime === slot.start && endTime2 === slot.end;
                      const currentFieldObj = fields.find(f => f.id === fieldId) || fields.find(f => f.field_name === booking.field);
                      const slotPrice = Number(slot.price || currentFieldObj?.min_price || currentFieldObj?.price_per_hour || 0);

                      return (
                        <button type="button" key={slot.start} disabled={slotLoading || isUnavailable}
                          className={`booking-time-slot${isUnavailable ? " booked" : ""}${isBlocked ? " blocked" : ""}${isPast ? " expired" : ""}${otherConflict ? " booked-other" : ""}${isSelected ? " selected" : ""}`}
                          onClick={() => {
                            if (otherConflict) {
                              showToast(`Khách đã đặt khung giờ ${tr} tại ${otherConflict.field_name}. Không thể đặt tiếp khung giờ đó ở sân khác.`, "warning");
                              return;
                            }
                            if (isSelected) {
                              setStartTime("");
                              setEndTime2("");
                            } else {
                              setStartTime(slot.start);
                              setEndTime2(slot.end);
                              if (slotPrice > 0) {
                                setBasePitchPrice(slotPrice);
                              }
                            }
                          }}
                          title={
                            isPast
                              ? "Khung giờ đã qua hoặc đang diễn ra"
                              : otherConflict
                                ? `Khách đã đặt khung giờ này tại ${otherConflict.field_name}`
                                : isBooked
                                  ? "Khung giờ này đã có người đặt"
                                  : isBlocked
                                    ? "Khung giờ đã bị khóa"
                                    : isSelf
                                      ? "Khung giờ hiện tại của đơn này"
                                      : "Bấm để chọn khung giờ"
                          }
                        >
                          <span className="slot-time-text">{slot.start} - {slot.end}</span>
                          <span className="slot-price-text">
                            {slotPrice > 0 ? `${slotPrice.toLocaleString("vi-VN")}đ` : "Miễn phí"}
                          </span>
                          <small>
                            {isPast
                              ? "Đã qua"
                              : isBooked
                                ? "Đã đặt"
                                : isBlocked
                                  ? "Đã khóa"
                                  : otherConflict
                                    ? `Đã đặt ở ${otherConflict.field_name}`
                                    : isSelected
                                      ? "✓ Đang chọn"
                                      : isSelf
                                        ? "Đơn hiện tại"
                                        : "Trống"}
                          </small>
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

/* ── Modal Báo Dọn Vệ Sinh Sân Khẩn Cấp từ Quản Lý Đặt Sân ── */
function CompleteMatchModal({ booking, onClose, onConfirm, loading }) {
  const [cleaningReason, setCleaningReason] = useState("Rác thải, chai lọ bừa bãi sau trận");
  const [priority, setPriority] = useState("Khẩn cấp");
  const [description, setDescription] = useState("");

  if (!booking) return null;
  const formattedDate = booking.date
    ? new Date(booking.date).toLocaleDateString("vi-VN")
    : "Hôm nay";

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    onConfirm({ reason: cleaningReason, priority, description });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div
        className="modal modal-confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "520px",
          maxWidth: "92vw",
          maxHeight: "88vh",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "1.25rem 1.25rem 0.5rem", textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.5rem",
              border: "4px solid #d1fae5",
              boxShadow: "0 4px 14px rgba(5, 150, 105, 0.2)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.75rem" }}>
              cleaning_services
            </span>
          </div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.25rem" }}>
            Báo dọn vệ sinh sân khẩn cấp
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0, lineHeight: 1.4 }}>
            Thông tin tình trạng sân sẽ được chuyển ngay đến trang <strong>Vệ sinh sân</strong> để nhân viên trực dọn dẹp.
          </p>
        </div>

        {/* Nội dung form cuộn được */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 1.25rem 1rem" }}>
          {/* Thông tin ca thi đấu */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "0.75rem",
              padding: "0.75rem 0.95rem",
              fontSize: "0.82rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              marginBottom: "0.85rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Sân bóng:</span>
              <strong style={{ color: "#059669" }}>{booking.field}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Khung giờ ca đặt:</span>
              <strong style={{ color: "#0f172a" }}>{booking.time}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Ngày thi đấu:</span>
              <span style={{ color: "#334155", fontWeight: 600 }}>{formattedDate}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Khách hàng:</span>
              <span style={{ color: "#0f172a" }}>
                {booking.name || "Khách"} {booking.phone ? `(${booking.phone})` : ""}
              </span>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} id="cleaningReportForm" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.3rem" }}>
                Tình trạng sân / Vấn đề cần dọn dẹp
              </label>
              <select
                value={cleaningReason}
                onChange={(e) => setCleaningReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.85rem",
                  color: "#0f172a",
                  background: "#f8fafc",
                }}
              >
                <option value="Rác thải, chai lọ bừa bãi sau trận">Rác thải, chai lọ bừa bãi sau trận</option>
                <option value="Nước ngọt, bia, chất lỏng đổ trên sân cỏ">Nước ngọt, bia, chất lỏng đổ trên sân cỏ</option>
                <option value="Bùn đất, vết bẩn bám dính trên mặt sân">Bùn đất, vết bẩn bám dính trên mặt sân</option>
                <option value="Vật thể lạ, dị vật nguy hiểm (đinh, đá dăm, mảnh kính)">Vật thể lạ, dị vật nguy hiểm (đinh, đá dăm, mảnh kính)</option>
                <option value="Khách làm bẩn khu ghế chờ, đường biên sân">Khách làm bẩn khu ghế chờ, đường biên sân</option>
                <option value="Mùi hôi khó chịu / Bẩn sau ca đá">Mùi hôi khó chịu / Bẩn sau ca đá</option>
                <option value="Khác (Nhập chi tiết bên dưới)">Khác (Nhập chi tiết bên dưới)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.3rem" }}>
                Mức độ khẩn cấp
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.85rem",
                  color: "#0f172a",
                  background: "#f8fafc",
                }}
              >
                <option value="Khẩn cấp">Khẩn cấp (Cần xử lý ngay lập tức)</option>
                <option value="Cao">Cao (Cần dọn trước khi ca sau bắt đầu)</option>
                <option value="Bình thường">Bình thường (Dọn trong ngày)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.3rem" }}>
                Mô tả chi tiết tình trạng sân (bị cái gì, vị trí nào)
              </label>
              <textarea
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập cụ thể sân đang bị gì, vị trí cần dọn (vd: Đổ nhiều nước ngọt ở giữa sân cỏ, vỏ chai bia vứt góc phải khán đài...)"
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </form>
        </div>

        {/* Modal footer */}
        <div
          style={{
            padding: "0.85rem 1.25rem",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: "0.65rem",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "0.55rem 1.15rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#475569",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn-confirm"
            onClick={handleFormSubmit}
            disabled={loading}
            style={{
              padding: "0.55rem 1.35rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 3px 10px rgba(5, 150, 105, 0.25)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.05rem" }}>
              cleaning_services
            </span>
            {loading ? "Đang xử lý..." : "Gửi báo dọn ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Báo Bảo Trì Khẩn Cấp từ Quản Lý Đặt Sân (kèm khung giờ lấy từ ca đặt) ── */
function ReportMaintenanceBookingModal({ booking, existingIssue, onClose, onSubmit, loading }) {
  const [category, setCategory] = useState(existingIssue?.category || "Đèn chiếu sáng cao áp");
  const [priority, setPriority] = useState(existingIssue?.priority || "Khẩn cấp");
  const [description, setDescription] = useState(
    existingIssue ? existingIssue.description : ""
  );

  if (!booking) return null;
  const formattedDate = booking.date
    ? new Date(booking.date).toLocaleDateString("vi-VN")
    : "Hôm nay";

  const isExisting = Boolean(existingIssue);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div
        className="modal modal-confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "520px",
          maxWidth: "92vw",
          maxHeight: "88vh",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "1.25rem 1.25rem 0.5rem", textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              background: isExisting ? "#fee2e2" : "#fff7ed",
              color: isExisting ? "#dc2626" : "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.5rem",
              border: `4px solid ${isExisting ? "#fecaca" : "#fed7aa"}`,
              boxShadow: "0 4px 14px rgba(234, 88, 12, 0.2)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.65rem" }}>
              {isExisting ? "warning" : "handyman"}
            </span>
          </div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.25rem" }}>
            {isExisting ? "Thông tin sự cố bảo trì ca này" : "Báo bảo trì sân khẩn cấp"}
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0, lineHeight: 1.4 }}>
            {isExisting
              ? "Ca thi đấu này đã được gửi thông tin báo hỏng đến bộ phận kỹ thuật bảo trì."
              : "Thông tin sự cố sẽ được gửi ngay đến trang Bảo trì sân & thiết bị kèm khung giờ ca đặt."}
          </p>
        </div>

        {/* Nội dung cuộn được (Cuộn nếu màn hình thấp, luôn nhìn thấy nút bấm ở footer) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 1.25rem 1rem" }}>
          {/* Thông tin ca thi đấu */}
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "0.75rem",
              padding: "0.75rem 0.95rem",
              fontSize: "0.82rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              marginBottom: "0.85rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#92400e" }}>Sân bóng:</span>
              <strong style={{ color: "#78350f" }}>{booking.field}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#92400e" }}>Khung giờ ca đặt:</span>
              <strong style={{ color: "#b45309" }}>{booking.time}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#92400e" }}>Ngày thi đấu:</span>
              <span style={{ color: "#78350f", fontWeight: 600 }}>{formattedDate}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#92400e" }}>Khách hàng:</span>
              <span style={{ color: "#78350f" }}>
                {booking.name || "Khách"} {booking.phone ? `(${booking.phone})` : ""}
              </span>
            </div>
          </div>

          {!isExisting ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.3rem" }}>
                  Hạng mục gặp sự cố (Sân bị hỏng cái gì)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.85rem",
                    color: "#0f172a",
                    background: "#f8fafc",
                  }}
                >
                  <option value="Đèn chiếu sáng cao áp (Cháy bóng, chập chờn, rớt chao)">Đèn chiếu sáng cao áp (Cháy bóng, chập chờn, rớt chao)</option>
                  <option value="Mặt cỏ nhân tạo (Rách thảm, bong tróc, lún sụt)">Mặt cỏ nhân tạo (Rách thảm, bong tróc, lún sụt)</option>
                  <option value="Lưới khung thành & Cột gôn (Rách lưới, lung lay cột)">Lưới khung thành &amp; Cột gôn (Rách lưới, lung lay cột)</option>
                  <option value="Hệ thống thoát nước (Tắc cống, ứ đọng nước mưa/bùn)">Hệ thống thoát nước (Tắc cống, ứ đọng nước mưa/bùn)</option>
                  <option value="Hàng rào & Lưới chắn bóng (Rách lưới chắn, xô lệch rào)">Hàng rào &amp; Lưới chắn bóng (Rách lưới chắn, xô lệch rào)</option>
                  <option value="Khán đài, ghế chờ, bảng tỷ số (Hỏng hóc, gãy ghế)">Khán đài, ghế chờ, bảng tỷ số (Hỏng hóc, gãy ghế)</option>
                  <option value="Khác (Nhập mô tả cụ thể bên dưới)">Khác (Nhập mô tả cụ thể bên dưới)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.3rem" }}>
                  Mức độ ưu tiên
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.85rem",
                    color: "#0f172a",
                    background: "#f8fafc",
                  }}
                >
                  <option value="Khẩn cấp">Khẩn cấp (Cần xử lý ngay trong ca đá)</option>
                  <option value="Cao">Cao (Xử lý ngay sau ca đá)</option>
                  <option value="Bình thường">Bình thường (Trong ngày)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.3rem" }}>
                  Mô tả chi tiết sự cố hỏng hóc (Cụ thể sân bị sự cố gì)
                </label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả cụ thể sân đang bị sự cố gì cần khắc phục (vd: Đèn cột số 2 bị nổ bóng, khung thành bên phải bị rách lưới to bóng bay ra ngoài...)"
                  required
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.85rem",
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.65rem",
                padding: "0.85rem",
                fontSize: "0.82rem",
                color: "#991b1b",
              }}
            >
              <p style={{ margin: "0 0 0.35rem" }}>
                <strong>Hạng mục:</strong> {existingIssue.category} ({existingIssue.priority})
              </p>
              <p style={{ margin: "0 0 0.35rem" }}>
                <strong>Mô tả:</strong> {existingIssue.description}
              </p>
              <p style={{ margin: 0, color: "#b91c1c", fontWeight: 600 }}>
                Trạng thái: {existingIssue.status === "fixing" ? "Đang sửa chữa" : "Đang chờ xử lý"} — Chờ nhân viên kỹ thuật nhấn "Sửa xong" để hoàn tất.
              </p>
            </div>
          )}
        </div>

        {/* Modal footer cố định ở đáy */}
        <div
          style={{
            flexShrink: 0,
            padding: "0.75rem 1.25rem",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: "0.65rem",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            style={{
              padding: "0.55rem 1.15rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#475569",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            {isExisting ? "Đóng" : "Hủy bỏ"}
          </button>
          {!isExisting && (
            <button
              type="button"
              className="btn-confirm"
              onClick={() => onSubmit({ category, priority, description })}
              disabled={loading || !description.trim()}
              style={{
                padding: "0.55rem 1.35rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: loading || !description.trim() ? "not-allowed" : "pointer",
                boxShadow: "0 3px 10px rgba(234, 88, 12, 0.25)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.05rem" }}>
                construction
              </span>
              {loading ? "Đang gửi..." : "Gửi báo bảo trì ngay"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Modal Xem Ghi Chú Của Khách Hàng (Dạng ô vuông nhỏ, 2 dòng: Đội bóng & Ghi chú) ── */
function CustomerNoteModal({ noteData, onClose }) {
  if (!noteData) return null;

  // Tách riêng Tên Đội bóng và Nội dung Ghi chú
  const rawNote = String(noteData.note || "").trim();
  let teamName = "";
  let customerNote = "";

  const teamMatch = rawNote.match(/(?:Đội bóng|CLB|Team)\s*:\s*([^|\n]+)/i);
  if (teamMatch) {
    teamName = teamMatch[1].trim();
    customerNote = rawNote
      .replace(/(?:Đội bóng|CLB|Team)\s*:\s*[^|\n]+/i, "")
      .replace(/^[|\s-]+|[|\s-]+$/g, "")
      .trim();
  } else if (rawNote.includes("|")) {
    const parts = rawNote.split("|").map((p) => p.trim());
    teamName = parts[0] || "";
    customerNote = parts.slice(1).join(" | ").trim();
  } else {
    teamName = "";
    customerNote = rawNote;
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div
        className="modal customer-note-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "360px",
          maxWidth: "92vw",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header nhỏ gọn */}
        <div
          style={{
            padding: "1rem 1.25rem 0.85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "#fef3c7",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
                description
              </span>
            </div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Thông tin ghi chú
            </h3>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            title="Đóng"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              borderRadius: "6px",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>close</span>
          </button>
        </div>

        {/* Nội dung 2 dòng rõ ràng */}
        <div style={{ padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Dòng 1: Đội bóng */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "9px 12px",
            }}
          >
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "3px", display: "flex", alignItems: "center", gap: "5px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.85rem", color: "#3b82f6" }}>groups</span>
              Đội bóng
            </div>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: teamName ? "#0f172a" : "#94a3b8", minHeight: "18px" }}>
              {teamName || ""}
            </div>
          </div>

          {/* Dòng 2: Ghi chú */}
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fef3c7",
              borderRadius: "10px",
              padding: "9px 12px",
            }}
          >
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "3px", display: "flex", alignItems: "center", gap: "5px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.85rem", color: "#d97706" }}>notes</span>
              Ghi chú
            </div>
            <div style={{ fontSize: "0.88rem", fontWeight: 500, color: customerNote ? "#92400e" : "#94a3b8", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "150px", overflowY: "auto", minHeight: "18px" }}>
              {customerNote || ""}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.65rem 1.25rem",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              fontWeight: 600,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Xác nhận Xóa đơn (Custom UI thay vì window.confirm) ── */
function DeleteBookingModal({ booking, onClose, onConfirm, loading }) {
  if (!booking) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div
        className="modal modal-confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "460px",
          maxWidth: "92vw",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.35)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "1.75rem 1.5rem 1rem", textAlign: "center" }}>
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "50%",
              background: "#fef2f2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              border: "4px solid #fee2e2",
              boxShadow: "0 4px 14px rgba(220, 38, 38, 0.15)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "2rem" }}>
              delete_forever
            </span>
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.4rem" }}>
            Xác nhận xóa đơn đặt sân
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, lineHeight: 1.45 }}>
            Bạn có chắc chắn muốn xóa đơn đặt <strong style={{ color: "#dc2626" }}>#BK{String(booking.id || "").substring(0, 8).toUpperCase()}</strong>? Thao tác này sẽ hủy lịch và giải phóng khung giờ sân.
          </p>
        </div>

        <div style={{ padding: "0 1.5rem 1rem" }}>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "0.75rem",
              padding: "0.75rem 1rem",
              fontSize: "0.82rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Khách hàng:</span>
              <strong style={{ color: "#0f172a" }}>{booking.name || "Khách"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Sân &amp; Ngày:</span>
              <span style={{ color: "#334155", fontWeight: 600 }}>{booking.field || "Sân bóng"} · {booking.date || ""}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "0.85rem 1.5rem",
            background: "#fff",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: "0.65rem",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#475569",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn-confirm"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#dc2626",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 3px 10px rgba(220, 38, 38, 0.25)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
              delete
            </span>
            {loading ? "Đang xóa..." : "Xác nhận xóa"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Bookings Component ── */
export default function Bookings() {
  const location = useLocation();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [fields, setFields] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [completingBooking, setCompletingBooking] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Xác nhận",
    confirmType: "danger",
    onConfirm: () => {},
  });
  const [viewingNote, setViewingNote] = useState(null);
  const [newBookingField, setNewBookingField] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [pitchCleaningStatus, setPitchCleaningStatus] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pitch_cleaning_status")) || {};
    } catch {
      return {};
    }
  });
  const [pitchMaintenanceIssues, setPitchMaintenanceIssues] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pitch_maintenance_issues")) || [];
    } catch {
      return [];
    }
  });
  const [cleaningLogs, setCleaningLogs] = useState([]);
  const [reportingMaintenanceBooking, setReportingMaintenanceBooking] = useState(null);
  const [reportingMaintenanceIssue, setReportingMaintenanceIssue] = useState(null);
  const [isReportingMaintenance, setIsReportingMaintenance] = useState(false);
  const { toasts, removeToast, toast } = useToast();

  // URL query pre-fill
  const urlSearch = new URLSearchParams(location.search).get("search") || "";
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedField, setSelectedField] = useState("");
  const [guestFilter, setGuestFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [datePeriod, setDatePeriod] = useState("all");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'schedule'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Quản lý Đồ khách quên (Lost & Found)
  const LOST_KEY = "pitch_lost_found_items";
  const [lostItems, setLostItems] = useState([]);

  const loadLostItems = async () => {
    try {
      const res = await getLostFoundItems().catch(() => null);
      if (res && (Array.isArray(res.data) || Array.isArray(res.data?.results))) {
        const backendItems = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        const enriched = backendItems.map((item) => ({
          ...item,
          id: item.id,
          fieldName: item.field_name || item.fieldName || "Sân bóng",
          itemType: item.item_type || item.itemType || "Đồ đạc",
          location: item.location || "Băng ghế chờ khán đài",
          description: item.description || "",
          guestInfo: item.guest_info || item.guestInfo || "Chưa rõ",
          customerPhone: item.customer_phone || item.customerPhone || "",
          bookingDate: item.booking_date || item.bookingDate || "2026-11-16",
          status: item.status || "pending",
          time: item.time || "Hôm nay",
          reportedBy: item.reported_by || item.reportedBy || "Nhân viên dọn dẹp",
          returnNote: item.return_note || item.returnNote || "",
          returnedAt: item.returned_at || item.returnedAt || null,
        }));
        setLostItems(enriched);
        localStorage.setItem(LOST_KEY, JSON.stringify(enriched));
        return;
      }
      const saved = localStorage.getItem(LOST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setLostItems(Array.isArray(parsed) ? parsed : []);
      } else {
        setLostItems([]);
      }
    } catch {
      setLostItems([]);
    }
  };

  const handleToggleLostStatus = (id) => {
    const updated = lostItems.map((item) => {
      if (item.id === id) {
        const nextStatus = item.status === "returned" ? "pending" : "returned";
        return {
          ...item,
          status: nextStatus,
          returnedAt: nextStatus === "returned" ? new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " hôm nay" : null,
        };
      }
      return item;
    });
    setLostItems(updated);
    localStorage.setItem(LOST_KEY, JSON.stringify(updated));
    broadcastSyncEvent("lost_item_status_changed", { id });
    toast.success("Đã cập nhật trạng thái đồ thất lạc!");
  };

  const handleUpdateLostItem = (updatedItem) => {
    const updated = lostItems.map((item) => (item.id === updatedItem.id ? updatedItem : item));
    setLostItems(updated);
    localStorage.setItem(LOST_KEY, JSON.stringify(updated));

    // Cập nhật database backend facility
    try {
      updateLostFoundItem(updatedItem.id, {
        item_type: updatedItem.itemType,
        field_name: updatedItem.fieldName,
        location: updatedItem.location,
        description: updatedItem.description,
        guest_info: updatedItem.guestInfo,
        customer_phone: updatedItem.customerPhone,
        booking_date: updatedItem.bookingDate,
        status: updatedItem.status,
        return_note: updatedItem.returnNote,
        returned_at: updatedItem.returnedAt,
      }).catch(() => {});
    } catch {}

    broadcastSyncEvent("lost_item_status_changed", updatedItem);
    toast.success("Đã cập nhật trạng thái & thông tin đồ thất lạc!");
  };

  const handleDeleteLostItem = (id) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Xóa đồ thất lạc",
      message: "Bạn có chắc muốn xóa bản ghi đồ thất lạc này không? Hành động này không thể hoàn tác.",
      confirmText: "Xóa bản ghi",
      confirmType: "danger",
      onConfirm: () => {
        const updated = lostItems.filter((i) => i.id !== id);
        setLostItems(updated);
        localStorage.setItem(LOST_KEY, JSON.stringify(updated));

        // Xóa trong database backend facility
        try {
          deleteLostFoundItem(id).catch(() => {});
        } catch {}

        broadcastSyncEvent("lost_item_status_changed", { id, action: "deleted" });
        toast.success("Đã xóa bản ghi đồ thất lạc!");
      }
    });
  };

  const bookingsRef = useRef([]);
  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);

  useEffect(() => {
    const s = new URLSearchParams(location.search).get("search");
    if (s) {
      setSearchQuery(s);
      setViewMode("table");
    }
  }, [location.search]);

  useEffect(() => {
    fetchBookings(false);
    fetchNotifications();
    loadFields();
    loadLostItems();
    loadMaintenanceIssues();
    loadCleaningLogs();

    // 1. Đồng bộ tức thì khi có sự kiện từ tab khác (Cross-tab sync 0ms)
    const cleanupSync = onSyncEvent((event) => {
      if (event.type?.startsWith("booking_")) {
        fetchBookings(true);
        fetchNotifications();
      }
      if (event.type === "notification_created" || event.type === "notification_updated") {
        fetchNotifications();
      }
      if (event.type === "pitch_cleaned" || event.type === "pitch_cleaning_needed") {
        try {
          const saved = localStorage.getItem("pitch_cleaning_status");
          if (saved) setPitchCleaningStatus(JSON.parse(saved));
        } catch {}
        loadCleaningLogs();
      }
      if (
        event.type === "maintenance_issue_reported" ||
        event.type === "field_maintenance_resolved"
      ) {
        try {
          const saved = localStorage.getItem("pitch_maintenance_issues");
          if (saved) setPitchMaintenanceIssues(JSON.parse(saved));
        } catch {}
      }
      if (
        event.type === "lost_item_reported" ||
        event.type === "lost_item_status_changed" ||
        event.type === "lost_item_deleted"
      ) {
        loadLostItems();
      }
    });

    // 2. Smart Polling kiểm tra ngầm mỗi 3.5 giây khi tab đang hiển thị và không mở modal soạn thảo
    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible" && !showAddModal && !editingBooking) {
        fetchBookings(true);
        fetchNotifications();
        loadLostItems();
        try {
          const saved = localStorage.getItem("pitch_cleaning_status");
          if (saved) setPitchCleaningStatus(JSON.parse(saved));
          const savedM = localStorage.getItem("pitch_maintenance_issues");
          if (savedM) setPitchMaintenanceIssues(JSON.parse(savedM));
        } catch {}
      }
    }, 3500);

    // 3. Tự động kiểm tra thông báo mỗi 15 giây
    const notificationInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    }, 15000);

    // 4. Cập nhật tức thì khi admin chuyển lại vào tab này
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchBookings(true);
        loadLostItems();
        try {
          const saved = localStorage.getItem("pitch_cleaning_status");
          if (saved) setPitchCleaningStatus(JSON.parse(saved));
          const savedM = localStorage.getItem("pitch_maintenance_issues");
          if (savedM) setPitchMaintenanceIssues(JSON.parse(savedM));
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cleanupSync();
      clearInterval(pollInterval);
      clearInterval(notificationInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [showAddModal, editingBooking]);

  const loadMaintenanceIssues = async () => {
    try {
      const res = await getMaintenanceIssues();
      const data = res.data?.results || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setPitchMaintenanceIssues(data);
        localStorage.setItem("pitch_maintenance_issues", JSON.stringify(data));
      }
    } catch {}
  };

  const loadCleaningLogs = async () => {
    try {
      const res = await getCleaningLogs();
      const data = res.data?.results || res.data || [];
      if (Array.isArray(data)) {
        setCleaningLogs(data);
      }
    } catch {}
  };

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
      const res = await notificationsApi.getNotifications(userData?.id || "admin");
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unread_count || 0);
    } catch (err) {
      console.log("Lỗi load notifications:", err);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsApi.markAsRead(notificationId);
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
      await notificationsApi.markAllAsRead(userData?.id || "admin");
      fetchNotifications();
    } catch (err) {
      console.log("Lỗi đánh dấu tất cả đã đọc:", err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      fetchNotifications();
    } catch (err) {
      console.log("Lỗi xóa thông báo:", err);
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      const userData = JSON.parse(
        localStorage.getItem("admin_user") || localStorage.getItem("user")
      );
      await notificationsApi.deleteAllNotifications(userData?.id || "admin");
      fetchNotifications();
    } catch (err) {
      console.log("Lỗi xóa tất cả thông báo:", err);
    }
  };

  const fetchBookings = async (isSilent = false) => {
    try {
      const res = await getBookings();
      const newList = res.data || [];
      if (isSilent && bookingsRef.current.length > 0) {
        // Kiểm tra xem có đơn đặt sân mới vừa được gửi không
        if (newList.length > bookingsRef.current.length) {
          toast.info("🔔 Có đơn đặt sân mới vừa được khách hàng gửi!");
        } else {
          // Kiểm tra xem có đơn nào đổi trạng thái không (ví dụ khách hủy)
          const oldMap = new Map(bookingsRef.current.map((b) => [b.id, b.status]));
          const changed = newList.find((b) => oldMap.has(b.id) && oldMap.get(b.id) !== b.status);
          if (changed) {
            toast.info(`Đơn #${String(changed.id).slice(0, 8)} (${changed.name || 'Khách'}) vừa đổi trạng thái: ${statusMap[changed.status] || changed.status}`);
          }
        }
      }
      setBookings(newList);
      fetchNotifications();
    } catch (err) {
      console.log("Lỗi load bookings:", err);
    }
  };

  const handleDelete = (bOrId) => {
    if (typeof bOrId === "object" && bOrId !== null) {
      setDeletingBooking(bOrId);
    } else {
      const found = bookings.find((item) => item.id === bOrId);
      setDeletingBooking(found || { id: bOrId });
    }
  };

  const executeDelete = async () => {
    if (!deletingBooking) return;
    try {
      setIsDeleting(true);
      await deleteBooking(deletingBooking.id);
      toast.success("Xóa đơn thành công");

      // Cập nhật trạng thái dọn dẹp của sân nếu ca bị xóa trùng với ca đang lưu
      try {
        const CLEANING_KEY = "pitch_cleaning_status";
        const savedStatus = localStorage.getItem(CLEANING_KEY);
        if (savedStatus) {
          let statusObj = JSON.parse(savedStatus);
          const fKey = deletingBooking.field_id || deletingBooking.field;
          if (statusObj[fKey]) {
            if (statusObj[fKey].cleanedBookingKey?.includes(deletingBooking.time)) {
              statusObj[fKey].cleanedBookingKey = null;
            }
            if (statusObj[fKey].cleanedSessions) {
              statusObj[fKey].cleanedSessions = statusObj[fKey].cleanedSessions.filter(
                (s) => s.time !== deletingBooking.time
              );
            }
            localStorage.setItem(CLEANING_KEY, JSON.stringify(statusObj));
          }
        }
      } catch (e) {}

      broadcastSyncEvent("booking_deleted", { id: deletingBooking.id, field: deletingBooking.field, time: deletingBooking.time });
      broadcastSyncEvent("booking_updated", { id: deletingBooking.id, action: "deleted" });
      setDeletingBooking(null);
      fetchBookings(false);
    } catch {
      toast.error("Lỗi khi xóa đơn đặt");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickApprove = async (id) => {
    try {
      await updateBooking(id, { status: "Confirmed" });
      toast.success("Đã xác nhận duyệt đơn thành công!");
      broadcastSyncEvent("booking_updated", { id, status: "Confirmed" });
      fetchBookings(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Lỗi khi duyệt đơn");
    }
  };

  const handleCompleteMatch = (b) => {
    setCompletingBooking(b);
  };

  const executeCompleteMatch = async (formData, andNavigate = false) => {
    if (!completingBooking) return;
    const b = completingBooking;
    const reason = formData?.reason || "Báo dọn khẩn cấp";
    const priority = formData?.priority || "Khẩn cấp";
    const description = formData?.description ? formData.description.trim() : "";
    const noteDetail = description ? `${reason} - ${description}` : reason;

    try {
      setIsCompleting(true);
      // KHÔNG đổi trạng thái booking sang Completed! Giữ nguyên trạng thái đơn của khách hàng.

      const nowTimeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const matchField = fields.find((f) => f.field_name === b.field);
      const fKey = matchField?.id || b.field_id || b.field;
      const currentUser = getCurrentUser();
      const managerName = currentUser?.full_name || currentUser?.fullname || currentUser?.username || "Quản lý đặt sân";

      // 1. Lưu trực tiếp vào CSDL backend facility_pitch_cleaning
      try {
        await createCleaningLog({
          field: matchField?.id || (typeof b.field_id === "string" && b.field_id.includes("-") ? b.field_id : null),
          field_name: b.field,
          booking: b.id || null,
          status: "needs_clean",
          status_text: `Báo dọn khẩn cấp: ${noteDetail}`,
          cleaner_name: managerName,
          cleaned_match_time: b.time || "",
          cleaned_match_customer: b.name || "",
          start_time: nowTimeStr,
          notes: noteDetail,
        });
      } catch (dbErr) {
        console.warn("Lưu CSDL cleaning thất bại:", dbErr);
      }

      // 2. Kích hoạt trạng thái báo dọn khẩn cấp cho Cleaner trong localStorage
      try {
        const CLEANING_KEY = "pitch_cleaning_status";
        const LOGS_KEY = "pitch_cleaning_logs";
        const savedStatus = localStorage.getItem(CLEANING_KEY);
        let statusObj = savedStatus ? JSON.parse(savedStatus) : {};

        const updateData = {
          status: "needs_clean",
          cleaningReason: "urgent",
          reportedBy: managerName,
          lastCleaned: `Báo dọn lúc ${nowTimeStr}`,
          start_time: nowTimeStr,
          issueType: reason,
          notes: noteDetail,
          priority: priority,
          completedMatch: {
            time: b.time,
            name: b.name,
            phone: b.phone,
            date: b.date,
            issueType: reason,
            notes: noteDetail,
            priority: priority,
          },
        };
        if (fKey) statusObj[fKey] = updateData;
        if (b.field) statusObj[b.field] = updateData;
        localStorage.setItem(CLEANING_KEY, JSON.stringify(statusObj));

        const savedLogs = localStorage.getItem(LOGS_KEY);
        let logsList = savedLogs ? JSON.parse(savedLogs) : [];
        const newLog = {
          id: Date.now(),
          fieldName: b.field || "Sân bóng",
          time: nowTimeStr,
          statusText: `Báo dọn khẩn cấp: ${noteDetail} (${managerName})`,
          cleaner: "Chờ nhân viên dọn",
        };
        localStorage.setItem(LOGS_KEY, JSON.stringify([newLog, ...logsList.slice(0, 9)]));
      } catch (err) {}

      broadcastSyncEvent("pitch_cleaning_needed", {
        fieldName: b.field,
        time: b.time,
        reason: reason,
        description: description,
        priority: priority,
        reportedBy: managerName,
        reportedTime: nowTimeStr,
      });
      toast.success(`Đã gửi yêu cầu báo dọn khẩn cấp cho sân ${b.field}!`);
      setCompletingBooking(null);

      if (andNavigate) {
        navigate("/admin/cleaning");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi gửi yêu cầu báo dọn sân");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReportMaintenanceSubmit = async (formData) => {
    if (!reportingMaintenanceBooking) return;
    const b = reportingMaintenanceBooking;
    try {
      setIsReportingMaintenance(true);
      const currentUser = getCurrentUser();
      const managerName =
        currentUser?.full_name ||
        currentUser?.fullname ||
        currentUser?.username ||
        "Quản trị viên";
      const reporterTitle = `Quản lý đặt sân (${managerName})`;

      const cleanCat = String(formData.category || "Cơ sở vật chất").split("(")[0].trim();
      const descDetail = formData.description ? formData.description.trim() : "";
      const fullDesc = `[Ca ${b.time}] ${formData.category}${descDetail ? `: ${descDetail}` : " - Cần khắc phục ngay"}`;

      const newIssueItem = {
        id: Date.now(),
        bookingId: b.id,
        bookingTime: b.time,
        field: b.field_id || null,
        fieldName: b.field || "Sân bóng",
        category: cleanCat,
        categoryFull: formData.category,
        description: fullDesc,
        issueDetail: descDetail,
        priority: formData.priority || "Khẩn cấp",
        status: "pending",
        estimatedCost: 0,
        cost: 0,
        reportedBy: reporterTitle,
        createdAt:
          "Hôm nay, " +
          new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      const savedIssues = localStorage.getItem("pitch_maintenance_issues");
      let issueList = savedIssues ? JSON.parse(savedIssues) : [];
      const updated = [newIssueItem, ...issueList];
      setPitchMaintenanceIssues(updated);
      localStorage.setItem("pitch_maintenance_issues", JSON.stringify(updated));

      try {
        const res = await createMaintenanceIssue({
          field: b.field_id || null,
          field_name: b.field,
          category: cleanCat,
          description: fullDesc,
          priority: formData.priority || "Khẩn cấp",
          status: "pending",
          reported_by_name: reporterTitle,
          estimated_cost: 0,
          cost: 0,
        });
        if (res?.data?.id) {
          newIssueItem.id = res.data.id;
          const synced = [newIssueItem, ...issueList];
          setPitchMaintenanceIssues(synced);
          localStorage.setItem("pitch_maintenance_issues", JSON.stringify(synced));
        }
      } catch {}

      broadcastSyncEvent("maintenance_issue_reported", newIssueItem);
      toast.success(`Đã gửi báo sự cố bảo trì cho sân ${b.field} ca ${b.time}!`);
      setReportingMaintenanceBooking(null);
      setReportingMaintenanceIssue(null);
    } catch (err) {
      toast.error("Lỗi khi gửi báo bảo trì sân");
    } finally {
      setIsReportingMaintenance(false);
    }
  };

  const handleBookingMutated = () => {
    broadcastSyncEvent("booking_updated");
    fetchBookings(false);
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
    lost_found: lostItems.filter((i) => i.status === "pending").length,
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

    // 5. Date & Period filter
    const bDateStr = String(b.date || b.booking_date || "").slice(0, 10);
    if (datePeriod === "today") {
      const todayIso = new Date().toISOString().slice(0, 10);
      if (bDateStr !== todayIso) return false;
    } else if (datePeriod === "week") {
      const now = new Date();
      const dayOfWeek = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      const bDate = new Date(bDateStr);
      if (isNaN(bDate.getTime()) || bDate < monday || bDate > sunday) return false;
    } else if (datePeriod === "month") {
      const now = new Date();
      const bDate = new Date(bDateStr);
      if (isNaN(bDate.getTime()) || bDate.getFullYear() !== now.getFullYear() || bDate.getMonth() !== now.getMonth()) return false;
    } else if (datePeriod === "year") {
      const now = new Date();
      const bDate = new Date(bDateStr);
      if (isNaN(bDate.getTime()) || bDate.getFullYear() !== now.getFullYear()) return false;
    } else if (selectedDate) {
      if (bDateStr !== selectedDate) return false;
    }

    return true;
  });

  const handleExportCSV = () => {
    if (!filteredBookings || filteredBookings.length === 0) {
      toast.warning("Không có dữ liệu đơn đặt sân nào để xuất");
      return;
    }

    const headers = [
      "Mã đơn",
      "Khách hàng",
      "Số điện thoại",
      "Loại khách",
      "Sân bóng",
      "Ngày thi đấu",
      "Khung giờ",
      "Tổng tiền (VNĐ)",
      "Trạng thái",
      "Ghi chú",
      "Ngày đặt",
    ];

    const getStatusLabel = (status) => {
      const s = String(status || "").toLowerCase();
      if (s === "pending") return "Chờ duyệt";
      if (s === "confirmed") return "Đã xác nhận";
      if (s === "checked_in") return "Đã check-in";
      if (s === "completed") return "Đã hoàn thành";
      if (s === "cancelled") return "Đã hủy";
      return status || "";
    };

    const rows = filteredBookings.map((b) => [
      `"${b.id}"`,
      `"${(b.name || "").replace(/"/g, '""')}"`,
      `"${b.phone || ""}"`,
      b.is_guest ? "Khách vãng lai" : "Thành viên",
      `"${(b.fieldName || "").replace(/"/g, '""')}"`,
      b.date ? new Date(b.date).toLocaleDateString("vi-VN") : "",
      `"${b.timeSlot || ""}"`,
      b.price || 0,
      `"${getStatusLabel(b.status)}"`,
      `"${(b.notes || "").replace(/"/g, '""')}"`,
      b.created_at ? new Date(b.created_at).toLocaleDateString("vi-VN") : "",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Danh_Sach_Dat_San_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Xuất danh sách đơn đặt sân thành công!");
  };

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
    setDatePeriod(val ? "custom" : "all");
    setCurrentPage(1);
  };

  const handleDatePeriodChange = (period) => {
    setDatePeriod(period);
    if (period !== "custom") {
      setSelectedDate("");
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedField("");
    setGuestFilter("all");
    setSelectedDate("");
    setDatePeriod("all");
    setActiveTab("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedField) ||
    guestFilter !== "all" ||
    Boolean(selectedDate) ||
    datePeriod !== "all" ||
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
        onDelete={handleDeleteNotification}
        onDeleteAll={handleDeleteAllNotifications}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      <main className="main-content bookings-admin-main">
        <div className="content-inner">
          {/* Page Header with View Switcher */}
          <div className="page-header">
            <div>
              <span className="booking-admin-eyebrow">
                VẬN HÀNH CƠ SỞ <span>›</span> QUẢN LÝ ĐẶT SÂN
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
                className="btn-export"
                onClick={handleExportCSV}
                type="button"
                title="Xuất file CSV / Excel"
              >
                <span className="material-symbols-outlined">download</span>
                Xuất CSV
              </button>

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

              {activeTab === "lost_found" ? (
                <LostFoundBookingPanel
                  lostItems={lostItems}
                  onUpdateItem={handleUpdateLostItem}
                  onDeleteItem={handleDeleteLostItem}
                  readOnly={false}
                />
              ) : (
                <>
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
                    datePeriod={datePeriod}
                    onDatePeriodChange={handleDatePeriodChange}
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
                    onCompleteMatch={handleCompleteMatch}
                    onViewNote={setViewingNote}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalFilteredCount={filteredBookings.length}
                    pitchCleaningStatus={pitchCleaningStatus}
                    pitchMaintenanceIssues={pitchMaintenanceIssues}
                    onRequestMaintenance={(booking, issue) => {
                      setReportingMaintenanceBooking(booking);
                      setReportingMaintenanceIssue(issue || null);
                    }}
                    fields={fields}
                    cleaningLogs={cleaningLogs}
                  />
                </>
              )}
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
          onSuccess={handleBookingMutated}
          showToast={(msg, type) => toast[type || "info"](msg)}
        />
      )}

      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSuccess={handleBookingMutated}
          showToast={(msg, type) => toast[type || "info"](msg)}
        />
      )}

      {completingBooking && (
        <CompleteMatchModal
          booking={completingBooking}
          onClose={() => setCompletingBooking(null)}
          onConfirm={executeCompleteMatch}
          loading={isCompleting}
        />
      )}

      {reportingMaintenanceBooking && (
        <ReportMaintenanceBookingModal
          booking={reportingMaintenanceBooking}
          existingIssue={reportingMaintenanceIssue}
          onClose={() => {
            setReportingMaintenanceBooking(null);
            setReportingMaintenanceIssue(null);
          }}
          onSubmit={handleReportMaintenanceSubmit}
          loading={isReportingMaintenance}
        />
      )}

      {deletingBooking && (
        <DeleteBookingModal
          booking={deletingBooking}
          onClose={() => setDeletingBooking(null)}
          onConfirm={executeDelete}
          loading={isDeleting}
        />
      )}

      {viewingNote && (
        <CustomerNoteModal
          noteData={viewingNote}
          onClose={() => setViewingNote(null)}
        />
      )}

      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        confirmType={confirmModalConfig.confirmType}
        onConfirm={confirmModalConfig.onConfirm}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}

