import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PrivateRoute } from '../App';
import { useAuth } from '../context/AuthContext';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock useAuth hook
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('PrivateRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('unauthenticated user is redirected to /login', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          <Route path="/protected" element={
            <PrivateRoute>
              <div data-testid="protected-child">Secret Page</div>
            </PrivateRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('protected-child')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toHaveTextContent('Login Page');
  });

  test('authenticated user sees the protected children', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: 'user' },
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={
            <PrivateRoute>
              <div data-testid="protected-child">Secret Page</div>
            </PrivateRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-child')).toBeInTheDocument();
    expect(screen.getByTestId('protected-child')).toHaveTextContent('Secret Page');
  });

  test('wrong role redirects to /dashboard', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: 'user' },
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard Page</div>} />
          <Route path="/protected" element={
            <PrivateRoute roles={['admin']}>
              <div data-testid="protected-child">Secret Page</div>
            </PrivateRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('protected-child')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-page')).toHaveTextContent('Dashboard Page');
  });
});
