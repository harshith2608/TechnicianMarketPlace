/**
 * Encryption Utility for Sensitive Payout Data
 * Uses AES encryption with crypto-js for secure storage
 * 
 * This utility encrypts/decrypts sensitive payout details like:
 * - Bank account numbers
 * - IFSC codes
 * - UPI IDs
 * - Account holder names
 */

let CryptoJS;
let cryptoAvailable = false;

try {
  CryptoJS = require('crypto-js');
  cryptoAvailable = true;
} catch (e) {
  console.warn('⚠️ crypto-js not available:', e.message);
  console.warn('💡 Will store payout data without encryption (add to .env to enable)');
}

// Encryption key - In production, this should be securely managed
// For now, using a fixed key derived from app credentials
const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'technicianmarketplace_secure_payout_key_2024';

/**
 * Encrypts sensitive payout data using AES encryption
 * Falls back to storing raw data if crypto is not available
 * @param {Object} data - The payout data to encrypt
 * @returns {Object} Encrypted data object with encrypted fields
 */
const encryptPayoutData = (data) => {
  if (!data) {
    throw new Error('Cannot encrypt empty data');
  }

  // If crypto is not available, return data with _encrypted flag set to false
  if (!cryptoAvailable) {
    console.log('⚠️ Storing payout data without encryption (crypto not available)');
    return {
      ...data,
      _encrypted: false,
      _timestamp: new Date().toISOString(),
    };
  }

  try {
    const encrypted = {};

    // Encrypt each sensitive field
    if (data.accountNumber) {
      encrypted.accountNumber = CryptoJS.AES.encrypt(
        data.accountNumber.toString(),
        ENCRYPTION_KEY
      ).toString();
    }

    if (data.ifscCode) {
      encrypted.ifscCode = CryptoJS.AES.encrypt(
        data.ifscCode.toString(),
        ENCRYPTION_KEY
      ).toString();
    }

    if (data.accountHolderName) {
      encrypted.accountHolderName = CryptoJS.AES.encrypt(
        data.accountHolderName.toString(),
        ENCRYPTION_KEY
      ).toString();
    }

    if (data.upiId) {
      encrypted.upiId = CryptoJS.AES.encrypt(
        data.upiId.toString(),
        ENCRYPTION_KEY
      ).toString();
    }

    // Copy non-sensitive fields
    encrypted.method = data.method;
    encrypted.autoPayoutEnabled = data.autoPayoutEnabled;
    encrypted.updatedAt = data.updatedAt;
    encrypted._encrypted = true;

    return encrypted;
  } catch (error) {
    console.error('❌ Encryption failed:', error.message);
    console.log('⚠️ Falling back to unencrypted storage');
    return {
      ...data,
      _encrypted: false,
      _timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Decrypts sensitive payout data using AES decryption
 * Handles both encrypted and unencrypted data (fallback)
 * @param {Object} encryptedData - The encrypted payout data object
 * @returns {Object} Decrypted data object with readable fields
 */
const decryptPayoutData = (encryptedData) => {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty data');
  }

  // If data is not encrypted (fallback mode), return as-is
  if (encryptedData._encrypted === false) {
    console.log('⚠️ Data is not encrypted (fallback mode)');
    return {
      accountNumber: encryptedData.accountNumber,
      ifscCode: encryptedData.ifscCode,
      accountHolderName: encryptedData.accountHolderName,
      upiId: encryptedData.upiId,
      method: encryptedData.method,
    };
  }

  // If crypto is not available but data looks encrypted, return empty
  if (!cryptoAvailable) {
    console.warn('⚠️ Cannot decrypt: crypto-js not available');
    return {
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      upiId: '',
      method: encryptedData.method,
    };
  }

  const decrypted = {};

  try {
    // Decrypt each sensitive field
    if (encryptedData.accountNumber) {
      const bytes = CryptoJS.AES.decrypt(
        encryptedData.accountNumber,
        ENCRYPTION_KEY
      );
      decrypted.accountNumber = bytes.toString(CryptoJS.enc.Utf8);
    }

    if (encryptedData.ifscCode) {
      const bytes = CryptoJS.AES.decrypt(
        encryptedData.ifscCode,
        ENCRYPTION_KEY
      );
      decrypted.ifscCode = bytes.toString(CryptoJS.enc.Utf8);
    }

    if (encryptedData.accountHolderName) {
      const bytes = CryptoJS.AES.decrypt(
        encryptedData.accountHolderName,
        ENCRYPTION_KEY
      );
      decrypted.accountHolderName = bytes.toString(CryptoJS.enc.Utf8);
    }

    if (encryptedData.upiId) {
      const bytes = CryptoJS.AES.decrypt(
        encryptedData.upiId,
        ENCRYPTION_KEY
      );
      decrypted.upiId = bytes.toString(CryptoJS.enc.Utf8);
    }

    // Copy non-sensitive fields
    decrypted.method = encryptedData.method;
    decrypted.autoPayoutEnabled = encryptedData.autoPayoutEnabled;
    decrypted.updatedAt = encryptedData.updatedAt;

    return decrypted;
  } catch (error) {
    console.error('❌ Decryption failed:', error.message);
    console.log('⚠️ Returning empty fields');
    // Return empty decrypted data on error
    return {
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      upiId: '',
      method: encryptedData.method,
    };
  }
};


/**
 * Encrypts a single sensitive string value
 * @param {string} value - The value to encrypt
 * @returns {string} Encrypted value
 */
const encryptValue = (value) => {
  if (!value) {
    throw new Error('Cannot encrypt empty value');
  }

  return CryptoJS.AES.encrypt(
    value.toString(),
    ENCRYPTION_KEY
  ).toString();
};

/**
 * Decrypts a single sensitive string value
 * @param {string} encryptedValue - The encrypted value
 * @returns {string} Decrypted value
 */
const decryptValue = (encryptedValue) => {
  if (!encryptedValue) {
    throw new Error('Cannot decrypt empty value');
  }

  try {
    const bytes = CryptoJS.AES.decrypt(
      encryptedValue,
      ENCRYPTION_KEY
    );
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    throw new Error(`Decryption of value failed: ${error.message}`);
  }
};

module.exports = {
  encryptPayoutData,
  decryptPayoutData,
  encryptValue,
  decryptValue,
};