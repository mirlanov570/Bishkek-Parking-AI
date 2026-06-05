import AdminModal from './AdminModal';
import Badge from '../common/Badge';
import Button from '../common/Button';

function AdminConfirmDialog({
  isOpen,
  title,
  description,
  badge = 'Подтверждение',
  details = [],
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const badgeVariant = variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'info';

  return (
    <AdminModal
      isOpen={isOpen}
      title={title}
      description={description}
      onClose={isLoading ? undefined : onCancel}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={variant} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={`admin-confirm admin-confirm--${variant}`}>
        <div className="admin-confirm__icon" aria-hidden="true">
          !
        </div>

        <div className="admin-confirm__content">
          <Badge variant={badgeVariant}>{badge}</Badge>

          {details.length > 0 && (
            <div className="admin-confirm__details">
              {details.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value || '—'}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
}

export default AdminConfirmDialog;