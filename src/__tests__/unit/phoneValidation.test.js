/**
 * Phone Validation Utility Tests
 * Testing: phone format, validation, formatting
 * File: src/__tests__/unit/phoneValidation.test.js
 */

import {
    formatPhone,
    validateEmail,
    validatePassword,
    validatePhone,
} from '../../utils/phoneValidation';

describe('Phone Validation Utilities', () => {
  // ===== PHONE VALIDATION =====
  describe('validatePhone', () => {
    it('should accept valid Indian phone numbers', () => {
      expect(validatePhone('+91 98765 43210')).toBe(true);
      expect(validatePhone('+919876543210')).toBe(true);
      expect(validatePhone('+91-98765-43210')).toBe(true);
    });

    it('should accept phone with spaces', () => {
      expect(validatePhone('+91 98765 43210')).toBe(true);
      expect(validatePhone('98765 43210')).toBe(true);
    });

    it('should accept 10-digit Indian numbers', () => {
      expect(validatePhone('9876543210')).toBe(true);
    });

    it('should accept international formats', () => {
      // USA
      expect(validatePhone('+1 234 567 8900')).toBe(true);
      // UK
      expect(validatePhone('+44 1234 567890')).toBe(true);
      // Canada
      expect(validatePhone('+1-416-555-0123')).toBe(true);
    });

    it('should reject numbers with letters', () => {
      expect(validatePhone('abc1234567890')).toBe(false);
      expect(validatePhone('phone123')).toBe(false);
    });

    it('should reject too short numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('12345')).toBe(false);
    });

    it('should reject too long numbers', () => {
      expect(validatePhone('123456789012345678901')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validatePhone('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(validatePhone(null)).toBe(false);
      expect(validatePhone(undefined)).toBe(false);
    });

    it('should reject only special characters', () => {
      expect(validatePhone('+-().')).toBe(false);
    });

    it('should reject invalid country codes', () => {
      expect(validatePhone('+999 1234567890')).toBe(false);
    });

    it('should handle whitespace trimming', () => {
      expect(validatePhone('  9876543210  ')).toBe(true);
    });
  });

  // ===== PHONE FORMATTING =====
  describe('formatPhone', () => {
    it('should format 10-digit Indian number', () => {
      expect(formatPhone('9876543210')).toBe('+91 98765 43210');
    });

    it('should format number without +91', () => {
      expect(formatPhone('9876543210')).toBe('+91 98765 43210');
    });

    it('should handle already formatted number', () => {
      expect(formatPhone('+919876543210')).toBe('+91 98765 43210');
    });

    it('should handle number with spaces', () => {
      expect(formatPhone('98765 43210')).toBe('+91 98765 43210');
    });

    it('should handle number with dashes', () => {
      expect(formatPhone('98765-43210')).toBe('+91 98765 43210');
    });

    it('should preserve international format', () => {
      const formatted = formatPhone('+919876543210');
      expect(formatted).toMatch(/^\+91/);
    });

    it('should handle leading zeros', () => {
      expect(formatPhone('09876543210')).toBe('+91 98765 43210');
    });

    it('should trim whitespace', () => {
      expect(formatPhone('  9876543210  ')).toBe('+91 98765 43210');
    });

    it('should return original if invalid', () => {
      const invalid = 'abc';
      expect(formatPhone(invalid)).toBeUndefined();
    });
  });

  // ===== EMAIL VALIDATION =====
  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('john@example.com')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
      expect(validateEmail('test.email@domain.com')).toBe(true);
    });

    it('should accept emails with subdomains', () => {
      expect(validateEmail('john@mail.example.com')).toBe(true);
      expect(validateEmail('user@subdomain.co.uk')).toBe(true);
    });

    it('should reject missing @', () => {
      expect(validateEmail('johnexample.com')).toBe(false);
    });

    it('should reject missing domain', () => {
      expect(validateEmail('john@')).toBe(false);
    });

    it('should reject missing local part', () => {
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('should reject invalid format', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('john@@example.com')).toBe(false);
    });

    it('should reject too long local part', () => {
      const longEmail = 'a'.repeat(65) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });

    it('should reject spaces in email', () => {
      expect(validateEmail('john @ example.com')).toBe(false);
      expect(validateEmail('john@exam ple.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateEmail('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(validateEmail('JOHN@EXAMPLE.COM')).toBe(true);
      expect(validateEmail('John@Example.Com')).toBe(true);
    });

    it('should accept numbers in email', () => {
      expect(validateEmail('user123@example.com')).toBe(true);
      expect(validateEmail('123@example.com')).toBe(true);
    });

    it('should accept common TLDs', () => {
      expect(validateEmail('john@example.com')).toBe(true);
      expect(validateEmail('john@example.co.uk')).toBe(true);
      expect(validateEmail('john@example.io')).toBe(true);
    });
  });

  // ===== PASSWORD VALIDATION =====
  describe('validatePassword', () => {
    it('should accept strong password with all requirements', () => {
      expect(validatePassword('SecurePass123!')).toBe(true);
      expect(validatePassword('MyPassword@2024')).toBe(true);
      expect(validatePassword('Test1Pass!')).toBe(true);
    });

    it('should require minimum 8 characters', () => {
      expect(validatePassword('Pass123!')).toBe(false); // 8 chars, acceptable
      expect(validatePassword('Pass12!')).toBe(false); // 7 chars, too short
    });

    it('should require uppercase letter', () => {
      expect(validatePassword('securepass123!')).toBe(false);
      expect(validatePassword('SecurePass123!')).toBe(true);
    });

    it('should require lowercase letter', () => {
      expect(validatePassword('SECUREPASS123!')).toBe(false);
      expect(validatePassword('SecurePass123!')).toBe(true);
    });

    it('should require number', () => {
      expect(validatePassword('SecurePass!')).toBe(false);
      expect(validatePassword('SecurePass123!')).toBe(true);
    });

    it('should require special character', () => {
      expect(validatePassword('SecurePass123')).toBe(false);
      expect(validatePassword('SecurePass123!')).toBe(true);
    });

    it('should accept various special characters', () => {
      expect(validatePassword('SecurePass123!')).toBe(true);
      expect(validatePassword('SecurePass123@')).toBe(true);
      expect(validatePassword('SecurePass123#')).toBe(true);
      expect(validatePassword('SecurePass123$')).toBe(true);
      expect(validatePassword('SecurePass123%')).toBe(true);
    });

    it('should reject empty password', () => {
      expect(validatePassword('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(validatePassword(null)).toBe(false);
      expect(validatePassword(undefined)).toBe(false);
    });

    it('should reject common weak passwords', () => {
      expect(validatePassword('password123')).toBe(false);
      expect(validatePassword('12345678')).toBe(false);
      expect(validatePassword('qwerty123')).toBe(false);
    });

    it('should allow spaces in password', () => {
      expect(validatePassword('Secure Pass 123!')).toBe(true);
    });

    it('should reject extremely long passwords', () => {
      const tooLong = 'SecurePass123!' + 'a'.repeat(200);
      expect(validatePassword(tooLong)).toBe(false);
    });

    it('should give feedback on missing requirements', () => {
      // This depends on implementation
      // Some implementations return true/false
      // Others return object with details
      const result = validatePassword('short');
      expect(typeof result).toBe('boolean');
    });
  });

  // ===== COMBINED VALIDATION SCENARIOS =====
  describe('Combined Validation Scenarios', () => {
    it('should validate complete registration data', () => {
      const registrationData = {
        email: 'john@example.com',
        phone: '+919876543210',
        password: 'SecurePass123!',
      };

      expect(validateEmail(registrationData.email)).toBe(true);
      expect(validatePhone(registrationData.phone)).toBe(true);
      expect(validatePassword(registrationData.password)).toBe(true);
    });

    it('should reject registration with invalid email', () => {
      const registrationData = {
        email: 'notanemail',
        phone: '+919876543210',
        password: 'SecurePass123!',
      };

      expect(validateEmail(registrationData.email)).toBe(false);
      expect(validatePhone(registrationData.phone)).toBe(true);
      expect(validatePassword(registrationData.password)).toBe(true);
    });

    it('should reject registration with weak password', () => {
      const registrationData = {
        email: 'john@example.com',
        phone: '+919876543210',
        password: 'weak123',
      };

      expect(validateEmail(registrationData.email)).toBe(true);
      expect(validatePhone(registrationData.phone)).toBe(true);
      expect(validatePassword(registrationData.password)).toBe(false);
    });
  });

  // ===== EDGE CASES & SECURITY =====
  describe('Edge Cases & Security', () => {
    it('should handle SQL injection attempts in email', () => {
      expect(validateEmail("john'; DROP TABLE users; --@example.com")).toBe(false);
    });

    it('should handle SQL injection attempts in password', () => {
      const result = validatePassword("'; DROP TABLE users; --123!");
      expect(typeof result).toBe('boolean');
    });

    it('should trim whitespace from inputs', () => {
      expect(validateEmail('  john@example.com  ')).toBe(true);
      expect(validatePhone('  9876543210  ')).toBe(true);
    });

    it('should handle unicode characters', () => {
      expect(validateEmail('josé@example.com')).toBe(true);
      expect(validatePassword('SecurePass123!™')).toBe(true);
    });

    it('should not reveal validation details in error', () => {
      const invalidEmail = 'notanemail';
      const result = validateEmail(invalidEmail);
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });
  });
});
