import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FieldCard from "../../components/FieldCard/FieldCard";
import { getFields } from "../../api/fieldsApi";
import "./Home.css";

const TABS = ["Tất cả", "Sân 5 người", "Sân 7 người", "Sân 11 người"];

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [activeTab, setActiveTab] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [searchDistrict, setSearchDistrict] = useState("");
  const [searchTime, setSearchTime] = useState("");
  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await getFields();
        setFeatured(res.data.fields || []);
      } catch (error) {
        console.log("Lỗi lấy sân nổi bật:", error);
      }
    };
    fetchFields();
  }, []);

  // Filter by tab
  const filteredByTab = featured.filter((f) => {
    if (activeTab === "Tất cả") return true;
    const t = String(f.field_type || "").toLowerCase();
    if (activeTab === "Sân 5 người") return t.includes("5");
    if (activeTab === "Sân 7 người") return t.includes("7");
    if (activeTab === "Sân 11 người") return t.includes("11");
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredByTab.length / ITEMS_PER_PAGE));
  const paginated = filteredByTab.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchText) params.set("q", searchText);
    if (searchDistrict) params.set("district", searchDistrict);
    navigate(`/fields?${params.toString()}`);
  };

  return (
    <>
      <main>
        {/* ── HERO ── */}
        <section className="home-hero">
          <div className="home-hero__bg" />
          <div className="home-hero__content">
            <div className="home-hero__badge">
              <span className="dot" />
              Hệ thống đặt sân bóng đá #1 Việt Nam
            </div>
            <h1 className="home-hero__title">
              Đặt sân bóng nhanh chóng —{" "}
              <span className="highlight">Trải nghiệm</span> bóng đá{" "}
              <span className="highlight">đỉnh cao</span>
            </h1>
            <p className="home-hero__subtitle">
              Tìm sân gần bạn nhất, kiểm tra lịch trống theo thời gian thực và đặt sân chỉ
              trong 30 giây. Gần 50k người dùng, Con số XXVN nâng trải nghiệm.
            </p>
            <div className="home-hero__actions">
              <Link to="/booking" className="btn-primary-hero">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  event_available
                </span>
                Đặt sân ngay
              </Link>
              <Link to="/fields" className="btn-outline-hero">
                Xem danh sách sân
              </Link>
            </div>
            <div className="home-hero__stats">
              <div className="hero-stat">
                <span className="hero-stat__num">500+</span>
                <span className="hero-stat__label">Sân bóng</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat__num">50.000+</span>
                <span className="hero-stat__label">Lượt đặt/tháng</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat__num">30s</span>
                <span className="hero-stat__label">Thời gian đặt</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat__num">4.9/5.0</span>
                <span className="hero-stat__label">Đánh giá</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SEARCH BAR ── */}
        <section className="home-search">
          <form className="home-search__inner" onSubmit={handleSearch}>
            {/* Tìm tên sân / địa chỉ */}
            <div className="search-field" style={{ flex: 2 }}>
              <label className="search-field__label">Tìm kiếm sân / địa chỉ</label>
              <div style={{ position: "relative" }}>
                <span
                  className="material-symbols-outlined search-field__icon"
                  style={{ bottom: "auto", top: "50%", transform: "translateY(-50%)" }}
                >
                  search
                </span>
                <input
                  className="search-field__input"
                  type="text"
                  placeholder="Nhập tên sân, đường, quận..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            {/* Khu vực / Quận huyện */}
            <div className="search-field">
              <label className="search-field__label">Khu vực / Quận huyện</label>
              <div style={{ position: "relative" }}>
                <span
                  className="material-symbols-outlined search-field__icon"
                  style={{ bottom: "auto", top: "50%", transform: "translateY(-50%)" }}
                >
                  location_on
                </span>
                <select
                  className="search-field__select"
                  value={searchDistrict}
                  onChange={(e) => setSearchDistrict(e.target.value)}
                >
                  <option value="">Tất cả quận huyện</option>
                  <option value="Ngũ Hành Sơn">Ngũ Hành Sơn</option>
                  <option value="Hải Châu">Hải Châu</option>
                  <option value="Thanh Khê">Thanh Khê</option>
                  <option value="Liên Chiểu">Liên Chiểu</option>
                  <option value="Cẩm Lệ">Cẩm Lệ</option>
                </select>
              </div>
            </div>

            {/* Thời gian đá */}
            <div className="search-field">
              <label className="search-field__label">Thời gian đá</label>
              <div style={{ position: "relative" }}>
                <span
                  className="material-symbols-outlined search-field__icon"
                  style={{ bottom: "auto", top: "50%", transform: "translateY(-50%)" }}
                >
                  schedule
                </span>
                <select
                  className="search-field__select"
                  value={searchTime}
                  onChange={(e) => setSearchTime(e.target.value)}
                >
                  <option value="">Hôm nay (Khung giờ vàng)</option>
                  <option value="sang">Buổi sáng (6:00–12:00)</option>
                  <option value="chieu">Buổi chiều (12:00–17:00)</option>
                  <option value="toi">Buổi tối (17:00–22:00)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-search">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                search
              </span>
              Tìm Sân
            </button>
          </form>
        </section>

        {/* ── WHY ── */}
        <section className="home-why">
          <div className="home-why__inner">
            <div className="section-header">
              <span className="section-header__label">Tại sao chọn chúng tôi</span>
              <h2 className="section-header__title">
                Tại sao nên chọn Football Booking?
              </h2>
              <p className="section-header__sub">
                Bạn chỉ cần tìm sân – chúng tôi lo phần còn lại với những ưu điểm nổi bật.
              </p>
            </div>
            <div className="why-grid">
              {[
                {
                  icon: "bolt",
                  title: "Đặt sân nhanh chóng",
                  desc: "Tiết kiệm thời gian với quy trình đặt sân tối giản chỉ trong 30 giây.",
                },
                {
                  icon: "schedule",
                  title: "Cập nhật khung giờ",
                  desc: "Thông tin lịch trống được cập nhật liên tục theo thời gian thực từ các chủ sân.",
                },
                {
                  icon: "assignment_turned_in",
                  title: "Quản lý lịch đặt",
                  desc: "Dễ dàng theo dõi, thay đổi hoặc hủy lịch đặt ngay trên ứng dụng di động.",
                },
                {
                  icon: "account_balance_wallet",
                  title: "Thanh toán nhanh",
                  desc: "Hỗ trợ đa dạng phương thức thanh toán: Ví điện tử, Thẻ ngân hàng, QR Code.",
                },
              ].map((item) => (
                <div key={item.title} className="why-card">
                  <div className="why-card__icon">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <h4 className="why-card__title">{item.title}</h4>
                  <p className="why-card__desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURED FIELDS ── */}
        <section className="home-featured">
          <div className="home-featured__inner">
            <div className="section-topbar">
              <div className="section-topbar__left">
                <p className="section-label">Khám phá ngay</p>
                <h2>Sân bóng nổi bật khu vực</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div className="section-topbar__tabs">
                  {TABS.map((tab) => (
                    <button
                      key={tab}
                      className={`tab-pill${activeTab === tab ? " active" : ""}`}
                      onClick={() => handleTabChange(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <Link to="/fields" className="link-viewall">
                  Xem tất cả{" "}
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>

            <div className="featured-grid">
              {paginated.length > 0 ? (
                paginated.map((field) => (
                  <FieldCard
                    key={field.id}
                    id={field.id}
                    image={field.image_url}
                    type={field.field_type}
                    name={field.field_name}
                    location={field.location}
                    price={field.price_per_hour}
                    bookingCount={field.booking_count}
                    rating={field.rating_avg}
                  />
                ))
              ) : (
                <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#6b7280", padding: "40px 0" }}>
                  Không có sân nào phù hợp
                </p>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="home-pagination">
                <button
                  className="home-page-dot"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`home-page-dot${currentPage === p ? " active" : ""}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="home-page-dot"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── BOOKING STEPS ── */}
        <section className="home-steps">
          <div className="home-steps__inner">
            <div className="section-header">
              <span className="section-header__label">Đơn giản & nhanh chóng</span>
              <h2 className="section-header__title">Quy trình đặt sân đơn giản</h2>
              <p className="section-header__sub">
                Bạn chỉ cần thực hiện 4 bước để có ngay sân bóng ưng ý
              </p>
            </div>
            <div className="steps-grid">
              {[
                { icon: "search", title: "1. Chọn sân", desc: "Tìm kiếm và lựa chọn sân bóng phù hợp với vị trí của bạn." },
                { icon: "calendar_month", title: "2. Chọn ngày & giờ", desc: "Kiểm tra khung giờ trống và chọn thời điểm ra sân lý tưởng." },
                { icon: "description", title: "3. Nhập thông tin", desc: "Điền thông tin liên hệ và hình thức thanh toán mong muốn." },
                { icon: "check_circle", title: "4. Xác nhận", desc: "Nhận mã đặt sân qua tin nhắn/email và sẵn sàng thi đấu." },
              ].map((step) => (
                <div key={step.title} className="step-card">
                  <div className="step-circle">
                    <span className="material-symbols-outlined">{step.icon}</span>
                  </div>
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="home-cta">
          <div className="home-cta__inner">
            <div className="cta-card">
              <div>
                <span className="cta-card__badge">⚽ CỘNG ĐỒNG BÓNG ĐÁ PHỦI</span>
                <h3>Đội bạn đang thiếu đối thủ giao hữu?</h3>
                <p>
                  Đăng tin tìm đối tác giao lưu, chia sẻ sân hoặc làm người ghép vị trí thi đấu;
                  lên đạo chỉ với 1 cú click.
                </p>
              </div>
              <div className="cta-card__actions">
                <Link to="/fields" className="btn-cta-white">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    search
                  </span>
                  Tìm đội tứ đá ngay
                </Link>
                <Link to="/booking" className="btn-cta-outline">
                  Đăng bài tìm người ghép
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECOND CTA (Chủ sân) ── */}
        <section style={{ background: "#f0fdf4", padding: "48px 40px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div
              style={{
                background: "#fff",
                border: "1.5px solid #bbf7d0",
                borderRadius: 16,
                padding: "40px 48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 32,
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#16a34a",
                    textTransform: "uppercase",
                    letterSpacing: "1.5px",
                    marginBottom: 6,
                  }}
                >
                  Dành cho chủ sân
                </p>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#111827", marginBottom: 8 }}>
                  Đội bạn đang thiếu đối thủ giao hữu?
                </h3>
                <p style={{ fontSize: "0.88rem", color: "#6b7280", maxWidth: 480, lineHeight: 1.65 }}>
                  Đăng lên hệ thống quản lý sân của bạn & tăng lợi nhuận, tiếp cận hàng triệu người
                  dùng. Đồng hành cùng Football Booking ngay hôm nay.
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link
                  to="/register"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#16a34a",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    padding: "13px 24px",
                    borderRadius: 10,
                    whiteSpace: "nowrap",
                  }}
                >
                  Đăng ký ngay
                </Link>
                <Link
                  to="/fields"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "transparent",
                    color: "#16a34a",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    padding: "13px 24px",
                    borderRadius: 10,
                    border: "1.5px solid #16a34a",
                    whiteSpace: "nowrap",
                  }}
                >
                  Tìm hiểu thêm
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
