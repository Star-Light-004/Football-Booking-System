import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getFieldDetail } from "../../api/fieldsApi";
import BookingForm from "../../components/BookingForm/BookingForm";
import ServiceSection from '../../components/ServiceSection/ServiceSection';
import "./FieldDetail.css";

// List of slots will be fetched dynamically from the API via BookingForm

// Price will be taken directly from the timeslot data

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
    availableSlots: [],
  });

  // Services State
  const [selectedServices, setSelectedServices] = useState({});
  const [totalServicePrice, setTotalServicePrice] = useState(0);

  const handleServicesChange = (quantities, total) => {
    setSelectedServices(quantities);
    setTotalServicePrice(total);
  };

  /* Nhận update từ BookingForm */
  const handleSlotSelect = useCallback((info) => {
    setScheduleInfo(info);
  }, []);

  const [reviews, setReviews] = useState([]);
  const [showReviews, setShowReviews] = useState(true);
  const [currentImage, setCurrentImage] = useState("");

  const fetchReviews = useCallback(async () => {
    try {
      const response = await fetch(`http://process.env.REACT_APP_API_URL/api/reviews/${id}/`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.log("Lỗi lấy danh sách đánh giá:", error);
    }
  }, [id]);

  useEffect(() => {
    const fetchFieldDetail = async () => {
      try {
        const res = await getFieldDetail(id);
        setField(res.data);
        setCurrentImage(res.data.image_url);
      } catch (error) {
        console.log("Lỗi lấy chi tiết sân:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFieldDetail();
    fetchReviews();
  }, [id, fetchReviews]);

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

  const { selectedDate, selectedTimeSlot, availableSlots } = scheduleInfo;
  const allImages = field.image_url ? [field.image_url, field.image_url, field.image_url] : [];

  // Tính điểm đánh giá trung bình
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length).toFixed(1)
    : "0.0";

  /* Tính trạng thái từng slot từ dữ liệu API */
  const slotsWithStatus = (availableSlots || []).map((s) => {
    const timeRange = `${s.start_time} - ${s.end_time}`;
    let status = "available";
    if (s.status !== "available") status = "booked";
    else if (selectedTimeSlot === timeRange) status = "selected";

    return { 
      ...s, 
      status,
      timeRange,
      displayPrice: (s.price / 1000) + "k"
    };
  });

  return (
    <main className="fd-page">
      <div className="fd-layout">

        {/* ===== LEFT: Main Content ===== */}
        <div className="fd-main">

          {/* Header & Gallery Section */}
          <div className="fd-top-area">
            <div className="fd-gallery-container">
              <div className="fd-gallery">
                <div className="fd-gallery-main">
                  <img src={currentImage} alt={field.field_name} />
                  <div className="fd-gallery-badge">Mới cập nhật</div>
                </div>
                <div className="fd-gallery-thumbs">
                  {allImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      className={`fd-thumb ${currentImage === img ? 'active' : ''}`}
                      onClick={() => setCurrentImage(img)}
                    >
                      <img src={img} alt={`Thumb ${idx}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="fd-services-aside">
              <ServiceSection fieldId={id} onServicesChange={handleServicesChange} />
            </div>
          </div>

          {/* Field Info */}
          <div className="fd-info">

            {/* Badges */}
            <div className="fd-badges">
              <span className="fd-badge-type">{field.field_type}</span>
              <span className="fd-badge-rating" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ca8a04', fontWeight: 'bold' }}>
                {averageRating}/5
                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>star</span>
                ({reviews.length} đánh giá)
              </span>
            </div>

            {/* Title */}
            <h1 className="fd-title">{field.field_name}</h1>

            {/* Location */}
            <div className="fd-location">
              <span className="fd-location-icon">📍</span>
              <span>{field.location}</span>
            </div>

            {/* Booking Count & Phone */}
            <div className="fd-field-meta" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '-10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '0.9rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#16a34a' }}>history</span>
                <span>Đã có <strong>{field.booking_count || 0}</strong> lượt đặt sân</span>
              </div>
              {field.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '0.9rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#16a34a' }}>call</span>
                  <span>Liên hệ: <strong>{field.phone}</strong></span>
                </div>
              )}
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
                {field.description || "Chưa có mô tả cho sân bóng này."}
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
                    <span className="slot-time">{slot.start_time}</span>
                    <span className="slot-price">
                      {slot.status === "booked"
                        ? "Đã đặt"
                        : slot.displayPrice}
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

            {/* Đánh giá người dùng - Moved below Schedule and added collapse feature */}
            <div className="fd-section" style={{ borderTop: '2px solid #00b14f', paddingTop: '20px', marginTop: '30px' }}>
              <div 
                className="fd-section-header" 
                onClick={() => setShowReviews(!showReviews)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <h2 className="fd-section-title" style={{ margin: 0 }}>
                  Đánh giá người dùng {reviews.length > 0 && `(${reviews.length})`}
                </h2>
                <span className="material-symbols-outlined" style={{ transform: showReviews ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                  expand_more
                </span>
              </div>
              
              {showReviews && (
                <div className="fd-reviews-content" style={{ marginTop: '20px', animation: 'fadeIn 0.5s' }}>
                  {reviews.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>Chưa có đánh giá nào cho sân này.</p>
                  ) : (
                    <div className="fd-reviews-list">
                      {reviews.map((rev) => (
                        <div key={rev.id} style={{ 
                          background: '#fff', 
                          padding: '15px', 
                          borderRadius: '12px', 
                          marginBottom: '15px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          border: '1px solid #f0f0f0'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#00b14f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9em' }}>
                                {rev.username?.charAt(0).toUpperCase()}
                              </div>
                              <strong>{rev.username}</strong>
                            </div>
                            <span style={{ color: '#888', fontSize: '0.85em' }}>
                              {new Date(rev.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <div style={{ marginBottom: '8px', fontSize: '0.9em' }}>
                            {[...Array(5)].map((_, i) => (
                              <span 
                                key={i} 
                                className="material-symbols-outlined"
                                style={{ 
                                  color: i < Number(rev.rating) ? '#FFD700' : '#ccc',
                                  fontVariationSettings: i < Number(rev.rating) ? "'FILL' 1" : "'FILL' 0",
                                  fontSize: '20px',
                                  verticalAlign: 'middle'
                                }}
                              >
                                star
                              </span>
                            ))}
                          </div>
                          <p style={{ margin: 0, color: '#333', lineHeight: '1.5' }}>{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
              externalServicesPrice={totalServicePrice}
              selectedServices={selectedServices}
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