import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import notificationsApi from "../../api/notificationsApi";
import { getMyVouchers } from "../../api/vouchersApi";
import { onSyncEvent } from "../../utils/realtimeSync";

// ── Helper: lấy thông tin hiển thị theo role ──────────────────────────────
const getRoleInfo = (role) => {
  switch (role) {
    case "admin":
      return { label: "Quản trị viên", color: "#ef4444", bg: "#fef2f2", border: "#fecaca" };
    case "staff":
      return { label: "Nhân viên", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" };
    case "customer":
    default:
      return { label: "Khách hàng", color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" };
  }
};

const Navbar = () => {
  const location = useLocation();
  // ✅ state user
  const [user, setUser] = useState(null);
  // ✅ state notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // ✅ state kho voucher của người dùng
  const [voucherCount, setVoucherCount] = useState(0);
  const [myVouchersList, setMyVouchersList] = useState([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const fetchVouchers = async () => {
    if (!user?.id) {
      setVoucherCount(0);
      setMyVouchersList([]);
      return;
    }
    try {
      const res = await getMyVouchers(user.id, "active");
      if (res.data) {
        const count = res.data.active_count !== undefined ? res.data.active_count : (res.data.vouchers?.length || 0);
        setVoucherCount(count);
        setMyVouchersList(res.data.vouchers || []);
      }
    } catch (e) {
      console.log("Lỗi tải vouchers header:", e);
    }
  };

  useEffect(() => {
    fetchVouchers();
    const handleVoucherSync = () => fetchVouchers();
    window.addEventListener("voucherUpdated", handleVoucherSync);
    window.addEventListener("storage", handleVoucherSync);
    return () => {
      window.removeEventListener("voucherUpdated", handleVoucherSync);
      window.removeEventListener("storage", handleVoucherSync);
    };
  }, [user?.id]);

  // ✅ load user từ localStorage
  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };

    loadUser();

    window.addEventListener("storage", loadUser);
    window.addEventListener("userChanged", loadUser);

    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("userChanged", loadUser);
    };
  }, []);

  // ✅ fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) {
      console.log("⚠️ User ID not found:", user);
      return;
    }

    try {
      setLoadingNotifications(true);
      console.log("📢 Fetching notifications for user:", user.id);
      const response = await notificationsApi.getNotifications(user.id);
      console.log("✅ Notifications response:", response.data);
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // ✅ Lắng nghe sự kiện đồng bộ và cập nhật notifications
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    const cleanupSync = onSyncEvent((event) => {
      if (
        event?.type === "notification_created" ||
        event?.type === "notification_updated" ||
        event?.type === "booking_created" ||
        event?.type === "booking_updated" ||
        event?.type === "booking_cancelled"
      ) {
        fetchNotifications();
      }
    });

    const interval = setInterval(fetchNotifications, 5000);

    return () => {
      clearInterval(interval);
      cleanupSync();
    };
  }, [user?.id]);

  // ✅ mark notification as read
  const handleMarkAsRead = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(notificationId);
      await fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // ✅ mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await notificationsApi.markAllAsRead(user.id);
      await fetchNotifications();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // ✅ delete notification
  const handleDeleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.deleteNotification(notificationId);
      await fetchNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // ✅ Xóa tất cả thông báo
  const handleDeleteAllNotifications = async (e) => {
    if (e) e.stopPropagation();
    if (!user?.id) return;
    try {
      await notificationsApi.deleteAllNotifications(user.id);
      await fetchNotifications();
    } catch (error) {
      console.error("Error deleting all notifications:", error);
    }
  };

  // ✅ logout — chỉ xóa session user, KHÔNG ảnh hưởng session admin
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 w-full" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo Sân Bóng Hải Châu - Sport-Tech Gradient */}
          <Link to="/" className="flex items-center gap-2.5 text-decoration-none group select-none">
            <div className="navbar-logo-badge">
              <svg className="ball-svg" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Glow ring / Outer sphere */}
                <circle cx="18" cy="18" r="16" fill="url(#ballGradientNavbar)" />
                {/* Motion speed arc */}
                <path d="M5 23C7 28 12 32 18 32C24 32 29 28 31 23" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 3" opacity="0.65" />
                {/* Soccer ball pentagons and seams */}
                <polygon points="18,11 22,14 20.5,19 15.5,19 14,14" fill="#ffffff" />
                <path d="M18 11V6M22 14L27 12M20.5 19L24 24M15.5 19L12 24M14 14L9 12" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 18C6 14 8 10 11 7" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
                <circle cx="27" cy="9" r="1.5" fill="#ffffff" opacity="0.8" />
                <defs>
                  <linearGradient id="ballGradientNavbar" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#10b981" />
                    <stop offset="0.55" stopColor="#059669" />
                    <stop offset="1" stopColor="#047857" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="brand-text-main">Sân Bóng</span>
                <span className="brand-text-accent">Hải Châu</span>
              </div>
              <span className="brand-tagline">Hệ thống đặt sân thông minh</span>
            </div>
          </Link>

          {/* Menu */}
          <nav className="navbar-menu">
            {[
              { to: "/", label: "Trang chủ", icon: "home", roles: null },
              { to: "/fields", label: "Sân bóng", icon: "stadium", roles: null },
              { to: "/tournaments", label: "Đặt giải đấu", icon: "emoji_events", roles: null },
              // Chỉ user đã đăng nhập mới thấy "Lịch sử"
              { to: "/my-bookings", label: "Lịch sử", icon: "history", roles: ["customer", "staff", "admin"] },
              { to: "/contact", label: "Liên hệ", icon: "support_agent", roles: null },
            ]
              .filter(({ roles }) => {
                if (!roles) return true; // public
                if (!user) return false; // cần login
                return roles.includes(user.role);
              })
              .map(({ to, label, icon }) => {
                const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`navbar-menu-link${isActive ? " active" : ""}`}
                  >
                    <span className="material-symbols-outlined navbar-menu-icon">{icon}</span>
                    {label}
                  </Link>
                );
              })}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Notification Bell */}
                <div className="relative group mr-1">
                  <button className="relative flex items-center justify-center w-10 h-10 rounded-full text-slate-500 hover:text-primary hover:bg-primary/10 transition-all duration-300">
                    <span className="material-symbols-outlined text-2xl">notifications</span>
                    {/* Badge */}
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  <div className="absolute right-0 mt-2 w-[410px] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-[100] overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[15px] text-slate-800 dark:text-white">Thông báo</span>
                        {unreadCount > 0 ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                            {unreadCount} mới
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {notifications.length}
                          </span>
                        )}
                      </div>

                      {notifications.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={handleMarkAllAsRead}
                              className="text-[11.5px] font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                              title="Đánh dấu tất cả thông báo là đã đọc"
                            >
                              <span className="material-symbols-outlined text-[15px]">done_all</span>
                              Đọc tất cả
                            </button>
                          )}

                          {unreadCount > 0 && <span className="text-slate-200 dark:text-slate-700">|</span>}

                          <button
                            type="button"
                            onClick={handleDeleteAllNotifications}
                            className="text-[11.5px] font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                            title="Xóa tất cả thông báo"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                            Xóa tất cả
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Danh sách thông báo */}
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                      {loadingNotifications ? (
                        <div className="py-8 text-center text-slate-500">
                          <span className="material-symbols-outlined animate-spin text-2xl text-primary">
                            refresh
                          </span>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="py-10 px-4 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center mb-2.5">
                            <span className="material-symbols-outlined text-2xl">notifications_none</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Không có thông báo nào</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Các thông tin về lịch thi đấu và ưu đãi sẽ xuất hiện tại đây.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          // Chọn icon và màu tương ứng với loại thông báo
                          let iconColor = 'bg-blue-100 text-blue-600';
                          let icon = 'info';

                          if (notif.notification_type === 'booking_approved') {
                            iconColor = 'bg-emerald-100 text-emerald-600';
                            icon = 'task_alt';
                          } else if (notif.notification_type === 'booking_rejected' || notif.notification_type === 'booking_cancelled') {
                            iconColor = 'bg-rose-100 text-rose-600';
                            icon = 'cancel';
                          } else if (notif.notification_type === 'booking_pending') {
                            iconColor = 'bg-amber-100 text-amber-600';
                            icon = 'schedule';
                          } else if (notif.notification_type === 'booking_completed') {
                            iconColor = 'bg-purple-100 text-purple-600';
                            icon = 'sports_soccer';
                          } else if (notif.title?.includes('Voucher') || notif.title?.includes('🎁')) {
                            iconColor = 'bg-teal-100 text-teal-600';
                            icon = 'redeem';
                          }

                          return (
                            <div
                              key={notif.id}
                              className={`p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer transition-all flex items-start gap-3 relative ${
                                !notif.is_read ? 'bg-emerald-50/35 dark:bg-emerald-950/15' : 'bg-white dark:bg-slate-900'
                              }`}
                              onClick={(e) => handleMarkAsRead(notif.id, e)}
                            >
                              {/* Chấm tròn báo chưa đọc */}
                              {!notif.is_read && (
                                <span className="absolute left-1.5 top-5 w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                              )}

                              {/* Icon hộp thông báo */}
                              <div className={`w-9 h-9 rounded-xl ${iconColor} flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
                                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                              </div>

                              {/* Nội dung thông báo */}
                              <div className="flex-1 min-w-0 pr-1">
                                <p className="font-bold text-[13px] text-slate-800 dark:text-slate-100 leading-snug">
                                  {notif.title}
                                </p>
                                <p className="text-[12.5px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                  {notif.message}
                                </p>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
                                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                                  <span>
                                    {new Date(notif.created_at).toLocaleString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })}
                                  </span>
                                  {!notif.is_read && (
                                    <span className="text-emerald-600 font-semibold ml-1">• Chưa đọc</span>
                                  )}
                                </div>
                              </div>

                              {/* Nút Xóa thông báo này */}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteNotification(notif.id, e)}
                                className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 -mr-1"
                                title="Xóa thông báo này"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* 🎟️ Nút Ví voucher (Vị trí 1: Nằm giữa Chuông và Profile) */}
                <button
                  type="button"
                  onClick={() => {
                    fetchVouchers();
                    setShowVoucherModal(true);
                  }}
                  className="btn-header-voucher"
                  title="Xem ví voucher và ưu đãi của bạn"
                >
                  <span className="material-symbols-outlined voucher-icon">confirmation_number</span>
                  <span className="voucher-text">Ví voucher ({voucherCount})</span>
                </button>

                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-semibold text-primary leading-tight">
                    Xin chào, {user?.full_name || user?.fullname || user?.phone || "bạn"}
                  </span>
                  {/* Role badge */}
                  {user?.role && (() => {
                    const roleInfo = getRoleInfo(user.role);
                    return (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 leading-none"
                        style={{
                          color: roleInfo.color,
                          background: roleInfo.bg,
                          border: `1px solid ${roleInfo.border}`,
                        }}
                      >
                        {roleInfo.label}
                      </span>
                    );
                  })()}
                </div>

                {/* User Profile Dropdown */}
                <div className="relative group">
                  <button className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all duration-300 shadow-sm">
                    <span className="material-symbols-outlined text-2xl">account_circle</span>
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-[100] overflow-hidden">
                    {/* User info header trong dropdown */}
                    <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {user?.full_name || user?.fullname || user?.phone}
                      </p>
                      {user?.role && (() => {
                        const roleInfo = getRoleInfo(user.role);
                        return (
                          <span
                            className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1"
                            style={{
                              color: roleInfo.color,
                              background: roleInfo.bg,
                              border: `1px solid ${roleInfo.border}`,
                            }}
                          >
                            {roleInfo.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="p-2">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                      >
                        <span className="material-symbols-outlined text-xl">person</span>
                        Thông tin của tôi
                      </Link>

                      {/* Quản trị viên và nhân viên thấy link quản trị trong dropdown */}
                      {Boolean(user?.role && ["admin", "field_owner", "field_manager", "receptionist", "cashier", "cleaner", "service_staff", "maintenance", "staff"].includes(user.role)) && (
                        <Link
                          to="/admin/dashboard"
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                          Trang quản trị
                        </Link>
                      )}

                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Link
                  to="/register"
                  className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors px-4 py-2 rounded-lg font-medium"
                >
                  Đăng ký
                </Link>
                <Link
                  to="/login"
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Đăng nhập
                </Link>
              </>
            )}
          </div>

        </div>
      </div>

      {/* ═══ MODAL VÍ VOUCHER TRÊN HEADER ═══ */}
      {showVoucherModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowVoucherModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 440,
              padding: "22px 24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              animation: "fadeInModal 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: "#16a34a", fontSize: "1.4rem" }}>confirmation_number</span>
                Ví Voucher của bạn
              </h3>
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>close</span>
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 16px 0", lineHeight: 1.4 }}>
              Kho mã ưu đãi nhận được sau khi hoàn thành các trận thi đấu đặt sân:
            </p>

            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
              {myVouchersList.length > 0 ? (
                myVouchersList.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      border: "1.5px dashed #86efac",
                      borderRadius: 12,
                      padding: "12px 14px",
                      background: "#f0fdf4",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, color: "#15803d", fontSize: "0.95rem", letterSpacing: "0.5px" }}>
                          {v.code}
                        </span>
                        <span style={{ fontSize: "0.7rem", padding: "2px 6px", background: "#dcfce7", color: "#166534", borderRadius: 4, fontWeight: 700 }}>
                          {v.discount_type === "percent" ? `-${v.discount_value}%` : `-${Number(v.discount_value).toLocaleString("vi-VN")}đ`}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#374151", fontWeight: 600 }}>{v.title}</div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 2 }}>
                        Đơn tối thiểu: {Number(v.min_booking_price || 0).toLocaleString("vi-VN")}đ • HSD: {new Date(v.valid_until).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "28px 16px", color: "#64748b", fontSize: "0.85rem", background: "#f8fafc", borderRadius: 14, border: "1px dashed #cbd5e1" }}>
                  <div style={{ fontSize: "2.2rem", marginBottom: 6 }}>🎟️</div>
                  <div style={{ fontWeight: 800, color: "#1e293b", marginBottom: 4, fontSize: "0.95rem" }}>Chưa có voucher nào trong ví</div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", maxWidth: 300, margin: "0 auto", lineHeight: 1.4 }}>
                    Khi bạn đặt sân và hoàn thành trận đấu, hệ thống sẽ tự động tặng voucher ưu đãi trực tiếp vào đây!
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                style={{
                  padding: "8px 20px",
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;