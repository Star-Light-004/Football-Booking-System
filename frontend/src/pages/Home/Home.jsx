import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FieldCard from "../../components/FieldCard/FieldCard";
import { getFields } from "../../api/fieldsApi";
import "./Home.css";

const Home = () => {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await getFields();
        // Lấy 6 sân đầu tiên
        setFeatured(res.data.fields.slice(0, 6));
      } catch (error) {
        console.log("Lỗi lấy sân nổi bật:", error);
      }
    };
    fetchFields();
  }, []);

  return (
    <>
      <main>
        {/* Hero section */}
        <section className="relative w-full h-[600px] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuAK6WUVAd4U0q2e94rmo9daIUTGrCQIjSp4PNooM4_sDkdpcWxJZjr5jdUhEUsHRH_4z9UCS0E5HefRVUy9l49OHs7rAbJonmAkWiFAougJTicpzya0XOJDcva1xAaLfxmwkLgLsXyoGkI9MlU4pajIwrsbdKHNPCncKAlfOKCoPEPepNwgZGX0Ln0_hLm9ZZuCGkBmr07qMVa-MK4wjgGqdRb_29RHKE1fP0duNMdDk696w9mqAq5DFmNW1Q1hzPUvJ9QThHDeIWo')",
            }}
          />
          <div className="relative z-10 max-w-4xl px-4 text-center">
            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Đặt sân bóng nhanh chóng – <span className="text-primary">Trải nghiệm</span> bóng đá trọn vẹn
            </h2>
            <p className="text-lg md:text-xl text-slate-200 mb-10 max-w-2xl mx-auto">
              Tìm sân gần bạn, xem khung giờ trống và đặt sân chỉ trong vài giây. Hệ thống đặt sân uy tín nhất hiện nay.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/booking"
                className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform"
              >
                <span className="material-symbols-outlined">event_available</span> Đặt sân ngay
              </Link>
              <Link
                to="/fields"
                className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center"
              >
                Xem danh sách sân
              </Link>
            </div>
          </div>
        </section>
        {/* Search bar */}
        <section className="relative -mt-16 z-20 px-4">
          <div className="max-w-5xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-100 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* selectors omitted for brevity */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Khu vực</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">location_on</span>
                  <select className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary">
                    <option>Tất cả khu vực</option>
                    <option>Quận 1, TP.HCM</option>
                    <option>Quận 7, TP.HCM</option>
                    <option>Cầu Giấy, Hà Nội</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Loại sân</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">groups</span>
                  <select className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary">
                    <option>Loại sân (5, 7, 11 người)</option>
                    <option>Sân 5 người</option>
                    <option>Sân 7 người</option>
                    <option>Sân 11 người</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Ngày đặt</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">calendar_today</span>
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary"
                    type="date"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined">search</span> Tìm sân
                </button>
              </div>
            </div>
          </div>
        </section>
        {/* Features */}
        <section className="py-24 px-4 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-4">Tại sao nên chọn Football Booking?</h3>
            <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* four feature cards */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary transition-colors group">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-3xl">bolt</span>
              </div>
              <h4 className="text-xl font-bold mb-3">Đặt sân nhanh chóng</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Tiết kiệm thời gian với quy trình đặt sân tối giản chỉ trong 30 giây.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary transition-colors group">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-3xl">schedule</span>
              </div>
              <h4 className="text-xl font-bold mb-3">Cập nhật khung giờ</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Thông tin lịch trống được cập nhật liên tục theo thời gian thực từ các chủ sân.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary transition-colors group">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-3xl">assignment_turned_in</span>
              </div>
              <h4 className="text-xl font-bold mb-3">Quản lý lịch đặt</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Dễ dàng theo dõi, thay đổi hoặc hủy lịch đặt ngay trên ứng dụng di động.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary transition-colors group">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
              </div>
              <h4 className="text-xl font-bold mb-3">Thanh toán nhanh</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Hỗ trợ đa dạng phương thức thanh toán: Ví điện tử, Thẻ ngân hàng, QR Code.</p>
            </div>
          </div>
        </section>
        {/* Featured Fields */}
        <section className="py-20 bg-primary/5 dark:bg-primary/10 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h3 className="text-3xl font-bold mb-2">Sân bóng nổi bật</h3>
                <p className="text-slate-500 dark:text-slate-400">Các sân bóng chất lượng cao, được yêu thích nhất khu vực</p>
              </div>
              <Link
                to="/fields"
                className="text-primary font-bold flex items-center gap-1 hover:underline"
              >
                Xem tất cả <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featured.map((field) => (
                <FieldCard
                  key={field.id}
                  id={field.id}
                  image={field.image_url}
                  type={field.field_type}
                  name={field.field_name}
                  location={field.location}
                  price={`${field.price_per_hour?.toLocaleString()}đ/giờ`}
                  bookingCount={field.booking_count}
                  rating={field.rating_avg}
                />
              ))}
            </div>
          </div>
        </section>
        {/* Booking Process */}
        <section className="py-24 px-4 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-4">Quy trình đặt sân đơn giản</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-16">Bạn chỉ cần thực hiện 4 bước để có ngay sân bóng ưng ý</p>
            
            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Connector line (desktop only) */}
              <div className="hidden md:block absolute top-8 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-dashed-line z-0"></div>
              
              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/30">
                  <span className="material-symbols-outlined text-3xl">search</span>
                </div>
                <h4 className="text-lg font-bold mb-2">1. Chọn sân</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tìm kiếm và lựa chọn sân bóng phù hợp với vị trí của bạn.</p>
              </div>

              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/30">
                  <span className="material-symbols-outlined text-3xl">calendar_month</span>
                </div>
                <h4 className="text-lg font-bold mb-2">2. Chọn ngày/giờ</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Kiểm tra khung giờ trống và chọn thời điểm ra sân lý tưởng.</p>
              </div>

              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/30">
                  <span className="material-symbols-outlined text-3xl">description</span>
                </div>
                <h4 className="text-lg font-bold mb-2">3. Nhập thông tin</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Điền thông tin liên hệ và hình thức thanh toán mong muốn.</p>
              </div>

              {/* Step 4 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/30">
                  <span className="material-symbols-outlined text-3xl">check_circle</span>
                </div>
                <h4 className="text-lg font-bold mb-2">4. Xác nhận</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Nhận mã đặt sân qua tin nhắn/email và sẵn sàng thi đấu.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="relative overflow-hidden bg-primary rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-center justify-between text-white">
              {/* Background pattern (placeholder for soccer ball pattern) */}
              <div className="absolute top-0 right-0 w-64 h-64 opacity-10 -mr-20 -mt-20">
                <span className="material-symbols-outlined text-[200px]">sports_soccer</span>
              </div>
              <div className="absolute bottom-0 left-0 w-48 h-48 opacity-10 -ml-16 -mb-16">
                <span className="material-symbols-outlined text-[150px]">sports_soccer</span>
              </div>

              <div className="relative z-10 mb-8 md:mb-0 max-w-2xl">
                <h3 className="text-3xl md:text-4xl font-bold mb-4">Bạn đã sẵn sàng cho trận bóng hôm nay?</h3>
                <p className="text-primary-foreground/80 text-lg opacity-90">
                  Hơn 500+ sân bóng đang chờ bạn trên khắp cả nước. Đặt ngay để nhận ưu đãi lên đến 20% cho khung giờ vàng.
                </p>
              </div>
              <div className="relative z-10">
                <Link
                  to="/booking"
                  className="bg-white text-primary px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 hover:bg-slate-100 transition-colors shadow-xl"
                >
                  ĐẶT SÂN NGAY <span className="material-symbols-outlined">directions_run</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

    </>
  );
};

export default Home;
