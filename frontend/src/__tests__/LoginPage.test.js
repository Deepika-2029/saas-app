import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '../pages/LoginPage';
import { useAuth } from '../context/AuthContext';
import { useNavigate, BrowserRouter } from 'react-router-dom';
import toast from 'react-hot-toast';

// Mock useAuth hook
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

describe('LoginPage', () => {
  let mockLogin;

  beforeEach(() => {
    mockLogin = jest.fn();
    useAuth.mockReturnValue({
      login: mockLogin,
    });
    jest.clearAllMocks();
  });

  test('form renders email and password fields', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  test('submit calls the auth API', async () => {
    mockLogin.mockResolvedValueOnce({ id: '1', name: 'Test User' });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    });

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'password123',
    });
    expect(toast.success).toHaveBeenCalledWith('Welcome back!');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('error message displays on failed login', async () => {
    const errorResponse = {
      response: {
        data: {
          message: 'Invalid email or password',
        },
      },
    };
    mockLogin.mockRejectedValueOnce(errorResponse);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'wrong@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    });

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'wrong@test.com',
      password: 'wrongpass',
    });
    expect(toast.error).toHaveBeenCalledWith('Invalid email or password');
  });
});
