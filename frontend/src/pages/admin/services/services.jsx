import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from "react-router-dom";
import { getServices, createBookingService } from "../../../api/servicesApi"; // Note: I should add CRUD to servicesApi
import axios from "axios";
import { BASE_URL } from "../../../config";
import './services.css';

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

function TopHeader({ onAdd }) {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm dịch vụ..." />
      </div>

      <div className="header-actions">
        <button className="icon-btn">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="icon-btn">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="header-divider" />
        <button className="btn-new-booking" onClick={onAdd}>New Service</button>
      </div>
    </header>
  );
}

function ServicesTable({ services, onEdit, onDelete }) {
  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tên dịch vụ</th>
              <th>Loại/Phân loại</th>
              <th>Giá tiền</th>
              <th>Tồn kho</th>
              <th>Trạng thái</th>
              <th className="right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="field-cell">
                    <div className="field-thumb">
                      {s.image ? (
                        <img src={s.image} alt={s.name} />
                      ) : (
                        <div className="placeholder-icon">
                          <span className="material-symbols-outlined">inventory_2</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="field-name">{s.name}</p>
                      <p className="field-location">{s.description || "Không có mô tả"}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`type-badge ${s.category?.toLowerCase() || 'other'}`}>
                    {s.category || "Chưa phân loại"}
                  </span>
                </td>
                <td>
                  <span className="price">{parseFloat(s.price).toLocaleString()}đ</span>
                </td>
                <td>
                  <span className="badge-count">{s.stock || 0}</span>
                </td>
                <td>
                  {s.is_active ? (
                    <span className="status-badge ready">
                      <span className="dot" /> Sẵn sàng
                    </span>
                  ) : (
                    <span className="status-badge maintenance">
                      <span className="dot" /> Ngưng bán
                    </span>
                  )}
                </td>
                <td className="action-cell">
                  <div className="action-group">
                    <button className="action-btn edit" onClick={() => onEdit(s)}>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button className="action-btn delete" onClick={() => onDelete(s.id)}>
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const stats = {
    total: services.length,
    inStock: services.reduce((acc, s) => acc + (parseInt(s.stock) || 0), 0),
    lowStock: services.filter(s => (parseInt(s.stock) || 0) < 10).length,
    active: services.filter(s => s.is_active).length,
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch services with admin=true to see inactive ones
      const res = await axios.get(`${BASE_URL}/services/list/?admin=true`);
      setServices(res.data);

      // Fetch fields for mapping
      const fieldsRes = await axios.get(`${BASE_URL}/football-fields/`);
      setFields(fieldsRes.data.fields || []);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này không?")) {
      try {
        await axios.delete(`${BASE_URL}/services/list/${id}/`);
        alert("Xóa dịch vụ thành công");
        fetchServices();
      } catch (error) {
        alert("Lỗi khi xóa dịch vụ");
      }
    }
  };

  if (loading) return (
    <div className="admin-services-page">
      <Sidebar />
      <div className="main-content flex items-center justify-center">
        <h2 className="animate-pulse text-slate-400">Đang tải danh sách dịch vụ...</h2>
      </div>
    </div>
  );

  return (
    <div className="admin-services-page">
      <Sidebar />
      <div className="admin-services-container">
        <TopHeader onAdd={() => { setEditingService(null); setShowModal(true); }} />

        <main className="main-content">
          <div className="page-header-alt">
            <div className="header-text">
              <h2 className="text-3xl font-bold text-slate-800">Hệ thống dịch vụ</h2>
              <p className="text-slate-500">Quản lý kho hàng, giá cả và trạng thái của các dịch vụ đi kèm.</p>
            </div>
            <button className="btn-primary-gradient" onClick={() => { setEditingService(null); setShowModal(true); }}>
              <span className="material-symbols-outlined">add</span>
              Thêm dịch vụ mới
            </button>
          </div>

          <div className="stats-row">
            <div className="stat-card-mini">
              <div className="stat-icon-bg blue">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
              <div className="stat-info">
                <span className="stat-label">Tổng dịch vụ</span>
                <span className="stat-value">{stats.total}</span>
              </div>
            </div>
            <div className="stat-card-mini">
              <div className="stat-icon-bg green">
                <span className="material-symbols-outlined">package_2</span>
              </div>
              <div className="stat-info">
                <span className="stat-label">Tổng tồn kho</span>
                <span className="stat-value">{stats.inStock}</span>
              </div>
            </div>
            <div className="stat-card-mini">
              <div className="stat-icon-bg orange">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div className="stat-info">
                <span className="stat-label">Sắp hết hàng</span>
                <span className="stat-value">{stats.lowStock}</span>
              </div>
            </div>
            <div className="stat-card-mini">
              <div className="stat-icon-bg purple">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div className="stat-info">
                <span className="stat-label">Đang kinh doanh</span>
                <span className="stat-value">{stats.active}</span>
              </div>
            </div>
          </div>

          <ServicesTable
            services={services}
            onEdit={(s) => { setEditingService(s); setShowModal(true); }}
            onDelete={handleDelete}
          />
        </main>
      </div>

      {showModal && (
        <ServiceModal
          service={editingService}
          availableFields={fields}
          onClose={() => setShowModal(false)}
          onSuccess={fetchInitialData}
        />
      )}
    </div>
  );
}

function ServiceModal({ service, availableFields, onClose, onSuccess }) {
  const [name, setName] = useState(service?.name || "");
  const [price, setPrice] = useState(service?.price || "");
  const [category, setCategory] = useState(service?.category || "Nước uống");
  const [stock, setStock] = useState(service?.stock || 0);
  const [description, setDescription] = useState(service?.description || "");
  const [selectedFields, setSelectedFields] = useState(service?.field_ids || []);
  const [imageFile, setImageFile] = useState(null);
  const [isActive, setIsActive] = useState(service ? service.is_active : true);
  const [loading, setLoading] = useState(false);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);

  const toggleField = (fieldId) => {
    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter(id => id !== fieldId));
    } else {
      setSelectedFields([...selectedFields, fieldId]);
    }
  };

  const handleSubmit = async () => {
    if (!name || !price) {
      alert("Vui lòng nhập tên và giá");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price);
      formData.append('category', category);
      formData.append('stock', stock);
      formData.append('description', description);
      formData.append('is_active', isActive ? 'true' : 'false');

      selectedFields.forEach(fid => {
        formData.append('field_ids', fid);
      });

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const config = {
        headers: { 'Content-Type': 'multipart/form-data' }
      };

      if (service) {
        await axios.put(`${BASE_URL}/services/list/${service.id}/`, formData, config);
        alert("Cập nhật thành công");
      } else {
        await axios.post(`${BASE_URL}/services/list/`, formData, config);
        alert("Thêm thành công");
      }
      onSuccess();
      onClose();
    } catch (error) {
      alert("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{service ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ mới"}</h3>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Tên dịch vụ</label>
              <input className="form-input" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group full">
              <label className="form-label">Ảnh dịch vụ</label>
              <input
                className="form-input"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
              />
              {service?.image && !imageFile && (
                <p className="text-xs text-slate-500 mt-1">Đã có ảnh. Tải lên ảnh mới để thay thế.</p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Giá (VNĐ)</label>
              <input className="form-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phân loại</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Giày">Giày đá bóng</option>
                <option value="Tất">Tất / Vớ</option>
                <option value="Nước uống">Nước uống</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Số lượng tồn kho</label>
              <input className="form-input" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={isActive ? "true" : "false"} onChange={(e) => setIsActive(e.target.value === "true")}>
                <option value="true">Sẵn sàng</option>
                <option value="false">Ngưng bán</option>
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Mô tả</label>
              <textarea className="form-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="form-group full">
              <label className="form-label">Áp dụng cho sân ({selectedFields.length} đã chọn)</label>
              <div className="field-dropdown-wrapper">
                <div
                  className={`field-dropdown-trigger ${showFieldDropdown ? 'active' : ''}`}
                  onClick={() => setShowFieldDropdown(!showFieldDropdown)}
                >
                  <span className="selected-text">
                    {selectedFields.length > 0
                      ? `Đã chọn ${selectedFields.length} sân bóng`
                      : "Click để chọn sân áp dụng..."}
                  </span>
                  <span className="material-symbols-outlined">
                    {showFieldDropdown ? 'expand_less' : 'expand_more'}
                  </span>
                </div>

                {showFieldDropdown && (
                  <div className="field-dropdown-content">
                    <div className="field-selection-grid">
                      {availableFields.map(field => (
                        <label key={field.id} className="field-checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedFields.includes(field.id)}
                            onChange={() => toggleField(field.id)}
                          />
                          <span>{field.field_name}</span>
                        </label>
                      ))}
                      {availableFields.length === 0 && <p className="text-xs p-2 text-slate-400">Không có dữ liệu sân.</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button className="btn-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}
