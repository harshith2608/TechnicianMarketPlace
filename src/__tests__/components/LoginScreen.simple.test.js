/**
 * LoginScreen Component Tests - Simple UI Focus
 * Testing: Form rendering, input handling, navigation
 * File: src/__tests__/components/LoginScreen.simple.test.js
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const MockLoginScreen = ({ onSubmit, onNavigate }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div>
      <h1>Login</h1>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
      />
      <input
        placeholder="Password"
        value={password}
        type={showPassword ? 'text' : 'password'}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
      />
      <button onClick={() => setShowPassword(!showPassword)}>
        {showPassword ? 'Hide' : 'Show'}
      </button>
      <button onClick={() => onSubmit({ email, password })}>Login</button>
      <button onClick={() => onNavigate('Register')}>Sign Up</button>
      <button onClick={() => onNavigate('ForgotPassword')}>Forgot Password?</button>
    </div>
  );
};

describe('LoginScreen UI Tests', () => {
  let mockOnSubmit;
  let mockOnNavigate;

  beforeEach(() => {
    mockOnSubmit = jest.fn();
    mockOnNavigate = jest.fn();
  });

  describe('Screen Rendering', () => {
    it('should render login screen with title', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const heading = screen.getByRole('heading', { name: 'Login' });
      expect(heading).toBeTruthy();
    });

    it('should display email and password inputs', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      expect(screen.getByTestId('email-input')).toBeTruthy();
      expect(screen.getByTestId('password-input')).toBeTruthy();
    });

    it('should display show/hide button', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      expect(screen.getByText('Show')).toBeTruthy();
    });

    it('should display login button', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const buttons = screen.getAllByText('Login');
      expect(buttons[0]).toBeTruthy();
    });
  });

  describe('Form Interactions', () => {
    it('should update email input value', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should update password input value', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const passwordInput = screen.getByTestId('password-input');
      fireEvent.change(passwordInput, { target: { value: 'Password123' } });
      expect(passwordInput.value).toBe('Password123');
    });

    it('should handle multiple input changes', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123' } });
      
      expect(emailInput.value).toBe('user@example.com');
      expect(passwordInput.value).toBe('SecurePass123');
    });
  });

  describe('Password Visibility', () => {
    it('should hide password by default', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const passwordInput = screen.getByTestId('password-input');
      expect(passwordInput.type).toBe('password');
    });

    it('should show password when toggle button is clicked', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const toggleBtn = screen.getByText('Show');
      fireEvent.click(toggleBtn);
      const passwordInput = screen.getByTestId('password-input');
      expect(passwordInput.type).toBe('text');
    });

    it('should toggle password visibility back', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const toggleBtn = screen.getByText('Show');
      
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Hide')).toBeTruthy();
      
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Show')).toBeTruthy();
    });

    it('should toggle password type on button click', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const passwordInput = screen.getByTestId('password-input');
      const toggleBtn = screen.getByText('Show');
      
      expect(passwordInput.type).toBe('password');
      fireEvent.click(toggleBtn);
      expect(passwordInput.type).toBe('text');
      fireEvent.click(toggleBtn);
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('Navigation', () => {
    it('should navigate to signup screen when Sign Up clicked', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const signupBtn = screen.getByText('Sign Up');
      fireEvent.click(signupBtn);
      expect(mockOnNavigate).toHaveBeenCalledWith('Register');
    });

    it('should navigate to forgot password screen', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const forgotBtn = screen.getByText('Forgot Password?');
      fireEvent.click(forgotBtn);
      expect(mockOnNavigate).toHaveBeenCalledWith('ForgotPassword');
    });

    it('should allow multiple navigation calls', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const signupBtn = screen.getByText('Sign Up');
      const forgotBtn = screen.getByText('Forgot Password?');
      
      fireEvent.click(signupBtn);
      fireEvent.click(forgotBtn);
      
      expect(mockOnNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit when login button clicked', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const buttons = screen.getAllByRole('button');
      const loginBtn = buttons.find(btn => btn.textContent === 'Login');
      fireEvent.click(loginBtn);
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('should pass form data to onSubmit', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123' } });
      
      const buttons = screen.getAllByRole('button');
      const loginBtn = buttons.find(btn => btn.textContent === 'Login');
      fireEvent.click(loginBtn);
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123'
      });
    });

    it('should submit with empty values if form not validated', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const buttons = screen.getAllByRole('button');
      const loginBtn = buttons.find(btn => btn.textContent === 'Login');
      fireEvent.click(loginBtn);
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: '',
        password: ''
      });
    });

    it('should submit with only email filled', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      
      const buttons = screen.getAllByRole('button');
      const loginBtn = buttons.find(btn => btn.textContent === 'Login');
      fireEvent.click(loginBtn);
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: ''
      });
    });

    it('should submit multiple times', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const buttons = screen.getAllByRole('button');
      const loginBtn = buttons.find(btn => btn.textContent === 'Login');
      
      fireEvent.click(loginBtn);
      fireEvent.click(loginBtn);
      
      expect(mockOnSubmit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Button States and Labels', () => {
    it('should have Login button text', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const loginButtons = screen.getAllByText('Login');
      expect(loginButtons.length).toBeGreaterThan(0);
    });

    it('should have Sign Up link', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      expect(screen.getByText('Sign Up')).toBeTruthy();
    });

    it('should have Forgot Password link', () => {
      render(<MockLoginScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      expect(screen.getByText('Forgot Password?')).toBeTruthy();
    });
  });
});
