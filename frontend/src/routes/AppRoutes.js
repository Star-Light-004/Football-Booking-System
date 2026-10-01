import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";

import Home from "../pages/Home/Home";
import Fields from "../pages/Fields/Fields";
import FieldDetail from "../pages/FieldDetail/FieldDetail";
import Booking from "../pages/Booking/Booking";
import BookingSuccess from "../pages/BookingSuccess/BookingSuccess";
import Lookup from "../pages/Lookup/Lookup";
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
import Revenue from "../pages/admin/revenue/revenue";
import Timeslots from "../pages/admin/timeslots/timeslots";
import AdminServices from "../pages/admin/services/services";
import AdminSettings from "../pages/admin/settings/settings";

// Role có quyền truy cập khu vực admin
const ADMIN_ROLES = ["admin", "staff"];

const AppRoutes = () => (
  <Routes>

    {/* ───── PUBLIC ROUTES ───── */}
    <Route path="/" element={<Home />} />
    <Route path="/fields" element={<Fields />} />
    <Route path="/fields/:id" element={<FieldDetail />} />
    <Route path="/lookup" element={<Lookup />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    {/* ───── USER ROUTES (yêu cầu đăng nhập) ───── */}
    <Route
      path="/booking"
      element={
        <ProtectedRoute requireAuth roles={["customer", "admin", "staff"]}>
          <Booking />
        </ProtectedRoute>
      }
    />
    <Route
      path="/booking/success"
      element={
        <ProtectedRoute requireAuth roles={["customer", "admin", "staff"]}>
          <BookingSuccess />
        </ProtectedRoute>
      }
    />
    <Route
      path="/my-bookings"
      element={
        <ProtectedRoute requireAuth roles={["customer", "admin", "staff"]}>
          <MyBookings />
        </ProtectedRoute>
      }
    />
    <Route
      path="/my-bookings/:id"
      element={
        <ProtectedRoute requireAuth roles={["customer", "admin", "staff"]}>
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
        <ProtectedRoute requireAuth roles={ADMIN_ROLES}>
          <Dashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/fields"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES}>
          <AdminFields />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/bookings"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES}>
          <Bookings />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/bookings/calendar"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES}>
          <BookingCalendar />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/timeslots"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES}>
          <Timeslots />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/services"
      element={
        <ProtectedRoute requireAuth roles={ADMIN_ROLES}>
          <AdminServices />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/revenue"
      element={
        <ProtectedRoute requireAuth roles={["admin"]}>
          <Revenue />
        </ProtectedRoute>
      }
    />
    {/* Quản lý người dùng – chỉ admin */}
    <Route
      path="/admin/users"
      element={
        <ProtectedRoute requireAuth roles={["admin"]}>
          <Users />
        </ProtectedRoute>
      }
    />
    {/* Cài đặt hệ thống – chỉ admin */}
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
