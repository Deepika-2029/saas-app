import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

// Mock authAPI
jest.mock('../services/api', () => ({
  authAPI: {
    getMe: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

// Mock Sentry utils
jest.mock('../utils/sentry', () => ({
  setSentryUser: jest.fn(),
  clearSentryUser: jest.fn(),
}));

const TestComponent = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="auth-state">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user-name">{user ? user.name : 'no user'}</div>
      <button data-testid="login-btn" onClick={() => login({ email: 'test@example.com', password: 'password' })}>Login</button>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('unauthenticated state is correct on load when no token exists', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const authState = await screen.findByTestId('auth-state');
    expect(authState).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('no user');
  });

  test('login sets user and isAuthenticated = true', async () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com', role: 'user' };
    authAPI.login.mockResolvedValueOnce({
      data: {
        data: {
          user: mockUser,
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
        },
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await screen.findByTestId('auth-state');

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    expect(authAPI.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' });
    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    expect(localStorage.getItem('accessToken')).toBe('access-token-123');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token-123');
  });

  test('logout clears state', async () => {
    localStorage.setItem('accessToken', 'existing-token');
    localStorage.setItem('refreshToken', 'existing-refresh-token');
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com', role: 'user' };
    
    authAPI.getMe.mockResolvedValueOnce({
      data: {
        data: { user: mockUser },
      },
    });
    authAPI.logout.mockResolvedValueOnce({});

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const userElement = await screen.findByTestId('user-name');
    expect(userElement).toHaveTextContent('John Doe');
    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    expect(authAPI.logout).toHaveBeenCalled();
    expect(screen.getByTestId('auth-state')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('no user');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});
