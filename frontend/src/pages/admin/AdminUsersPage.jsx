import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRoles } from '../../api/rolesApi';
import { createUser, deleteUser, getUsers, updateUser } from '../../api/usersApi';
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog';
import AdminModal from '../../components/admin/AdminModal';
import AdminTable from '../../components/admin/AdminTable';
import UserForm from '../../components/admin/UserForm';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ErrorMessage from '../../components/common/ErrorMessage';
import PageHeader from '../../components/common/PageHeader';
import { formatDateTime } from '../../utils/formatters';

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail || error?.apiError?.detail;

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || JSON.stringify(item)).join('; ');

  return error?.message || fallback;
};

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const roleMap = useMemo(
    () => roles.reduce((acc, role) => ({ ...acc, [role.id]: role }), {}),
    [roles],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        getUsers({ limit: 100, offset: 0 }),
        getRoles({ limit: 100, offset: 0 }),
      ]);

      setUsers(extractItems(usersResponse));
      setRoles(extractItems(rolesResponse));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось загрузить пользователей или роли.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
  };

  const handleCreate = async (payload) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createUser(payload);
      setSuccess('Пользователь успешно создан.');
      closeModal();
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось создать пользователя.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (payload) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await updateUser(selectedUser.id, payload);
      setSuccess('Пользователь успешно обновлен.');
      closeModal();
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось обновить пользователя.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await deleteUser(userToDelete.id);
      setSuccess('Пользователь удален.');
      setUserToDelete(null);
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось удалить пользователя.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'Пользователь',
      render: (user) => (
        <div className="admin-main-cell">
          <strong>{user.full_name}</strong>
          <span>{user.email}</span>
          <small>
            login: {user.login} · ID: {user.id}
          </small>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Телефон',
      render: (user) => user.phone || '—',
    },
    {
      key: 'role_id',
      label: 'Роль',
      render: (user) => {
        const role = roleMap[user.role_id];

        return (
          <Badge variant={user.role_id === 1 || role?.code === 'admin' ? 'info' : 'neutral'}>
            {role?.code || `role_id=${user.role_id}`}
          </Badge>
        );
      },
    },
    {
      key: 'language',
      label: 'Язык',
      render: (user) => <Badge variant="neutral">{user.preferred_language}</Badge>,
    },
    {
      key: 'status',
      label: 'Статус',
      render: (user) => (
        <Badge variant={user.is_active ? 'success' : 'neutral'}>
          {user.is_active ? 'active' : 'inactive'}
        </Badge>
      ),
    },
    {
      key: 'last_login_at',
      label: 'Последний вход',
      render: (user) => formatDateTime(user.last_login_at),
    },
  ];

  return (
    <div className="page-stack admin-page">
      <PageHeader
        title="Админ: пользователи"
        subtitle="Управление пользователями, ролями, языком и активностью аккаунта."
        badge="Users"
        actions={
          <div className="admin-header-actions">
            <Button variant="secondary" onClick={loadData} disabled={isLoading}>
              Обновить
            </Button>
            <Button onClick={() => setModalMode('create')}>Создать пользователя</Button>
          </div>
        }
      />

      {error && <ErrorMessage title="Ошибка" message={error} />}
      {success && <div className="admin-success-message">{success}</div>}

      <Card className="admin-data-card">
        <AdminTable
          columns={columns}
          rows={users}
          isLoading={isLoading}
          emptyMessage="Пользователи пока не найдены."
          actions={(user) => (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedUser(user);
                  setModalMode('edit');
                }}
              >
                Изменить
              </Button>

              <Button size="sm" variant="danger" onClick={() => setUserToDelete(user)}>
                Удалить
              </Button>
            </>
          )}
        />
      </Card>

      <AdminModal
        isOpen={modalMode === 'create'}
        title="Создать пользователя"
        description="Пароль обязателен."
        onClose={closeModal}
        size="lg"
      >
        <UserForm
          mode="create"
          roles={roles}
          isSubmitting={isSubmitting}
          onSubmit={handleCreate}
          onCancel={closeModal}
        />
      </AdminModal>

      <AdminModal
        isOpen={modalMode === 'edit'}
        title="Редактировать пользователя"
        description="Пароль можно оставить пустым."
        onClose={closeModal}
        size="lg"
      >
        <UserForm
          user={selectedUser}
          mode="edit"
          roles={roles}
          isSubmitting={isSubmitting}
          onSubmit={handleUpdate}
          onCancel={closeModal}
        />
      </AdminModal>

      <AdminConfirmDialog
        isOpen={Boolean(userToDelete)}
        title="Удалить пользователя?"
        description="Пользователь будет удален через DELETE /users/{id}."
        badge="Delete"
        variant="danger"
        confirmLabel="Удалить"
        isLoading={isSubmitting}
        details={[
          { label: 'ФИО', value: userToDelete?.full_name },
          { label: 'Email', value: userToDelete?.email },
          { label: 'Login', value: userToDelete?.login },
        ]}
        onCancel={() => setUserToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default AdminUsersPage;