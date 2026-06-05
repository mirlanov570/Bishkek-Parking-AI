export const API_ERROR_EVENTS = {
    UNAUTHORIZED: 'bishkek-parking-ai:auth-expired',
    FORBIDDEN: 'bishkek-parking-ai:forbidden',
  };
  
  const DEFAULT_ERROR_MESSAGE = 'Произошла ошибка при запросе к серверу.';
  
  const isObject = (value) => typeof value === 'object' && value !== null;
  
  const formatValidationDetail = (detail) =>
    detail
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
  
        if (!isObject(item)) {
          return String(item);
        }
  
        const location = Array.isArray(item.loc) ? item.loc.join('.') : '';
        const message = item.msg || item.message || JSON.stringify(item);
  
        return location ? `${location}: ${message}` : message;
      })
      .join('; ');
  
  export const getApiErrorStatus = (error) => error?.apiError?.status || error?.response?.status || null;
  
  export const getApiErrorCode = (error) =>
    error?.apiError?.code ||
    error?.response?.data?.code ||
    error?.response?.data?.error_code ||
    error?.code ||
    'API_ERROR';
  
  export const getApiErrorDetail = (error) => {
    if (error?.apiError?.detail) {
      return error.apiError.detail;
    }
  
    const detail = error?.response?.data?.detail;
  
    if (Array.isArray(detail)) {
      return formatValidationDetail(detail);
    }
  
    if (isObject(detail)) {
      return detail.message || detail.detail || JSON.stringify(detail);
    }
  
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  
    return (
      error?.response?.data?.message ||
      error?.response?.statusText ||
      error?.message ||
      DEFAULT_ERROR_MESSAGE
    );
  };
  
  export const isNetworkError = (error) =>
    !error?.response &&
    ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ECONNREFUSED'].includes(error?.code);
  
  export const isUnauthorizedError = (error) => getApiErrorStatus(error) === 401;
  
  export const isForbiddenError = (error) => getApiErrorStatus(error) === 403;
  
  export const isNotFoundError = (error) => getApiErrorStatus(error) === 404;
  
  export const normalizeApiError = (error) => {
    const status = getApiErrorStatus(error);
    const code = getApiErrorCode(error);
    const detail = getApiErrorDetail(error);
  
    let title = 'Ошибка запроса';
    let friendlyMessage = detail;
  
    if (isNetworkError(error)) {
      title = 'Backend offline';
      friendlyMessage = 'Backend недоступен. Проверьте, что FastAPI запущен на http://127.0.0.1:8000.';
    } else if (code === 'ECONNABORTED') {
      title = 'Превышено время ожидания';
      friendlyMessage = 'Backend не ответил вовремя. Проверьте запуск сервера и повторите запрос.';
    } else if (status === 401) {
      title = 'Сессия истекла';
      friendlyMessage = detail || 'Авторизация истекла. Выполните вход заново.';
    } else if (status === 403) {
      title = 'Доступ запрещён';
      friendlyMessage = detail || 'У вашей роли нет прав для выполнения этого действия.';
    } else if (status === 404) {
      title = 'Не найдено';
      friendlyMessage = detail || 'Запрошенная запись не найдена или уже удалена.';
    } else if (status === 422) {
      title = 'Ошибка валидации';
      friendlyMessage = detail || 'Проверьте поля формы и повторите запрос.';
    } else if (status >= 500) {
      title = 'Ошибка backend';
      friendlyMessage = detail || 'Backend вернул внутреннюю ошибку. Проверьте логи FastAPI.';
    }
  
    const codeForMeta = code && code !== 'API_ERROR' ? code : null;
    const statusForMeta = status ? `HTTP ${status}` : null;
    const meta = [statusForMeta, codeForMeta].filter(Boolean).join(' / ');
    const displayMessage = meta ? `${friendlyMessage} (${meta})` : friendlyMessage;
  
    return {
      status,
      code,
      detail: displayMessage,
      rawDetail: detail,
      title,
      message: displayMessage,
      data: error?.response?.data || error?.apiError?.data || null,
    };
  };
  
  export const getApiErrorMessage = (error, fallback = DEFAULT_ERROR_MESSAGE) => {
    const normalizedError = normalizeApiError(error);
    return normalizedError.message || fallback;
  };
  
  export const dispatchApiErrorEvent = (error) => {
    if (typeof window === 'undefined') {
      return;
    }
  
    const normalizedError = normalizeApiError(error);
  
    if (normalizedError.status === 401) {
      window.dispatchEvent(new CustomEvent(API_ERROR_EVENTS.UNAUTHORIZED, { detail: normalizedError }));
    }
  
    if (normalizedError.status === 403) {
      window.dispatchEvent(new CustomEvent(API_ERROR_EVENTS.FORBIDDEN, { detail: normalizedError }));
    }
  };