import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import notificationsApi from "../../api/notificationsApi";

const Navbar = () => {
  const location = useLocation();
  // ✅ state user
  const [user, setUser] = useState(null);
  // ✅ state notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

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

  // ✅ polling notifications mỗi 5 giây
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();
    
    const interval = setInterval(fetchNotifications, 5000);
    
    return () => clearInterval(interval);
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

  // ✅ logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-primary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg text-white">
              <span className="material-symbols-outlined block text-2xl">
                sports_soccer
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-primary">
              Football Booking
            </h1>
          </div>

          {/* Menu */}
          <nav className="navbar-menu">
            {[
              { to: "/", label: "Trang chủ", icon: "home" },
              { to: "/fields", label: "Sân bóng", icon: "stadium" },
              { to: "/booking", label: "Đặt sân", icon: "event_available" },
              { to: "/lookup", label: "Tra cứu", icon: "search" },
              { to: "/my-bookings", label: "Lịch sử", icon: "history" },
            ].map(({ to, label, icon }) => {
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
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-[100] overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 dark:text-white">Thông báo</h3>
                        {unreadCount > 0 && (
                          <span 
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-primary font-medium cursor-pointer hover:underline"
                          >
                            Đánh dấu đã đọc
                          </span>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {loadingNotifications ? (
                          <div className="p-4 text-center text-slate-500">
                            <span className="material-symbols-outlined animate-spin">
                              refresh
                            </span>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-sm">
                            Không có thông báo nào
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            // Chọn icon và màu tương ứng với loại thông báo
                            let iconColor = 'bg-blue-100 text-blue-600';
                            let icon = 'info';
                            
                            if (notif.notification_type === 'booking_approved') {
                              iconColor = 'bg-green-100 text-green-600';
                              icon = 'check_circle';
                            } else if (notif.notification_type === 'booking_rejected') {
                              iconColor = 'bg-red-100 text-red-600';
                              icon = 'cancel';
                            } else if (notif.notification_type === 'booking_completed') {
                              iconColor = 'bg-purple-100 text-purple-600';
                              icon = 'done_all';
                            }

                            return (
                              <div 
                                key={notif.id}
                                className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors flex gap-3 justify-between ${
                                  !notif.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                                }`}
                                onClick={() => handleMarkAsRead(notif.id, event)}
                              >
                                <div className="flex gap-3 flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-full ${iconColor} flex items-center justify-center shrink-0`}>
                                    <span className="material-symbols-outlined text-sm">{icon}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">{notif.title}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{notif.message}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                      {new Date(notif.created_at).toLocaleDateString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => handleDeleteNotification(notif.id, e)}
                                  className="text-slate-400 hover:text-red-500 transition-colors shrink-0 hover:bg-red-50 dark:hover:bg-red-900/20 w-6 h-6 rounded flex items-center justify-center"
                                  title="Xóa thông báo"
                                >
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-sm font-semibold text-primary hidden md:block">
                    Xin chào, {user?.full_name || user?.fullname || user?.phone || "bạn"}
                  </span>
                  
                  {/* User Profile Dropdown */}
                  <div className="relative group">
                    <button className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all duration-300 shadow-sm">
                      <span className="material-symbols-outlined text-2xl">account_circle</span>
                    </button>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-[100] overflow-hidden">
                      <div className="p-2">
                        <Link 
                          to="/profile" 
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">person</span>
                          Thông tin của tôi
                        </Link>
                        
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
    </header>
  );
};

export default Navbar;