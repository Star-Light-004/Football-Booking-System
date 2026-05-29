import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-white text-2xl font-bold">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white">sports_soccer</span>
              </div>
              <span>Football <span className="text-primary">Booking</span></span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Nền tảng đặt sân bóng đá hàng đầu Việt Nam, kết nối đam mê, nâng tầm trải nghiệm thể thao cộng đồng.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors">
                <i className="fab fa-facebook-f text-white"></i>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors">
                <i className="fab fa-twitter text-white"></i>
              </a>
            </div>
          </div>

          {/* Popular Fields */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Sân bóng phổ biến</h4>
            <ul className="space-y-4">
              <li><Link to="/fields?location=Quận 1" className="hover:text-primary transition-colors">Sân Quận 1</Link></li>
              <li><Link to="/fields?location=Quận 7" className="hover:text-primary transition-colors">Sân Quận 7</Link></li>
              <li><Link to="/fields?location=Tân Bình" className="hover:text-primary transition-colors">Sân Quận Tân Bình</Link></li>
              <li><Link to="/fields?location=Bình Thạnh" className="hover:text-primary transition-colors">Sân Quận Bình Thạnh</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Hỗ trợ khách hàng</h4>
            <ul className="space-y-4">
              <li><Link to="/guide" className="hover:text-primary transition-colors">Hướng dẫn đặt sân</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Chính sách bảo mật</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Điều khoản dịch vụ</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">Câu hỏi thường gặp</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Liên hệ với chúng tôi</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">mail</span>
                <span>contact@footballbooking.vn</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">call</span>
                <span>1900 123 456</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">location_on</span>
                <span>Tòa nhà X, Đường Y, Quận Z, TP. Hồ Chí Minh</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>© 2024 Football Booking System. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-6">
            <button className="hover:text-white transition-colors">Tiếng Việt</button>
            <button className="hover:text-white transition-colors">English</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
