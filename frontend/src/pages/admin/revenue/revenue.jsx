import React, { useState, useEffect, useMemo } from 'react';
import AdminSidebar from '../../../components/AdminSidebar/AdminSidebar';
import { useToast, ToastContainer } from '../../../components/Toast/Toast';
import { getRevenueAnalytics } from '../../../api/paymentsApi';
import { getFields } from '../../../api/fieldsApi';
import { getMaintenanceIssues } from '../../../api/facilityApi';
import { onSyncEvent } from '../../../utils/realtimeSync';
import './revenue.css';

const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString('vi-VN');
};

function TopHeader({ onExport, searchTerm, onSearchChange, onRefresh, loading }) {
  return (
    <header className="top-header">
      <div className="search-wrapper">
        <div className="search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Tìm kiếm giao dịch, sự cố, thiết bị, sân bóng..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="header-actions">
        <button
          className="icon-btn"
          title="Làm mới dữ liệu"
          onClick={onRefresh}
          disabled={loading}
          type="button"
        >
          <span className={`material-symbols-outlined ${loading ? 'spin-icon' : ''}`}>
            sync
          </span>
        </button>
        <button className="icon-btn" title="Thông báo" type="button">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  );
}

function SummaryCards({ summary, selectedPeriod = 'all', selectedSpecificDate = null, selectedYear = new Date().getFullYear() }) {
  const currentYear = new Date().getFullYear();
  const isCurrentYear = Number(selectedYear) === currentYear;
  const growthRate = summary?.growth_pct ?? 0;
  const isPositiveGrowth = growthRate >= 0;
  const totalRevenue = summary?.total_revenue || 0;

  let periodBadge = `Năm ${selectedYear}`;
  let periodLabel = `Tổng doanh thu năm ${selectedYear}`;

  if (selectedSpecificDate) {
    const [y, m, d] = selectedSpecificDate.split('-');
    periodBadge = `${d}/${m}/${y}`;
    periodLabel = `Doanh thu ngày ${d}/${m}/${y}`;
  } else if (selectedPeriod === 'today') {
    periodBadge = 'Hôm nay';
    periodLabel = 'Doanh thu hôm nay';
  } else if (selectedPeriod === 'week') {
    periodBadge = 'Tuần này';
    periodLabel = 'Doanh thu tuần này';
  } else if (selectedPeriod === 'month') {
    periodBadge = 'Tháng này';
    periodLabel = 'Doanh thu tháng này';
  } else if (selectedPeriod === 'year' || selectedPeriod === 'all') {
    periodBadge = `Năm ${selectedYear}`;
    periodLabel = `Doanh thu năm ${selectedYear}`;
  }

  return (
    <div className="summary-grid three-cards">
      {/* 1. Doanh thu thực tế */}
      <div className="card-actual">
        <div className="card-content">
          <div className="card-header">
            <div className="card-icon-wrap white-glass">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
            <span className="card-badge white-glass">{periodBadge}</span>
          </div>
          <p className="card-label">{periodLabel}</p>
          <h3 className="card-value">
            {formatCurrency(totalRevenue)} <span className="unit">đ</span>
          </h3>
          <div className="card-sub-info">
            <span className="sub-tag">
              <span className="material-symbols-outlined">today</span>
              Hôm nay: {formatCurrency(summary?.today_revenue)} đ
            </span>
          </div>
        </div>
        <div className="card-blob" />
      </div>

      {/* 2. Doanh thu tháng này & Tăng trưởng */}
      <div className="card-white">
        <div>
          <div className="card-header">
            <div className="card-icon-wrap blue-light">
              <span className="material-symbols-outlined" style={{ color: '#2563eb' }}>
                calendar_month
              </span>
            </div>
            <span className={`card-badge ${isPositiveGrowth ? 'green-soft' : 'pink-soft'}`}>
              {isPositiveGrowth ? `+${growthRate}%` : `${growthRate}%`}
            </span>
          </div>
          <p className="card-label">
            {isCurrentYear ? 'Doanh thu tháng này' : `Doanh thu tháng 12/${selectedYear}`}
          </p>
          <h3 className="card-value">
            {formatCurrency(summary?.this_month_revenue)} <span className="unit">đ</span>
          </h3>
        </div>
        <p className="card-italic">
          {isCurrentYear ? (
            `${isPositiveGrowth ? '📈 Tăng trưởng' : '📉 Giảm'} so với tháng trước (${formatCurrency(summary?.last_month_revenue)} đ)`
          ) : (
            `So với tháng 11/${selectedYear} (${formatCurrency(summary?.last_month_revenue)} đ)`
          )}
        </p>
      </div>

      {/* 3. Giá trị trung bình đơn & Lượt đặt */}
      <div className="card-white">
        <div>
          <div className="card-header">
            <div className="card-icon-wrap amber-light">
              <span className="material-symbols-outlined" style={{ color: '#d97706' }}>
                receipt_long
              </span>
            </div>
            <span className="card-badge amber-soft">
              {summary?.successful_orders || 0} đơn thành công
            </span>
          </div>
          <p className="card-label">Giá trị trung bình đơn</p>
          <h3 className="card-value">
            {formatCurrency(summary?.avg_order_value)} <span className="unit">đ</span>
          </h3>
        </div>
        <p className="card-italic">
          Tổng số lượt đặt: <b>{summary?.total_orders || 0}</b> | Đã hủy: <b>{summary?.cancelled_orders || 0}</b>
        </p>
      </div>
    </div>
  );
}

function BarChart({ monthlyStats, selectedYear, onYearChange, availableYears }) {
  const [hoveredMonth, setHoveredMonth] = useState(null);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h4 className="chart-title">Xu hướng doanh thu theo tháng</h4>
          <p className="chart-subtitle">
            Doanh thu thực tế từng tháng trong năm {selectedYear}
          </p>
        </div>
        <div className="chart-actions">
          <select
            className="chart-select"
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
          >
            {availableYears?.map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bar-chart-container">
        {hoveredMonth && (
          <div className="bar-tooltip">
            <strong>Tháng {hoveredMonth.month}/{selectedYear}</strong>
            <div>Doanh thu: {formatCurrency(hoveredMonth.revenue)} đ</div>
            <small>{hoveredMonth.count} lượt đặt sân</small>
          </div>
        )}

        <div className="bar-chart">
          {monthlyStats?.map((m) => {
            const isZero = m.revenue === 0;
            const barClass = m.is_current
              ? 'active'
              : m.is_future
              ? 'future'
              : isZero
              ? 'zero'
              : 'normal';

            return (
              <div
                key={m.label}
                className={`bar-col ${m.is_future ? 'faded' : ''}`}
                onMouseEnter={() => setHoveredMonth(m)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                <div className="bar-track">
                  <div
                    className={`bar-fill ${barClass}`}
                    style={{ height: m.height }}
                  >
                    {m.revenue > 0 && (
                      <span className="bar-val-badge">
                        {m.revenue >= 1000000
                          ? `${(m.revenue / 1000000).toFixed(1)}M`
                          : `${Math.round(m.revenue / 1000)}k`}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`bar-label ${m.is_current ? 'active' : ''}`}>
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DonutChart({ segments }) {
  const cx = 18;
  const cy = 18;
  const r = 15.9155;

  return (
    <div className="donut-card">
      <div className="donut-header">
        <h4 className="chart-title">Cơ cấu loại sân</h4>
        <p className="donut-subtitle">Tỷ lệ đóng góp doanh thu theo quy mô sân</p>
      </div>

      <div className="donut-chart-wrap">
        <div className="donut-svg-wrap">
          <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            <path
              d={`M ${cx} 2.0845 a ${r} ${r} 0 0 1 0 31.831 a ${r} ${r} 0 0 1 0 -31.831`}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="4.2"
              strokeDasharray="100 100"
            />
            {segments?.map((seg) => (
              <path
                key={seg.label}
                d={`M ${cx} 2.0845 a ${r} ${r} 0 0 1 0 31.831 a ${r} ${r} 0 0 1 0 -31.831`}
                fill="none"
                stroke={seg.color}
                strokeWidth="4.2"
                strokeDasharray={seg.strokeArray}
                strokeDashoffset={seg.strokeOffset}
                strokeLinecap="round"
                className="donut-segment"
              />
            ))}
          </svg>
          <div className="donut-center-label">
            <span className="donut-center-value">100%</span>
            <span className="donut-center-sub">Cơ cấu</span>
          </div>
        </div>

        <div className="donut-legend">
          {segments?.map((seg) => (
            <div key={seg.label} className="donut-legend-row">
              <div className="donut-legend-label">
                <span className="legend-dot" style={{ backgroundColor: seg.color }} />
                <span className="legend-name">{seg.label}</span>
              </div>
              <div className="donut-legend-right">
                <span className="donut-legend-amount">{formatCurrency(seg.revenue)}đ</span>
                <span className="donut-legend-pct">({seg.pct})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransactionTable({ transactions, searchTerm, selectedPeriod, selectedSpecificDate = null, selectedYear = new Date().getFullYear(), onPeriodChange }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [internalPeriod, setInternalPeriod] = useState('all');

  const txPeriod = selectedPeriod !== undefined ? selectedPeriod : internalPeriod;
  const setTxPeriod = onPeriodChange || setInternalPeriod;

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        !searchTerm ||
        t.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.phone?.includes(searchTerm) ||
        t.field?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'success' && t.status_class === 'success') ||
        (statusFilter === 'info' && t.status_class === 'info') ||
        (statusFilter === 'pending' && t.status_class === 'pending') ||
        (statusFilter === 'cancelled' && t.status_class === 'cancelled');

      // Period or Specific Date filter
      let matchPeriod = true;
      const dStr = t.booking_date || t.date || t.created_at;

      if (selectedSpecificDate) {
        if (dStr) {
          let tDate = null;
          if (typeof dStr === 'string' && dStr.includes('/')) {
            const parts = dStr.split(' ')[0].split('/');
            if (parts.length === 3) tDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            tDate = new Date(dStr);
          }
          if (tDate && !isNaN(tDate.getTime())) {
            const [sYear, sMonth, sDay] = selectedSpecificDate.split('-').map(Number);
            matchPeriod =
              tDate.getFullYear() === sYear &&
              tDate.getMonth() + 1 === sMonth &&
              tDate.getDate() === sDay;
          } else {
            matchPeriod = false;
          }
        } else {
          matchPeriod = false;
        }
      } else if (dStr) {
        const now = new Date();
        let tDate = null;
        if (typeof dStr === 'string' && dStr.includes('/')) {
          const parts = dStr.split(' ')[0].split('/');
          if (parts.length === 3) tDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          tDate = new Date(dStr);
        }
        if (tDate && !isNaN(tDate.getTime())) {
          if (txPeriod === 'today') {
            matchPeriod = String(dStr).slice(0, 10) === now.toISOString().slice(0, 10);
          } else if (txPeriod === 'week') {
            const diffDays = (now - tDate) / (1000 * 60 * 60 * 24);
            matchPeriod = diffDays >= 0 && diffDays <= 7;
          } else if (txPeriod === 'month') {
            matchPeriod = tDate.getFullYear() === Number(selectedYear) && tDate.getMonth() === now.getMonth();
          } else if (txPeriod === 'year' || txPeriod === 'all') {
            matchPeriod = tDate.getFullYear() === Number(selectedYear);
          }
        }
      }

      return matchSearch && matchStatus && matchPeriod;
    });
  }, [transactions, searchTerm, statusFilter, txPeriod, selectedSpecificDate, selectedYear]);

  const getInitials = (name) => {
    if (!name) return 'KH';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <section className="tx-section">
      <div className="tx-header">
        <div>
          <h4>Lịch sử giao dịch &amp; Hóa đơn ({filtered.length})</h4>
          <p className="tx-subtitle">Danh sách đơn đặt sân và thanh toán thực tế trong hệ thống</p>
        </div>

        <div className="tx-filters">
          <button
            type="button"
            className={`tx-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`tx-filter-btn ${statusFilter === 'success' ? 'active' : ''}`}
            onClick={() => setStatusFilter('success')}
          >
            Đã hoàn thành
          </button>
          <button
            type="button"
            className={`tx-filter-btn ${statusFilter === 'info' ? 'active' : ''}`}
            onClick={() => setStatusFilter('info')}
          >
            Đã xác nhận
          </button>
          <button
            type="button"
            className={`tx-filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Chờ xử lý
          </button>
          <button
            type="button"
            className={`tx-filter-btn ${statusFilter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            Đã hủy
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Sân bóng</th>
              <th>Thời gian thi đấu</th>
              <th>Phương thức</th>
              <th>Số tiền thanh toán</th>
              <th style={{ textAlign: 'center' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>
                    receipt_long
                  </span>
                  Không tìm thấy giao dịch nào phù hợp với bộ lọc
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.full_id || t.id}>
                  <td>
                    <span className="inv-id">#{String(t.id).replace(/^#/, '')}</span>
                  </td>
                  <td>
                    <div className="customer-cell">
                      <div className="avatar green">{getInitials(t.name)}</div>
                      <div>
                        <span className="customer-name">{t.name || 'Khách vãng lai'}</span>
                        <small className="customer-phone">{t.phone || '—'}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="field-badge">{t.field || 'Sân bóng'}</span>
                  </td>
                  <td>
                    <div className="tx-time-cell">
                      <span className="tx-date-main">
                        {t.date || (t.booking_date ? new Date(t.booking_date).toLocaleDateString('vi-VN') : '—')}
                      </span>
                      {t.time_slot && <small className="tx-time-sub">{t.time_slot}</small>}
                    </div>
                  </td>
                  <td>
                    <span className={`tx-method-badge ${t.payment_method?.includes('VietQR') ? 'qr' : 'cash'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>
                        {t.payment_method?.includes('VietQR') ? 'qr_code_2' : 'payments'}
                      </span>
                      {t.payment_method || 'Tiền mặt tại sân'}
                    </span>
                  </td>
                  <td>
                    <div className="tx-price-cell">
                      <span className="tx-price">{formatCurrency(t.price)} đ</span>
                      {t.discount > 0 ? (
                        <small className="tx-discount">
                          <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>sell</span>
                          -{formatCurrency(t.discount)}đ voucher
                        </small>
                      ) : null}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`tx-badge ${t.status_class}`}>
                      <span className="tx-badge-dot" />
                      {t.status_label}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── 2. CÁC COMPONENT TAB CHI PHÍ BẢO TRÌ ── */

function MaintenanceSummaryCards({ issues, totalRevenue }) {
  const actualCost = issues
    .filter((i) => i.status === 'done' || i.status === 'resolved')
    .reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0);

  const doneCount = issues.filter((i) => i.status === 'done' || i.status === 'resolved').length;
  const activeCount = issues.filter((i) => i.status !== 'done' && i.status !== 'resolved').length;

  const costRatio = totalRevenue > 0 ? ((actualCost / totalRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="summary-grid three-cards">
      {/* 1. Tổng chi phí bảo trì thực tế */}
      <div className="card-actual" style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)' }}>
        <div className="card-content">
          <div className="card-header">
            <div className="card-icon-wrap white-glass">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="card-badge white-glass">Chi phí thực tế</span>
          </div>
          <p className="card-label">Tổng chi phí bảo trì thực tế</p>
          <h3 className="card-value">
            {formatCurrency(actualCost)} <span className="unit">đ</span>
          </h3>
          <div className="card-sub-info">
            <span className="sub-tag">
              <span className="material-symbols-outlined">task_alt</span>
              Đã khắc phục: {doneCount} phiếu sự cố
            </span>
          </div>
        </div>
        <div className="card-blob" />
      </div>

      {/* 2. Tình trạng phiếu bảo trì */}
      <div className="card-white">
        <div>
          <div className="card-header">
            <div className="card-icon-wrap blue-light">
              <span className="material-symbols-outlined" style={{ color: '#2563eb' }}>
                build
              </span>
            </div>
            <span className="card-badge blue-soft">{issues.length} phiếu</span>
          </div>
          <p className="card-label">Tình trạng phiếu bảo trì</p>
          <h3 className="card-value">
            {activeCount} <span className="unit" style={{ fontSize: '1rem', color: '#ef4444' }}>cần sửa</span>
          </h3>
        </div>
        <p className="card-italic">
          Đã hoàn thành: <b>{doneCount}</b> | Chờ xử lý / Đang sửa: <b>{activeCount}</b>
        </p>
      </div>

      {/* 3. Tỷ lệ chi phí bảo trì / Doanh thu */}
      <div className="card-white">
        <div>
          <div className="card-header">
            <div className="card-icon-wrap green-light">
              <span className="material-symbols-outlined" style={{ color: '#059669' }}>
                percent
              </span>
            </div>
            <span className="card-badge green-soft">Chỉ số tài chính</span>
          </div>
          <p className="card-label">Tỷ lệ bảo trì / Doanh thu</p>
          <h3 className="card-value">
            {costRatio}%
          </h3>
        </div>
        <p className="card-italic">
          Chiếm {costRatio}% trên tổng {formatCurrency(totalRevenue)} đ doanh thu
        </p>
      </div>
    </div>
  );
}

function MaintenanceAnalytics({ issues, fieldsList }) {
  // Thống kê theo sân bóng
  const pitchStats = useMemo(() => {
    const map = {};
    fieldsList.forEach((f) => {
      map[f.field_name] = { name: f.field_name, actualCost: 0, count: 0 };
    });

    issues.forEach((i) => {
      const pName = i.fieldName || i.field_name || 'Khác';
      if (!map[pName]) {
        map[pName] = { name: pName, actualCost: 0, count: 0 };
      }
      map[pName].actualCost += parseFloat(i.cost) || 0;
      map[pName].count += 1;
    });

    return Object.values(map);
  }, [issues, fieldsList]);

  const maxPitchCost = Math.max(...pitchStats.map((p) => p.actualCost), 1);

  // Thống kê theo hạng mục
  const categoryStats = useMemo(() => {
    const map = {};
    issues.forEach((i) => {
      const cat = i.category || 'Khác';
      if (!map[cat]) {
        map[cat] = { name: cat, actualCost: 0, count: 0 };
      }
      map[cat].actualCost += parseFloat(i.cost) || 0;
      map[cat].count += 1;
    });
    return Object.values(map).sort((a, b) => b.actualCost - a.actualCost);
  }, [issues]);

  const maxCatCost = Math.max(...categoryStats.map((c) => c.actualCost), 1);

  return (
    <div className="maintenance-analytics-grid">
      {/* 1. Chi phí theo sân bóng */}
      <div className="m-breakdown-card">
        <h4>Chi phí bảo trì theo sân bóng</h4>
        <p>Phân bổ chi phí sửa chữa thực tế giữa các sân bóng trong cơ sở</p>

        <div>
          {pitchStats.map((p) => {
            const pct = Math.round((p.actualCost / maxPitchCost) * 100);
            return (
              <div key={p.name} className="breakdown-row">
                <div className="breakdown-header-line">
                  <strong>{p.name}</strong>
                  <span>
                    <strong style={{ color: p.actualCost > 0 ? '#b91c1c' : '#64748b' }}>
                      {formatCurrency(p.actualCost)} đ
                    </strong>{' '}
                    <small style={{ color: '#94a3b8' }}>({p.count} phiếu)</small>
                  </span>
                </div>
                <div className="breakdown-progress-track">
                  <div
                    className="breakdown-progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: p.actualCost > 0 ? '#b91c1c' : '#cbd5e1',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Chi phí theo hạng mục thiết bị */}
      <div className="m-breakdown-card">
        <h4>Chi phí theo hạng mục thiết bị</h4>
        <p>Chi tiết các thiết bị, cơ sở vật chất phát sinh chi phí sửa chữa</p>

        <div>
          {categoryStats.map((c) => {
            const pct = Math.round((c.actualCost / maxCatCost) * 100);
            return (
              <div key={c.name} className="breakdown-row">
                <div className="breakdown-header-line">
                  <span>{c.name}</span>
                  <span>
                    <strong>{formatCurrency(c.actualCost)} đ</strong>{' '}
                    <small style={{ color: '#94a3b8' }}>({c.count} phiếu)</small>
                  </span>
                </div>
                <div className="breakdown-progress-track">
                  <div
                    className="breakdown-progress-fill"
                    style={{ width: `${pct}%`, background: '#d97706' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MaintenanceTable({ issues, searchTerm }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      const matchSearch =
        !searchTerm ||
        (i.fieldName || i.field_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.reportedBy || i.reported_by_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(i.id).toLowerCase().includes(searchTerm.toLowerCase());

      const isDone = i.status === 'done' || i.status === 'resolved';
      const isFixing = i.status === 'fixing';
      const isPending = i.status === 'pending';

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'done' && isDone) ||
        (statusFilter === 'fixing' && isFixing) ||
        (statusFilter === 'pending' && isPending);

      return matchSearch && matchStatus;
    });
  }, [issues, searchTerm, statusFilter]);

  return (
    <section className="tx-section">
      <div className="tx-header">
        <div>
          <h4>Tất cả thông tin bảo trì &amp; Chi phí phát sinh ({filtered.length})</h4>
          <p className="tx-subtitle">
            Hồ sơ chi tiết từng phiếu sửa chữa, nguồn báo hỏng và chi phí thực tế
          </p>
        </div>

        <div className="tx-filters">
          <button
            type="button"
            className={`tx-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`tx-filter-btn ${statusFilter === 'done' ? 'active' : ''}`}
            onClick={() => setStatusFilter('done')}
          >
            Đã sửa xong
          </button>
          <button
            type="button"
            className={`tx-filter-btn ${statusFilter === 'fixing' ? 'active' : ''}`}
            onClick={() => setStatusFilter('fixing')}
          >
            Đang sửa
          </button>
          <button
            type="button"
            className={`tx-filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Chờ xử lý
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="maintenance-compact-table">
          <thead>
            <tr>
              <th style={{ width: '19%' }}>Phiếu &amp; Sân bóng</th>
              <th style={{ width: '31%' }}>Hạng mục &amp; Mô tả sự cố</th>
              <th style={{ width: '17%' }}>Nguồn báo &amp; Thời gian</th>
              <th style={{ width: '11%' }}>Chi phí thực tế</th>
              <th style={{ width: '10%' }}>Hoàn tất</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>
                    construction
                  </span>
                  Không có phiếu bảo trì nào phù hợp với bộ lọc
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isDone = item.status === 'done' || item.status === 'resolved';
                const reporter = item.reportedBy || item.reported_by_name || 'Kỹ thuật';
                const isCleaning =
                  reporter.toLowerCase().includes('vệ sinh') ||
                  reporter.toLowerCase().includes('dọn dẹp');
                const actCost = parseFloat(item.cost) || 0;

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="m-ticket-cell">
                        <span className="inv-id">#{String(item.id).slice(0, 8)}</span>
                        <strong className="m-field-name">{item.fieldName || item.field_name || 'Sân bóng'}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="m-issue-cell">
                        <div className="m-issue-tags">
                          <span className="field-badge">{item.category || 'Cơ sở vật chất'}</span>
                          <span
                            className={`priority-badge priority-${
                              item.priority === 'Khẩn cấp' || item.priority === 'Cao' ? 'high' : 'normal'
                            }`}
                          >
                            {item.priority || 'Bình thường'}
                          </span>
                        </div>
                        <span className="issue-desc" title={item.description}>
                          {item.description || 'Không có mô tả chi tiết'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="tx-time-cell">
                        <span className="tx-date-main">{item.createdAt || item.created_at || 'Mới báo'}</span>
                        <small className="tx-time-sub" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', color: isCleaning ? '#059669' : '#3b82f6' }}>
                            {isCleaning ? 'cleaning_services' : 'build'}
                          </span>
                          {reporter}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className="m-cost-val" style={{ color: actCost > 0 ? '#b91c1c' : '#64748b' }}>
                        {actCost > 0 ? `${formatCurrency(actCost)} đ` : '0 đ'}
                      </span>
                    </td>
                    <td>
                      <span className="tx-date" style={{ color: isDone ? '#059669' : '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                        {item.resolvedAt || (isDone ? 'Đã hoàn thành' : 'Đang xử lý')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`tx-badge ${isDone ? 'success' : item.status === 'fixing' ? 'pending' : 'cancelled'}`}>
                        <span className="tx-badge-dot" />
                        {isDone ? 'Đã xong' : item.status === 'fixing' ? 'Đang sửa' : 'Chờ xử lý'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Revenue() {
  const { toast, toasts, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState('revenue'); // 'revenue' | 'maintenance'
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState(null);
  const [maintenanceIssues, setMaintenanceIssues] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'year' | 'custom_date'
  const [selectedSpecificDate, setSelectedSpecificDate] = useState(null); // 'YYYY-MM-DD' or null
  const [selectedField, setSelectedField] = useState('all');
  const [fieldsList, setFieldsList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openExport, setOpenExport] = useState(false);

  // Danh sách 7 ngày gần nhất để chọn xem doanh thu theo ngày
  const pastDatesList = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const [year, month, day] = iso.split('-');
      let label = '';
      if (i === 0) label = `Hôm nay (${day}/${month}/${year})`;
      else if (i === 1) label = `Hôm qua (${day}/${month}/${year})`;
      else label = `${i} ngày trước (${day}/${month}/${year})`;
      list.push({ iso, label, displayDate: `${day}/${month}/${year}`, year: Number(year) });
    }
    return list;
  }, []);

  const ISSUES_STORAGE_KEY = 'pitch_maintenance_issues';

  // Tải danh sách sân bóng để lọc
  useEffect(() => {
    getFields()
      .then((res) => {
        const list = res.data?.fields || (Array.isArray(res.data) ? res.data : []);
        setFieldsList(list);
      })
      .catch((err) => console.log('Lỗi lấy danh sách sân:', err));
  }, []);

  // Tải dữ liệu sự cố bảo trì
  const fetchMaintenance = () => {
    getMaintenanceIssues()
      .then((res) => {
        const serverList = res.data?.results || res.data || [];
        if (Array.isArray(serverList) && serverList.length > 0) {
          setMaintenanceIssues(serverList);
          localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(serverList));
        } else {
          const saved = localStorage.getItem(ISSUES_STORAGE_KEY);
          if (saved) setMaintenanceIssues(JSON.parse(saved));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem(ISSUES_STORAGE_KEY);
        if (saved) {
          setMaintenanceIssues(JSON.parse(saved));
        }
      });
  };

  // Tải dữ liệu thống kê doanh thu thực tế
  const fetchRevenue = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const params = {
      year: selectedYear,
    };
    if (selectedField !== 'all') {
      params.field_id = selectedField;
    }

    getRevenueAnalytics(params)
      .then((res) => {
        if (res.data?.success) {
          setRevenueData(res.data);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải thống kê doanh thu:', err);
      })
      .finally(() => {
        if (!isSilent) setLoading(false);
      });

    fetchMaintenance();
  };

  useEffect(() => {
    fetchRevenue(false);

    // Smart background polling mỗi 4s để cập nhật doanh thu tự động
    const timer = setInterval(() => {
      fetchRevenue(true);
    }, 4000);

    // Lắng nghe realtime khi có thanh toán, đặt sân mới hoặc báo hỏng
    const cleanup = onSyncEvent((event) => {
      if (
        event?.type?.startsWith('booking_') ||
        event?.type?.startsWith('payment_') ||
        event?.type?.startsWith('maintenance_') ||
        event?.type === 'field_maintenance_resolved' ||
        event?.type === 'services_updated'
      ) {
        fetchRevenue(true);
      }
    });

    return () => {
      clearInterval(timer);
      cleanup();
    };
  }, [selectedYear, selectedField]);

  // Lọc danh sách bảo trì theo sân nếu có chọn
  const filteredMaintenanceIssues = useMemo(() => {
    if (selectedField === 'all') return maintenanceIssues;
    const selectedFieldObj = fieldsList.find((f) => String(f.id) === String(selectedField));
    const targetName = selectedFieldObj?.field_name?.toLowerCase();

    return maintenanceIssues.filter((i) => {
      const matchId = i.field && String(i.field) === String(selectedField);
      const matchName =
        targetName && (i.fieldName || i.field_name || '').toLowerCase() === targetName;
      return matchId || matchName;
    });
  }, [maintenanceIssues, selectedField, fieldsList]);

  // Kiểm tra ngày trong kỳ lọc nhanh hoặc ngày cụ thể
  const isDateInPeriod = (dStr, period, specificDate = null) => {
    if (!dStr) return true;
    let tDate = null;
    if (typeof dStr === 'string' && dStr.includes('/')) {
      const parts = dStr.split(' ')[0].split('/');
      if (parts.length === 3) tDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      tDate = new Date(dStr);
    }
    if (!tDate || isNaN(tDate.getTime())) return true;

    // Nếu đang chọn một ngày cụ thể từ danh sách các ngày đã qua
    if (specificDate) {
      const [sYear, sMonth, sDay] = specificDate.split('-').map(Number);
      return (
        tDate.getFullYear() === sYear &&
        tDate.getMonth() + 1 === sMonth &&
        tDate.getDate() === sDay
      );
    }

    if (!period || period === 'all') return true;

    const now = new Date();
    if (period === 'today') {
      return (
        tDate.getFullYear() === now.getFullYear() &&
        tDate.getMonth() === now.getMonth() &&
        tDate.getDate() === now.getDate()
      );
    }
    if (period === 'week') {
      const diffDays = (now - tDate) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }
    if (period === 'month') {
      return tDate.getFullYear() === now.getFullYear() && tDate.getMonth() === now.getMonth();
    }
    if (period === 'year') {
      return tDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Tính toán KPI doanh thu theo kỳ đã chọn (Chỉ tính đơn Completed vào Doanh thu thực tế)
  const activeSummary = useMemo(() => {
    if (!revenueData?.summary) return null;
    if (selectedPeriod === 'all' && !selectedSpecificDate) return revenueData.summary;

    const txs = revenueData.transactions || [];
    const filteredTxs = txs.filter((t) =>
      isDateInPeriod(t.booking_date || t.date || t.created_at, selectedPeriod, selectedSpecificDate)
    );

    const completedTxs = filteredTxs.filter((t) => t.status_class === 'success');
    const totalRev = completedTxs.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    const expectedRev = filteredTxs
      .filter((t) => t.status_class !== 'cancelled')
      .reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    const successfulOrders = completedTxs.length;
    const totalOrders = filteredTxs.length;
    const cancelledOrders = filteredTxs.filter((t) => t.status_class === 'cancelled').length;
    const avgOrderValue = successfulOrders > 0 ? Math.round(totalRev / successfulOrders) : 0;

    return {
      ...revenueData.summary,
      total_revenue: totalRev,
      expected_revenue: expectedRev,
      successful_orders: successfulOrders,
      total_orders: totalOrders,
      cancelled_orders: cancelledOrders,
      avg_order_value: avgOrderValue,
    };
  }, [revenueData, selectedPeriod, selectedSpecificDate]);

  // Xuất file Excel / CSV
  const handleExportCSV = () => {
    if (activeTab === 'maintenance') {
      // Xuất danh sách chi phí bảo trì
      const list = filteredMaintenanceIssues;
      if (list.length === 0) {
        toast.warning('Không có dữ liệu bảo trì để xuất báo cáo.');
        return;
      }

      const headers = [
        'Mã phiếu',
        'Sân bóng',
        'Hạng mục',
        'Mô tả sự cố',
        'Người báo cáo',
        'Mức độ ưu tiên',
        'Chi phí thực tế (VNĐ)',
        'Ngày báo cáo',
        'Ngày hoàn thành',
        'Trạng thái',
      ];

      const rows = list.map((item) => {
        const actCost = parseFloat(item.cost) || 0;
        const isDone = item.status === 'done' || item.status === 'resolved';

        return [
          `"${item.id}"`,
          `"${item.fieldName || item.field_name || ''}"`,
          `"${item.category || ''}"`,
          `"${(item.description || '').replace(/"/g, '""')}"`,
          `"${item.reportedBy || item.reported_by_name || ''}"`,
          `"${item.priority || ''}"`,
          actCost,
          `"${item.createdAt || item.created_at || ''}"`,
          `"${item.resolvedAt || (isDone ? 'Đã hoàn thành' : '')}"`,
          `"${isDone ? 'Đã sửa xong' : item.status === 'fixing' ? 'Đang sửa' : 'Chờ xử lý'}"`,
        ];
      });

      const csvContent =
        '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_cao_chi_phi_bao_tri_${selectedYear}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setOpenExport(false);
      return;
    }

    // Xuất doanh thu giao dịch
    const list = revenueData?.transactions || [];
    if (list.length === 0) {
      toast.warning('Không có dữ liệu giao dịch để xuất báo cáo.');
      return;
    }

    const headers = [
      'Mã đơn',
      'Khách hàng',
      'Số điện thoại',
      'Sân bóng',
      'Ngày thi đấu',
      'Tổng tiền (VNĐ)',
      'Giảm giá (VNĐ)',
      'Phương thức thanh toán',
      'Trạng thái',
    ];

    const rows = list.map((t) => [
      `"${t.id}"`,
      `"${t.name || ''}"`,
      `"${t.phone || ''}"`,
      `"${t.field || ''}"`,
      `"${t.date || ''}"`,
      t.price || 0,
      t.discount || 0,
      `"${t.payment_method || ''}"`,
      `"${t.status_label || ''}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_cao_doanh_thu_${selectedYear}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setOpenExport(false);
  };

  const handlePrintPDF = () => {
    setOpenExport(false);
    window.print();
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AdminSidebar />
      <TopHeader
        onExport={() => setOpenExport((prev) => !prev)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={fetchRevenue}
        loading={loading}
      />

      <main className="main-content admin-revenue-main">
        <div className="content-inner">
          {/* Page Heading matching Admin styling */}
          <div className="page-header">
            <div>
              <span className="booking-admin-eyebrow">
                VẬN HÀNH CƠ SỞ <span>›</span> TÀI CHÍNH &amp; DOANH THU
              </span>
              <h2>
                Báo cáo doanh thu &amp; Tài chính
              </h2>
              <p>
                Phân tích chi tiết hiệu quả hoạt động kinh doanh sân bóng và theo dõi chi phí bảo trì cơ sở vật chất.
              </p>
            </div>

            <div className="dashboard-heading-actions">
              {/* Lọc theo sân */}
              <select
                className="dashboard-select-field"
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                title="Lọc theo sân bóng"
              >
                <option value="all">Tất cả sân bóng</option>
                {fieldsList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.field_name}
                  </option>
                ))}
              </select>

              {/* Lọc theo ngày đã qua hoặc theo năm */}
              <select
                className="dashboard-select-year"
                value={selectedSpecificDate ? `date:${selectedSpecificDate}` : `year:${selectedYear}`}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('date:')) {
                    const dateStr = val.replace('date:', '');
                    setSelectedSpecificDate(dateStr);
                    setSelectedPeriod('custom_date');
                    const [y] = dateStr.split('-');
                    if (Number(y) !== selectedYear) {
                      setSelectedYear(Number(y));
                    }
                  } else if (val.startsWith('year:')) {
                    setSelectedSpecificDate(null);
                    setSelectedYear(Number(val.replace('year:', '')));
                    setSelectedPeriod('all');
                  }
                }}
                title="Sổ xuống để chọn ngày đã qua hoặc năm tài chính để xem doanh thu"
              >
                <optgroup label="📅 Xem doanh thu theo ngày đã qua">
                  {pastDatesList.map((item) => (
                    <option key={item.iso} value={`date:${item.iso}`}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="📆 Xem doanh thu theo năm">
                  {(revenueData?.available_years || [2026, 2025]).map((y) => (
                    <option key={y} value={`year:${y}`}>
                      Năm {y}
                    </option>
                  ))}
                </optgroup>
              </select>

              <button
                type="button"
                className="btn-export-main"
                onClick={() => setOpenExport((prev) => !prev)}
              >
                <span className="material-symbols-outlined">download</span>
                Xuất file
              </button>
            </div>
          </div>

          {/* ── THANH CHUYỂN TAB DOANH THU & CHI PHÍ BẢO TRÌ (Tích hợp bộ lọc kỳ thời gian gọn gàng) ── */}
          <div className="revenue-tabs-nav">
            <div className="revenue-tabs-left">
              <button
                type="button"
                className={`revenue-tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
                onClick={() => setActiveTab('revenue')}
              >
                <span className="material-symbols-outlined">payments</span>
                Tổng quan doanh thu
                <span className="tab-badge">{revenueData?.transactions?.length || 0} đơn</span>
              </button>

              <button
                type="button"
                className={`revenue-tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
                onClick={() => setActiveTab('maintenance')}
              >
                <span className="material-symbols-outlined">construction</span>
                Chi phí bảo trì
                <span className="tab-badge">{filteredMaintenanceIssues.length} phiếu</span>
              </button>
            </div>

            {activeTab === 'revenue' && (
              <div className="revenue-tabs-period-filter">
                <span className="revenue-period-label">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#006b2c' }}>
                    calendar_month
                  </span>
                  Kỳ báo cáo:
                </span>
                <div className="revenue-period-pills">
                  {[
                    { key: 'all', label: 'Tất cả' },
                    { key: 'today', label: 'Hôm nay' },
                    { key: 'week', label: 'Tuần này' },
                    { key: 'month', label: 'Tháng này' },
                    { key: 'year', label: 'Năm nay' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      className={`revenue-period-pill ${selectedPeriod === p.key && !selectedSpecificDate ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedPeriod(p.key);
                        setSelectedSpecificDate(null);
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {loading && !revenueData ? (
            <div className="loading-state">
              <div
                className="cd-spinner"
                style={{ borderColor: '#16a34a', borderTopColor: 'transparent', margin: '0 auto 12px' }}
              />
              <p>Đang tải dữ liệu tài chính...</p>
            </div>
          ) : activeTab === 'revenue' ? (
            /* ── TAB 1: TỔNG QUAN DOANH THU ── */
            <>
              {/* Summary Metrics */}
              <SummaryCards
                summary={activeSummary || revenueData?.summary}
                selectedPeriod={selectedPeriod}
                selectedSpecificDate={selectedSpecificDate}
                selectedYear={selectedYear}
              />

              {/* Charts Section */}
              <div className="charts-grid">
                <BarChart
                  monthlyStats={revenueData?.monthly_stats}
                  selectedYear={selectedYear}
                  onYearChange={(year) => {
                    setSelectedYear(year);
                    setSelectedSpecificDate(null);
                  }}
                  availableYears={revenueData?.available_years}
                />
                <DonutChart
                  segments={revenueData?.donut_segments}
                  totalRevenue={activeSummary?.total_revenue || revenueData?.summary?.total_revenue}
                />
              </div>

              {/* Transactions Section */}
              <TransactionTable
                transactions={revenueData?.transactions || []}
                searchTerm={searchTerm}
                selectedPeriod={selectedPeriod}
                selectedSpecificDate={selectedSpecificDate}
                selectedYear={selectedYear}
                onPeriodChange={(period) => {
                  setSelectedPeriod(period);
                  setSelectedSpecificDate(null);
                }}
              />
            </>
          ) : (
            /* ── TAB 2: CHI PHÍ BẢO TRÌ ── */
            <>
              {/* KPI Thống kê chi phí bảo trì */}
              <MaintenanceSummaryCards
                issues={filteredMaintenanceIssues}
                totalRevenue={revenueData?.summary?.total_revenue || 0}
              />

              {/* Biểu đồ phân bổ chi phí theo sân và theo hạng mục */}
              <MaintenanceAnalytics
                issues={filteredMaintenanceIssues}
                fieldsList={fieldsList}
              />

              {/* Bảng chi tiết toàn bộ thông tin bảo trì và chi phí */}
              <MaintenanceTable
                issues={filteredMaintenanceIssues}
                searchTerm={searchTerm}
              />
            </>
          )}
        </div>

        {/* Modal / Popup Xuất báo cáo */}
        {openExport && (
          <div className="export-modal-backdrop" onClick={() => setOpenExport(false)}>
            <div className="export-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="export-modal-header">
                <h3>
                  <span className="material-symbols-outlined">file_download</span>
                  Tùy chọn xuất báo cáo {activeTab === 'maintenance' ? 'chi phí bảo trì' : 'doanh thu'}
                </h3>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setOpenExport(false)}
                >
                  ✕
                </button>
              </div>

              <div className="export-modal-body">
                <p>
                  Chọn định dạng báo cáo{' '}
                  <strong>{activeTab === 'maintenance' ? 'Chi phí bảo trì' : 'Doanh thu'}</strong>{' '}
                  bạn muốn tải về máy:
                </p>
                <div className="export-options-grid">
                  <button
                    type="button"
                    className="export-opt-btn"
                    onClick={handleExportCSV}
                  >
                    <div className="opt-icon excel-icon">
                      <span className="material-symbols-outlined">table_view</span>
                    </div>
                    <div>
                      <strong>Xuất Excel (.csv)</strong>
                      <small>
                        {activeTab === 'maintenance'
                          ? 'Đầy đủ danh sách sự cố & chi phí thực tế'
                          : 'Đầy đủ danh sách hóa đơn, tương thích Excel và Google Sheets'}
                      </small>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="export-opt-btn"
                    onClick={handlePrintPDF}
                  >
                    <div className="opt-icon pdf-icon">
                      <span className="material-symbols-outlined">print</span>
                    </div>
                    <div>
                      <strong>In / Xuất PDF (A4)</strong>
                      <small>Bản in báo cáo tài chính trực quan, lưu dạng file PDF</small>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
