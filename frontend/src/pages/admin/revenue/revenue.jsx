import React, { useState } from 'react';
import './revenue.css';
import AdminSidebar from '../../../components/AdminSidebar/AdminSidebar';

/* ── Mock Data for Charts & Transactions ── */
const barData = [
  { label: 'T1', height: '40%', type: 'light' },
  { label: 'T2', height: '55%', type: 'light' },
  { label: 'T3', height: '68%', type: 'light' },
  { label: 'T4', height: '72%', type: 'light' },
  { label: 'T5', height: '90%', type: 'active', activeLabel: true },
  { label: 'T6', height: '80%', type: 'light' },
  { label: 'T7', height: '65%', type: 'light' },
  { label: 'T8', height: '70%', type: 'light' },
  { label: 'T9', height: '60%', type: 'light' },
  { label: 'T10', height: '75%', type: 'light' },
  { label: 'T11', height: '45%', type: 'future', dashed: true, faded: true },
  { label: 'T12', height: '50%', type: 'future', dashed: true, faded: true },
];

const donutColors = ['#10b981', '#6ee7b7', '#3b683e'];
const donutSegments = [
  { label: 'Sân 5 người', strokeArray: '55 100', strokeOffset: 0, dotClass: 'green', pct: '55%' },
  { label: 'Sân 7 người', strokeArray: '30 100', strokeOffset: -55, dotClass: 'light-green', pct: '30%' },
  { label: 'Sân 11 người', strokeArray: '15 100', strokeOffset: -85, dotClass: 'secondary', pct: '15%' },
];

const transactions = [
  {
    id: '#HD-9082',
    name: 'Nguyễn Văn An',
    initials: 'NA',
    avatarClass: 'green',
    field: 'Sân 5A',
    date: '28/05/2024 - 18:30',
    price: '350.000 đ',
    statusClass: 'success',
    statusLabel: 'Hoàn tất',
  },
  {
    id: '#HD-9081',
    name: 'Trần Minh Tuấn',
    initials: 'MT',
    avatarClass: 'blue',
    field: 'Sân 7B',
    date: '28/05/2024 - 17:00',
    price: '650.000 đ',
    statusClass: 'success',
    statusLabel: 'Hoàn tất',
  },
  {
    id: '#HD-9080',
    name: 'Lê Hoàng Long',
    initials: 'HL',
    avatarClass: 'zinc',
    field: 'Sân 5B',
    date: '28/05/2024 - 16:00',
    price: '300.000 đ',
    statusClass: 'pending',
    statusLabel: 'Chờ thanh toán',
  },
  {
    id: '#HD-9079',
    name: 'Phạm Đức Huy',
    initials: 'DH',
    avatarClass: 'green',
    field: 'Sân 11A',
    date: '27/05/2024 - 19:00',
    price: '1.200.000 đ',
    statusClass: 'success',
    statusLabel: 'Hoàn tất',
  },
  {
    id: '#HD-9078',
    name: 'Vũ Quốc Khánh',
    initials: 'QK',
    avatarClass: 'blue',
    field: 'Sân 7A',
    date: '27/05/2024 - 20:00',
    price: '650.000 đ',
    statusClass: 'success',
    statusLabel: 'Hoàn tất',
  },
];

function TopHeader({ onExport }) {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm giao dịch, hóa đơn..." />
      </div>

      <div className="header-actions">
        <button className="icon-btn" title="Thông báo">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="icon-btn" title="Trợ giúp">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="header-divider" />
        <button className="btn-new-booking" onClick={onExport}>
          <span className="material-symbols-outlined">file_download</span>
          Xuất báo cáo
        </button>
      </div>
    </header>
  );
}
 
function SummaryCards() {
  return (
    <div className="summary-grid">
      {/* Actual Revenue */}
      <div className="card-actual">
        <div className="card-content">
          <div className="card-header">
            <div className="card-icon-wrap white-glass">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
            <span className="card-badge white-glass">Thực tế</span>
          </div>
          <p className="card-label">Doanh thu thực tế</p>
          <h3 className="card-value">
            1,240,500,000 <span className="unit">đ</span>
          </h3>
        </div>
        <div className="card-blob" />
      </div>
 
      {/* Expected Revenue */}
      <div className="card-white">
        <div>
          <div className="card-header">
            <div className="card-icon-wrap green-light">
              <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)' }}>insights</span>
            </div>
            <span className="card-badge green-soft">Dự kiến</span>
          </div>
          <p className="card-label">Doanh thu dự kiến</p>
          <h3 className="card-value">
            1,500,000,000 <span className="unit">đ</span>
          </h3>
        </div>
        <div className="progress-wrap">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '82.7%' }} />
          </div>
          <span className="progress-pct">82.7%</span>
        </div>
      </div>
 
      {/* Growth Rate */}
      <div className="card-white">
        <div>
          <div className="card-header">
            <div className="card-icon-wrap pink-light">
              <span className="material-symbols-outlined" style={{ color: 'var(--color-tertiary)' }}>trending_up</span>
            </div>
            <span className="card-badge pink-soft">Tăng trưởng</span>
          </div>
          <p className="card-label">Tỷ lệ tăng trưởng</p>
          <h3 className="card-value">+12.4%</h3>
        </div>
        <p className="card-italic">So với cùng kỳ tháng trước (T4/2024)</p>
      </div>
    </div>
  );
}
 
function BarChart() {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h4 className="chart-title">Xu hướng doanh thu</h4>
          <p className="chart-subtitle">Thống kê doanh thu theo tháng trong năm 2024</p>
        </div>
        <select className="chart-select">
          <option>Năm 2024</option>
          <option>Năm 2023</option>
        </select>
      </div>
 
      <div className="bar-chart">
        {barData.map(({ label, height, type, faded, dashed, activeLabel }) => (
          <div key={label} className={`bar-col${faded ? ' faded' : ''}`}>
            <div className={`bar-track${dashed ? ' dashed' : ''}`}>
              {type !== 'none' && (
                <div className={`bar-fill ${type}`} style={{ height }} />
              )}
            </div>
            <span className={`bar-label${activeLabel ? ' active' : ''}`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
 
function DonutChart() {
  const CIRCUMFERENCE = 100;
  const cx = 18, cy = 18, r = 15.9155;
 
  return (
    <div className="donut-card">
      <h4 className="chart-title">Cơ cấu doanh thu</h4>
      <p className="donut-subtitle">Phân loại theo loại hình sân</p>
 
      <div className="donut-chart-wrap">
        <div className="donut-svg-wrap">
          <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            {/* Background track */}
            <path
              d={`M ${cx} 2.0845 a ${r} ${r} 0 0 1 0 31.831 a ${r} ${r} 0 0 1 0 -31.831`}
              fill="none" stroke="#f4f4f5"
              strokeWidth="4" strokeDasharray="100, 100"
            />
            {/* Segments */}
            {donutSegments.map(({ label, strokeArray, strokeOffset }, i) => (
              <path
                key={label}
                d={`M ${cx} 2.0845 a ${r} ${r} 0 0 1 0 31.831 a ${r} ${r} 0 0 1 0 -31.831`}
                fill="none"
                stroke={donutColors[i]}
                strokeWidth="4"
                strokeDasharray={strokeArray}
                strokeDashoffset={strokeOffset}
              />
            ))}
          </svg>
          <div className="donut-center-label">
            <span className="donut-center-value">100%</span>
            <span className="donut-center-sub">Tổng thể</span>
          </div>
        </div>
 
        <div className="donut-legend">
          {donutSegments.map(({ label, dotClass, pct }) => (
            <div key={label} className="donut-legend-row">
              <div className="donut-legend-label">
                <span className={`legend-dot ${dotClass}`} />
                {label}
              </div>
              <span className="donut-legend-pct">{pct}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
 
function TransactionTable() {
  return (
    <section className="tx-section">
      <div className="tx-header">
        <h4>Lịch sử giao dịch gần đây</h4>
        <button className="btn-view-all">Xem tất cả</button>
      </div>
 
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mã hóa đơn</th>
              <th>Khách hàng</th>
              <th>Sân bãi</th>
              <th>Ngày đặt</th>
              <th>Tổng tiền</th>
              <th className="right">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td><span className="inv-id">{t.id}</span></td>
                <td>
                  <div className="customer-cell">
                    <div className={`avatar ${t.avatarClass}`}>{t.initials}</div>
                    <span className="customer-name">{t.name}</span>
                  </div>
                </td>
                <td><span className="field-badge">{t.field}</span></td>
                <td><span className="tx-date">{t.date}</span></td>
                <td><span className="tx-price">{t.price}</span></td>
                <td className="tx-status-cell">
                  <span className={`tx-badge ${t.statusClass}`}>{t.statusLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
 
function ExportFAB({ open, setOpen }) {
  return (
    <div className="fab-container">
      <div className={`export-menu ${open ? 'visible' : 'hidden'}`}>
        <button className="export-menu-btn" onClick={() => alert("Tính năng xuất PDF đang được xử lý")}>
          <span className="material-symbols-outlined pdf">picture_as_pdf</span>
          Xuất PDF (A4)
        </button>
        <button className="export-menu-btn" onClick={() => alert("Tính năng xuất Excel đang được xử lý")}>
          <span className="material-symbols-outlined excel">table_view</span>
          Xuất Excel (.xlsx)
        </button>
      </div>
      <button className="fab-btn" onClick={() => setOpen((v) => !v)}>
        <span className="material-symbols-outlined">download_for_offline</span>
      </button>
    </div>
  );
}

/* ── Main Revenue Component ── */
export default function Revenue() {
  const [openExport, setOpenExport] = useState(false);

  return (
    <div className="revenue-page-layout">
      <AdminSidebar />
      <div className="revenue-page-container">
        <TopHeader onExport={() => setOpenExport((v) => !v)} />

        <main className="main-content revenue-main-content">
          {/* Page Header */}
          <div className="page-header-alt">
            <div className="header-text">
              <span className="admin-page-eyebrow">
                PITCH &amp; PULSE OPERATIONS <span>›</span> TÀI CHÍNH &amp; KINH DOANH
              </span>
              <h2>Báo cáo doanh thu</h2>
              <p>Phân tích chi tiết hiệu quả hoạt động kinh doanh sân bãi theo thời gian thực.</p>
            </div>
            <div className="date-picker-wrap">
              <div className="date-range-display">
                <span className="material-symbols-outlined">calendar_today</span>
                <span>01/05/2024 - 31/05/2024</span>
              </div>
              <button className="btn-expand">
                <span className="material-symbols-outlined">expand_more</span>
              </button>
              <button className="btn-primary-gradient" onClick={() => setOpenExport((v) => !v)}>
                <span className="material-symbols-outlined">file_download</span>
                Xuất báo cáo
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <SummaryCards />

          {/* Charts */}
          <div className="charts-grid">
            <BarChart />
            <DonutChart />
          </div>

          {/* Transactions */}
          <TransactionTable />
        </main>
      </div>

      {/* FAB */}
      <ExportFAB open={openExport} setOpen={setOpenExport} />
    </div>
  );
}