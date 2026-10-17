import React, { useState, useCallback, useEffect } from "react";
import "./Toast.css";

// ─── Single Toast item ───────────────────────────────────────────────────────
const ToastItem = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const icons = {
    success: "check_circle",
    error: "cancel",
    warning: "warning",
    info: "info",
  };

  return (
    <div className={`toast-item toast-${toast.type}`}>
      <span className="material-symbols-outlined toast-icon">
        {icons[toast.type] || "info"}
      </span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  );
};

// ─── Container renders all toasts ────────────────────────────────────────────
export const ToastContainer = ({ toasts = [], onRemove, removeToast }) => {
  const handleRemove = onRemove || removeToast;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={handleRemove} />
      ))}
    </div>
  );
};

// ─── Hook to use inside any component ────────────────────────────────────────
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((msg, type = "info", dur) => {
    addToast(msg, type, dur);
  }, [addToast]);

  toast.success = (msg, dur) => addToast(msg, "success", dur);
  toast.error = (msg, dur) => addToast(msg, "error", dur);
  toast.warning = (msg, dur) => addToast(msg, "warning", dur);
  toast.info = (msg, dur) => addToast(msg, "info", dur);

  return { toasts, removeToast, toast };
};

export default ToastItem;
