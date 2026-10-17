import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasPermission } from "../../utils/permissionUtils";
import "./ProtectedRoute.css";

/**
 * ProtectedRoute – bảo vệ route theo trạng thái đăng nhập, vai trò (role) và quyền (permission).
 *
 * Props:
 *  - children    : nội dung cần render
 *  - requireAuth : true → phải đăng nhập
 *  - roles       : mảng role được phép, vd ["admin", "staff"]
 *  - permission  : mã quyền cần có, vd "revenue", "fields", "users"
 */
const ProtectedRoute = ({ children, requireAuth = false, roles = [], permission = null }) => {
  const location = useLocation();

  // Admin roles — đọc từ key "admin_user" riêng biệt
  const ADMIN_ROLES = ["admin", "field_owner", "field_manager", "receptionist", "cashier", "cleaner", "service_staff", "maintenance"];
  // Là admin route khi roles chỉ gồm admin roles (không có "customer")
  const isAdminRoute = roles.length > 0 && !roles.includes("customer") && roles.some(r => ADMIN_ROLES.includes(r));

  // Chọn đúng storage key theo loại route
  const storageKey = isAdminRoute ? "admin_user" : "user";
  const storedUser = localStorage.getItem(storageKey);
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Chưa đăng nhập → chuyển về /login
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Đã đăng nhập nhưng không đúng role → chuyển về trang chủ
  if (roles.length > 0 && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Kiểm tra quyền (permission) cụ thể
  if (permission && user) {
    if (!hasPermission(permission, user)) {
      return <Navigate to={user.role === 'customer' ? "/" : "/admin/dashboard"} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;