import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
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
    if (coords && coords.lat && coords.lng) {
      map.flyTo([coords.lat, coords.lng], 16, { duration: 1.2 });
    }
  }, [coords, map]);
  return null;
}

// Click on map to update marker position (used in Admin forms)
function MapClickHandler({ onSelectCoords }) {
  useMapEvents({
    click(e) {
      if (onSelectCoords) {
        onSelectCoords(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

const DEFAULT_DA_NANG = { lat: 16.054407, lng: 108.202166 };

/**
 * FieldMap component
 * Props:
 *  - lat, lng       : tọa độ từ DB (ưu tiên cao nhất)
 *  - address        : địa chỉ đầy đủ (phụ)
 *  - location       : tên địa điểm / địa chỉ ngắn (dùng để geocode nếu không có lat/lng)
 *  - fieldName      : tên sân, hiển thị trong popup
 *  - onCoordsFound  : callback(lat, lng) khi geocode xong hoặc admin click bản đồ
 *  - compact        : true = chế độ nhỏ gọn cho modal preview
 *  - showFooter     : hiển thị thanh điều hướng footer (mặc định true)
 */
const FieldMap = ({
  lat,
  lng,
  address,
  fieldName = "Sân bóng đá",
  location,
  onCoordsFound,
  compact = false,
  showFooter = true,
}) => {
  const initialLat = parseFloat(lat);
  const initialLng = parseFloat(lng);
  const hasValidInitialCoords =
    !isNaN(initialLat) && !isNaN(initialLng) && initialLat !== 0 && initialLng !== 0;

  const [coords, setCoords] = useState(
    hasValidInitialCoords ? { lat: initialLat, lng: initialLng } : null
  );
  const [loading, setLoading] = useState(!hasValidInitialCoords);
  const [geocoding, setGeocoding] = useState(false);
  const prevLocationRef = useRef(null);

  useEffect(() => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    // Nếu đã có tọa độ hợp lệ từ DB / props → dùng luôn
    if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0) {
      setCoords({ lat: parsedLat, lng: parsedLng });
      setLoading(false);
      return;
    }

    const currentQuery = address || location;
    if (!currentQuery) {
      // Fallback về trung tâm Đà Nẵng nếu không có thông tin
      setCoords(DEFAULT_DA_NANG);
      setLoading(false);
      return;
    }

    // Nếu địa chỉ không đổi và đã có coords thì không geocode lại
    if (prevLocationRef.current === currentQuery && coords) {
      setLoading(false);
      return;
    }

    prevLocationRef.current = currentQuery;
    setGeocoding(true);

    // Geocode địa chỉ
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
          if (onCoordsFound) {
            onCoordsFound(newCoords.lat, newCoords.lng);
          }
        } else {
          // Thử tìm theo quận / thành phố nếu tìm địa chỉ chi tiết không ra
          const fallbackQuery = encodeURIComponent("Hải Châu, Đà Nẵng, Việt Nam");
          return fetch(
            `https://nominatim.openstreetmap.org/search?q=${fallbackQuery}&format=json&limit=1`,
            { headers: { "Accept-Language": "vi" } }
          )
            .then((r) => r.json())
            .then((fallbackData) => {
              if (fallbackData && fallbackData.length > 0) {
                const fbCoords = {
                  lat: parseFloat(fallbackData[0].lat),
                  lng: parseFloat(fallbackData[0].lon),
                };
                setCoords(fbCoords);
                if (onCoordsFound) onCoordsFound(fbCoords.lat, fbCoords.lng);
              } else {
                setCoords(DEFAULT_DA_NANG);
              }
            });
        }
      })
      .catch(() => {
        // Fallback nhẹ nhàng về Đà Nẵng nếu mạng/CORS lỗi
        setCoords(DEFAULT_DA_NANG);
      })
      .finally(() => {
        setLoading(false);
        setGeocoding(false);
      });
  }, [lat, lng, address, location, onCoordsFound]);

  const handleMapClick = (clickLat, clickLng) => {
    setCoords({ lat: clickLat, lng: clickLng });
    if (onCoordsFound) {
      onCoordsFound(clickLat, clickLng);
    }
  };

  const mapHeight = compact ? "200px" : "240px";

  if (loading) {
    return (
      <div className="fm-placeholder fm-loading" style={{ height: mapHeight }}>
        <span className="fm-spinner" />
        <p>Đang tải bản đồ...</p>
      </div>
    );
  }

  const effectiveCoords = coords || DEFAULT_DA_NANG;
  const displayAddress = location || address || "Hải Châu, Đà Nẵng";
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    fieldName + " " + displayAddress
  )}`;

  return (
    <div className="fm-wrapper">
      {geocoding && (
        <div className="fm-geocoding-badge">
          <span className="fm-spinner fm-spinner-sm" />
          Đang định vị...
        </div>
      )}

      <MapContainer
        center={[effectiveCoords.lat, effectiveCoords.lng]}
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
        <MapFlyTo coords={effectiveCoords} />
        {onCoordsFound && <MapClickHandler onSelectCoords={handleMapClick} />}
        <Marker position={[effectiveCoords.lat, effectiveCoords.lng]} icon={greenIcon}>
          <Popup className="fm-popup">
            <strong>{fieldName}</strong>
            <br />
            <span>{displayAddress}</span>
            <div style={{ marginTop: "6px" }}>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#00b14f", fontWeight: "600", textDecoration: "none", fontSize: "0.8rem" }}
              >
                Mở chỉ đường trên Google Maps ↗
              </a>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {showFooter && (
        <div className="fm-footer">
          <span className="fm-footer-label" title={displayAddress}>
            <span className="fm-dot" />
            {displayAddress}
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
