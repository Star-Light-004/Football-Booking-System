import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./BookingForm.css";

const BookingForm = ({ fieldId, fieldName, fieldAddress, onSlotSelect }) => {

  const today = new Date();
  const initialYear = today.getFullYear();
  const initialMonth = today.getMonth();

  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().split("T")[0]
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [price, setPrice] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  // ─── Booked slots state ──────────────────────────────────────────────────
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const timeSlots = [
    "07:00 - 08:00",
    "08:00 - 09:00",
    "09:00 - 10:00",
    "10:00 - 11:00",
    "17:00 - 18:00",
    "18:00 - 19:00",
    "19:00 - 20:00",
    "20:00 - 21:00",
  ];

  // ─── Fetch booked slots whenever date or fieldId changes ─────────────────
  const fetchBookedSlots = useCallback(async (date) => {
    if (!fieldId || !date) return;
    setLoadingSlots(true);
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/api/bookings/booked-slots/?field_id=${fieldId}&date=${date}`
      );
      setBookedSlots(res.data.booked_slots || []);
    } catch (err) {
      console.error("Lỗi lấy booked slots:", err);
      setBookedSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [fieldId]);

  useEffect(() => {
    fetchBookedSlots(selectedDate);
  }, [selectedDate, fetchBookedSlots]);

  // Notify parent (FieldDetail) to update the schedule display
  useEffect(() => {
    if (onSlotSelect) {
      onSlotSelect({ selectedDate, selectedTimeSlot, bookedSlots });
    }
  }, [selectedDate, selectedTimeSlot, bookedSlots, onSlotSelect]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const calculatePrice = (slot) => {
    const startHour = parseInt(slot.split(":")[0]);
    if (startHour >= 7 && startHour < 12) return 200000;
    if (startHour >= 12 && startHour < 17) return 300000;
    if (startHour >= 17 && startHour < 22) return 400000;
    return 0;
  };

  const isBooked = (slot) => bookedSlots.includes(slot);

  const handleTimeSlotSelect = (slot) => {
    if (isBooked(slot)) return; // blocked
    setSelectedTimeSlot(slot);
    setPrice(calculatePrice(slot));
    setShowTimeSlots(false);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleDateSelect = (day) => {
    const dateStr =
      currentYear +
      "-" +
      String(currentMonth + 1).padStart(2, "0") +
      "-" +
      String(day).padStart(2, "0");
    setSelectedDate(dateStr);
    setSelectedTimeSlot(null);
    setPrice(0);
    setShowCalendar(false);
  };

  const isPastDay = (day) => {
    const d = new Date(currentYear, currentMonth, day);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Chưa chọn";
    const [y, m, d] = dateStr.split("-");
    return new Date(y, m - 1, d).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl">

      <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-4">
        Thông tin đặt sân
      </h3>

      <div className="space-y-4">

        {/* ── DATE ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 uppercase">
            Ngày đặt
          </label>

          <div
            className="relative flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer"
            onClick={() => setShowCalendar((v) => !v)}
          >
            <span className="material-symbols-outlined text-primary text-xl">
              calendar_today
            </span>
            <span className="text-sm font-semibold">
              {formatDate(selectedDate)}
            </span>

            {showCalendar && (
              <div
                className="bf-calendar-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Month nav */}
                <div className="bf-cal-nav">
                  <button onClick={() => {
                    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
                    else setCurrentMonth(currentMonth - 1);
                  }}>{"<"}</button>
                  <span className="text-sm font-semibold">
                    Tháng {currentMonth + 1} / {currentYear}
                  </span>
                  <button onClick={() => {
                    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
                    else setCurrentMonth(currentMonth + 1);
                  }}>{">"}</button>
                </div>

                {/* Weekday headers */}
                <div className="bf-cal-grid bf-cal-weekdays">
                  {["CN","T2","T3","T4","T5","T6","T7"].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>

                {/* Days */}
                <div className="bf-cal-grid">
                  {Array.from(
                    { length: new Date(currentYear, currentMonth, 1).getDay() },
                    (_, i) => <span key={`e-${i}`} />
                  )}
                  {calendarDays.map((day) => {
                    const past = isPastDay(day);
                    const dateStr =
                      currentYear +
                      "-" +
                      String(currentMonth + 1).padStart(2, "0") +
                      "-" +
                      String(day).padStart(2, "0");
                    const isSelected = dateStr === selectedDate;
                    return (
                      <button
                        key={day}
                        disabled={past}
                        className={[
                          "bf-cal-day",
                          past ? "past" : "",
                          isSelected ? "selected" : "",
                        ].join(" ")}
                        onClick={() => handleDateSelect(day)}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── TIME SLOT ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 uppercase">
            Khung giờ đã chọn
            {loadingSlots && (
              <span className="ml-2 text-primary normal-case font-normal">
                (Đang kiểm tra...)
              </span>
            )}
          </label>

          <div
            className="relative flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20 cursor-pointer"
            onClick={() => setShowTimeSlots((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">
                schedule
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedTimeSlot || "Chưa chọn — bấm để mở"}
              </span>
            </div>

            <span className="text-sm font-bold text-primary">
              {price ? price.toLocaleString() + "đ" : "0đ"}
            </span>

            {showTimeSlots && (
              <div
                className="bf-slots-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="bf-slots-hint">
                  <span className="hint-dot available" /> Trống
                  &nbsp;&nbsp;
                  <span className="hint-dot booked" /> Đã đặt
                </p>
                <div className="bf-slots-grid">
                  {timeSlots.map((slot) => {
                    const booked = isBooked(slot);
                    const selected = selectedTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        disabled={booked}
                        title={booked ? "Khung giờ này đã có người đặt" : ""}
                        className={[
                          "bf-slot-btn",
                          booked ? "booked" : "",
                          selected ? "selected" : "",
                        ].join(" ")}
                        onClick={() => handleTimeSlotSelect(slot)}
                      >
                        <span className="slot-time-label">{slot}</span>
                        {booked && (
                          <span className="slot-badge-booked">Đã đặt</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PRICE BREAKDOWN ─────────────────────────────────────── */}
        <div className="space-y-2 py-4 border-t border-dashed border-slate-200 dark:border-slate-700">
          <div className="flex justify-between text-sm">
            <span>Tiền sân</span>
            <span>{price ? price.toLocaleString() + "đ" : "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Phí dịch vụ (0%)</span>
            <span>0đ</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2">
            <span>Tổng cộng</span>
            <span className="text-primary">
              {price ? price.toLocaleString() + "đ" : "—"}
            </span>
          </div>
        </div>

        <Link
          to="/booking"
          state={{
            fieldId,
            fieldName,
            fieldAddress,
            selectedDate,
            selectedTimeSlot,
            price,
          }}
          className={[
            "w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2",
            selectedTimeSlot
              ? "bg-primary hover:bg-primary/90 text-white"
              : "bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none",
          ].join(" ")}
          onClick={(e) => { if (!selectedTimeSlot) e.preventDefault(); }}
        >
          Tiến hành đặt sân
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>

      </div>
    </div>
  );
};

export default BookingForm;