export const formatNumber = (value, fallback = '—') => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return fallback;
    }
  
    return new Intl.NumberFormat('ru-RU').format(Number(value));
  };
  
  export const formatDateTime = (value, fallback = '—') => {
    if (!value) {
      return fallback;
    }
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }
  
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  export const formatDate = (value, fallback = '—') => {
    if (!value) {
      return fallback;
    }
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }
  
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };
  
  export const formatPercent = (value, fallback = '—') => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return fallback;
    }
  
    return `${Math.round(Number(value))}%`;
  };
  
  export const formatCurrency = (value, currency = 'KGS', fallback = '—') => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return fallback;
    }
  
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value));
  };
  
  export const getFullName = (user) => {
    if (!user) {
      return '—';
    }
  
    return user.full_name || user.fullName || user.login || user.email || '—';
  };