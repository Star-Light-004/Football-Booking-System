export const BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000/api";
  
export const SERVER_URL =
  process.env.REACT_APP_SERVER_URL ||
  "https://football-booking-system-8m77.onrender.com";

export const getFullImageUrl = (path) => {
  if (!path) return "";
  if (typeof path !== "string") return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SERVER_URL}${cleanPath}`;
};