import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  // ✅ state user
  const [user, setUser] = useState(null);

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
          <nav className="hidden md:flex items-center gap-8">
            <Link className="text-sm font-semibold hover:text-primary transition-colors" to="/">
              Trang chủ
            </Link>
            <Link
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              to="/fields"
            >
              Sân bóng
            </Link>
            <Link
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              to="/booking"
            >
              Đặt sân
            </Link>
            <Link
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              to="/lookup"
            >
              Tra cứu
            </Link>
            <Link
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              to="/my-bookings"
            >
              Lịch sử
            </Link>
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm font-semibold text-primary">
                  Xin chào, {user?.full_name || user?.fullname || user?.phone || "bạn"}
                </span>

                <button
                  onClick={handleLogout}
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Đăng xuất
                </button>
              </>
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