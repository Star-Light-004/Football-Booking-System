import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        {/* Grid */}
        <div className="footer-grid">
          {/* Col 1 – Brand */}
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo__icon">
                <span className="material-symbols-outlined">sports_soccer</span>
              </div>
              <div>
                <span className="footer-logo__name">Football</span>
                <span className="footer-logo__name green"> Booking</span>
              </div>
            </div>
            <p className="footer-brand__desc">
              Nền tảng đặt sân bóng đá hàng đầu Việt Nam, kết nối đam mê, nâng tầm
              trải nghiệm thể thao cộng đồng.
            </p>
            <div className="footer-socials">
              <a href="#" className="footer-social-btn" aria-label="Facebook">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
              </a>
              <a href="#" className="footer-social-btn" aria-label="YouTube">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
                </svg>
              </a>
              <a href="#" className="footer-social-btn" aria-label="Zalo">
                <span style={{ fontSize: 11, fontWeight: 800 }}>Z</span>
              </a>
            </div>
          </div>

          {/* Col 2 – Khu vực phục vụ */}
          <div className="footer-col">
            <h4 className="footer-col__title">Khu vực phục vụ</h4>
            <ul className="footer-links">
              <li><Link to="/fields?district=Ngũ Hành Sơn">Sân bóng Ngũ Hành Sơn</Link></li>
              <li><Link to="/fields?district=Hải Châu">Sân bóng Hải Châu</Link></li>
              <li><Link to="/fields?district=Liên Chiểu">Sân bóng Liên Chiểu & Hòa Xuân</Link></li>
              <li><Link to="/fields?district=Thanh Khê">Sân bóng Thanh Khê</Link></li>
              <li><Link to="/fields?district=Cẩm Lệ">Sân bóng Cẩm Lệ & Hòa Xuân</Link></li>
              <li><Link to="/fields">Cầu Giấy, Hà Nội</Link></li>
            </ul>
          </div>

          {/* Col 3 – Dành cho chủ sân */}
          <div className="footer-col">
            <h4 className="footer-col__title">Dành cho chủ sân</h4>
            <ul className="footer-links">
              <li><Link to="/register">Đăng ký làm đối tác</Link></li>
              <li><Link to="/admin/dashboard">Hệ thống quản lý sân</Link></li>
              <li><Link to="#">Chính sách hợp tác</Link></li>
              <li><Link to="#">Hệ thống đặt sân tự động & POS</Link></li>
            </ul>
          </div>

          {/* Col 4 – Hỗ trợ */}
          <div className="footer-col">
            <h4 className="footer-col__title">Hỗ trợ khách hàng</h4>
            <div className="footer-contact">
              <div className="footer-phone">
                <span className="material-symbols-outlined">call</span>
                <div>
                  <div className="footer-phone__number">1900 88 99 22</div>
                  <div className="footer-phone__hours">Hỗ trợ từ 6:00 – 23:00 mỗi ngày</div>
                </div>
              </div>
              <ul className="footer-links">
                <li><Link to="#">Hướng dẫn đặt sân</Link></li>
                <li><Link to="#">Câu hỏi thường gặp</Link></li>
                <li><Link to="#">Chính sách bảo mật</Link></li>
                <li><Link to="#">Điều khoản dịch vụ</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="footer-divider" />

        {/* Bottom */}
        <div className="footer-bottom">
          <p>© 2025 Football Booking Platform. All rights reserved.</p>
          <div className="footer-bottom__links">
            <button>Điều khoản dịch vụ</button>
            <button>Chính sách bảo mật & cookie</button>
            <button>Sơ đồ trang web</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
