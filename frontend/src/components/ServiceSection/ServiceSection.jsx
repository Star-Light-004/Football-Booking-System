import React, { useState, useEffect } from "react";
import { getServices } from "../../api/servicesApi";
import "./ServiceSection.css";

const ServiceSection = ({ fieldId, onServicesChange }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [selectedShoeSizes, setSelectedShoeSizes] = useState({});

  const isShoeService = (service) => /giày|giay|shoe/i.test(`${service.name || ''} ${service.category || ''}`);

  const notifyChanges = (quantities, shoeSizes) => {
    const totalPrice = services.reduce((total, service) => total + (service.price * (quantities[service.id] || 0)), 0);
    onServicesChange(quantities, totalPrice, shoeSizes);
  };

  useEffect(() => {
  const fetchServices = async () => {
    try {
      const res = await getServices({ field_id: fieldId });

      console.log("Services API:", res.data);

      const data = res.data;

      setServices(Array.isArray(data) ? data : data?.services || []);
    } catch (err) {
      console.error("Lỗi lấy dịch vụ:", err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  if (fieldId) fetchServices();
}, [fieldId]);

  const updateQuantity = (serviceId, delta) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    setSelectedQuantities((prev) => {
      const currentQty = prev[serviceId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      const newQuantities = { ...prev, [serviceId]: newQty };
      
      notifyChanges(newQuantities, selectedShoeSizes);
      return newQuantities;
    });
  };

  const updateShoeSize = (serviceId, size) => {
    setSelectedShoeSizes((previous) => {
      const newSizes = { ...previous, [serviceId]: size };
      notifyChanges(selectedQuantities, newSizes);
      return newSizes;
    });
  };

  if (loading) return <div className="ss-loading">Đang tải dịch vụ...</div>;

  return (
    <div className="service-section">
      <div className="ss-header">
        <h3>Dịch vụ đi kèm</h3>
        <span className="material-symbols-outlined">shopping_basket</span>
      </div>
      
      <div className="ss-grid">
        {services.length === 0 ? (
          <div className="ss-empty">
            <span className="material-symbols-outlined">sentiment_dissatisfied</span>
            <p>Hiện tại chưa có dịch vụ đi kèm.</p>
          </div>
        ) : (
          services.map((service) => (
          <div key={service.id} className="ss-card">
            <div className="ss-image">
              {service.image ? (
                <img src={service.image} alt={service.name} />
              ) : (
                <div className="ss-placeholder">
                   <span className="material-symbols-outlined">inventory_2</span>
                </div>
              )}
              {selectedQuantities[service.id] > 0 && (
                <div className="ss-badge">{selectedQuantities[service.id]}</div>
              )}
            </div>
            
            <div className="ss-info">
              <p className="ss-name">{service.name}</p>
              <p className="ss-price">{parseFloat(service.price).toLocaleString()}đ</p>
              
              {isShoeService(service) && selectedQuantities[service.id] > 0 && (
                <label className="ss-size-label">
                  Size giày
                  <select value={selectedShoeSizes[service.id] || ''} onChange={(event) => updateShoeSize(service.id, event.target.value)}>
                    <option value="">Chọn size</option>
                    {[38, 39, 40, 41, 42, 43, 44].map((size) => <option value={size} key={size}>{size}</option>)}
                  </select>
                </label>
              )}

              <div className="ss-actions">
                <button 
                  className="ss-btn ss-btn-minus"
                  onClick={() => updateQuantity(service.id, -1)}
                  disabled={!selectedQuantities[service.id]}
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <span className="ss-qty">{selectedQuantities[service.id] || 0}</span>
                <button 
                  className="ss-btn ss-btn-plus"
                  onClick={() => updateQuantity(service.id, 1)}
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>
          </div>
        )))}
      </div>
    </div>
  );
};

export default ServiceSection;
