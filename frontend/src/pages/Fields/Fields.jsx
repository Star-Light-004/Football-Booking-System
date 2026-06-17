import React, { useEffect, useState } from "react";
import { getFields } from "../../api/fieldsApi";
import FieldCard from "../../components/FieldCard/FieldCard";
import "./Fields.css";

const Fields = () => {
  const [fields, setFields] = useState([]); // OK
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

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

        // 🔥 FIX QUAN TRỌNG NHẤT
        const data = res.data?.fields;

        if (Array.isArray(data)) {
          setFields(data);
        } else {
          setFields([]); // chống crash
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
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* GRID - 🔥 FIX MAP AN TOÀN */}
      <div className="fields-grid">
        {Array.isArray(fields) && fields.length > 0 ? (
          fields.map((field) => (
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
          <p style={{ padding: 20 }}>Không có sân nào</p>
        )}
      </div>

      {/* Pagination (giữ nguyên) */}
      <div className="fields-pagination">
        <button className="page-btn nav-btn">‹</button>
        {[1, 2, 3].map((p) => (
          <button
            key={p}
            className={`page-btn${currentPage === p ? " active" : ""}`}
            onClick={() => setCurrentPage(p)}
          >
            {p}
          </button>
        ))}
        <span className="page-ellipsis">...</span>
        <button
          className={`page-btn${currentPage === 10 ? " active" : ""}`}
          onClick={() => setCurrentPage(10)}
        >
          10
        </button>
        <button className="page-btn nav-btn">›</button>
      </div>

    </main>
  );
};

export default Fields;