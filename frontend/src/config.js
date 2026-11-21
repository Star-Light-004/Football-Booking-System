export const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]");

export const BASE_URL =
  process.env.REACT_APP_API_URL ||
  (isLocalhost
    ? "http://localhost:8000/api"
    : "https://football-booking-system-8m77.onrender.com/api");

export const SERVER_URL =
  process.env.REACT_APP_SERVER_URL ||
  (process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, "")
    : isLocalhost
    ? "http://localhost:8000"
    : "https://football-booking-system-8m77.onrender.com");

export const getFullImageUrl = (path) => {
  if (!path) return "";
  if (typeof path !== "string") return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    if (!isLocalhost && (path.includes("localhost:8000") || path.includes("127.0.0.1:8000"))) {
      return path.replace(/^https?:\/\/(localhost|127\.0\.0\.1):8000/, SERVER_URL);
    }
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SERVER_URL}${cleanPath}`;
};
