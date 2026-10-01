import React, { useEffect, useState } from "react";
import { getFields } from "../../api/fieldsApi";
import FieldCard from "../../components/FieldCard/FieldCard";
import "./Fields.css";

const Fields = () => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 6;

  const tabs = [
    { key: "all", label: "Tất cả" },
    { key: "5", label: "Sân 5 người" },
    { key: "7", label: "Sân 7 người" },
    { key: "11", label: "Sân 11 người" },
  ];

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await getFields();
        console.log("API response:", res.data);
        const data = res.data?.fields;

        if (Array.isArray(data)) {
          setFields(data);
        } else {
          setFields([]);
        }
      } catch (error) {
        console.log("Lỗi lấy sân:", error);
        setFields([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, []);

  // Lọc sân theo tab được chọn (Tất cả / 5 / 7 / 11)
  const filteredFields = fields.filter((field) => {
    if (activeTab === "all") return true;
    const typeStr = String(field.field_type || "").toLowerCase();
    return typeStr.includes(activeTab);
  });

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredFields.length / ITEMS_PER_PAGE) || 1;

  // Cắt mảng hiển thị trang hiện tại
  const paginatedFields = filteredFields.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Đổi tab
  const handleTabChange = (key) => {
    setActiveTab(key);
    setCurrentPage(1);
  };

  if (loading) {
    return <h2 style={{ padding: 20 }}>Đang tải danh sách sân...</h2>;
  }

  return (
    <main className="fields-page">
      {/* Header */}
      <div className="fields-heading">
        <h1>Danh sách sân bóng</h1>
        <p>Tìm kiếm và đặt sân bóng phù hợp nhất với đội của bạn tại khu vực Hà Nội</p>
      </div>

      {/* Tabs */}
      <div className="fields-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`fields-tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="fields-grid">
        {paginatedFields.length > 0 ? (
          paginatedFields.map((field) => (
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
          ))
        ) : (
          <p style={{ padding: 20, gridColumn: "1 / -1" }}>Không có sân nào phù hợp với bộ lọc</p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="fields-pagination">
          <button
            className="page-btn nav-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`page-btn${currentPage === p ? " active" : ""}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          ))}

          <button
            className="page-btn nav-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          >
            ›
          </button>
        </div>
      )}
    </main>
  );
};

export default Fields;