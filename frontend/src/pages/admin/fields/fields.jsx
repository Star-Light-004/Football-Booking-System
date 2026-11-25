import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from "react-router-dom";
import { getFields, getFieldDetail, createField, updateField, deleteField } from "../../../api/fieldsApi";
import { BASE_URL, SERVER_URL, getFullImageUrl } from '../../../config';
import FieldMap from '../../../components/FieldMap/FieldMap';
import './fields.css';
import { useToast, ToastContainer } from '../../../components/Toast/Toast';
import AdminSidebar from '../../../components/AdminSidebar/AdminSidebar';
import ConfirmModal from '../../../components/ConfirmModal/ConfirmModal';

/* ── Sub-components ── */
function TopHeader() {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm tên sân, vị trí..." />
      </div>
 
      <div className="header-actions">
        <button className="icon-btn" type="button" title="Thông báo">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  );
}
 
function FilterControls({ fields, activeType, onTypeChange, onFiltered }) {
  const types = ['Tất cả', 'Sân 5', 'Sân 7', 'Sân 11'];
  const typeMap = { 'Sân 5': '5 vs 5', 'Sân 7': '7 vs 7', 'Sân 11': '11 vs 11' };

  // Lọc mỗi khi fields hoặc activeType thay đổi
  useEffect(() => {
    if (!fields) return;

    const filtered = fields.filter(f => {
      if (activeType === 'Tất cả') return true; // 🔹 tất cả thì return tất cả
      return f.field_type === typeMap[activeType];
    });

    onFiltered(filtered);
  }, [fields, activeType, onFiltered]);

  return (
    <div className="filter-grid">
      <div className="filter-card col-span-2">
        <label className="filter-label">Phân loại theo quy mô</label>
        <div className="filter-btn-group">
          {types.map(t => (
            <button
              key={t}
              className={`filter-btn${activeType === t ? ' active' : ''}`}
              onClick={() => onTypeChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-card col-span-2">
        <label className="filter-label">Trạng thái hoạt động</label>
        <div className="filter-btn-group">
          <button className="filter-status-btn ready">
            <span className="status-dot green" /> Sẵn sàng
          </button>
          <button className="filter-status-btn maint">
            <span className="status-dot amber" /> Đang bảo trì
          </button>
        </div>
      </div>
    </div>
  );
}
 
function FieldsTable({ fields, onView, onEdit, onDelete }) {
  return (
    <div className="fields-grid-container">
      <div className="fields-grid">
        {fields.map((f) => (
          <div key={f.id} className="field-card">
            <div className="field-card-image">
              {f.image || f.image_url ? (
                <img
                  src={getFullImageUrl(f.image_url || f.image)}
                  alt={f.field_name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML =
                      '<span class="material-symbols-outlined" style="font-size:3rem;color:#a1a1aa;margin:auto;display:flex;align-items:center;justify-content:center;height:100%">stadium</span>';
                  }}
                />
              ) : (
                <span className="material-symbols-outlined"
                  style={{ fontSize: '3rem', color: '#a1a1aa', margin: 'auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  stadium
                </span>
              )}
              <div className="field-card-badge">
                <span className={`type-badge ${f.field_type?.includes('5') ? 'san5' : f.field_type?.includes('7') ? 'san7' : 'san11'}`}>
                  {f.field_type}
                </span>
              </div>
            </div>

            <div className="field-card-content">
              <h3 className="field-card-name">{f.field_name}</h3>
              <p className="field-card-location">
                <span className="material-symbols-outlined">location_on</span>
                {f.location}
              </p>

              <div className="field-card-info">
                <div className="info-item">
                  <span className="material-symbols-outlined">payments</span>
                  <div>
                    <small>Giá chỉ từ</small>
                    <strong>{Number(f.min_price || f.price_per_hour || 0).toLocaleString("vi-VN")}đ</strong>
                  </div>
                </div>
                <div className="info-item">
                  <span className="material-symbols-outlined">event_available</span>
                  <div>
                    <small>Lượt đặt</small>
                    <strong>{f.booking_count || 0}</strong>
                  </div>
                </div>
                <div className="info-item">
                  <span className="material-symbols-outlined">star</span>
                  <div>
                    <small>Đánh giá</small>
                    <strong>{f.rating_avg || 0}/5</strong>
                  </div>
                </div>
                <div className="info-item">
                  <span className="material-symbols-outlined">phone</span>
                  <div>
                    <small>SĐT</small>
                    <strong>{f.phone || '-'}</strong>
                  </div>
                </div>
              </div>

              <div className="field-card-status">
                <small>Trạng thái</small>
                {f.is_available ? (
                  <span className="status-badge ready">
                    <span className="dot" />
                    Sẵn sàng
                  </span>
                ) : (
                  <span className="status-badge maintenance">
                    <span className="dot" />
                    Đang bảo trì
                  </span>
                )}
              </div>

              <div className="field-card-actions">
                <button
                  className="card-action-btn view"
                  onClick={() => onView(f)}
                  title="Xem chi tiết"
                >
                  <span className="material-symbols-outlined">visibility</span>
                  Xem
                </button>
                <button
                  className="card-action-btn edit"
                  onClick={() => onEdit(f)}
                  title="Chỉnh sửa"
                >
                  <span className="material-symbols-outlined">edit</span>
                  Sửa
                </button>
                <button
                  className="card-action-btn delete"
                  onClick={() => onDelete(f.id)}
                  title="Xóa"
                >
                  <span className="material-symbols-outlined">delete</span>
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="table-footer">
        <p>Hiển thị {fields.length} trong tổng số {fields.length} sân</p>
        <div className="pagination">
          <button className="page-btn icon">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_left</span>
          </button>
          <button className="page-btn active">1</button>
          <button className="page-btn">2</button>
          <button className="page-btn icon">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
 
function RatingStars({ rating }) {
  return <span className="detail-rating-stars">{[0, 1, 2, 3, 4].map((index) => (
    <span key={index} className="material-symbols-outlined" style={{ fontVariationSettings: index < Number(rating) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
  ))}</span>;
}

function FieldDetailModal({ initialField, onClose }) {
  const [field, setField] = useState(initialField);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const [fieldResponse, reviewsResponse] = await Promise.all([
          getFieldDetail(initialField.id), fetch(`${BASE_URL}/reviews/${initialField.id}/`),
        ]);
        if (!reviewsResponse.ok) throw new Error("Không thể tải đánh giá");
        setField(fieldResponse.data);
        setReviews(await reviewsResponse.json());
      } catch (loadError) {
        console.error("Lỗi lấy chi tiết sân:", loadError);
        setError("Không thể tải chi tiết sân. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [initialField.id]);

  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : "0.0";
  const imageUrl = getFullImageUrl(field?.image_url || field?.image);

  return (
    <div className="modal-overlay field-detail-overlay" onMouseDown={onClose}>
      <div className="modal field-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div><p className="field-detail-kicker">CHI TIẾT SÂN BÓNG</p><h3>{field?.field_name || initialField.field_name}</h3></div>
          <button className="modal-close" onClick={onClose} aria-label="Đóng chi tiết sân"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="modal-body field-detail-body">
          {loading && <div className="field-detail-loading">Đang tải chi tiết sân...</div>}
          {!loading && error && <div className="field-detail-error">{error}</div>}
          {!loading && !error && field && <>
            <div className="field-detail-summary">
              <div className="field-detail-image">{imageUrl ? <img src={imageUrl} alt={field.field_name} /> : <span className="material-symbols-outlined">stadium</span>}</div>
              <div className="field-detail-info">
                <div className="field-detail-rating"><p>Đánh giá trung bình</p><strong>{averageRating}<small>/5</small></strong><RatingStars rating={averageRating} /><span>{reviews.length} đánh giá</span></div>
                <div className="field-detail-meta">
                  <p>
                    <span className="material-symbols-outlined">payments</span>
                    <b>Giá thuê khởi điểm:</b> {Number(field.price_per_hour || 0).toLocaleString("vi-VN")}đ/giờ
                    {field.min_price && field.price_per_hour && Number(field.min_price) !== Number(field.price_per_hour) && (
                      <span style={{ fontSize: "0.82rem", color: "#16a34a", marginLeft: "8px", fontWeight: "600" }}>
                        (Khách đang thấy từ: {Number(field.min_price).toLocaleString("vi-VN")}đ)
                      </span>
                    )}
                  </p>
                  <p><span className="material-symbols-outlined">straighten</span><b>Quy mô mặt sân:</b> {field.pitch_standard || "Tiêu chuẩn theo loại sân"}</p>
                  <p><span className="material-symbols-outlined">event_available</span><b>Lượt đặt:</b> {field.booking_count || 0}</p>
                  <p><span className="material-symbols-outlined">phone</span><b>Liên hệ:</b> {field.phone || "Chưa cập nhật"}</p>
                  <p><span className="material-symbols-outlined">location_on</span><b>Địa chỉ:</b> {field.location}</p>
                </div>
              </div>
            </div>
            <section className="field-detail-section"><h4>Mô tả sân</h4><p>{field.description || "Sân chưa có mô tả chi tiết."}</p></section>
            <section className="field-detail-section field-detail-reviews">
              <h4>Tất cả đánh giá <span>({reviews.length})</span></h4>
              {reviews.length === 0 ? <p className="field-detail-empty">Chưa có đánh giá nào cho sân này.</p> : reviews.map((review) => <article className="field-review-item" key={review.id}>
                <div className="field-review-avatar">{(review.username || "U").charAt(0).toUpperCase()}</div>
                <div><div className="field-review-heading"><strong>{review.username || "Người dùng"}</strong><time>{new Date(review.created_at).toLocaleDateString("vi-VN")}</time></div><RatingStars rating={review.rating} /><p>{review.comment || "Người dùng không để lại nhận xét."}</p></div>
              </article>)}
            </section>
          </>}
        </div>
      </div>
    </div>
  );
}

function FieldImagesManager({
  mainImage, setMainImage, existingMainImage,
  sub1, setSub1, existingSub1,
  sub2, setSub2, existingSub2,
  sub3, setSub3, existingSub3,
}) {
  const mainRef = useRef(null);
  const sub1Ref = useRef(null);
  const sub2Ref = useRef(null);
  const sub3Ref = useRef(null);

  const mainPreview = mainImage ? URL.createObjectURL(mainImage) : existingMainImage;
  const sub1Preview = sub1 ? URL.createObjectURL(sub1) : existingSub1;
  const sub2Preview = sub2 ? URL.createObjectURL(sub2) : existingSub2;
  const sub3Preview = sub3 ? URL.createObjectURL(sub3) : existingSub3;

  return (
    <div className="field-images-manager" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* 1. Main image */}
      <div>
        <label className="form-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16a34a' }}>photo_camera</span>
          Ảnh đại diện chính sân bóng
        </label>
        <div
          className={`upload-zone ${mainPreview ? 'has-preview' : ''}`}
          onClick={() => mainRef.current.click()}
        >
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={mainRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setMainImage(e.target.files[0]);
              }
            }}
          />
          {mainPreview ? (
            <>
              <img src={mainPreview} alt="Ảnh chính sân bóng" />
              <div className="upload-zone-overlay">
                <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>edit</span>
                <span>Nhấn để thay đổi ảnh chính</span>
              </div>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">add_a_photo</span>
              <p>Tải lên hình ảnh sân bóng chính</p>
              <p className="upload-hint">JPG, PNG (Tối đa 5MB)</p>
            </>
          )}
        </div>
      </div>

      {/* 2. Sub images */}
      <div className="sub-images-section">
        <div className="sub-images-header">
          <div className="sub-images-title">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16a34a' }}>collections</span>
            3 Ảnh phụ chi tiết sân bóng
          </div>
          <p className="sub-images-subtitle">
            Hiển thị cột dọc bên phải ở trang chi tiết sân (Khung thành, mặt cỏ, dàn đèn...)
          </p>
        </div>

        <div className="sub-images-grid">
          {/* Sub 1 */}
          <div
            className={`sub-upload-card ${sub1Preview ? 'has-image' : ''}`}
            onClick={() => sub1Ref.current.click()}
          >
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={sub1Ref}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSub1(e.target.files[0]);
                }
              }}
            />
            {sub1Preview ? (
              <>
                <img src={sub1Preview} alt="Ảnh phụ 1" />
                <div className="sub-card-overlay">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>edit</span>
                  <span>Đổi ảnh 1</span>
                </div>
              </>
            ) : (
              <div className="sub-empty-content">
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span className="sub-card-label">Ảnh phụ 1</span>
                <span className="sub-card-hint">Khung thành & lưới</span>
              </div>
            )}
          </div>

          {/* Sub 2 */}
          <div
            className={`sub-upload-card ${sub2Preview ? 'has-image' : ''}`}
            onClick={() => sub2Ref.current.click()}
          >
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={sub2Ref}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSub2(e.target.files[0]);
                }
              }}
            />
            {sub2Preview ? (
              <>
                <img src={sub2Preview} alt="Ảnh phụ 2" />
                <div className="sub-card-overlay">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>edit</span>
                  <span>Đổi ảnh 2</span>
                </div>
              </>
            ) : (
              <div className="sub-empty-content">
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span className="sub-card-label">Ảnh phụ 2</span>
                <span className="sub-card-hint">Mặt cỏ nhân tạo</span>
              </div>
            )}
          </div>

          {/* Sub 3 */}
          <div
            className={`sub-upload-card ${sub3Preview ? 'has-image' : ''}`}
            onClick={() => sub3Ref.current.click()}
          >
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={sub3Ref}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSub3(e.target.files[0]);
                }
              }}
            />
            {sub3Preview ? (
              <>
                <img src={sub3Preview} alt="Ảnh phụ 3" />
                <div className="sub-card-overlay">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>edit</span>
                  <span>Đổi ảnh 3</span>
                </div>
              </>
            ) : (
              <div className="sub-empty-content">
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span className="sub-card-label">Ảnh phụ 3</span>
                <span className="sub-card-hint">Dàn đèn LED</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddFieldModal({ onClose, onSuccess, showToast }) {
  const [image, setImage] = useState(null);
  const [subImage1, setSubImage1] = useState(null);
  const [subImage2, setSubImage2] = useState(null);
  const [subImage3, setSubImage3] = useState(null);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("5 vs 5");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [pitchStandard, setPitchStandard] = useState("");
  const [phone, setPhone] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [loading, setLoading] = useState(false);

  const [debouncedLocation, setDebouncedLocation] = useState("");
  const debounceRef = useRef(null);

  const handleLocationChange = (val) => {
    setLocation(val);
    setLatitude(null);
    setLongitude(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedLocation(val);
    }, 700);
  };

  const handleCoordsFound = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleAddField = async () => {
    if (!fieldName || !price || !location) {
      showToast("Vui lòng nhập đầy đủ thông tin", "warning");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("field_name", fieldName);
      formData.append("field_type", fieldType);
      formData.append("location", location);
      formData.append("price_per_hour", price);
      formData.append("description", description);
      formData.append("pitch_standard", pitchStandard);
      formData.append("phone", phone);
      if (image) formData.append("image", image);
      if (subImage1) formData.append("sub_image_1", subImage1);
      if (subImage2) formData.append("sub_image_2", subImage2);
      if (subImage3) formData.append("sub_image_3", subImage3);
      if (latitude) formData.append("latitude", latitude);
      if (longitude) formData.append("longitude", longitude);

      await createField(formData);
      showToast("Đã thêm sân thành công!", "success");
      onSuccess();
      onClose();
    } catch (error) {
      console.log(error);
      showToast("Lỗi khi thêm sân", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <h3>Thêm sân bóng mới</h3>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Main and sub images upload */}
          <FieldImagesManager
            mainImage={image}
            setMainImage={setImage}
            sub1={subImage1}
            setSub1={setSubImage1}
            sub2={subImage2}
            setSub2={setSubImage2}
            sub3={subImage3}
            setSub3={setSubImage3}
          />

          {/* Form */}
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Tên sân bóng</label>
              <input
                className="form-input"
                type="text"
                placeholder="Nhập tên sân (Ví dụ: Sân A2)"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Loại sân</label>
              <select
                className="form-select"
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
              >
                <option value="5 vs 5">Sân 5 người</option>
                <option value="7 vs 7">Sân 7 người</option>
                <option value="11 vs 11">Sân 11 người</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Giá thuê khởi điểm (VNĐ/giờ)</label>
              <input
                className="form-input"
                type="number"
                placeholder="VD: 80000 hoặc 100000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <span style={{ fontSize: "0.78rem", color: "#64748b", display: "block", marginTop: "4px" }}>
                💡 Khi sân chưa có khung giờ riêng, mức giá này sẽ hiển thị là "Giá thuê chỉ từ..." cho khách hàng.
              </span>
            </div>

            <div className="form-group full">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#00b14f' }}>location_on</span>
                Địa điểm / Địa chỉ cụ thể
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="VD: 123 Nguyễn Văn Linh, Hải Châu, Đà Nẵng"
                value={location}
                onChange={(e) => handleLocationChange(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '5px 0 8px', lineHeight: '1.4' }}>
                💡 Nhập địa chỉ đầy đủ để bản đồ định vị chính xác.
                Bản đồ sẽ tự cập nhật sau khi bạn gõ xong.
              </p>

              {/* Live map preview */}
              {debouncedLocation && (
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #bbf7d0', marginTop: '4px' }}>
                  <FieldMap
                    lat={latitude}
                    lng={longitude}
                    location={debouncedLocation}
                    fieldName={fieldName}
                    onCoordsFound={handleCoordsFound}
                    compact={true}
                    showFooter={false}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại liên hệ</label>
              <input
                className="form-input"
                type="text"
                placeholder="09xx xxx xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label className="form-label">Mô tả chi tiết sân bóng</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Mô tả về chất lượng cỏ, đèn chiếu sáng, tiện ích đi kèm..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label className="form-label">
                Mô tả quy mô mặt sân
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "normal", marginLeft: "6px" }}>
                  (Hiển thị trên banner ảnh chi tiết sân)
                </span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="Ví dụ: Cụm 4 sân 7 người kết hợp sân 11 tiêu chuẩn"
                value={pitchStandard}
                onChange={(e) => setPitchStandard(e.target.value)}
              />
            </div>
          </div>

          {/* Info banner */}
          <div className="info-banner">
            <span className="material-symbols-outlined">info</span>
            <p>
              Sân mới sau khi tạo sẽ mặc định ở trạng thái "Sẵn sàng" và hiển thị
              ngay trên ứng dụng người dùng.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button
            className="btn-confirm"
            onClick={handleAddField}
            disabled={loading}
          >
            {loading ? "Đang thêm..." : "Xác nhận thêm sân"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditFieldModal({ field, onClose, onSuccess, showToast }) {
  const [fieldName, setFieldName] = useState(field.field_name || "");
  const [fieldType, setFieldType] = useState(field.field_type || "5 vs 5");
  const [price, setPrice] = useState(field.price_per_hour || "");
  const [location, setLocation] = useState(field.location || "");
  const [description, setDescription] = useState(field.description || "");
  const [pitchStandard, setPitchStandard] = useState(field.pitch_standard || "");
  const [phone, setPhone] = useState(field.phone || "");
  const [isAvailable, setIsAvailable] = useState(field.is_available);
  const [latitude, setLatitude] = useState(field.latitude || null);
  const [longitude, setLongitude] = useState(field.longitude || null);
  const [loading, setLoading] = useState(false);

  // Images state
  const [image, setImage] = useState(null);
  const [subImage1, setSubImage1] = useState(null);
  const [subImage2, setSubImage2] = useState(null);
  const [subImage3, setSubImage3] = useState(null);

  const existingMainImage = getFullImageUrl(field.image_url || field.image) || null;
  const existingSub1 = getFullImageUrl(field.sub_image_1_url || field.sub_image_1) || null;
  const existingSub2 = getFullImageUrl(field.sub_image_2_url || field.sub_image_2) || null;
  const existingSub3 = getFullImageUrl(field.sub_image_3_url || field.sub_image_3) || null;

  // Debounced location: chờ 700ms sau khi gõ xong mới geocode
  const [debouncedLocation, setDebouncedLocation] = useState(field.location || "");
  const debounceRef = useRef(null);

  const handleLocationChange = (val) => {
    setLocation(val);
    if (val !== field.location) {
      setLatitude(null);
      setLongitude(null);
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedLocation(val);
    }, 700);
  };

  const handleCoordsFound = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleEditField = async () => {
    if (!fieldName || !price || !location) {
      showToast("Vui lòng nhập đầy đủ thông tin", "warning");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("field_name", fieldName);
      formData.append("field_type", fieldType);
      formData.append("location", location);
      formData.append("price_per_hour", price);
      formData.append("description", description);
      formData.append("pitch_standard", pitchStandard);
      formData.append("phone", phone);
      formData.append("is_available", isAvailable);
      if (latitude) formData.append("latitude", latitude);
      if (longitude) formData.append("longitude", longitude);

      if (image) formData.append("image", image);
      if (subImage1) formData.append("sub_image_1", subImage1);
      if (subImage2) formData.append("sub_image_2", subImage2);
      if (subImage3) formData.append("sub_image_3", subImage3);

      await updateField(field.id, formData);
      showToast("Cập nhật sân thành công!", "success");
      onSuccess();
      onClose();
    } catch (error) {
      console.log(error);
      showToast("Lỗi khi cập nhật sân", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Chỉnh sửa thông tin sân</h3>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          {/* Main and sub images upload & preview */}
          <FieldImagesManager
            mainImage={image}
            setMainImage={setImage}
            existingMainImage={existingMainImage}
            sub1={subImage1}
            setSub1={setSubImage1}
            existingSub1={existingSub1}
            sub2={subImage2}
            setSub2={setSubImage2}
            existingSub2={existingSub2}
            sub3={subImage3}
            setSub3={setSubImage3}
            existingSub3={existingSub3}
          />

          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Tên sân bóng</label>
              <input
                className="form-input"
                type="text"
                placeholder="Nhập tên sân (Ví dụ: Sân A2)"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Loại sân</label>
              <select
                className="form-select"
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
              >
                <option value="5 vs 5">Sân 5 người</option>
                <option value="7 vs 7">Sân 7 người</option>
                <option value="11 vs 11">Sân 11 người</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Giá thuê khởi điểm (VNĐ/giờ)</label>
              <input
                className="form-input"
                type="number"
                placeholder="VD: 80000 hoặc 100000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <span style={{ fontSize: "0.78rem", color: "#64748b", display: "block", marginTop: "4px" }}>
                💡 Mức giá mặc định khi chưa có slot. Giá hiển thị thực tế ngoài trang khách hiện tại: <strong style={{ color: "#16a34a" }}>{Number(field.min_price || price || 0).toLocaleString("vi-VN")}đ/giờ</strong>
              </span>
            </div>

            {/* Địa chỉ + live map preview */}
            <div className="form-group full">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#00b14f' }}>location_on</span>
                Địa điểm / Địa chỉ cụ thể
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="VD: 123 Nguyễn Văn Linh, Hải Châu, Đà Nẵng"
                value={location}
                onChange={(e) => handleLocationChange(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '5px 0 8px', lineHeight: '1.4' }}>
                💡 Nhập địa chỉ đầy đủ để bản đồ định vị chính xác.
                Bản đồ sẽ tự cập nhật sau khi bạn gõ xong.
              </p>

              {/* Live map preview */}
              {debouncedLocation && (
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #bbf7d0', marginTop: '4px' }}>
                  <FieldMap
                    lat={latitude}
                    lng={longitude}
                    location={debouncedLocation}
                    fieldName={fieldName}
                    onCoordsFound={handleCoordsFound}
                    compact={true}
                    showFooter={false}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại liên hệ</label>
              <input
                className="form-input"
                type="text"
                placeholder="09xx xxx xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label className="form-label">Mô tả chi tiết sân bóng</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Mô tả về chất lượng cỏ, đèn chiếu sáng, tiện ích đi kèm..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label className="form-label">
                Mô tả quy mô mặt sân
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "normal", marginLeft: "6px" }}>
                  (Hiển thị trên banner ảnh chi tiết sân)
                </span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="Ví dụ: Cụm 4 sân 7 người kết hợp sân 11 tiêu chuẩn"
                value={pitchStandard}
                onChange={(e) => setPitchStandard(e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label className="form-label">Trạng thái hoạt động</label>
              <select
                className="form-select"
                value={isAvailable ? "true" : "false"}
                onChange={(e) => setIsAvailable(e.target.value === "true")}
              >
                <option value="true">Sẵn sàng</option>
                <option value="false">Đang bảo trì</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button
            className="btn-confirm"
            onClick={handleEditField}
            disabled={loading}
          >
            {loading ? "Đang cập nhật..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
 
/* ── Main Fields Component ── */
export default function Fields() {
  const [filteredFields, setFilteredFields] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [viewingField, setViewingField] = useState(null);
  const [activeType, setActiveType] = useState('Tất cả');
  const { toasts, removeToast, toast } = useToast();
 const fetchFields = async () => {
  try {
    const res = await getFields({ params: { show_all: 'true' } });
    
    // 🔹 Thêm dòng này để xem dữ liệu trả về
    console.log("Dữ liệu fields từ API:", res.data.fields);
    
    setFields(res.data.fields);
    setFilteredFields(res.data.fields);
  } catch (error) {
    console.log(error);
  } finally {
    setLoading(false);
  }
};

  // 🔹 gọi khi load trang
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Xác nhận",
    confirmType: "danger",
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchFields();
  }, []);
  
  const handleDelete = (id) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Xóa sân bóng",
      message: "Bạn có chắc chắn muốn xóa sân này không? Hành động này không thể hoàn tác.",
      confirmText: "Xóa sân",
      confirmType: "danger",
      onConfirm: async () => {
        try {
          await deleteField(id);
          toast.success("Xóa sân thành công!");
          fetchFields();
        } catch (error) {
          console.log(error);
          toast.error("Lỗi khi xóa sân");
        }
      }
    });
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AdminSidebar />

      <TopHeader />

      <main className="main-content fields-admin-main">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <h2>Đang tải danh sách sân...</h2>
          </div>
        ) : (
          <div className="content-inner">
            <div className="page-header">
              <div>
                <span className="fields-eyebrow">VẬN HÀNH CƠ SỞ <span>›</span> QUẢN LÝ SÂN BÓNG</span>
                <h2>Quản lý sân bóng</h2>
                <p>Theo dõi, điều chỉnh và cập nhật trạng thái hoạt động theo thời gian thực của toàn bộ cụm sân thể thao.</p>
              </div>

              <button
                className="btn-add-field"
                onClick={() => setShowModal(true)}
              >
                <span className="material-symbols-outlined">add</span>
                Thêm sân mới
              </button>
            </div>

            <section className="fields-overview-grid" aria-label="Tổng quan sân bóng">
              <article className="fields-overview-card">
                <div><span>QUY MÔ HOẠT ĐỘNG</span><span className="material-symbols-outlined overview-icon green">stadium</span></div>
                <strong>{fields.length}<small> sân</small></strong>
                <p><span className="material-symbols-outlined">verified</span>Danh sách sân toàn hệ thống</p>
              </article>
              <article className="fields-overview-card">
                <div><span>SÂN SẴN SÀNG VẬN HÀNH</span><span className="material-symbols-outlined overview-icon mint">check_circle</span></div>
                <strong>{fields.filter((field) => field.is_available).length}<small> sân</small></strong>
                <p><span className="material-symbols-outlined">event_available</span>Đang cho phép đặt sân</p>
              </article>
              <article className="fields-overview-card">
                <div><span>BẢO TRÌ MẶT SÂN</span><span className="material-symbols-outlined overview-icon rose">engineering</span></div>
                <strong>{fields.filter((field) => !field.is_available).length}<small> sân</small></strong>
                <p><span className="material-symbols-outlined">build</span>Chưa khả dụng</p>
              </article>
              <article className="fields-overview-card">
                <div><span>GIÁ KHỞI ĐIỂM TRUNG BÌNH</span><span className="material-symbols-outlined overview-icon blue">payments</span></div>
                <strong>{fields.length ? Math.round(fields.reduce((sum, field) => sum + Number(field.min_price || field.price_per_hour || 0), 0) / fields.length).toLocaleString("vi-VN") : 0}<small>đ / giờ</small></strong>
                <p><span className="material-symbols-outlined">insights</span>Theo giá chỉ từ của danh sách sân</p>
              </article>
            </section>

            <FilterControls
              fields={fields}
              activeType={activeType}
              onTypeChange={setActiveType}
              onFiltered={setFilteredFields}
            />

            <FieldsTable fields={filteredFields} onView={setViewingField} onEdit={setEditingField} onDelete={handleDelete} />
          </div>
        )}
      </main>

      {showModal && (
  <AddFieldModal
    onClose={() => setShowModal(false)}
    onSuccess={fetchFields}
    showToast={(msg, type) => toast[type || 'info'](msg)}
  />
)}
      {editingField && (
  <EditFieldModal
    field={editingField}
    onClose={() => setEditingField(null)}
    onSuccess={fetchFields}
    showToast={(msg, type) => toast[type || 'info'](msg)}
  />
)}
      {viewingField && <FieldDetailModal initialField={viewingField} onClose={() => setViewingField(null)} />}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        confirmType={confirmModalConfig.confirmType}
        onConfirm={confirmModalConfig.onConfirm}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
