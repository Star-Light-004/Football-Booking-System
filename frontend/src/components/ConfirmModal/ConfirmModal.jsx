import React from 'react';
import './ConfirmModal.css';

export default function ConfirmModal({
  isOpen,
  title = "Xác nhận thao tác",
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  confirmType = "danger",
  icon = "warning",
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-modal-icon-badge ${confirmType}`}>
          <span className="material-symbols-outlined">
            {icon === "danger" ? "warning" : icon === "trash" ? "delete" : icon}
          </span>
        </div>
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button type="button" className="confirm-btn-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`confirm-btn-submit ${confirmType}`}
            onClick={() => {
              if (onConfirm) onConfirm();
              if (onClose) onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

