import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getFields } from "../../api/fieldsApi";
import FieldCard from "../../components/FieldCard/FieldCard";
import "./Fields.css";

const TABS = [
  { key: "all", label: "Tất cả loại sân" },
  { key: "5", label: "Sân 5 người (Futsal & Co)" },
  { key: "7", label: "Sân 7 người (Mini tiêu chuẩn)" },
  { key: "11", label: "Sân 11 người (Sân lớn)" },
];

const SORT_OPTIONS = [
  { value: "default", label: "Đánh giá cao nhất" },
  { value: "price_asc", label: "Giá thấp → cao" },
  { value: "price_desc", label: "Giá cao → thấp" },
  { value: "booking", label: "Lượt đặt nhiều nhất" },
];

const ITEMS_PER_PAGE = 6;

const Fields = () => {
  const locationHook = useLocation();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [searchDistrict, setSearchDistrict] = useState("");
  const [searchTime, setSearchTime] = useState("");
  const [inputText, setInputText] = useState("");
  const [inputDistrict, setInputDistrict] = useState("");
  const [inputTime, setInputTime] = useState("");

  // Read query params on mount
  useEffect(() => {
    const params = new URLSearchParams(locationHook.search);
    const q = params.get("q") || "";
    const d = params.get("district") || "";
    setInputText(q);
    setInputDistrict(d);
    setSearchText(q);
    setSearchDistrict(d);
  }, [locationHook.search]);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await getFields();
        const data = res.data?.fields;
        setFields(Array.isArray(data) ? data : []);
      } catch (error) {
        console.log("Lỗi lấy sân:", error);
        setFields([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFields();
  }, []);

  // Filter
  const filtered = fields.filter((f) => {
    // Tab filter
    if (activeTab !== "all") {
      const typeStr = String(f.field_type || "").toLowerCase();
      if (!typeStr.includes(activeTab)) return false;
    }
    // Text search
    if (searchText) {
      const q = searchText.toLowerCase();
      const nameMatch = (f.field_name || "").toLowerCase().includes(q);
      const locMatch = (f.location || "").toLowerCase().includes(q);
      if (!nameMatch && !locMatch) return false;
    }
    // District filter
    if (searchDistrict) {
      const locStr = (f.location || "").toLowerCase();
      if (!locStr.includes(searchDistrict.toLowerCase())) return false;
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price_asc") return (a.price_per_hour || 0) - (b.price_per_hour || 0);
    if (sortBy === "price_desc") return (b.price_per_hour || 0) - (a.price_per_hour || 0);
    if (sortBy === "booking") return (b.booking_count || 0) - (a.booking_count || 0);
    // default: rating desc
    return (b.rating_avg || 0) - (a.rating_avg || 0);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated = sorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleTabChange = (key) => {
    setActiveTab(key);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchText(inputText);
    setSearchDistrict(inputDistrict);
    setSearchTime(inputTime);
    setCurrentPage(1);
  };

  // Pagination range with ellipsis
  const getPageRange = () => {
    const range = [];
    const delta = 2;
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    if (left > 1) {
      range.push(1);
      if (left > 2) range.push("...");
    }
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages) {
      if (right < totalPages - 1) range.push("...");
      range.push(totalPages);
    }
    return range;
  };

  return (
    <div className="fields-page">
      {/* ── Hero Header ── */}
      <div className="fields-hero">
        <div className="fields-hero__inner">
          <div className="fields-hero__breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span className="sep">›</span>
            <span className="current">Sân bóng</span>
          </div>
          <p className="fields-hero__count">
            Hơn {fields.length}+ sân bóng và {Math.floor(fields.length * 0.8)} địa điểm gần bạn đã được đưa vào hệ thống
          </p>
          <h1>Danh sách sân bóng đá & đặt lịch trực tuyến</h1>
          <p>
            Tìm kiếm sân bóng gần bạn nhất, kiểm tra lịch trống theo thời gian thực và đặt sân chỉ 30
            giây tại khu vực Đà Nẵng & Hà Nội.
          </p>
        </div>
      </div>

      {/* ── Search / Filter Bar ── */}
      <div className="fields-search-bar">
        <form className="fields-search-bar__inner" onSubmit={handleSearch}>
          {/* Tên sân / địa chỉ */}
          <div className="fsb-field grow">
            <label className="fsb-label">Tìm kiếm sân / địa chỉ</label>
            <div className="fsb-input-wrap">
              <span className="material-symbols-outlined fsb-icon">search</span>
              <input
                className="fsb-input"
                type="text"
                placeholder="Nhập tên sân, đường, quận..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
          </div>

          {/* Khu vực */}
          <div className="fsb-field normal">
            <label className="fsb-label">Khu vực / Quận huyện</label>
            <div className="fsb-input-wrap">
              <span className="material-symbols-outlined fsb-icon">location_on</span>
              <select
                className="fsb-select"
                value={inputDistrict}
                onChange={(e) => setInputDistrict(e.target.value)}
              >
                <option value="">Tất cả quận huyện</option>
                <option value="Ngũ Hành Sơn">Ngũ Hành Sơn</option>
                <option value="Hải Châu">Hải Châu</option>
                <option value="Thanh Khê">Thanh Khê</option>
                <option value="Liên Chiểu">Liên Chiểu</option>
                <option value="Cẩm Lệ">Cẩm Lệ</option>
                <option value="Hòa Vang">Hòa Vang</option>
              </select>
            </div>
          </div>

          {/* Thời gian */}
          <div className="fsb-field normal">
            <label className="fsb-label">Thời gian đá</label>
            <div className="fsb-input-wrap">
              <span className="material-symbols-outlined fsb-icon">schedule</span>
              <select
                className="fsb-select"
                value={inputTime}
                onChange={(e) => setInputTime(e.target.value)}
              >
                <option value="">Hôm nay (Khung giờ vàng)</option>
                <option value="sang">Buổi sáng (6:00–12:00)</option>
                <option value="chieu">Buổi chiều (12:00–17:00)</option>
                <option value="toi">Buổi tối (17:00–22:00)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="fsb-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>search</span>
            Tìm Sân
          </button>
        </form>
      </div>

      {/* ── Main Content ── */}
      <main className="fields-main">
        {/* Controls: Tabs + Sort */}
        <div className="fields-controls">
          <div className="fields-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`fields-tab${activeTab === tab.key ? " active" : ""}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="fields-sort">
            <span className="sort-label">Lọc địa chỉ:</span>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Golden hour banner */}
        <div className="fields-golden-bar">
          <div className="golden-bar__left">
            <span className="material-symbols-outlined icon">bolt</span>
            <span>
              Khung giờ vàng hôm nay (17:30 – 20:30): Đã có 6/12 sân được giữ chỗ trước. Đặt ngay đã có sân đẹp!
            </span>
          </div>
          <Link to="#" className="golden-bar__link">
            Xem sân còn trống →
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="fields-loading">
            <span className="material-symbols-outlined spin" style={{ fontSize: 28 }}>refresh</span>
            Đang tải danh sách sân...
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <>
            <div className="fields-grid">
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
                <div className="fields-empty">
                  <span className="material-symbols-outlined">search_off</span>
                  <h3>Không tìm thấy sân phù hợp</h3>
                  <p>Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="fields-pagination">
                <button
                  className="page-btn nav-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                {getPageRange().map((item, idx) =>
                  item === "..." ? (
                    <span key={`ellipsis-${idx}`} className="page-ellipsis">…</span>
                  ) : (
                    <button
                      key={item}
                      className={`page-btn${currentPage === item ? " active" : ""}`}
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  className="page-btn nav-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Community CTA ── */}
      <div className="fields-cta">
        <div className="fields-cta__inner">
          <div>
            <span className="fields-cta__badge">⚽ CỘNG ĐỒNG BÓNG ĐÁ PHỦ</span>
            <h3>Đội của bạn đang thiếu đối thủ giao hữu?</h3>
            <p>
              Đăng tin tìm đối tác giao lưu, chia sẻ sân hoặc làm người ghép vị trí thi đấu;
              lên đạo chỉ với 1 cú click.
            </p>
          </div>
          <div className="fields-cta__actions">
            <button className="btn-cta-solid">
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>search</span>
              Tìm đội tứ đá ngay
            </button>
            <button className="btn-cta-ghost">
              Đăng bài tìm người ghép
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fields;