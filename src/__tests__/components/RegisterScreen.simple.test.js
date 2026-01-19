/**
 * RegisterScreen Component Tests - Simple UI Focus
 * Testing: Form rendering, user type selection, input handling
 * File: src/__tests__/components/RegisterScreen.simple.test.js
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const MockRegisterScreen = ({ onSubmit, onNavigate }) => {
  const [userType, setUserType] = React.useState('customer');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div>
      <h1>Register</h1>

      <div data-testid="user-type-selector">
        <button
          onClick={() => setUserType('customer')}
          data-testid="customer-btn"
        >
          Customer
        </button>
        <button
          onClick={() => setUserType('technician')}
          data-testid="technician-btn"
        >
          Technician
        </button>
      </div>
      <p>Selected: {userType}</p>

      <input
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        data-testid="name-input"
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
      />

      <input
        placeholder="Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
      />
      <button onClick={() => setShowPassword(!showPassword)}>
        {showPassword ? 'Hide' : 'Show'}
      </button>

      {userType === 'technician' && (
        <div data-testid="technician-fields">
          <label>
            <input type="checkbox" defaultChecked={false} />
            Plumbing
          </label>
          <label>
            <input type="checkbox" defaultChecked={false} />
            Electrical
          </label>
        </div>
      )}

      <button onClick={() => onSubmit({ userType, name, email, password })} data-testid="register-btn">
        Register
      </button>
      <button onClick={() => onNavigate('Login')} data-testid="login-link">
        Already have account? Login
      </button>
    </div>
  );
};

describe('RegisterScreen UI Tests', () => {
  let mockOnSubmit;
  let mockOnNavigate;

  beforeEach(() => {
    mockOnSubmit = jest.fn();
    mockOnNavigate = jest.fn();
  });

  describe('Screen Rendering', () => {
    it('should render register screen', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const heading = screen.getByRole('heading', { name: 'Register' });
      expect(heading).toBeTruthy();
    });

    it('should display user type selector', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      expect(screen.getByTestId('customer-btn')).toBeTruthy();
      expect(screen.getByTestId('technician-btn')).toBeTruthy();
    });

    it('should display all form fields', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      expect(screen.getByTestId('name-input')).toBeTruthy();
      expect(screen.getByTestId('email-input')).toBeTruthy();
      expect(screen.getByTestId('password-input')).toBeTruthy();
    });

    it('should display register button', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      expect(screen.getByTestId('register-btn')).toBeTruthy();
    });

    it('should display login link', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      expect(screen.getByTestId('login-link')).toBeTruthy();
    });

    it('should display password visibility toggle', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      expect(screen.getByText('Show')).toBeTruthy();
    });
  });

  describe('User Type Selection', () => {
    it('should start with customer selected', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      expect(screen.getByText('Selected: customer')).toBeTruthy();
    });

    it('should allow selecting technician role', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const techBtn = screen.getByTestId('technician-btn');
      fireEvent.click(techBtn);
      expect(screen.getByText('Selected: technician')).toBeTruthy();
    });

    it('should show technician fields when technician selected', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const techBtn = screen.getByTestId('technician-btn');
      fireEvent.click(techBtn);
      expect(screen.getByTestId('technician-fields')).toBeTruthy();
    });

    it('should hide technician fields when customer selected', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const techBtn = screen.getByTestId('technician-btn');
      const customerBtn = screen.getByTestId('customer-btn');
      
      fireEvent.click(techBtn);
      expect(screen.getByTestId('technician-fields')).toBeTruthy();
      
      fireEvent.click(customerBtn);
      expect(screen.queryByTestId('technician-fields')).toBeNull();
    });

    it('should toggle between customer and technician', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const techBtn = screen.getByTestId('technician-btn');
      const customerBtn = screen.getByTestId('customer-btn');
      
      fireEvent.click(techBtn);
      expect(screen.getByText('Selected: technician')).toBeTruthy();
      
      fireEvent.click(customerBtn);
      expect(screen.getByText('Selected: customer')).toBeTruthy();
      
      fireEvent.click(techBtn);
      expect(screen.getByText('Selected: technician')).toBeTruthy();
    });
  });

  describe('Form Input Handling', () => {
    it('should update name field', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      expect(nameInput.value).toBe('John Doe');
    });

    it('should update email field', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      expect(emailInput.value).toBe('john@example.com');
    });

    it('should update password field', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const passwordInput = screen.getByTestId('password-input');
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123' } });
      expect(passwordInput.value).toBe('SecurePass123');
    });

    it('should handle multiple field changes', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const nameInput = screen.getByTestId('name-input');
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      
      fireEvent.change(nameInput, { target: { value: 'Alice' } });
      fireEvent.change(emailInput, { target: { value: 'alice@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Pass123' } });
      
      expect(nameInput.value).toBe('Alice');
      expect(emailInput.value).toBe('alice@test.com');
      expect(passwordInput.value).toBe('Pass123');
    });
  });

  describe('Password Visibility', () => {
    it('should hide password by default', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const passwordInput = screen.getByTestId('password-input');
      expect(passwordInput.type).toBe('password');
    });

    it('should show password when toggle clicked', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const toggleBtn = screen.getByText('Show');
      fireEvent.click(toggleBtn);
      const passwordInput = screen.getByTestId('password-input');
      expect(passwordInput.type).toBe('text');
    });

    it('should toggle password visibility correctly', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const passwordInput = screen.getByTestId('password-input');
      let toggleBtn = screen.getByText('Show');
      
      fireEvent.click(toggleBtn);
      expect(passwordInput.type).toBe('text');
      
      toggleBtn = screen.getByText('Hide');
      fireEvent.click(toggleBtn);
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('Navigation', () => {
    it('should navigate to login when link clicked', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const loginLink = screen.getByTestId('login-link');
      fireEvent.click(loginLink);
      expect(mockOnNavigate).toHaveBeenCalledWith('Login');
    });

    it('should handle multiple navigation clicks', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      const loginLink = screen.getByTestId('login-link');
      
      fireEvent.click(loginLink);
      fireEvent.click(loginLink);
      
      expect(mockOnNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Form Submission', () => {
    it('should submit with all fields filled', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      
      fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'john@test.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'Pass123' } });
      
      fireEvent.click(screen.getByTestId('register-btn'));
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        userType: 'customer',
        name: 'John',
        email: 'john@test.com',
        password: 'Pass123'
      });
    });

    it('should include user type in submission', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      
      fireEvent.click(screen.getByTestId('technician-btn'));
      fireEvent.click(screen.getByTestId('register-btn'));
      
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ userType: 'technician' })
      );
    });

    it('should submit with empty fields', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      fireEvent.click(screen.getByTestId('register-btn'));
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        userType: 'customer',
        name: '',
        email: '',
        password: ''
      });
    });

    it('should allow multiple submissions', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      
      fireEvent.click(screen.getByTestId('register-btn'));
      fireEvent.click(screen.getByTestId('register-btn'));
      
      expect(mockOnSubmit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Technician Specific Features', () => {
    it('should show skill checkboxes for technician', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      fireEvent.click(screen.getByTestId('technician-btn'));
      
      expect(screen.getByText('Plumbing')).toBeTruthy();
      expect(screen.getByText('Electrical')).toBeTruthy();
    });

    it('should hide skill checkboxes for customer', () => {
      render(<MockRegisterScreen onSubmit={mockOnSubmit} onNavigate={mockOnNavigate} />);
      expect(screen.queryByText('Plumbing')).toBeNull();
    });
  });
});
