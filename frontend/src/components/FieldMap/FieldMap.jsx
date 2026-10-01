import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./FieldMap.css";

// Fix leaflet default icon path (Webpack issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Custom green marker
const greenIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Sub-component: tự fly map đến tọa độ mới khi coords thay đổi
function MapFlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], 16, { duration: 1.2 });
    }
  }, [coords, map]);
  return null;
}

/**
 * FieldMap component
 * Props:
 *  - lat, lng       : tọa độ từ DB (ưu tiên cao nhất)
 *  - address        : địa chỉ đầy đủ (phụ)
 *  - location       : tên địa điểm / địa chỉ ngắn (dùng để geocode nếu không có lat/lng)
 *  - fieldName      : tên sân, hiển thị trong popup
 *  - onCoordsFound  : callback(lat, lng) khi geocode xong → dùng để auto-fill form
 *  - compact        : true = chế độ nhỏ gọn cho modal preview
 */
const FieldMap = ({ lat, lng, address, fieldName, location, onCoordsFound, compact = false }) => {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [geocoding, setGeocoding] = useState(false); // đang geocode lại (khác với loading ban đầu)
  const prevLocationRef = useRef(null);

  useEffect(() => {
    const currentQuery = address || location;

    // Nếu đã có tọa độ từ DB → dùng luôn (không geocode nữa)
    if (lat && lng && parseFloat(lat) !== 0 && parseFloat(lng) !== 0) {
      const newCoords = { lat: parseFloat(lat), lng: parseFloat(lng) };
      setCoords(newCoords);
      setError(false);
      setLoading(false);
      return;
    }

    if (!currentQuery) {
      setError(true);
      setLoading(false);
      return;
    }

    // Nếu địa chỉ không đổi thì không geocode lại
    if (prevLocationRef.current === currentQuery && coords) {
      setLoading(false);
      return;
    }

    // Geocode địa chỉ mới
    prevLocationRef.current = currentQuery;
    setGeocoding(true);
    setError(false);

    const searchQuery = encodeURIComponent(currentQuery + ", Việt Nam");
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&limit=1`,
      { headers: { "Accept-Language": "vi" } }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data && data.length > 0) {
          const newCoords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          };
          setCoords(newCoords);
          setError(false);
          // Thông báo lên parent để tự điền lat/lng nếu cần
          if (onCoordsFound) {
            onCoordsFound(newCoords.lat, newCoords.lng);
          }
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => {
        setLoading(false);
        setGeocoding(false);
      });
  }, [lat, lng, address, location, onCoordsFound]);

  const mapHeight = compact ? "200px" : "280px";

  if (loading) {
    return (
      <div className="fm-placeholder fm-loading" style={{ height: mapHeight }}>
        <span className="fm-spinner" />
        <p>Đang tải bản đồ...</p>
      </div>
    );
  }

  if (error || !coords) {
    return (
      <div className="fm-placeholder fm-error" style={{ height: mapHeight }}>
        <span className="fm-pin-icon">📍</span>
        <p>Không tìm thấy vị trí</p>
        <span className="fm-sub">Thử nhập địa chỉ đầy đủ hơn</span>
      </div>
    );
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;

  return (
    <div className="fm-wrapper">
      {/* Badge geocoding nhỏ hiện khi đang cập nhật lại */}
      {geocoding && (
        <div className="fm-geocoding-badge">
          <span className="fm-spinner fm-spinner-sm" />
          Đang định vị...
        </div>
      )}

      <MapContainer
        center={[coords.lat, coords.lng]}
        zoom={16}
        style={{ height: mapHeight }}
        className="fm-map"
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />
        {/* Tự động fly đến tọa độ mới khi địa chỉ thay đổi */}
        <MapFlyTo coords={coords} />
        <Marker position={[coords.lat, coords.lng]} icon={greenIcon}>
          <Popup className="fm-popup">
            <strong>{fieldName}</strong>
            <br />
            <span>{location || address}</span>
          </Popup>
        </Marker>
      </MapContainer>

      {!compact && (
        <div className="fm-footer">
          <span className="fm-footer-label">
            <span className="fm-dot" />
            {location || address}
          </span>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fm-directions-btn"
          >
            <span>Chỉ đường</span>
            <span className="fm-arrow">↗</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default FieldMap;
