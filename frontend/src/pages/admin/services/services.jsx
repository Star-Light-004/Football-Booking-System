import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from "react-router-dom";
import { getServices, createBookingService } from "../../../api/servicesApi";
import axios from "../../../api/axiosClient";
import { BASE_URL, getFullImageUrl } from "../../../config";
import './services.css';
import { useToast, ToastContainer } from '../../../components/Toast/Toast';
import AdminSidebar from '../../../components/AdminSidebar/AdminSidebar';
import ConfirmModal from '../../../components/ConfirmModal/ConfirmModal';
import { onSyncEvent, broadcastSyncEvent } from '../../../utils/realtimeSync';

function TopHeader({ onAdd }) {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm dịch vụ..." />
      </div>

      <div className="header-actions">
        <button className="icon-btn" type="button" title="Thông báo">
          <span className="material-symbols-outlined">notifications</span>
        </button>
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
            {services.length === 0 ? (
              <tr><td colSpan="6" className="services-empty-row">Không tìm thấy dịch vụ phù hợp.</td></tr>
            ) : services.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="field-cell">
                    <div className="field-thumb">
                      {s.image ? (
                        <img src={getFullImageUrl(s.image)} alt={s.name} />
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
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeMainTab, setActiveMainTab] = useState("inventory"); // 'inventory' | 'stats'
  const [statsPeriod, setStatsPeriod] = useState("all"); // 'all' | 'today' | 'week' | 'month'
  const { toasts, removeToast, toast } = useToast();

  const stats = {
    total: services.length,
    inStock: services.reduce((acc, s) => acc + (parseInt(s.stock) || 0), 0),
    lowStock: services.filter(s => (parseInt(s.stock) || 0) < 10).length,
    active: services.filter(s => s.is_active).length,
  };
  const categories = ["Tất cả", ...new Set(services.map((service) => service.category).filter(Boolean))];
  const filteredServices = services.filter((service) => {
    const query = searchQuery.trim().toLocaleLowerCase("vi");
    const matchesSearch = !query || `${service.name || ""} ${service.description || ""} ${service.category || ""}`.toLocaleLowerCase("vi").includes(query);
    const matchesCategory = categoryFilter === "Tất cả" || service.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? service.is_active : !service.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });
  const highlightedServices = [...services].sort((a, b) => Number(b.price || 0) - Number(a.price || 0)).slice(0, 3);
  const lowStockServices = services.filter((service) => Number(service.stock || 0) < 10).slice(0, 3);

  const fetchInitialData = async (isFirst = false) => {
    try {
      if (isFirst) setLoading(true);
      const [res, statsRes] = await Promise.all([
        axios.get(`${BASE_URL}/services/list/?admin=true`),
        axios.get(`${BASE_URL}/services/stats/`).catch(() => ({ data: null }))
      ]);
      const list = Array.isArray(res.data) ? res.data : (res.data?.services || []);
      setServices(list);
      if (statsRes?.data) {
        setStatsData(statsRes.data);
      }

      // Fetch fields for mapping
      try {
        const fieldsRes = await axios.get(`${BASE_URL}/football-fields/`);
        setFields(fieldsRes.data?.fields || []);
      } catch (fErr) {
        console.warn("Lỗi tải danh sách sân:", fErr);
      }
    } catch (error) {
      console.error("Lỗi lấy dữ liệu dịch vụ:", error);
    } finally {
      if (isFirst) setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData(true);
    const unsub = onSyncEvent((event) => {
      const type = typeof event === "string" ? event : event?.type;
      if (
        type === "booking_updated" ||
        type === "booking_created" ||
        type === "booking_cancelled" ||
        type === "services_updated"
      ) {
        fetchInitialData(false);
      }
    });

    const pollInterval = setInterval(() => {
      fetchInitialData(false);
    }, 4000);

    return () => {
      if (typeof unsub === "function") unsub();
      clearInterval(pollInterval);
    };
  }, []);

  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Xác nhận",
    confirmType: "danger",
    onConfirm: () => {},
  });

  const handleDelete = (id) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Xóa dịch vụ",
      message: "Bạn có chắc chắn muốn xóa dịch vụ này không? Hành động này không thể hoàn tác.",
      confirmText: "Xóa dịch vụ",
      confirmType: "danger",
      onConfirm: async () => {
        try {
          await axios.delete(`${BASE_URL}/services/list/${id}/`);
          toast.success("Xóa dịch vụ thành công!");
          broadcastSyncEvent("services_updated", { id, action: "delete" });
          fetchInitialData(false);
        } catch (error) {
          toast.error("Lỗi khi xóa dịch vụ");
        }
      }
    });
  };

  return (
    <div className="admin-services-page">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AdminSidebar />
      <div className="admin-services-container">
        <TopHeader onAdd={() => { setEditingService(null); setShowModal(true); }} />

        <main className="main-content services-admin-main">
          <div className="content-inner">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                <h2>Đang tải danh sách dịch vụ...</h2>
              </div>
            ) : (
              <>
                <div className="page-header-alt">
                  <div className="header-text">
                    <span className="services-eyebrow">VẬN HÀNH CƠ SỞ <span>›</span> DỊCH VỤ &amp; TIỆN ÍCH</span>
                    <h2>Hệ thống dịch vụ</h2>
                    <p>Quản lý kho hàng, giá cả và trạng thái các dịch vụ đi kèm khi thuê sân. Cập nhật biến động tồn kho theo thời gian thực.</p>
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
                  {/* Ô THỨ 5: DỊCH VỤ TRONG NGÀY (BÁN NƯỚC, CHO THUÊ GIÀY/TRỌNG TÀI) */}
                  <div className="stat-card-mini">
                    <div className="stat-icon-bg indigo">
                      <span className="material-symbols-outlined">local_mall</span>
                    </div>
                    <div className="stat-info">
                      <span className="stat-label">Dịch vụ trong ngày</span>
                      <span className="stat-value">
                        {statsData?.today?.total_quantity || 0}
                        <small style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginLeft: 4 }}>lượt</small>
                      </span>
                      <span className="stat-subtext" style={{ color: statsData?.today?.total_quantity > 0 ? '#15803d' : '#64748b' }}>
                        {statsData?.today?.summary_text || 'Chưa có phát sinh hôm nay'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TAB CHUYỂN ĐỔI: KHO HÀNG & THỐNG KÊ */}
                <div className="services-main-nav-tabs">
                  <button
                    type="button"
                    className={`services-main-tab-btn ${activeMainTab === 'inventory' ? 'active' : ''}`}
                    onClick={() => setActiveMainTab('inventory')}
                  >
                    <span className="material-symbols-outlined">inventory_2</span>
                    Danh sách &amp; Kho hàng
                  </button>
                  <button
                    type="button"
                    className={`services-main-tab-btn ${activeMainTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveMainTab('stats')}
                  >
                    <span className="material-symbols-outlined">analytics</span>
                    Thống kê dịch vụ
                  </button>
                </div>

                {activeMainTab === 'inventory' ? (
                  <div className="services-workspace">
                    <section className="services-primary-column">
                      <div className="services-toolbar">
                        <div className="services-category-tabs" role="tablist" aria-label="Lọc theo loại dịch vụ">
                          {categories.map((category) => (
                            <button key={category} type="button" className={categoryFilter === category ? "active" : ""} onClick={() => setCategoryFilter(category)}>{category}<span>{category === "Tất cả" ? services.length : services.filter((service) => service.category === category).length}</span></button>
                          ))}
                        </div>
                        <label className="services-search"><span className="material-symbols-outlined">search</span><input type="search" placeholder="Tìm tên dịch vụ..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></label>
                        <label className="services-status-select"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái dịch vụ"><option value="all">Tất cả trạng thái</option><option value="active">Đang kinh doanh</option><option value="inactive">Ngưng bán</option></select><span className="material-symbols-outlined">expand_more</span></label>
                      </div>
                      <ServicesTable
                        services={filteredServices}
                        onEdit={(s) => { setEditingService(s); setShowModal(true); }}
                        onDelete={handleDelete}
                      />
                    </section>

                    <aside className="services-insight-rail">
                      <section className="services-insight-card">
                        <div className="services-insight-heading"><div><span className="services-insight-eyebrow">PHÂN TÍCH GIÁ NIÊM YẾT</span><h3>Dịch vụ nổi bật</h3></div><span className="material-symbols-outlined">insights</span></div>
                        {highlightedServices.length ? highlightedServices.map((service, index) => (
                          <div className="service-highlight-row" key={service.id}>
                            <div><strong>{index + 1}. {service.name}</strong><span>{Number(service.stock || 0).toLocaleString("vi-VN")} sản phẩm tồn kho</span></div>
                            <b>{Number(service.price || 0).toLocaleString("vi-VN")}đ</b>
                          </div>
                        )) : <p className="service-rail-empty">Chưa có dịch vụ để hiển thị.</p>}
                        <div className="service-rail-total"><span>Tổng tồn kho</span><strong>{stats.inStock.toLocaleString("vi-VN")}<small> sản phẩm</small></strong></div>
                      </section>

                      <section className="services-insight-card services-stock-alert">
                        <div className="services-insight-heading"><div><span className="services-insight-eyebrow">THEO DÕI TỒN KHO</span><h3>Cần nhập thêm hàng</h3></div><span className="material-symbols-outlined">inventory</span></div>
                        {lowStockServices.length ? lowStockServices.map((service) => (
                          <div className="stock-alert-row" key={service.id}><div><strong>{service.name}</strong><small>{service.category || "Chưa phân loại"}</small></div><span>{Number(service.stock || 0)} còn</span></div>
                        )) : <p className="service-rail-empty">Tồn kho hiện ổn định.</p>}
                        <button type="button" className="stock-alert-button" onClick={() => { setCategoryFilter("Tất cả"); setStatusFilter("all"); setSearchQuery(""); }}>
                          <span className="material-symbols-outlined">filter_alt_off</span>Đặt lại bộ lọc
                        </button>
                      </section>
                    </aside>
                  </div>
                ) : (
                  <ServicesStatsView
                    statsData={statsData}
                    services={services}
                    statsPeriod={statsPeriod}
                    onPeriodChange={setStatsPeriod}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {showModal && (
        <ServiceModal
          service={editingService}
          availableFields={fields}
          onClose={() => setShowModal(false)}
          onSuccess={() => fetchInitialData(false)}
          showToast={(msg, type) => toast[type || 'info'](msg)}
        />
      )}

      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        confirmType={confirmModalConfig.confirmType}
        onConfirm={confirmModalConfig.onConfirm}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

function ServiceModal({ service, availableFields, onClose, onSuccess, showToast }) {
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
      showToast("Vui lòng nhập tên và giá", "warning");
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

      if (service) {
        await axios.put(`${BASE_URL}/services/list/${service.id}/`, formData);
        showToast("Cập nhật thành công", "success");
      } else {
        await axios.post(`${BASE_URL}/services/list/`, formData);
        showToast("Thêm thành công", "success");
      }
      broadcastSyncEvent("services_updated", { action: service ? "update" : "create" });
      onSuccess();
      onClose();
    } catch (error) {
      showToast("Có lỗi xảy ra", "error");
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

function ServicesStatsView({ statsData, services, statsPeriod, onPeriodChange }) {
  const allOrders = statsData?.orders || [];

  // Filter orders according to period
  const filteredOrders = React.useMemo(() => {
    if (!allOrders.length) return [];
    if (statsPeriod === 'all') return allOrders;

    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    if (statsPeriod === 'today') {
      return allOrders.filter(o => o.created_at?.startsWith(todayStr));
    }
    if (statsPeriod === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return allOrders.filter(o => {
        if (!o.created_at) return false;
        const parts = o.created_at.split(' ')[0].split('/');
        if (parts.length === 3) {
          const oDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          return oDate >= weekAgo;
        }
        return true;
      });
    }
    if (statsPeriod === 'month') {
      const monthStr = `/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      return allOrders.filter(o => o.created_at?.includes(monthStr) || (o.created_at && new Date(o.created_at).getMonth() === now.getMonth() && new Date(o.created_at).getFullYear() === now.getFullYear()));
    }
    if (statsPeriod === 'year') {
      const yearStr = `/${now.getFullYear()}`;
      return allOrders.filter(o => o.created_at?.includes(yearStr) || o.created_at?.startsWith(String(now.getFullYear())) || (o.created_at && new Date(o.created_at).getFullYear() === now.getFullYear()));
    }
    return allOrders;
  }, [allOrders, statsPeriod]);

  // Aggregated item breakdown based on filtered orders
  const itemBreakdown = React.useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const name = o.service_name || 'Khác';
      const isRental = o.action_type === 'rental' || /giày|giay|thuê|thue|trọng tài|áo bib|bóng/i.test(`${name} ${o.service_category || ''}`);
      if (!map[name]) {
        const matchedSrv = services.find(s => s.name === name);
        map[name] = {
          name,
          category: o.service_category || 'Khác',
          action_type: isRental ? 'rental' : 'sale',
          action_label: isRental ? 'Cho thuê' : 'Bán lẻ',
          quantity: 0,
          revenue: 0,
          price: matchedSrv ? parseFloat(matchedSrv.price) : (o.quantity ? o.total_price / o.quantity : 0),
          stock: matchedSrv ? matchedSrv.stock : 0
        };
      }
      map[name].quantity += (o.quantity || 1);
      map[name].revenue += parseFloat(o.total_price || 0);
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity);
  }, [filteredOrders, services]);

  const totalPeriodRevenue = filteredOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  const totalPeriodQty = filteredOrders.reduce((sum, o) => sum + (o.quantity || 1), 0);
  const bestSeller = itemBreakdown[0] || null;

  return (
    <div className="services-stats-panel">
      {/* Filter bar */}
      <div className="stats-filter-bar">
        <div className="stats-filter-title">
          <span className="material-symbols-outlined" style={{ color: '#006b2c' }}>filter_alt</span>
          <span>Khoảng thời gian thống kê</span>
        </div>
        <div className="stats-period-pills">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'today', label: 'Hôm nay' },
            { key: 'week', label: 'Tuần này' },
            { key: 'month', label: 'Tháng này' },
            { key: 'year', label: 'Năm nay' },
          ].map(p => (
            <button
              key={p.key}
              type="button"
              className={`stats-period-btn ${statsPeriod === p.key ? 'active' : ''}`}
              onClick={() => onPeriodChange(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 0 }}>
        <div className="stat-card-mini">
          <div className="stat-icon-bg green">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div className="stat-info">
            <span className="stat-label">Doanh thu dịch vụ</span>
            <span className="stat-value">{Number(totalPeriodRevenue).toLocaleString('vi-VN')} <small style={{ fontSize: '0.8rem', color: '#64748b' }}>đ</small></span>
          </div>
        </div>

        <div className="stat-card-mini">
          <div className="stat-icon-bg blue">
            <span className="material-symbols-outlined">room_service</span>
          </div>
          <div className="stat-info">
            <span className="stat-label">Tổng lượt phục vụ</span>
            <span className="stat-value">{totalPeriodQty} <small style={{ fontSize: '0.8rem', color: '#64748b' }}>lượt/món</small></span>
          </div>
        </div>

        <div className="stat-card-mini">
          <div className="stat-icon-bg purple">
            <span className="material-symbols-outlined">receipt_long</span>
          </div>
          <div className="stat-info">
            <span className="stat-label">Ca đá dùng dịch vụ</span>
            <span className="stat-value">{filteredOrders.length} <small style={{ fontSize: '0.8rem', color: '#64748b' }}>ca</small></span>
          </div>
        </div>

        <div className="stat-card-mini">
          <div className="stat-icon-bg orange">
            <span className="material-symbols-outlined">local_fire_department</span>
          </div>
          <div className="stat-info">
            <span className="stat-label">Sử dụng nhiều nhất</span>
            <span className="stat-value" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bestSeller ? `${bestSeller.name} (${bestSeller.quantity})` : 'Chưa có'}
            </span>
          </div>
        </div>
      </div>

      {/* TABLE 1: Product Sales & Rentals Performance */}
      <div className="stats-breakdown-card">
        <div className="stats-card-heading">
          <h3>Hiệu suất dịch vụ &amp; tiện ích (Bán lẻ &amp; Cho thuê)</h3>
          <span className="stats-card-badge">{itemBreakdown.length} dịch vụ có giao dịch</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tên dịch vụ</th>
                <th>Hình thức &amp; Phân loại</th>
                <th>Đơn giá niêm yết</th>
                <th>Lượng sử dụng</th>
                <th>Tổng doanh thu</th>
                <th>Tỷ trọng</th>
                <th className="right">Tồn kho hiện tại</th>
              </tr>
            </thead>
            <tbody>
              {itemBreakdown.length === 0 ? (
                <tr>
                  <td colSpan="7" className="services-empty-row">
                    Không có giao dịch dịch vụ nào trong khoảng thời gian đã chọn.
                  </td>
                </tr>
              ) : (
                itemBreakdown.map((item, idx) => {
                  const percent = totalPeriodRevenue > 0 ? ((item.revenue / totalPeriodRevenue) * 100).toFixed(1) : 0;
                  return (
                    <tr key={item.name}>
                      <td>
                        <strong>{idx + 1}. {item.name}</strong>
                      </td>
                      <td>
                        <span className={`action-type-badge ${item.action_type === 'rental' ? 'rental' : 'sale'}`}>
                          {item.action_label}
                        </span>
                        <span className={`type-badge ${item.category?.toLowerCase() || 'other'}`} style={{ marginLeft: 6 }}>
                          {item.category}
                        </span>
                      </td>
                      <td>{Number(item.price).toLocaleString('vi-VN')} đ</td>
                      <td>
                        <span className="badge-count" style={{ background: item.action_type === 'rental' ? '#f5f3ff' : '#dcfce7', color: item.action_type === 'rental' ? '#7c3aed' : '#15803d' }}>
                          {item.quantity} {item.action_type === 'rental' ? 'lượt thuê' : 'món đã bán'}
                        </span>
                      </td>
                      <td><strong style={{ color: '#006b2c' }}>{Number(item.revenue).toLocaleString('vi-VN')} đ</strong></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: '#006b2c', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>{percent}%</span>
                        </div>
                      </td>
                      <td className="right">
                        <span style={{ fontWeight: 600, color: item.stock < 10 ? '#ea580c' : '#15803d' }}>
                          {item.stock} {item.action_type === 'rental' ? 'sẵn sàng' : 'trong kho'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: Detailed Booking Services Orders History */}
      <div className="stats-breakdown-card">
        <div className="stats-card-heading">
          <h3>Lịch sử các ca đá sử dụng dịch vụ</h3>
          <span className="stats-card-badge">{filteredOrders.length} ca ghi nhận</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Mã ca</th>
                <th>Sân bóng áp dụng</th>
                <th>Khách hàng</th>
                <th>Dịch vụ &amp; Hình thức</th>
                <th>Thành tiền</th>
                <th className="right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="services-empty-row">
                    Chưa có lịch sử sử dụng dịch vụ trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isRental = order.action_type === 'rental' || /giày|giay|thuê|thue|trọng tài|áo bib|bóng/i.test(`${order.service_name} ${order.service_category || ''}`);
                  const isDone = order.status_code === 'completed' || order.status === 'deducted';
                  const isCancel = order.status_code === 'cancelled';
                  const statusClass = isDone ? 'completed' : isCancel ? 'cancelled' : isRental ? 'renting' : 'serving';
                  const statusText = order.status_label || (isDone ? 'Hoàn thành' : isRental ? 'Đang thuê' : 'Đang phục vụ');

                  return (
                    <tr key={order.id}>
                      <td><span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{order.created_at}</span></td>
                      <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>#{order.booking_code || '---'}</code></td>
                      <td><strong>{order.field_name}</strong></td>
                      <td>{order.customer_name}</td>
                      <td>
                        <span className={`action-type-badge ${isRental ? 'rental' : 'sale'}`}>
                          {isRental ? 'Cho thuê' : 'Bán lẻ'}
                        </span>
                        <span style={{ fontWeight: 700, color: '#0f172a', marginLeft: 6 }}>{order.service_name}</span>
                        {' '}
                        <span className="badge-count" style={{ marginLeft: 4 }}>x{order.quantity}</span>
                        {order.shoe_size ? <small style={{ marginLeft: 6, color: '#64748b' }}>[Size: {order.shoe_size}]</small> : null}
                      </td>
                      <td><strong style={{ color: '#006b2c' }}>{Number(order.total_price).toLocaleString('vi-VN')} đ</strong></td>
                      <td className="right">
                        <span className={`status-pill ${statusClass}`}>
                          <span className="dot" />
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
