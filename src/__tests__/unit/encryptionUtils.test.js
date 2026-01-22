/**
 * Tests for Encryption Utility
 * Comprehensive testing of encryption and decryption functionality
 */

import {
    decryptPayoutData,
    decryptValue,
    encryptPayoutData,
    encryptValue,
} from '../../utils/encryptionUtils';

describe('Encryption Utility Tests', () => {
  describe('encryptPayoutData()', () => {
    test('should encrypt all payout data fields correctly', () => {
      const testData = {
        accountNumber: '123456789012345',
        ifscCode: 'HDFC0000001',
        accountHolderName: 'John Doe',
        method: 'bank',
        autoPayoutEnabled: true,
        updatedAt: '2024-01-20T10:00:00Z',
      };

      const encrypted = encryptPayoutData(testData);

      // Verify structure
      expect(encrypted).toHaveProperty('accountNumber');
      expect(encrypted).toHaveProperty('ifscCode');
      expect(encrypted).toHaveProperty('accountHolderName');
      expect(encrypted).toHaveProperty('method');
      expect(encrypted).toHaveProperty('autoPayoutEnabled');

      // Verify non-sensitive fields are not encrypted
      expect(encrypted.method).toBe('bank');
      expect(encrypted.autoPayoutEnabled).toBe(true);

      // Verify encrypted fields are strings (encrypted format)
      expect(typeof encrypted.accountNumber).toBe('string');
      expect(typeof encrypted.ifscCode).toBe('string');
      expect(typeof encrypted.accountHolderName).toBe('string');

      // Verify encrypted data is different from original
      expect(encrypted.accountNumber).not.toBe(testData.accountNumber);
      expect(encrypted.ifscCode).not.toBe(testData.ifscCode);
    });

    test('should handle UPI data encryption', () => {
      const testData = {
        upiId: 'john@okhdfcbank',
        method: 'upi',
        autoPayoutEnabled: false,
        updatedAt: '2024-01-20T10:00:00Z',
      };

      const encrypted = encryptPayoutData(testData);

      expect(encrypted).toHaveProperty('upiId');
      expect(encrypted.method).toBe('upi');
      expect(encrypted.autoPayoutEnabled).toBe(false);
      expect(encrypted.upiId).not.toBe(testData.upiId);
    });

    test('should throw error for empty data', () => {
      expect(() => encryptPayoutData(null)).toThrow('Cannot encrypt empty data');
      expect(() => encryptPayoutData(undefined)).toThrow('Cannot encrypt empty data');
    });

    test('should handle optional fields gracefully', () => {
      const testData = {
        accountNumber: '123456789012345',
        method: 'bank',
      };

      const encrypted = encryptPayoutData(testData);

      expect(encrypted).toHaveProperty('accountNumber');
      expect(encrypted.method).toBe('bank');
      expect(encrypted.ifscCode).toBeUndefined();
      expect(encrypted.accountHolderName).toBeUndefined();
    });
  });

  describe('decryptPayoutData()', () => {
    test('should decrypt all fields correctly', () => {
      const originalData = {
        accountNumber: '123456789012345',
        ifscCode: 'HDFC0000001',
        accountHolderName: 'John Doe',
        method: 'bank',
        autoPayoutEnabled: true,
        updatedAt: '2024-01-20T10:00:00Z',
      };

      // Encrypt
      const encrypted = encryptPayoutData(originalData);

      // Decrypt
      const decrypted = decryptPayoutData(encrypted);

      // Verify all fields match original
      expect(decrypted.accountNumber).toBe(originalData.accountNumber);
      expect(decrypted.ifscCode).toBe(originalData.ifscCode);
      expect(decrypted.accountHolderName).toBe(originalData.accountHolderName);
      expect(decrypted.method).toBe(originalData.method);
      expect(decrypted.autoPayoutEnabled).toBe(originalData.autoPayoutEnabled);
      expect(decrypted.updatedAt).toBe(originalData.updatedAt);
    });

    test('should handle UPI data decryption', () => {
      const originalData = {
        upiId: 'john@okhdfcbank',
        method: 'upi',
        autoPayoutEnabled: false,
      };

      const encrypted = encryptPayoutData(originalData);
      const decrypted = decryptPayoutData(encrypted);

      expect(decrypted.upiId).toBe(originalData.upiId);
      expect(decrypted.method).toBe(originalData.method);
      expect(decrypted.autoPayoutEnabled).toBe(originalData.autoPayoutEnabled);
    });

    test('should throw error for corrupted encrypted data', () => {
      const corruptedData = {
        accountNumber: 'corrupted_data_not_valid_encryption',
        ifscCode: 'HDFC0000001',
      };

      expect(() => decryptPayoutData(corruptedData)).toThrow();
    });

    test('should throw error for empty data', () => {
      expect(() => decryptPayoutData(null)).toThrow('Cannot decrypt empty data');
      expect(() => decryptPayoutData(undefined)).toThrow('Cannot decrypt empty data');
    });
  });

  describe('encryptValue()', () => {
    test('should encrypt a single string value', () => {
      const value = '123456789012345';
      const encrypted = encryptValue(value);

      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(value);
      expect(encrypted.length).toBeGreaterThan(value.length);
    });

    test('should encrypt special characters', () => {
      const value = 'test@bank-with_special.chars!';
      const encrypted = encryptValue(value);

      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(value);
    });

    test('should encrypt numeric string', () => {
      const value = '123456789';
      const encrypted = encryptValue(value);

      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(value);
    });

    test('should throw error for empty value', () => {
      expect(() => encryptValue(null)).toThrow('Cannot encrypt empty value');
      expect(() => encryptValue(undefined)).toThrow('Cannot encrypt empty value');
      expect(() => encryptValue('')).toThrow('Cannot encrypt empty value');
    });
  });

  describe('decryptValue()', () => {
    test('should decrypt a single string value', () => {
      const originalValue = '123456789012345';
      const encrypted = encryptValue(originalValue);
      const decrypted = decryptValue(encrypted);

      expect(decrypted).toBe(originalValue);
    });

    test('should decrypt special characters', () => {
      const originalValue = 'test@bank-with_special.chars!';
      const encrypted = encryptValue(originalValue);
      const decrypted = decryptValue(encrypted);

      expect(decrypted).toBe(originalValue);
    });

    test('should decrypt numeric string', () => {
      const originalValue = '123456789';
      const encrypted = encryptValue(originalValue);
      const decrypted = decryptValue(encrypted);

      expect(decrypted).toBe(originalValue);
    });

    test('should throw error for corrupted encrypted value', () => {
      const corruptedValue = 'not_a_valid_encryption_string';

      expect(() => decryptValue(corruptedValue)).toThrow();
    });

    test('should throw error for empty value', () => {
      expect(() => decryptValue(null)).toThrow('Cannot decrypt empty value');
      expect(() => decryptValue(undefined)).toThrow('Cannot decrypt empty value');
      expect(() => decryptValue('')).toThrow('Cannot decrypt empty value');
    });
  });

  describe('Round-trip encryption/decryption', () => {
    test('should correctly round-trip bank account data', () => {
      const original = {
        accountNumber: '918765432109876',
        ifscCode: 'AXIS0000012',
        accountHolderName: 'Priya Sharma',
        method: 'bank',
        autoPayoutEnabled: true,
        updatedAt: '2024-01-20T15:30:00Z',
      };

      const encrypted = encryptPayoutData(original);
      const decrypted = decryptPayoutData(encrypted);

      // Deep equality check
      expect(decrypted).toEqual(original);
    });

    test('should correctly round-trip UPI data', () => {
      const original = {
        upiId: 'priya.sharma@oksbi',
        method: 'upi',
        autoPayoutEnabled: true,
        updatedAt: '2024-01-20T15:30:00Z',
      };

      const encrypted = encryptPayoutData(original);
      const decrypted = decryptPayoutData(encrypted);

      expect(decrypted).toEqual(original);
    });

    test('should maintain data integrity through multiple iterations', () => {
      const original = {
        accountNumber: '9876543210123456',
        ifscCode: 'HDFC0000123',
        accountHolderName: 'Test User',
        method: 'bank',
        autoPayoutEnabled: false,
      };

      let data = original;

      // Encrypt and decrypt 3 times
      for (let i = 0; i < 3; i++) {
        const encrypted = encryptPayoutData(data);
        data = decryptPayoutData(encrypted);
      }

      expect(data).toEqual(original);
    });
  });

  describe('Edge cases', () => {
    test('should handle very long account numbers', () => {
      const longNumber = '1'.repeat(100);
      const encrypted = encryptValue(longNumber);
      const decrypted = decryptValue(encrypted);

      expect(decrypted).toBe(longNumber);
    });

    test('should handle Unicode characters', () => {
      const unicodeValue = 'John Döe 张三 مجموعة';
      const encrypted = encryptValue(unicodeValue);
      const decrypted = decryptValue(encrypted);

      expect(decrypted).toBe(unicodeValue);
    });

    test('should handle whitespace in values', () => {
      const valueWithSpace = '  John Doe  ';
      const encrypted = encryptValue(valueWithSpace);
      const decrypted = decryptValue(encrypted);

      expect(decrypted).toBe(valueWithSpace);
    });

    test('should handle empty optional fields in full data object', () => {
      const data = {
        accountNumber: '123456789012345',
        ifscCode: '',
        accountHolderName: 'John Doe',
        method: 'bank',
      };

      const encrypted = encryptPayoutData(data);
      const decrypted = decryptPayoutData(encrypted);

      expect(decrypted.ifscCode).toBe('');
    });
  });
});
