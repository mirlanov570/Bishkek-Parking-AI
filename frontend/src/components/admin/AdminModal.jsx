import { useEffect } from 'react';

function AdminModal({
  isOpen,
  title,
  description,
  children,
  footer,
  onClose,
  size = 'md',
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
      <button
        type="button"
        className="admin-modal__backdrop"
        aria-label="Закрыть окно"
        onClick={onClose}
      />

      <div className={`admin-modal__panel admin-modal__panel--${size}`}>
        <header className="admin-modal__header">
          <div>
            <h2 id="admin-modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>

          <button
            type="button"
            className="modal-close-button admin-modal__close"
            onClick={onClose}
            aria-label="Закрыть окно"
            title="Закрыть окно"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 6L18 18" />
              <path d="M18 6L6 18" />
            </svg>
            <span className="modal-close-button__label">Закрыть</span>
          </button>
        </header>

        <div className="admin-modal__body">{children}</div>

        {footer && <footer className="admin-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}

export default AdminModal;