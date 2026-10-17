import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";

import Home from "../pages/Home/Home";
import Fields from "../pages/Fields/Fields";
import FieldDetail from "../pages/FieldDetail/FieldDetail";
import Booking from "../pages/Booking/Booking";
import BookingSuccess from "../pages/BookingSuccess/BookingSuccess";
import Lookup from "../pages/Lookup/Lookup";
import Contact from "../pages/Contact/Contact";
import MyBookings from "../pages/MyBookings/MyBookings";
import BookingDetail from "../pages/BookingDetail/BookingDetail";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import Profile from "../pages/Profile/Profile";

/* ADMIN */
import Dashboard from "../pages/admin/dashboard/dashboard";
import AdminFields from "../pages/admin/fields/fields";
import Bookings from "../pages/admin/bookings/bookings";
import BookingCalendar from "../pages/admin/bookings/BookingCalendar";
import Users from "../pages/admin/users/users";
import UserRoles from "../pages/admin/users/user-roles";
import Revenue from "../pages/admin/revenue/revenue";
import Timeslots from "../pages/admin/timeslots/timeslots";
import AdminServices from "../pages/admin/services/services";
import AdminVouchers from "../pages/admin/vouchers/vouchers";
import AdminSettings from "../pages/admin/settings/settings";

// ── Role Groups ────────────────────────────────────────────────────────────
// Admin + tất cả nhân viên có quyền truy cập khu vực quản trị
const ADMIN_ROLES = [
  "admin",
  "field_owner",
  "field_manager",
  "receptionist",
  "cashier",
  "cleaner",
  "service_staff",
  "maintenance",
];
// Chỉ admin và chủ sân xem doanh thu
const REVENUE_ROLES = ["admin", "field_owner"];
// Tất cả role đã đăng nhập (bao gồm cả customer)
const ALL_AUTH_ROLES = [...ADMIN_ROLES, "customer"];

const AppRoutes = () => (
  <Routes>

    {/* ───── PUBLIC ROUTES (ai cũng có thể truy cập, bao gồm khách vãng lai) ───── */}
    <Route path="/" element={<Home />} />
    <Route path="/fields" element={<Fields />} />
    <Route path="/fields/:id" element={<FieldDetail />} />
    <Route path="/booking" element={<Booking />} />
    <Route path="/booking/success" element={<BookingSuccess />} />
    <Route path="/lookup" element={<Lookup />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    {/* ───── USER ROUTES (yêu cầu đăng nhập tài khoản cá nhân) ───── */}
    <Route
      path="/my-bookings"
      element={
        <ProtectedRoute requireAuth roles={ALL_AUTH_ROLES}>
          <MyBookings />
        </ProtectedRoute>
      }
    />
    <Route
      path="/my-bookings/:id"
      element={
        <ProtectedRoute requireAuth roles={ALL_AUTH_ROLES}>
          <BookingDetail />
        </ProtectedRoute>
      }
    />
    <Route
      path="/profile"
      element={
        <ProtectedRoute requireAuth>
          <Profile />
        </ProtectedRoute>
      }
    />

    {/* ───── ADMIN / STAFF ROUTES ───── */}
    <Route
      path="/admin/dashboard"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES} permission="dashboard">
          <Dashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/fields"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES} permission="fields">
          <AdminFields />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/bookings"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES} permission="bookings">
          <Bookings />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/bookings/calendar"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES} permission="bookings">
          <BookingCalendar />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/timeslots"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES} permission="timeslots">
          <Timeslots />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/services"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES} permission="services">
          <AdminServices />
        </ProtectedRoute>
      }
    />
    {/* Quản lý Voucher & Khuyến mãi */}
    <Route
      path="/admin/vouchers"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES} permission="vouchers">
          <AdminVouchers />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/revenue"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES} permission="revenue">
          <Revenue />
        </ProtectedRoute>
      }
    />
    {/* Quản lý người dùng – chỉ vai trò có quyền users */}
    <Route
      path="/admin/users"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES} permission="users">
          <Users />
        </ProtectedRoute>
      }
    />
    {/* Phân quyền người dùng – chỉ super admin */}
    <Route
      path="/admin/users/roles"
      element={
        <ProtectedRoute requireAuth roles={["admin"]}>
          <UserRoles />
        </ProtectedRoute>
      }
    />
    {/* Cài đặt hệ thống – chỉ super admin */}
    <Route
      path="/admin/settings"
      element={
        <ProtectedRoute requireAuth roles={["admin"]}>
          <AdminSettings />
        </ProtectedRoute>
      }
    />

  </Routes>
);

export default AppRoutes;
