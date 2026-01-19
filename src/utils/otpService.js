/**
 * OTP Service - Generates and validates 4-digit OTPs
 * Used for service completion verification and payment release
 */

/**
 * Generate a random 4-digit OTP
 * @returns {string} 4-digit OTP (e.g., "7342")
 */
export const generateOTP = () => {
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return randomNumber.toString();
};

/**
 * Validate that a value is a valid 4-digit OTP
 * @param {string} otp - OTP to validate
 * @returns {boolean} True if valid 4-digit OTP
 */
export const isValidOTP = (otp) => {
  if (!otp || typeof otp !== 'string') return false;
  return /^\d{4}$/.test(otp);
};

/**
 * Compare user-entered OTP with stored OTP
 * @param {string} enteredOTP - OTP entered by user
 * @param {string} storedOTP - OTP stored in database
 * @returns {boolean} True if OTPs match
 */
export const validateOTP = (enteredOTP, storedOTP) => {
  if (!enteredOTP || !storedOTP) return false;
  return enteredOTP === storedOTP;
};

/**
 * Check if OTP has expired
 * @param {number} createdAtTimestamp - Firestore timestamp when OTP was created
 * @param {number} minutesAllowed - Minutes OTP is valid for (default 5)
 * @returns {boolean} True if OTP has expired
 */
export const isOTPExpired = (createdAtTimestamp, minutesAllowed = 5) => {
  if (!createdAtTimestamp) return true;
  
  const now = Date.now();
  const expiryTime = createdAtTimestamp + (minutesAllowed * 60 * 1000);
  
  return now > expiryTime;
};

/**
 * Calculate remaining time for OTP
 * @param {number} createdAtTimestamp - Firestore timestamp when OTP was created
 * @param {number} minutesAllowed - Minutes OTP is valid for (default 5)
 * @returns {object} Object with minutes and seconds remaining
 */
export const getOTPRemainingTime = (createdAtTimestamp, minutesAllowed = 5) => {
  if (!createdAtTimestamp) {
    return { minutes: 0, seconds: 0, totalSeconds: 0 };
  }
  
  const now = Date.now();
  const expiryTime = createdAtTimestamp + (minutesAllowed * 60 * 1000);
  const remainingMs = expiryTime - now;
  
  if (remainingMs <= 0) {
    return { minutes: 0, seconds: 0, totalSeconds: 0 };
  }
  
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return { minutes, seconds, totalSeconds };
};

/**
 * Format OTP remaining time for display
 * @param {number} createdAtTimestamp - Firestore timestamp
 * @returns {string} Formatted time (e.g., "04:32")
 */
export const formatOTPTimeout = (createdAtTimestamp) => {
  const { minutes, seconds } = getOTPRemainingTime(createdAtTimestamp);
  
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  
  return `${formattedMinutes}:${formattedSeconds}`;
};

/**
 * Check if OTP verification should be allowed
 * @param {object} completion - Service completion document from Firestore
 * @returns {object} Object with isAllowed boolean and reason string
 */
export const canVerifyOTP = (completion) => {
  if (!completion) {
    return { isAllowed: false, reason: 'Service completion not found' };
  }
  
  if (completion.status !== 'pending_otp') {
    return { isAllowed: false, reason: 'Service already verified' };
  }
  
  if (isOTPExpired(completion.otpCreatedAt)) {
    return { isAllowed: false, reason: 'OTP has expired' };
  }
  
  return { isAllowed: true, reason: 'OTP can be verified' };
};

/**
 * Max attempts for OTP entry
 */
export const MAX_OTP_ATTEMPTS = 3;

/**
 * Rate limit: minimum milliseconds between OTP attempts
 */
export const OTP_ATTEMPT_RATE_LIMIT_MS = 2000;

/**
 * OTP validity duration in minutes
 */
export const OTP_VALIDITY_MINUTES = 5;
