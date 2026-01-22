/**
 * Encryption Utility for Sensitive Payout Data
 * Uses TweetNaCl.js (pure JavaScript crypto library) for secure client-side encryption
 * 
 * This utility encrypts/decrypts sensitive payout details like:
 * - Bank account numbers
 * - IFSC codes
 * - UPI IDs
 * - Account holder names
 * 
 * Uses secretbox (authenticated encryption with Poly1305)
 * Nonce is randomly generated for each field and stored with the ciphertext
 */

import * as ExpoCrypto from 'expo-crypto';
import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

// Seed nacl's PRNG with crypto-grade random bytes from Expo
let prngSeeded = false;
let randomByteBuffer = new Uint8Array(0);
let randomByteIndex = 0;

// Create a custom PRNG function that pulls from our random byte buffer
const createPRNGFunction = (buffer) => {
  let index = 0;
  return (x) => {
    // Refill buffer if we need more bytes than available
    if (index + x > buffer.length) {
      index = 0; // Reset to start
    }
    const result = buffer.slice(index, index + x);
    index += x;
    return result;
  };
};

const seedPRNG = async () => {
  if (!prngSeeded) {
    try {
      // Get a large buffer of random bytes from expo-crypto (1024 bytes should be plenty)
      const randomBytes = await ExpoCrypto.getRandomBytesAsync(1024);
      randomByteBuffer = randomBytes;
      // Set nacl's PRNG to use a function that pulls from our buffer
      nacl.setPRNG(createPRNGFunction(randomByteBuffer));
      prngSeeded = true;
    } catch (error) {
      console.error('Failed to seed nacl PRNG:', error);
      throw error;
    }
  }
};

// Call seedPRNG on module load (but don't block - it's async)
seedPRNG().catch(err => {
  console.error('PRNG seeding failed at startup:', err);
});

/**
 * Get encryption key from environment or use default
 * Creates a fixed-size key from a string
 * @returns {Uint8Array} 32-byte key for nacl.secretbox
 */
const getEncryptionKey = () => {
  const keyString = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'fixbolt_secure_payout_key_2024';
  
  // Create a fixed-size key from the string (32 bytes for nacl.secretbox)
  // This is deterministic so the same key is always generated from the same input
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(keyString);
  const key = new Uint8Array(32);
  
  // XOR the key bytes to fill the 32-byte key
  for (let i = 0; i < 32; i++) {
    key[i] = keyBytes[i % keyBytes.length];
  }
  
  return key;
};

/**
 * Ensure PRNG is seeded before encryption
 * This ensures we have cryptographically secure random bytes
 */
const ensurePRNGSeeded = async () => {
  if (!prngSeeded) {
    await seedPRNG();
  }
};

/**
 * Encrypts a single sensitive field using nacl.secretbox
 * @param {string} value - The value to encrypt
 * @returns {string} Base64-encoded encrypted value with nonce
 */
const encryptField = async (value) => {
  if (!value) {
    throw new Error('Cannot encrypt empty value');
  }

  try {
    // Ensure PRNG is seeded for random number generation
    await ensurePRNGSeeded();
    
    const plaintext = naclUtil.decodeUTF8(value.toString());
    const key = getEncryptionKey();
    const nonce = nacl.randomBytes(24); // 24-byte nonce for secretbox
    
    const ciphertext = nacl.secretbox(plaintext, nonce, key);
    
    if (!ciphertext) {
      throw new Error('Encryption failed');
    }
    
    // Combine nonce + ciphertext for storage
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce, 0);
    combined.set(ciphertext, nonce.length);
    
    // Return as base64 for Firestore storage
    return naclUtil.encodeBase64(combined);
  } catch (error) {
    throw new Error(`Field encryption failed: ${error.message}`);
  }
};

/**
 * Decrypts a single encrypted field
 * @param {string} encryptedValue - Base64-encoded encrypted value with nonce
 * @returns {string} Decrypted plaintext value
 */
const decryptField = (encryptedValue) => {
  if (!encryptedValue) {
    throw new Error('Cannot decrypt empty value');
  }

  try {
    const key = getEncryptionKey();
    const combined = naclUtil.decodeBase64(encryptedValue);
    const nonceBytes = 24; // nacl.secretbox nonce is always 24 bytes
    
    // Extract nonce and ciphertext
    const nonce = combined.slice(0, nonceBytes);
    const ciphertext = combined.slice(nonceBytes);
    
    const plaintext = nacl.secretbox.open(ciphertext, nonce, key);
    
    if (!plaintext) {
      throw new Error('Decryption failed - authentication tag verification failed');
    }
    
    return naclUtil.encodeUTF8(plaintext);
  } catch (error) {
    throw new Error(`Field decryption failed: ${error.message}`);
  }
};

/**
 * Encrypts sensitive payout data using nacl.secretbox
 * @param {Object} data - The payout data to encrypt
 * @param {string} data.accountNumber - Bank account number (optional)
 * @param {string} data.ifscCode - IFSC code (optional)
 * @param {string} data.accountHolderName - Account holder name (optional)
 * @param {string} data.upiId - UPI ID (optional)
 * @returns {Promise<Object>} Encrypted data object with encrypted fields
 */
const encryptPayoutData = async (data) => {
  if (!data) {
    throw new Error('Cannot encrypt empty data');
  }

  const encrypted = {};

  // Encrypt each sensitive field (all async operations)
  const encryptionPromises = [];
  
  if (data.accountNumber) {
    encryptionPromises.push(
      encryptField(data.accountNumber).then(enc => {
        encrypted.accountNumber = enc;
      })
    );
  }

  if (data.ifscCode) {
    encryptionPromises.push(
      encryptField(data.ifscCode).then(enc => {
        encrypted.ifscCode = enc;
      })
    );
  }

  if (data.accountHolderName) {
    encryptionPromises.push(
      encryptField(data.accountHolderName).then(enc => {
        encrypted.accountHolderName = enc;
      })
    );
  }

  if (data.upiId) {
    encryptionPromises.push(
      encryptField(data.upiId).then(enc => {
        encrypted.upiId = enc;
      })
    );
  }

  // Wait for all encryptions to complete
  await Promise.all(encryptionPromises);

  // Copy non-sensitive fields as-is (only if defined to avoid Firestore errors)
  if (data.method !== undefined) encrypted.method = data.method;
  if (data.autoPayoutEnabled !== undefined) encrypted.autoPayoutEnabled = data.autoPayoutEnabled;
  if (data.updatedAt !== undefined) encrypted.updatedAt = data.updatedAt;

  return encrypted;
};

/**
 * Decrypts sensitive payout data
 * @param {Object} encryptedData - The encrypted payout data object
 * @returns {Object} Decrypted data object with readable fields
 */
const decryptPayoutData = (encryptedData) => {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty data');
  }

  const decrypted = {};

  try {
    // Decrypt each sensitive field (sync operations)
    if (encryptedData.accountNumber) {
      decrypted.accountNumber = decryptField(encryptedData.accountNumber);
    }

    if (encryptedData.ifscCode) {
      decrypted.ifscCode = decryptField(encryptedData.ifscCode);
    }

    if (encryptedData.accountHolderName) {
      decrypted.accountHolderName = decryptField(encryptedData.accountHolderName);
    }

    if (encryptedData.upiId) {
      decrypted.upiId = decryptField(encryptedData.upiId);
    }

    // Copy non-sensitive fields as-is (only if defined)
    if (encryptedData.method !== undefined) decrypted.method = encryptedData.method;
    if (encryptedData.autoPayoutEnabled !== undefined) decrypted.autoPayoutEnabled = encryptedData.autoPayoutEnabled;
    if (encryptedData.updatedAt !== undefined) decrypted.updatedAt = encryptedData.updatedAt;

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Encrypts a single sensitive string value
 * @param {string} value - The value to encrypt
 * @returns {Promise<string>} Encrypted value (base64-encoded)
 */
const encryptValue = async (value) => {
  return encryptField(value);
};

/**
 * Decrypts a single sensitive string value
 * @param {string} encryptedValue - The encrypted value
 * @returns {string} Decrypted value
 */
const decryptValue = (encryptedValue) => {
  return decryptField(encryptedValue);
};

export {
  decryptPayoutData, decryptValue, encryptPayoutData, encryptValue
};

