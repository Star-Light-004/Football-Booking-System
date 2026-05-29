import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import "./timeslots.css";
import timeslotsApi from "../../../api/timeslotsApi";
import { getFields } from "../../../api/fieldsApi";

const navLinks = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: 'stadium', label: 'Fields', path: '/admin/fields' },
  { icon: 'event_available', label: 'Bookings', path: '/admin/bookings' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'payments', label: 'Revenue', path: '/admin/revenue' },
  { icon: 'calendar_month', label: 'Time Slots', path: '/admin/timeslots' },
  { icon: 'inventory_2', label: 'Services', path: '/admin/services' },
];

/* ── Bảng giá hiển thị (bỏ 10:00-14:00) ── */
const PRICE_LABELS = [
  { range: '06:00 – 10:00', price: '80,000 – 100,000đ', tag: 'Sáng sớm', tagClass: 'morning' },
  { range: '14:00 – 17:00', price: '150,000 – 180,000đ', tag: 'Buổi chiều', tagClass: 'afternoon' },
  { range: '17:00 – 22:00', price: '200,000 – 270,000đ', tag: 'Cao điểm', tagClass: 'peak' },
];

/* ── Sidebar ── */
function Sidebar() {
  const location = useLocation();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Pitch &amp; Pulse</h1>
        <p>Admin Console</p>
      </div>
      <nav className="sidebar-nav">
        {navLinks.map(({ icon, label, path }) => (
          <Link
            key={label}
            to={path}
            className={`nav-link ${location.pathname === path ? "active" : ""}`}
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-profile">
        <div className="sidebar-profile-inner">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbtTOzZUEspcIZtP_NrcVT_RpRIsxBXVtIHw8I_z9TgtDhtU851BPV7SC_PG4zamnMZ0emALIOpJfCvL4MfAfXJLhkDRRdQcH6A_UDRc5BrAhVSENkXZ9XrrsdW2tWheVauhO0S_7K-mN-e1Pi0zlx4fQSvAsYLRqw3gc2HLoB28R5Uyr5amlw666kMQbXZKr4W9xFKHYwHyKACWk7PPyUZp11_PnL1gqkvBWKJ76lcQn3HNAOO689oZ25n_R9O-JmkV3Rp_g1qao"
            alt="Admin"
          />
          <div>
            <p className="profile-name">Admin Name</p>
            <p className="profile-role">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── TopHeader ── */
function TopHeader() {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm khung giờ..." />
      </div>
      <div className="header-actions">
        <div className="icon-group">
          <button className="icon-btn">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="icon-btn">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ── Generate Modal ── */
function GenerateModal({ onClose, onSuccess }) {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await timeslotsApi.generateSlots(days);
      setResult(res.data);
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="ts-modal-overlay">
      <div className="ts-modal gen-modal">
        <div className="ts-modal-header">
          <div className="gen-modal-title">
            <span className="material-symbols-outlined gen-icon">auto_awesome</span>
            <h2>Tạo slot giờ tự động</h2>
          </div>
          <button onClick={onClose} className="btn-close-modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="gen-modal-body">
          {/* Bảng giá preview */}
          <div className="price-preview">
            <p className="price-preview-title">Bảng giá sẽ được áp dụng</p>
            <div className="price-rows">
              {PRICE_LABELS.map(p => (
                <div key={p.range} className="price-row">
                  <span className={`price-tag ${p.tagClass}`}>{p.tag}</span>
                  <span className="price-range-time">{p.range}</span>
                  <span className="price-range-val">{p.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Số ngày */}
          <div className="gen-days-wrap">
            <label className="ts-label">Tạo cho bao nhiêu ngày tới?</label>
            <div className="days-input-row">
              {[7, 14, 30, 60].map(d => (
                <button
                  key={d}
                  className={`days-chip ${days === d ? 'active' : ''}`}
                  onClick={() => setDays(d)}
                >
                  {d} ngày
                </button>
              ))}
              <input
                type="number"
                className="ts-input days-custom"
                value={days}
                min={1}
                max={90}
                onChange={e => setDays(Number(e.target.value))}
              />
            </div>
            <p className="gen-hint">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
              Slot đã tồn tại sẽ được bỏ qua. Tối đa 90 ngày.
            </p>
          </div>

          {/* Kết quả */}
          {result && (
            <div className="gen-result">
              <div className="gen-result-item created">
                <span className="material-symbols-outlined">check_circle</span>
                <strong>{result.created.toLocaleString()}</strong> slot đã tạo mới
              </div>
              <div className="gen-result-item skipped">
                <span className="material-symbols-outlined">skip_next</span>
                <strong>{result.skipped.toLocaleString()}</strong> slot đã tồn tại (bỏ qua)
              </div>
            </div>
          )}
        </div>

        <div className="ts-modal-footer">
          {result ? (
            <button className="btn-save" onClick={handleDone}>Xong</button>
          ) : (
            <>
              <button className="btn-cancel" onClick={onClose}>Hủy</button>
              <button className="btn-save btn-generate" onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <>
                    <span className="material-symbols-outlined spin">progress_activity</span>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">bolt</span>
                    Tạo ngay
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Edit Modal ── */
function EditModal({ slot, fields, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    field_id: slot.field_id,
    slot_date: slot.slot_date,
    start_time: slot.start_time,
    end_time: slot.end_time,
    price: slot.price,
    status: slot.status,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await timeslotsApi.update(slot.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      alert("Lỗi khi lưu: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ts-modal-overlay">
      <div className="ts-modal">
        <div className="ts-modal-header">
          <h2>Chỉnh sửa khung giờ</h2>
          <button onClick={onClose} className="btn-close-modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="ts-modal-body">
            <div className="ts-filter-group full-width">
              <label className="ts-label">Sân bóng</label>
              <select
                className="ts-select"
                value={formData.field_id}
                onChange={e => setFormData({ ...formData, field_id: e.target.value })}
                required
              >
                {fields.map(f => <option key={f.id} value={f.id}>{f.field_name}</option>)}
              </select>
            </div>
            <div className="ts-filter-group full-width">
              <label className="ts-label">Ngày</label>
              <input
                type="date"
                className="ts-input"
                value={formData.slot_date}
                onChange={e => setFormData({ ...formData, slot_date: e.target.value })}
                required
              />
            </div>
            <div className="ts-filter-group">
              <label className="ts-label">Giờ bắt đầu</label>
              <input
                type="time"
                className="ts-input"
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="ts-filter-group">
              <label className="ts-label">Giờ kết thúc</label>
              <input
                type="time"
                className="ts-input"
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
            <div className="ts-filter-group">
              <label className="ts-label">Giá tiền (VNĐ)</label>
              <input
                type="number"
                className="ts-input"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="ts-filter-group">
              <label className="ts-label">Trạng thái</label>
              <select
                className="ts-select"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="available">Trống</option>
                <option value="booked">Đã đặt</option>
                <option value="blocked">Khóa</option>
              </select>
            </div>
          </div>
          <div className="ts-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Component ── */
const Timeslots = () => {
  const [timeslots, setTimeslots] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  // Filters
  const [filterField, setFilterField] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await timeslotsApi.getAll();
      setTimeslots(res.data);
    } catch (err) {
      console.error("Lỗi fetch timeslots:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    getFields().then(res => setFields(res.data.fields || [])).catch(console.error);
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa khung giờ này?")) {
      try {
        await timeslotsApi.delete(id);
        fetchData();
      } catch {
        alert("Lỗi khi xóa");
      }
    }
  };

  const handleToggleStatus = async (slot) => {
    const newStatus = slot.status === 'available' ? 'blocked' : 'available';
    try {
      await timeslotsApi.update(slot.id, { ...slot, status: newStatus });
      fetchData();
    } catch {
      alert("Lỗi khi cập nhật trạng thái");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("⚠️ Bạn có chắc muốn XÓA TOÀN BỘ slot không?\nHành động này không thể hoàn tác!")) return;
    try {
      const res = await timeslotsApi.deleteAll();
      alert(res.data.message);
      fetchData();
    } catch {
      alert('Lỗi khi xóa toàn bộ slot');
    }
  };

  // Lọc dữ liệu
  const filtered = timeslots.filter(s => {
    if (filterField && s.field_id !== filterField) return false;
    if (filterDate && s.slot_date !== filterDate) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    return true;
  });

  const statusLabel = { available: 'Trống', booked: 'Đã đặt', blocked: 'Khóa' };

  /* ── Stats tính từ filtered ── */
  const stats = {
    total: filtered.length,
    available: filtered.filter(s => s.status === 'available').length,
    booked: filtered.filter(s => s.status === 'booked').length,
    blocked: filtered.filter(s => s.status === 'blocked').length,
  };

  return (
    <>
      <Sidebar />
      <TopHeader />
      <main className="main-content">
        <div className="content-inner">

          {/* ── Page Header ── */}
          <div className="ts-header">
            <div>
              <h1 className="ts-title">Quản lý Khung giờ</h1>
              <p className="ts-subtitle">Xem, chỉnh sửa giá, vô hiệu hoá hoặc xoá các slot giờ</p>
            </div>
            <div className="ts-header-btns">
              <button className="btn-delete-all" onClick={handleDeleteAll}>
                <span className="material-symbols-outlined">delete_sweep</span>
                Xóa tất cả
              </button>
              <button className="btn-generate-slots" onClick={() => setShowGenModal(true)}>
                <span className="material-symbols-outlined">auto_awesome</span>
                Tạo slot tự động
              </button>
            </div>
          </div>

          {/* ── Stats Cards ── */}
          <div className="ts-stats-grid">
            <div className="ts-stat-card">
              <span className="material-symbols-outlined ts-stat-icon blue">calendar_month</span>
              <div>
                <p className="ts-stat-val">{stats.total.toLocaleString()}</p>
                <p className="ts-stat-label">Tổng slot (đang lọc)</p>
              </div>
            </div>
            <div className="ts-stat-card">
              <span className="material-symbols-outlined ts-stat-icon green">check_circle</span>
              <div>
                <p className="ts-stat-val">{stats.available.toLocaleString()}</p>
                <p className="ts-stat-label">Slot trống</p>
              </div>
            </div>
            <div className="ts-stat-card">
              <span className="material-symbols-outlined ts-stat-icon red">event_busy</span>
              <div>
                <p className="ts-stat-val">{stats.booked.toLocaleString()}</p>
                <p className="ts-stat-label">Đã đặt</p>
              </div>
            </div>
            <div className="ts-stat-card">
              <span className="material-symbols-outlined ts-stat-icon gray">lock</span>
              <div>
                <p className="ts-stat-val">{stats.blocked.toLocaleString()}</p>
                <p className="ts-stat-label">Đã khóa</p>
              </div>
            </div>
          </div>

          {/* ── Filter Bar ── */}
          <div className="ts-filter-bar">
            <div className="ts-filter-group">
              <label className="ts-label">Sân bóng</label>
              <select className="ts-select" value={filterField} onChange={e => setFilterField(e.target.value)}>
                <option value="">Tất cả sân</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.field_name}</option>)}
              </select>
            </div>
            <div className="ts-filter-group">
              <label className="ts-label">Ngày</label>
              <input
                type="date"
                className="ts-input"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
            </div>
            <div className="ts-filter-group">
              <label className="ts-label">Trạng thái</label>
              <select className="ts-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Tất cả</option>
                <option value="available">Trống</option>
                <option value="booked">Đã đặt</option>
                <option value="blocked">Đã khóa</option>
              </select>
            </div>
            <button
              className="btn-clear-filter"
              onClick={() => { setFilterField(''); setFilterDate(''); setFilterStatus(''); }}
            >
              <span className="material-symbols-outlined">filter_alt_off</span>
              Xóa lọc
            </button>
          </div>

          {/* ── Table ── */}
          <div className="ts-table-card">
            <table className="ts-table">
              <thead>
                <tr>
                  <th>Sân bóng</th>
                  <th>Ngày</th>
                  <th>Khung giờ</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                  <th className="th-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="td-center">Đang tải...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="td-empty">
                      <span className="material-symbols-outlined empty-icon">event_busy</span>
                      <p>Không có slot nào</p>
                      <p className="empty-hint">Nhấn <strong>"Tạo slot tự động"</strong> để bắt đầu</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(slot => (
                    <tr key={slot.id} className={slot.status === 'blocked' ? 'row-blocked' : ''}>
                      <td className="ts-field-info">{slot.field_name}</td>
                      <td>{new Date(slot.slot_date + 'T00:00:00').toLocaleDateString("vi-VN")}</td>
                      <td>
                        <span className="ts-time-badge">
                          {slot.start_time} – {slot.end_time}
                        </span>
                      </td>
                      <td className="ts-price">{Number(slot.price).toLocaleString('vi-VN')}đ</td>
                      <td>
                        <span className={`ts-badge ${slot.status}`}>
                          {statusLabel[slot.status] || slot.status}
                        </span>
                      </td>
                      <td className="ts-actions">
                        {/* Toggle khóa/mở */}
                        <button
                          className={`btn-action toggle ${slot.status === 'blocked' ? 'unblock' : 'block'}`}
                          title={slot.status === 'blocked' ? 'Mở lại' : 'Vô hiệu hóa'}
                          onClick={() => handleToggleStatus(slot)}
                          disabled={slot.status === 'booked'}
                        >
                          <span className="material-symbols-outlined">
                            {slot.status === 'blocked' ? 'lock_open' : 'lock'}
                          </span>
                        </button>
                        {/* Sửa */}
                        <button
                          className="btn-action edit"
                          title="Sửa giá / thông tin"
                          onClick={() => setEditingSlot(slot)}
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        {/* Xóa */}
                        <button
                          className="btn-action delete"
                          title="Xóa slot"
                          onClick={() => handleDelete(slot.id)}
                          disabled={slot.status === 'booked'}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {filtered.length > 0 && (
              <div className="ts-table-footer">
                Hiển thị <strong>{filtered.length}</strong> trong tổng số <strong>{timeslots.length}</strong> slot
              </div>
            )}
          </div>
        </div>
      </main>

      {showGenModal && (
        <GenerateModal
          onClose={() => setShowGenModal(false)}
          onSuccess={fetchData}
        />
      )}
      {editingSlot && (
        <EditModal
          slot={editingSlot}
          fields={fields}
          onClose={() => setEditingSlot(null)}
          onSuccess={fetchData}
        />
      )}
    </>
  );
};

export default Timeslots;
