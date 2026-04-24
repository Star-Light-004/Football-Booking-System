import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import BookingForm from "../../components/BookingForm/BookingForm";
import "./FieldDetail.css";

/* Danh sách khung giờ (giống BookingForm) */
const ALL_SLOTS = [
  { time: "07:00 - 08:00", label: "07:00" },
  { time: "08:00 - 09:00", label: "08:00" },
  { time: "09:00 - 10:00", label: "09:00" },
  { time: "10:00 - 11:00", label: "10:00" },
  { time: "17:00 - 18:00", label: "17:00" },
  { time: "18:00 - 19:00", label: "18:00" },
  { time: "19:00 - 20:00", label: "19:00" },
  { time: "20:00 - 21:00", label: "20:00" },
];

const getSlotPrice = (slot) => {
  const h = parseInt(slot.split(":")[0]);
  if (h >= 7 && h < 12) return "200k";
  if (h >= 12 && h < 17) return "300k";
  if (h >= 17 && h < 22) return "400k";
  return "";
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const FieldDetail = () => {
  const { id } = useParams();
  const [field, setField] = useState(null);
  const [loading, setLoading] = useState(true);

  /* State nhận từ BookingForm qua callback */
  const [scheduleInfo, setScheduleInfo] = useState({
    selectedDate: new Date().toISOString().split("T")[0],
    selectedTimeSlot: null,
    bookedSlots: [],
  });

  /* Nhận update từ BookingForm */
  const handleSlotSelect = useCallback((info) => {
    setScheduleInfo(info);
  }, []);

  useEffect(() => {
    const fetchFieldDetail = async () => {
      try {
        const res = await axios.get(
          `http://127.0.0.1:8000/api/football-fields/${id}/`
        );
        setField(res.data);
      } catch (error) {
        console.log("Lỗi lấy chi tiết sân:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFieldDetail();
  }, [id]);

  if (loading)
    return <h2 style={{ padding: 30 }}>Đang tải chi tiết sân...</h2>;
  if (!field)
    return <h2 style={{ padding: 30 }}>Không tìm thấy sân</h2>;

  const amenities = [
    { icon: "🚗", label: "Bãi đỗ xe rộng" },
    { icon: "💧", label: "Nước uống miễn phí" },
    { icon: "📶", label: "Wifi tốc độ cao" },
    { icon: "👕", label: "Phòng thay đồ" },
  ];

  const { selectedDate, selectedTimeSlot, bookedSlots } = scheduleInfo;

  /* Tính trạng thái từng slot */
  const slotsWithStatus = ALL_SLOTS.map((s) => {
    if (bookedSlots.includes(s.time)) return { ...s, status: "booked" };
    if (selectedTimeSlot === s.time) return { ...s, status: "selected" };
    return { ...s, status: "available" };
  });

  return (
    <main className="fd-page">
      <div className="fd-layout">

        {/* ===== LEFT: Main Content ===== */}
        <div className="fd-main">

          {/* Image Gallery */}
          <div className="fd-gallery">
            <div
              className="fd-gallery-main"
              style={{ backgroundImage: `url(${field.image_url})` }}
            />
            <div className="fd-gallery-side">
              <div
                className="fd-gallery-thumb"
                style={{ backgroundImage: `url(${field.image_url})` }}
              />
              <div
                className="fd-gallery-thumb"
                style={{ backgroundImage: `url(${field.image_url})` }}
              />
            </div>
          </div>

          {/* Field Info */}
          <div className="fd-info">

            {/* Badges */}
            <div className="fd-badges">
              <span className="fd-badge-type">{field.field_type}</span>
              <span className="fd-badge-rating">⭐ 4.8 (120 đánh giá)</span>
            </div>

            {/* Title */}
            <h1 className="fd-title">{field.field_name}</h1>

            {/* Location */}
            <div className="fd-location">
              <span className="fd-location-icon">📍</span>
              <span>{field.location}</span>
            </div>

            {/* Amenities */}
            <div className="fd-amenities">
              {amenities.map((a, i) => (
                <span key={i} className="fd-amenity-tag">
                  <span>{a.icon}</span> {a.label}
                </span>
              ))}
            </div>

            {/* Description */}
            <div className="fd-section">
              <h2 className="fd-section-title">Mô tả</h2>
              <p className="fd-description">
                {field.description ||
                  "Sân cỏ nhân tạo chất lượng cao đạt chuẩn FIFA, hệ thống đèn LED hiện đại không gây lóa mắt, không gian thoáng đãng nằm ngay trung tâm. Phù hợp cho các trận giao hữu 5 người và 7 người."}
              </p>
            </div>

            {/* ─── Schedule — realtime ──────────────────────────────────── */}
            <div className="fd-section">
              <div className="fd-schedule-header">
                <div>
                  <h2 className="fd-section-title">Lịch đặt sân</h2>
                  <p className="fd-schedule-date">{formatDate(selectedDate)}</p>
                </div>
                <div className="fd-schedule-legend">
                  <span className="legend-dot empty" /> Trống
                  <span className="legend-dot booked" /> Đã đặt
                  <span className="legend-dot selected" /> Đang chọn
                </div>
              </div>

              <div className="fd-slots">
                {slotsWithStatus.map((slot, i) => (
                  <div
                    key={i}
                    className={`fd-slot fd-slot--${slot.status}`}
                    title={
                      slot.status === "booked"
                        ? "Khung giờ này đã có người đặt"
                        : slot.status === "selected"
                          ? "Bạn đang chọn khung giờ này"
                          : "Trống — có thể đặt"
                    }
                  >
                    <span className="slot-time">{slot.label}</span>
                    <span className="slot-price">
                      {slot.status === "booked"
                        ? "Đã đặt"
                        : getSlotPrice(slot.label)}
                    </span>
                    {slot.status === "booked" && (
                      <span className="slot-booked-badge">✕</span>
                    )}
                    {slot.status === "selected" && (
                      <span className="slot-selected-badge">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ===== RIGHT: Sidebar ===== */}
        <aside className="fd-sidebar">
          <div className="fd-sidebar-sticky">
            <BookingForm
              fieldId={field.id}
              fieldName={field.field_name}
              fieldAddress={field.location}
              onSlotSelect={handleSlotSelect}
            />

            {/* Map card */}
            <div className="fd-map-card">
              <div className="fd-map-placeholder">
                <span className="fd-map-pin">📍</span>
              </div>
              <div className="fd-map-footer">
                <span>Xem trên bản đồ</span>
                <a href="#" className="fd-map-link">Chỉ đường ↗</a>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </main>
  );
};

export default FieldDetail;