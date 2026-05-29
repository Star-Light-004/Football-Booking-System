import React from "react";
import { Routes, Route } from "react-router-dom";

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
import Users from "../pages/admin/users/users";
import Revenue from "../pages/admin/revenue/revenue";
import Timeslots from "../pages/admin/timeslots/timeslots";
import AdminServices from "../pages/admin/services/services";

const AppRoutes = () => (
  <Routes>

    {/* USER */}
    <Route path="/" element={<Home />} />
    <Route path="/fields" element={<Fields />} />
    <Route path="/fields/:id" element={<FieldDetail />} />
    <Route path="/booking" element={<Booking />} />
    <Route path="/booking/success" element={<BookingSuccess />} />
    <Route path="/lookup" element={<Lookup />} />
    <Route path="/my-bookings" element={<MyBookings />} />
    <Route path="/my-bookings/:id" element={<BookingDetail />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/profile" element={<Profile />} />

    {/* ADMIN */}
    <Route path="/admin/dashboard" element={<Dashboard />} />
    <Route path="/admin/fields" element={<AdminFields />} />
    <Route path="/admin/bookings" element={<Bookings />} />
    <Route path="/admin/users" element={<Users />} />
    <Route path="/admin/revenue" element={<Revenue />} />
    <Route path="/admin/timeslots" element={<Timeslots />} />
    <Route path="/admin/services" element={<AdminServices />} />

  </Routes>
);

export default AppRoutes;