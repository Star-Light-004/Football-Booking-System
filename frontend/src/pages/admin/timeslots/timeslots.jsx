import React, { useState, useEffect, useCallback } from "react";
import "./timeslots.css";
import timeslotsApi from "../../../api/timeslotsApi";
import { getFields } from "../../../api/fieldsApi";
import { useToast, ToastContainer } from "../../../components/Toast/Toast";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";

/* ── Sidebar ── dùng AdminSidebar component chung */

/* ── TopHeader ── */
function TopHeader({ onGenerate, searchTerm, onSearchChange }) {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          placeholder="Tìm kiếm khung giờ, tên sân, ngày..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="header-actions">
        <button className="icon-btn" title="Thông báo">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="icon-btn" title="Trợ giúp">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="header-divider" />
        <button className="btn-new-booking" onClick={onGenerate}>
          <span className="material-symbols-outlined">auto_awesome</span>
          Tạo slot tự động
        </button>
      </div>
    </header>
  );
}

/* ── Cấu hình mẫu các khung giờ trong ngày ── */
const DEFAULT_SLOT_TEMPLATES = [
  { hour: 6,  start_time: '06:00', end_time: '07:00', label: '06:00 – 07:00', price: 80000,  enabled: true,  session: 'morning',   sessionLabel: 'Sáng' },
  { hour: 7,  start_time: '07:00', end_time: '08:00', label: '07:00 – 08:00', price: 80000,  enabled: true,  session: 'morning',   sessionLabel: 'Sáng' },
  { hour: 8,  start_time: '08:00', end_time: '09:00', label: '08:00 – 09:00', price: 100000, enabled: true,  session: 'morning',   sessionLabel: 'Sáng' },
  { hour: 9,  start_time: '09:00', end_time: '10:00', label: '09:00 – 10:00', price: 100000, enabled: true,  session: 'morning',   sessionLabel: 'Sáng' },
  { hour: 10, start_time: '10:00', end_time: '11:00', label: '10:00 – 11:00', price: 120000, enabled: false, session: 'midday',    sessionLabel: 'Trưa' },
  { hour: 11, start_time: '11:00', end_time: '12:00', label: '11:00 – 12:00', price: 120000, enabled: false, session: 'midday',    sessionLabel: 'Trưa' },
  { hour: 12, start_time: '12:00', end_time: '13:00', label: '12:00 – 13:00', price: 120000, enabled: false, session: 'midday',    sessionLabel: 'Trưa' },
  { hour: 13, start_time: '13:00', end_time: '14:00', label: '13:00 – 14:00', price: 120000, enabled: false, session: 'midday',    sessionLabel: 'Trưa' },
  { hour: 14, start_time: '14:00', end_time: '15:00', label: '14:00 – 15:00', price: 150000, enabled: true,  session: 'afternoon', sessionLabel: 'Chiều' },
  { hour: 15, start_time: '15:00', end_time: '16:00', label: '15:00 – 16:00', price: 150000, enabled: true,  session: 'afternoon', sessionLabel: 'Chiều' },
  { hour: 16, start_time: '16:00', end_time: '17:00', label: '16:00 – 17:00', price: 180000, enabled: true,  session: 'afternoon', sessionLabel: 'Chiều' },
  { hour: 17, start_time: '17:00', end_time: '18:00', label: '17:00 – 18:00', price: 200000, enabled: true,  session: 'peak',      sessionLabel: 'Cao điểm' },
  { hour: 18, start_time: '18:00', end_time: '19:00', label: '18:00 – 19:00', price: 250000, enabled: true,  session: 'peak',      sessionLabel: 'Cao điểm' },
  { hour: 19, start_time: '19:00', end_time: '20:00', label: '19:00 – 20:00', price: 270000, enabled: true,  session: 'peak',      sessionLabel: 'Cao điểm' },
  { hour: 20, start_time: '20:00', end_time: '21:00', label: '20:00 – 21:00', price: 270000, enabled: true,  session: 'peak',      sessionLabel: 'Cao điểm' },
  { hour: 21, start_time: '21:00', end_time: '22:00', label: '21:00 – 22:00', price: 250000, enabled: true,  session: 'peak',      sessionLabel: 'Cao điểm' },
];

/* ── Generate Modal ── */
function GenerateModal({ fields = [], onClose, onSuccess, showToast }) {
  const [selectedField, setSelectedField] = useState("all");
  const [days, setDays] = useState(30);
  const [slotConfigs, setSlotConfigs] = useState(DEFAULT_SLOT_TEMPLATES);
  const [quickPrice, setQuickPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Tính khoảng ngày bắt đầu & kết thúc
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + Math.max(0, days - 1));

  const formatDateStr = (d) => {
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const handleToggleSlot = (index) => {
    setSlotConfigs(prev => prev.map((s, idx) => idx === index ? { ...s, enabled: !s.enabled } : s));
  };

  const handlePriceChange = (index, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setSlotConfigs(prev => prev.map((s, idx) => idx === index ? { ...s, price: num } : s));
  };

  const handleSelectAllSlots = (enableAll = true) => {
    setSlotConfigs(prev => prev.map(s => ({ ...s, enabled: enableAll })));
  };

  const handleSelectStandardSlots = () => {
    setSlotConfigs(DEFAULT_SLOT_TEMPLATES);
  };

  const handleApplyBulkPrice = () => {
    const p = parseInt(quickPrice, 10);
    if (!p || p <= 0) return;
    setSlotConfigs(prev => prev.map(s => s.enabled ? { ...s, price: p } : s));
    showToast(`Đã áp dụng giá ${p.toLocaleString()}đ cho tất cả khung giờ đang bật`, "success");
    setQuickPrice("");
  };

  const handleGenerate = async () => {
    const enabledSlots = slotConfigs.filter(s => s.enabled);
    if (enabledSlots.length === 0) {
      showToast("Vui lòng bật ít nhất 1 khung giờ để tạo!", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        days,
        field_id: selectedField === "all" ? null : selectedField,
        slot_configs: enabledSlots.map(s => ({
          start_time: s.start_time,
          end_time: s.end_time,
          price: s.price,
          enabled: true,
        })),
      };

      const res = await timeslotsApi.generateSlots(payload);
      setResult(res.data);
    } catch (err) {
      showToast("Lỗi: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  const enabledCount = slotConfigs.filter(s => s.enabled).length;
  const targetFieldName = selectedField === "all"
    ? `Tất cả các sân (${fields.length} sân)`
    : fields.find(f => f.id === selectedField)?.field_name || "Sân đã chọn";

  return (
    <div className="ts-modal-overlay">
      <div className="ts-modal gen-modal">
        <div className="ts-modal-header">
          <div className="gen-modal-title">
            <span className="material-symbols-outlined gen-icon">auto_awesome</span>
            <div>
              <h2>Tạo slot giờ tự động</h2>
              <p className="gen-subtitle">Tùy chỉnh sân áp dụng, số ngày và giá từng khung giờ</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-close-modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="gen-modal-body">
          {/* ── 1. Chọn sân áp dụng ── */}
          <div className="gen-section">
            <label className="ts-label">
              <span className="material-symbols-outlined label-icon">stadium</span>
              Áp dụng cho sân bóng nào?
            </label>
            <div className="gen-field-select-box">
              <select
                className="ts-select gen-select-field"
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
              >
                <option value="all">🏟️ Tất cả các sân đang hoạt động ({fields.length} sân)</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    ⚽ {f.field_name || f.name} {f.location ? `— ${f.location}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── 2. Số ngày tới & Phạm vi ngày ── */}
          <div className="gen-section">
            <label className="ts-label">
              <span className="material-symbols-outlined label-icon">calendar_month</span>
              Tạo cho bao nhiêu ngày tới?
            </label>
            <div className="days-input-row">
              {[7, 14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`days-chip ${days === d ? "active" : ""}`}
                  onClick={() => setDays(d)}
                >
                  {d} ngày
                </button>
              ))}
              <div className="days-custom-box">
                <input
                  type="number"
                  className="ts-input days-custom"
                  value={days}
                  min={1}
                  max={90}
                  onChange={(e) => setDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
                />
                <span className="days-unit">ngày</span>
              </div>
            </div>
            <div className="gen-date-range-badge">
              <span className="material-symbols-outlined">event_upcoming</span>
              <span>
                Khoảng thời gian: Từ <strong>{formatDateStr(today)}</strong> đến <strong>{formatDateStr(endDate)}</strong> ({days} ngày)
              </span>
            </div>
          </div>

          {/* ── 3. Điều chỉnh khung giờ & Bảng giá ── */}
          <div className="gen-section">
            <div className="gen-slots-header">
              <div>
                <label className="ts-label">
                  <span className="material-symbols-outlined label-icon">payments</span>
                  Bảng giá &amp; Khung giờ áp dụng
                </label>
                <p className="gen-slots-hint">
                  Đang bật <strong>{enabledCount}</strong> / {slotConfigs.length} khung giờ. Bấm checkbox để bật/tắt hoặc nhập lại giá theo ý muốn.
                </p>
              </div>
              <div className="gen-slots-quick-actions">
                <button type="button" className="btn-text-action" onClick={() => handleSelectAllSlots(true)}>Bật hết</button>
                <span className="sep">•</span>
                <button type="button" className="btn-text-action" onClick={() => handleSelectAllSlots(false)}>Tắt hết</button>
                <span className="sep">•</span>
                <button type="button" className="btn-text-action" onClick={handleSelectStandardSlots}>Mặc định (bỏ trưa)</button>
              </div>
            </div>

            {/* Thanh gán giá nhanh */}
            <div className="bulk-price-bar">
              <span className="bulk-price-label">
                <span className="material-symbols-outlined">tune</span>
                Đặt giá nhanh cho các giờ đang bật:
              </span>
              <div className="bulk-price-inputs">
                <input
                  type="number"
                  step="10000"
                  min="0"
                  placeholder="Ví dụ: 150000"
                  value={quickPrice}
                  onChange={(e) => setQuickPrice(e.target.value)}
                  className="ts-input bulk-price-input"
                />
                <button
                  type="button"
                  className="btn-apply-bulk-price"
                  onClick={handleApplyBulkPrice}
                  disabled={!quickPrice || Number(quickPrice) <= 0}
                >
                  Áp dụng giá
                </button>
              </div>
            </div>

            {/* Lưới danh sách các khung giờ */}
            <div className="gen-slots-grid">
              {slotConfigs.map((slot, index) => (
                <div
                  key={slot.start_time}
                  className={`gen-slot-card ${slot.enabled ? "is-enabled" : "is-disabled"} ${slot.session}`}
                >
                  <div className="gen-slot-meta">
                    <label className="gen-slot-label">
                      <input
                        type="checkbox"
                        checked={slot.enabled}
                        onChange={() => handleToggleSlot(index)}
                        className="gen-slot-checkbox"
                      />
                      <span className="gen-slot-time-text">{slot.label}</span>
                    </label>
                    <span className={`price-tag ${slot.session}`}>{slot.sessionLabel}</span>
                  </div>
                  <div className="gen-slot-price-field">
                    <span className="price-prefix">Giá:</span>
                    <input
                      type="number"
                      step="5000"
                      min="0"
                      disabled={!slot.enabled}
                      value={slot.price}
                      onChange={(e) => handlePriceChange(index, e.target.value)}
                      className="ts-input gen-slot-price-input"
                    />
                    <span className="currency-unit">đ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tóm tắt trước khi tạo ── */}
          <div className="gen-summary-card">
            <span className="material-symbols-outlined summary-icon">info</span>
            <div className="summary-text">
              Sẽ tạo tối đa <strong>{enabledCount * days * (selectedField === "all" ? (fields.length || 1) : 1)}</strong> slot 
              ({enabledCount} khung giờ × {days} ngày × {targetFieldName}).
              <br />
              <span className="summary-subtext">Hệ thống tự động bỏ qua những slot giờ đã tồn tại trước đó để tránh trùng lặp.</span>
            </div>
          </div>

          {/* ── Kết quả sau khi tạo ── */}
          {result && (
            <div className="gen-result">
              <div className="gen-result-item created">
                <span className="material-symbols-outlined">check_circle</span>
                <strong>{result.created?.toLocaleString()}</strong> slot đã tạo mới thành công
              </div>
              <div className="gen-result-item skipped">
                <span className="material-symbols-outlined">skip_next</span>
                <strong>{result.skipped?.toLocaleString()}</strong> slot đã tồn tại trước đó (bỏ qua)
              </div>
            </div>
          )}
        </div>

        <div className="ts-modal-footer">
          {result ? (
            <button className="btn-save" onClick={handleDone}>
              <span className="material-symbols-outlined">done</span>
              Hoàn tất
            </button>
          ) : (
            <>
              <button className="btn-cancel" onClick={onClose} disabled={loading}>Hủy</button>
              <button className="btn-save btn-generate" onClick={handleGenerate} disabled={loading || enabledCount === 0}>
                {loading ? (
                  <>
                    <span className="material-symbols-outlined spin">progress_activity</span>
                    Đang tạo hàng loạt...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">bolt</span>
                    Tạo ngay ({enabledCount} giờ / ngày)
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
function EditModal({ slot, fields, onClose, onSuccess, showToast }) {
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
      showToast("Lưu thành công", "success");
      onSuccess();
      onClose();
    } catch (err) {
      showToast("Lỗi khi lưu: " + (err.response?.data?.error || err.message), "error");
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
  const { toasts, removeToast, toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
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
        toast.success("Xóa khung giờ thành công!");
        fetchData();
      } catch {
        toast.error("Lỗi khi xóa");
      }
    }
  };

  const handleToggleStatus = async (slot) => {
    const newStatus = slot.status === 'available' ? 'blocked' : 'available';
    try {
      await timeslotsApi.update(slot.id, { ...slot, status: newStatus });
      toast.success(`Đã cập nhật trạng thái sang ${newStatus === 'blocked' ? 'Đã khóa' : 'Trống'}`);
      fetchData();
    } catch {
      toast.error("Lỗi khi cập nhật trạng thái");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("⚠️ Bạn có chắc muốn XÓA TOÀN BỘ slot không?\nHành động này không thể hoàn tác!")) return;
    try {
      const res = await timeslotsApi.deleteAll();
      toast.success(res.data.message || "Đã xóa toàn bộ slot");
      fetchData();
    } catch {
      toast.error('Lỗi khi xóa toàn bộ slot');
    }
  };

  // Lọc dữ liệu
  const filtered = timeslots.filter(s => {
    if (filterField && s.field_id !== filterField) return false;
    if (filterDate && s.slot_date !== filterDate) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchField = (s.field_name || '').toLowerCase().includes(q);
      const matchTime = `${s.start_time} - ${s.end_time}`.toLowerCase().includes(q);
      const matchDate = (s.slot_date || '').toLowerCase().includes(q);
      if (!matchField && !matchTime && !matchDate) return false;
    }
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
    <div className="timeslots-page-layout">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AdminSidebar />
      <div className="timeslots-page-container">
        <TopHeader
          onGenerate={() => setShowGenModal(true)}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
        <main className="main-content timeslots-main-content">
          <div className="content-inner">

            {/* ── Page Header ── */}
            <div className="page-header-alt">
              <div className="header-text">
                <span className="admin-page-eyebrow">
                  PITCH &amp; PULSE OPERATIONS <span>›</span> LỊCH TRÌNH SÂN
                </span>
                <h2>Quản lý Khung giờ</h2>
                <p>Xem, chỉnh sửa giá, vô hiệu hoá hoặc xoá các slot giờ thi đấu theo thời gian thực.</p>
              </div>
              <div className="ts-header-btns">
                <button className="btn-delete-all" onClick={handleDeleteAll}>
                  <span className="material-symbols-outlined">delete_sweep</span>
                  Xóa tất cả
                </button>
                <button className="btn-primary-gradient" onClick={() => setShowGenModal(true)}>
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
    </div>

      {showGenModal && (
        <GenerateModal
          fields={fields}
          onClose={() => setShowGenModal(false)}
          onSuccess={fetchData}
          showToast={(msg, type) => toast[type || 'info'](msg)}
        />
      )}
      {editingSlot && (
        <EditModal
          slot={editingSlot}
          fields={fields}
          onClose={() => setEditingSlot(null)}
          onSuccess={fetchData}
          showToast={(msg, type) => toast[type || 'info'](msg)}
        />
      )}
    </div>
  );
};

export default Timeslots;
