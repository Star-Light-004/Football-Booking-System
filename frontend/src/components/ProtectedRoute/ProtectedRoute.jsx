import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import "./ProtectedRoute.css";

/**
 * ProtectedRoute – bảo vệ route theo trạng thái đăng nhập và vai trò (role).
 *
 * Props:
 *  - children    : nội dung cần render
 *  - requireAuth : true → phải đăng nhập
 *  - roles       : mảng role được phép, vd ["admin", "staff"]
 *                  nếu không truyền → không kiểm tra role, chỉ kiểm tra login
 */
const ProtectedRoute = ({ children, requireAuth = false, roles = [] }) => {
  const location = useLocation();

  // Lấy user từ localStorage
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Chưa đăng nhập → chuyển về /login
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Đã đăng nhập nhưng không đúng role → chuyển về trang chủ với thông báo
  if (roles.length > 0 && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;