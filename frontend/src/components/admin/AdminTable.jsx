import Badge from '../common/Badge';
import Loader from '../common/Loader';

function AdminTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  actions,
  isLoading = false,
  emptyMessage = 'Данных пока нет.',
}) {
  if (isLoading) {
    return (
      <div className="admin-table-state">
        <Loader text="Загружаем данные..." />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="admin-table-state">
        <Badge variant="neutral">Empty</Badge>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key || column.label}>{column.label}</th>
            ))}
            {actions && <th>Действия</th>}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => {
            const keyValue = typeof rowKey === 'function' ? rowKey(row) : row[rowKey];

            return (
              <tr key={keyValue || index}>
                {columns.map((column) => (
                  <td key={column.key || column.label} className={column.className || ''}>
                    {column.render ? column.render(row, index) : row[column.key] || '—'}
                  </td>
                ))}

                {actions && <td className="admin-table__actions">{actions(row, index)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AdminTable;