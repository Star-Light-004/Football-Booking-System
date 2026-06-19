import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from "react-router-dom";
import { getFields, createField, updateField, deleteField } from "../../../api/fieldsApi";
import { SERVER_URL } from "../../../config";
import './fields.css';
/* ── Data ── */
const navLinks = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: 'stadium', label: 'Fields', path: '/admin/fields' },
  { icon: 'event_available', label: 'Bookings', path: '/admin/bookings' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'payments', label: 'Revenue', path: '/admin/revenue' },
  { icon: 'calendar_month', label: 'Time Slots', path: '/admin/timeslots' },
  { icon: 'inventory_2', label: 'Services', path: '/admin/services' },
];
 

 
/* ── Sub-components ── */
function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Pitch & Pulse</h1>
        <p>Admin Console</p>
      </div>

      <nav className="sidebar-nav">
        {navLinks.map(({ icon, label, path }) => (
          <NavLink
            key={label}
            to={path}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-profile">
        <div className="sidebar-profile-inner">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdrldOeo6h3tM4QUVTdRQOYTA9M_VjtM_il1LKwVnnvhcmyq8d56rpUZQIWwZu1JacVmvA2zrYEaKa5HHxXST08yBkGMk1d8rH7qF3UDFZYy7Qd_V1qe3d-XNTWHFt5PAyDMxqk6bEF7sZ4nSvdutiOjcYSSc2ZMloqVfT_yXbhRf00269pZLMfxm6lrEUG3HdsqeEYVnBT_TSJX3dZmsHnenBWSC3iWMj_tgKDsEDq4BK_lFeMNYi8VVfMkeMVawVdxfBGofmzV0"
            alt="Admin"
          />
          <div>
            <p className="profile-name">Admin Panel</p>
            <p className="profile-role">Super User</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
function TopHeader() {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm tên sân, vị trí..." />
      </div>
 
      <div className="header-actions">
        <button className="icon-btn">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="icon-btn">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="header-divider" />
        <button className="btn-new-booking">New Booking</button>
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
 
function FieldsTable({ fields, onEdit, onDelete }) {
  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tên sân</th>
              <th>Loại sân</th>
              <th>Giá thuê/giờ</th>
              <th>Lượt đặt</th>
              <th>Đánh giá</th>
              <th>SĐT</th>
              <th>Trạng thái</th>
              <th className="right">Thao tác</th>
            </tr>
          </thead>
         <tbody>

  {fields.map((f) => (

    <tr key={f.id}>

      <td>
        <div className="field-cell">

          <div className="field-thumb">
                        <img
  src={f.image_url || f.image}
  alt="field"
/>
          </div>

          <div>
            <p className="field-name">
              {f.field_name}
            </p>

            <p className="field-location">
              {f.location}
            </p>
          </div>

        </div>
      </td>

      <td>
        <span className="type-badge san7">
          {f.field_type}
        </span>
      </td>
      <td>
        <span className="price">
          {f.price_per_hour?.toLocaleString()}đ
        </span>
      </td>

      <td>
        <span className="badge-count" style={{ background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85em' }}>
          {f.booking_count || 0}
        </span>
      </td>

      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9em', color: '#ca8a04' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>star</span>
          {f.rating_avg || 0}/5
          <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>star</span>
        </div>
      </td>

      <td>
        <span style={{ fontSize: '0.9em', color: '#64748b' }}>{f.phone || "-"}</span>
      </td>

      <td>
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
      </td>

      <td className="action-cell">

        <div className="action-group">

          <button className="action-btn edit" onClick={() => onEdit(f)}>
            <span className="material-symbols-outlined">
              edit
            </span>
          </button>

          <button className="action-btn delete" onClick={() => onDelete(f.id)}>
            <span className="material-symbols-outlined">
              delete
            </span>
          </button>

        </div>

      </td>

    </tr>

  ))}

</tbody>
        </table>
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
 
function AddFieldModal({ onClose, onSuccess }) {
const fileInputRef = useRef(null); 
const [image, setImage] = useState(null);
const [fieldName, setFieldName] = useState("");
const [fieldType, setFieldType] = useState("5 vs 5");
const [price, setPrice] = useState("");
const [location, setLocation] = useState("");
const [description, setDescription] = useState("");
const [phone, setPhone] = useState("");
const [loading, setLoading] = useState(false);
const handleAddField = async () => {

  if (!fieldName || !price || !location) {
    alert("Vui lòng nhập đầy đủ thông tin");
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
    formData.append("phone", phone);
    formData.append("image", image);

    await createField(formData);

    alert("Thêm sân thành công");

    onSuccess();
    onClose();

  } catch (error) {

    console.log(error);
    alert("Lỗi khi thêm sân");

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
          {/* Image upload */}
                                  <div className="upload-zone" onClick={() => fileInputRef.current.click()}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}   // ẩn input đi
                    ref={fileInputRef}            // dùng ref để trigger
                    onChange={(e) => setImage(e.target.files[0])}
                  />

                  <span className="material-symbols-outlined">add_a_photo</span>

                  <p>{image ? image.name : "Tải lên hình ảnh sân bóng"}</p>
                  <p className="upload-hint">
                    JPG, PNG (Tối đa 5MB)
                  </p>
                </div>
 
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
              <label className="form-label">Giá thuê (VNĐ/giờ)</label>
                          <input
              className="form-input"
              type="number"
              placeholder="500000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            </div>
 
            <div className="form-group full">
              <label className="form-label">Địa điểm / Địa chỉ cụ thể</label>
                             <input
                className="form-input"
                type="text"
                placeholder="Nhập địa chỉ sân"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
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

function EditFieldModal({ field, onClose, onSuccess }) {
  const [fieldName, setFieldName] = useState(field.field_name || "");
  const [fieldType, setFieldType] = useState(field.field_type || "5 vs 5");
  const [price, setPrice] = useState(field.price_per_hour || "");
  const [location, setLocation] = useState(field.location || "");
  const [description, setDescription] = useState(field.description || "");
  const [phone, setPhone] = useState(field.phone || "");
  const [isAvailable, setIsAvailable] = useState(field.is_available);
  const [loading, setLoading] = useState(false);

  const handleEditField = async () => {
    if (!fieldName || !price || !location) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setLoading(true);
      const data = {
        field_name: fieldName,
        field_type: fieldType,
        location: location,
        price_per_hour: price,
        description: description,
        phone: phone,
        is_available: isAvailable
      };

      await updateField(field.id, data);
      alert("Cập nhật sân thành công");
      onSuccess();
      onClose();
    } catch (error) {
      console.log(error);
      alert("Lỗi khi cập nhật sân");
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
              <label className="form-label">Giá thuê (VNĐ/giờ)</label>
              <input
                className="form-input"
                type="number"
                placeholder="500000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="form-group full">
              <label className="form-label">Địa điểm / Địa chỉ cụ thể</label>
              <input
                className="form-input"
                type="text"
                placeholder="Nhập địa chỉ sân"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
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
  const [activeType, setActiveType] = useState('Tất cả');
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
  useEffect(() => {
    fetchFields();
  }, []);
  
  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sân này không?")) {
      try {
        await deleteField(id);
        alert("Xóa sân thành công");
        fetchFields();
      } catch (error) {
        console.log(error);
        alert("Lỗi khi xóa sân");
      }
    }
  };

  if (loading) {
    return <h2 style={{padding:20}}>Đang tải danh sách sân...</h2>;
  }

  return (
    <>
      <Sidebar />

      <TopHeader />

      <main className="main-content">

        <div className="page-header">

          <div>
            <h2>Quản lý sân bóng</h2>
            <p>
              Theo dõi, điều chỉnh và cập nhật danh sách các sân vận động.
            </p>
          </div>

          <button
            className="btn-add-field"
            onClick={() => setShowModal(true)}
          >
            <span className="material-symbols-outlined">
              add_circle
            </span>
            Thêm sân mới
          </button>

        </div>
            <FilterControls
              fields={fields}                  // truyền dữ liệu fields
              activeType={activeType}
              onTypeChange={setActiveType}
              onFiltered={setFilteredFields}   // callback nhận filteredFields
            />

      <FieldsTable fields={filteredFields} onEdit={setEditingField} onDelete={handleDelete} />
      </main>

      {showModal && (
  <AddFieldModal
    onClose={() => setShowModal(false)}
    onSuccess={fetchFields}
  />
)}
      {editingField && (
  <EditFieldModal
    field={editingField}
    onClose={() => setEditingField(null)}
    onSuccess={fetchFields}
  />
)}
    </>
  );
}