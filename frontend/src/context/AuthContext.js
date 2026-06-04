import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';
import { setSentryUser, clearSentryUser } from '../utils/sentry';

const AuthContext = createContext(null);

const initialState = { user: null, isAuthenticated: false, isLoading: true, error: null };

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS': return { ...state, user: action.payload, isAuthenticated: true, isLoading: false, error: null };
    case 'LOGOUT': return { ...state, user: null, isAuthenticated: false, isLoading: false };
    case 'UPDATE_USER': return { ...state, user: { ...state.user, ...action.payload } };
    case 'SET_ERROR': return { ...state, error: action.payload, isLoading: false };
    default: return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) { dispatch({ type: 'SET_LOADING', payload: false }); return; }
      try {
        const res = await authAPI.getMe();
        dispatch({ type: 'LOGIN_SUCCESS', payload: res.data.data.user });
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    const res = await authAPI.login(credentials);
    const { user, accessToken, refreshToken } = res.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    setSentryUser({ id: user.id, email: user.email, role: user.role });
    return user;
  };

  const register = async (userData) => {
    const res = await authAPI.register(userData);
    const { user, accessToken, refreshToken } = res.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    setSentryUser({ id: user.id, email: user.email, role: user.role });
    return user;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    clearSentryUser();
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (userData) => dispatch({ type: 'UPDATE_USER', payload: userData });

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
