import React, { useEffect, useState } from "react";
import axios from "axios";
import FieldCard from "../../components/FieldCard/FieldCard";
import "./Fields.css";
 
const Fields = () => {
  const [fields, setFields] = useState([]);
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
        const res = await axios.get(
          "http://127.0.0.1:8000/api/football-fields/"
        );
        setFields(res.data.fields);
      } catch (error) {
        console.log("Lỗi lấy sân:", error);
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
 
      {/* Filter Bar */}
      <div className="fields-filter-bar">
        <button className="filter-dropdown-btn">
          <span className="filter-icon">📍</span>
          Khu vực
          <span className="chevron">▾</span>
        </button>
        <button className="filter-dropdown-btn">
          <span className="filter-icon">👥</span>
          Loại sân
          <span className="chevron">▾</span>
        </button>
        <button className="filter-dropdown-btn">
          <span className="filter-icon">💳</span>
          Khoảng giá
          <span className="chevron">▾</span>
        </button>
        <button className="filter-advanced-btn">
          <span className="filter-icon">≡</span>
          Lọc nâng cao
        </button>
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
 
      {/* Grid */}
      <div className="fields-grid">
        {fields.map((field) => (
          <FieldCard
            key={field.id}
            id={field.id}
            image={field.image_url}
            type={field.field_type}
            name={field.field_name}
            location={field.location}
            price={`${field.price_per_hour?.toLocaleString()}đ/giờ`}
          />
        ))}
      </div>
 
      {/* Pagination */}
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