import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./BookingForm.css";

const BookingForm = ({ fieldId, fieldName, fieldAddress, onSlotSelect, externalServicesPrice = 0, selectedServices = {} }) => {

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

  // ─── Time slots state ──────────────────────────────────────────────────
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // ─── Fetch slots from TimeSlots API ─────────────────
  const fetchTimeSlots = useCallback(async (date) => {
    if (!fieldId || !date) return;
    setLoadingSlots(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/timeslots/get-by-field/?field_id=${fieldId}&date=${date}`
      );
      setAvailableSlots(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy slots:", err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [fieldId]);

  useEffect(() => {
    fetchTimeSlots(selectedDate);
  }, [selectedDate, fetchTimeSlots]);

  // Notify parent (FieldDetail) to update the schedule display
  useEffect(() => {
    if (onSlotSelect) {
      onSlotSelect({ selectedDate, selectedTimeSlot, availableSlots });
    }
  }, [selectedDate, selectedTimeSlot, availableSlots, onSlotSelect]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const isBooked = (slot) => slot.status !== 'available';

  const handleTimeSlotSelect = (slot) => {
    if (isBooked(slot)) return;
    const timeRange = `${slot.start_time} - ${slot.end_time}`;
    setSelectedTimeSlot(timeRange);
    setPrice(slot.price);
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

  const totalPrice = price + externalServicesPrice;

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
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
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
                  {availableSlots.map((slot) => {
                    const booked = isBooked(slot);
                    const timeRange = `${slot.start_time} - ${slot.end_time}`;
                    const selected = selectedTimeSlot === timeRange;
                    return (
                      <button
                        key={slot.id}
                        disabled={booked}
                        title={booked ? "Khung giờ này đã có người đặt" : ""}
                        className={[
                          "bf-slot-btn",
                          booked ? "booked" : "",
                          selected ? "selected" : "",
                        ].join(" ")}
                        onClick={() => handleTimeSlotSelect(slot)}
                      >
                        <span className="slot-time-label">{timeRange}</span>
                        <span className="text-[10px] opacity-60">
                          {slot.price.toLocaleString()}đ
                        </span>
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
            <span>Dịch vụ thêm</span>
            <span>{externalServicesPrice ? externalServicesPrice.toLocaleString() + "đ" : "0đ"}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2">
            <span>Tổng cộng</span>
            <span className="text-primary">
              {totalPrice ? totalPrice.toLocaleString() + "đ" : "—"}
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
            selectedServices,
            totalServicePrice: externalServicesPrice,
            totalPrice
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