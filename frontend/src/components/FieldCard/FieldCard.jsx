import React from "react";
import { Link } from "react-router-dom";
import "./FieldCard.css";

const FieldCard = ({ id, image, type, name, location, price, bookingCount, rating }) => {
  // Determine type label & badge
  const typeStr = String(type || "").toLowerCase();
  let typeLabel = type || "Sân bóng";
  let badgeStatus = null;

  if (typeStr.includes("5")) typeLabel = "5 VS 5";
  else if (typeStr.includes("7")) typeLabel = "7 VS 7";
  else if (typeStr.includes("11")) typeLabel = "11 VS 11";

  // Rating display
  const ratingNum = parseFloat(rating) || 0;
  const ratingDisplay = ratingNum > 0 ? ratingNum.toFixed(1) : null;

  // Price display
  const priceNum = typeof price === "number" ? price : parseFloat(price) || 0;
  const priceDisplay = priceNum > 0 ? priceNum.toLocaleString("vi-VN") : "Liên hệ";

  return (
    <div className="field-card">
      {/* ── Image ── */}
      <div className="field-card__img-wrap">
        {image ? (
          <img className="field-card__img" src={image} alt={name} loading="lazy" />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #14532d, #16a34a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 64, color: "rgba(255,255,255,0.3)" }}>
              stadium
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="field-card__badges">
          <span className="badge-type">{typeLabel}</span>
          {badgeStatus && <span className={`badge-status ${badgeStatus.cls}`}>{badgeStatus.label}</span>}
        </div>

        {/* Rating */}
        {ratingDisplay && (
          <div className="field-card__rating-img">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>star</span>
            {ratingDisplay}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="field-card__body">
        <h5 className="field-card__name">{name || "Sân bóng đá"}</h5>

        <div className="field-card__meta">
          {/* Location */}
          {location && (
            <div className="field-card__location">
              <span className="material-symbols-outlined">location_on</span>
              <span>{location}</span>
            </div>
          )}
          {/* Booking count */}
          {bookingCount > 0 && (
            <div className="field-card__info-row">
              <span className="material-symbols-outlined">history</span>
              <span>Đã có {bookingCount} lượt đặt</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="field-card__tags">
          <span className="field-tag">
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>bolt</span>
            Đặt ngay
          </span>
          <span className="field-tag grey">
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>light_mode</span>
            Có đèn
          </span>
          {ratingDisplay && (
            <span className="field-tag">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>star</span>
              {ratingDisplay}/5
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="field-card__footer">
          <div>
            <div className="field-card__price-label">Giá thuê từ</div>
            <div className="field-card__price">
              {priceDisplay}
              {priceNum > 0 && <span>đ/giờ</span>}
            </div>
          </div>
          <div className="field-card__actions">
            <Link to={`/fields/${id}`} className="btn-detail">
              Chi tiết
            </Link>
            <Link
              to={`/booking?field=${id}`}
              state={{
                fieldId: id,
                fieldName: name,
                fieldType: type,
                fieldAddress: location,
                fieldImage: image,
                price: priceNum,
                selectedDate: new Date().toISOString().split("T")[0],
                totalPrice: priceNum,
                bookingCode: `FB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(id).padStart(2, "0")}`
              }}
              className="btn-book"
            >
              Đặt ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldCard;
