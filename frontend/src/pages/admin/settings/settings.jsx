import React from "react";
import { Link } from "react-router-dom";
import "./settings.css";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import { useToast, ToastContainer } from "../../../components/Toast/Toast";

function TopHeader() {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm cài đặt..." />
      </div>

      <div className="header-actions">
        <button className="icon-btn" type="button" title="Thông báo">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  );
}

export default function AdminSettings() {
  const { toasts, showToast } = useToast();

  return (
    <>
      <ToastContainer toasts={toasts} />
      <AdminSidebar />
      <TopHeader />

      <main className="main-content">
        <div className="content-inner">
          <div className="page-header">
            <div>
              <span className="fields-eyebrow">
                VẬN HÀNH CƠ SỞ <span>›</span> THIẾT LẬP HỆ THỐNG
              </span>
              <h2>Cài đặt hệ thống</h2>
              <p>Quản lý cấu hình chung, thông báo và bảo mật của hệ thống sân bóng.</p>
            </div>
            <button
              className="btn-add-field"
              type="button"
              onClick={() => showToast("Đã lưu thiết lập hệ thống thành công!", "success")}
            >
              <span className="material-symbols-outlined">save</span>
              Lưu thay đổi
            </button>
          </div>

          <div className="settings-grid">
            <div className="settings-card">
              <div className="settings-card-header">
                <span className="material-symbols-outlined icon">tune</span>
                <h3>Cấu hình chung</h3>
              </div>
              <div className="settings-form">
                <div className="form-group">
                  <label>Tên hệ thống</label>
                  <input type="text" defaultValue="Sân Bóng Đá Hải Châu - Đà Nẵng" className="settings-input" />
                </div>
                <div className="form-group">
                  <label>Số điện thoại hỗ trợ hotline</label>
                  <input type="text" defaultValue="0988 123 456" className="settings-input" />
                </div>
                <div className="form-group">
                  <label>Email liên hệ</label>
                  <input type="email" defaultValue="support@sanbonghaichau.vn" className="settings-input" />
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <span className="material-symbols-outlined icon">notifications_active</span>
                <h3>Cài đặt thông báo</h3>
              </div>
              <div className="settings-form">
                <label className="toggle-label">
                  <span>Gửi SMS xác nhận khi đặt sân thành công</span>
                  <input type="checkbox" defaultChecked />
                </label>
                <label className="toggle-label">
                  <span>Gửi Email thông báo đơn đặt sân mới cho Admin</span>
                  <input type="checkbox" defaultChecked />
                </label>
                <label className="toggle-label">
                  <span>Tự động nhắc lịch đá trước 2 giờ</span>
                  <input type="checkbox" defaultChecked />
                </label>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
