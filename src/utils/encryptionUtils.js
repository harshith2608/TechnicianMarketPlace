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
try {
  CryptoJS = require('crypto-js');
} catch (e) {
  // Fallback for environments where crypto-js might not be available
  console.warn('crypto-js not available, some operations may fail');
}

// Encryption key - In production, this should be securely managed
// For now, using a fixed key derived from app credentials
const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'technicianmarketplace_secure_payout_key_2024';

/**
 * Encrypts sensitive payout data using AES encryption
 * @param {Object} data - The payout data to encrypt
 * @param {string} data.accountNumber - Bank account number (optional)
 * @param {string} data.ifscCode - IFSC code (optional)
 * @param {string} data.accountHolderName - Account holder name (optional)
 * @param {string} data.upiId - UPI ID (optional)
 * @returns {Object} Encrypted data object with encrypted fields
 */
const encryptPayoutData = (data) => {
  if (!data) {
    throw new Error('Cannot encrypt empty data');
  }

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

  return encrypted;
};

/**
 * Decrypts sensitive payout data using AES decryption
 * @param {Object} encryptedData - The encrypted payout data object
 * @returns {Object} Decrypted data object with readable fields
 */
const decryptPayoutData = (encryptedData) => {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty data');
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
    throw new Error(`Decryption failed: ${error.message}`);
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
