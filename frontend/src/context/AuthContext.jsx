import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  login as loginRequest,
  logout as logoutRequest,
  me as getCurrentUser,
} from '../api/authApi';
import { clearAuthStorage, getAccessToken } from '../utils/authStorage';
import { API_ERROR_EVENTS } from '../utils/apiErrors';
import { IS_DEVELOPMENT, USER_ROLE_IDS, USER_ROLES } from '../utils/constants';

const AuthContext = createContext(null);

const getUserRoleCode = (user) => {
  const roleCode =
    user?.role?.code ||
    user?.role_code ||
    user?.roleCode ||
    user?.role?.name ||
    user?.role_name ||
    user?.roleName ||
    '';

  return String(roleCode).trim().toLowerCase();
};

const getUserRoleId = (user) => {
  const roleId = user?.role_id || user?.roleId || user?.role?.id || null;
  return Number(roleId);
};

const checkIsAdmin = (user) => {
  const roleCode = getUserRoleCode(user);
  const roleId = getUserRoleId(user);

  return roleCode === USER_ROLES.ADMIN || roleId === USER_ROLE_IDS.ADMIN;
};

const checkIsDriver = (user) => {
  const roleCode = getUserRoleCode(user);
  const roleId = getUserRoleId(user);

  return roleCode === USER_ROLES.DRIVER || roleId === USER_ROLE_IDS.DRIVER;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const resetSession = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setIsLoading(false);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      resetSession();
      return null;
    }

    setIsLoading(true);

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      resetSession();
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [resetSession]);

  const login = useCallback(async ({ username, password }) => {
    try {
      await loginRequest(username, password);
      const currentUser = await getCurrentUser();

      setUser(currentUser);

      return currentUser;
    } catch (error) {
      clearAuthStorage();
      setUser(null);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) {
        await logoutRequest();
      }
    } catch (error) {
      if (IS_DEVELOPMENT) {
        console.warn('Logout request failed:', error);
      }
    } finally {
      resetSession();
    }
  }, [resetSession]);

  useEffect(() => {
    const handleAuthExpired = () => {
      resetSession();
    };

    window.addEventListener(API_ERROR_EVENTS.UNAUTHORIZED, handleAuthExpired);

    return () => {
      window.removeEventListener(API_ERROR_EVENTS.UNAUTHORIZED, handleAuthExpired);
    };
  }, [resetSession]);

  useEffect(() => {
    let isMounted = true;

    const restoreUser = async () => {
      const accessToken = getAccessToken();

      if (!accessToken) {
        clearAuthStorage();

        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }

        return;
      }

      try {
        const currentUser = await getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        clearAuthStorage();

        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      isAdmin: checkIsAdmin(user),
      isDriver: checkIsDriver(user),
      login,
      logout,
      refreshCurrentUser,
    }),
    [user, isLoading, login, logout, refreshCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

export default AuthContext;