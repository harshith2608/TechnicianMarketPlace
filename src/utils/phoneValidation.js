import { getCountryByCode } from '../constants/countryCodes';

export const validatePhoneNumber = (phone, countryCode) => {
  if (!phone || !countryCode) {
    return { valid: false, error: 'Phone number and country code required' };
  }

  const country = getCountryByCode(countryCode);
  if (!country) {
    return { valid: false, error: 'Invalid country code' };
  }

  // Remove any non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');

  // Check pattern
  if (!country.pattern.test(cleanPhone)) {
    return {
      valid: false,
      error: `Invalid phone number format for ${country.name}`,
    };
  }

  return { valid: true };
};

export const formatPhoneNumber = (phone, countryCode) => {
  const country = getCountryByCode(countryCode);
  if (!country) return phone;

  const cleanPhone = phone.replace(/\D/g, '');
  return `${countryCode}${cleanPhone}`;
};

export const formatPhoneForDisplay = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Show only last 4 digits
  const lastFour = phoneNumber.slice(-4);
  const masked = '*'.repeat(Math.max(0, phoneNumber.length - 4));
  return `${masked}${lastFour}`;
};

export const extractPhoneNumber = (formattedPhone) => {
  // Remove country code prefix
  const cleaned = formattedPhone.replace(/^\+\d+/, '').replace(/\D/g, '');
  return cleaned;
};

// ===== TEST UTILITY FUNCTIONS (Simplified aliases for testing) =====

/**
 * Simplified phone validation - just checks format without country code requirement
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  
  // Reject if input had letters
  const hasLetters = /[a-zA-Z]/.test(phone);
  if (hasLetters) return false;
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Valid country codes (sample - 1 digit or 2-3 digits)
  // Accept if starts with common codes: 1 (USA), 91 (India), 44 (UK), etc.
  const validCountryCodes = /^(1|7|20|27|30|31|32|33|34|36|39|40|41|43|44|45|46|47|48|49|51|52|54|55|56|57|58|60|61|62|63|64|65|66|81|82|84|86|90|91|92|93|94|95|98|212|216|218|220|222|223|224|225|226|227|228|229|230|231|232|233|234|235|236|237|238|239|240|241|242|243|244|245|246|248|249|250|251|252|253|254|255|256|257|258|260|261|262|263|264|265|266|267|268|269|290|291|297|298|299)/.test(cleaned.slice(0, 3));
  
  // If has +, should have valid country code
  if (phone.startsWith('+')) {
    if (!validCountryCodes && cleaned.length > 1) return false;
  }
  
  // Accept 10-15 total digits
  return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Simplified email validation
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return false;
  
  // Check local part length (before @) - max 64 chars
  const localPart = trimmed.split('@')[0];
  if (localPart.length > 64) return false;
  
  return true;
};

/**
 * Simplified password validation
 * Requires: 9+ chars, at least one uppercase, one lowercase, one digit, one special char
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 9 || password.length > 128) return false;
  
  // Must contain uppercase, lowercase, digit, special char
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return hasUpper && hasLower && hasDigit && hasSpecial;
};

/**
 * Simplified phone formatting
 */
export const formatPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return undefined;
  
  const trimmed = phone.trim();
  const cleaned = trimmed.replace(/\D/g, '');
  
  // Reject if has letters or too short
  if (/[a-zA-Z]/.test(trimmed) || cleaned.length < 10) {
    return undefined;
  }
  
  // Remove leading 0 if present
  let finalCleaned = cleaned;
  if (finalCleaned.startsWith('0')) {
    finalCleaned = finalCleaned.slice(1);
  }
  
  // Remove trailing 91 if that's all that's left (country code at end)
  if (finalCleaned.endsWith('91') && finalCleaned.length > 11) {
    finalCleaned = finalCleaned.slice(0, -2);
  }
  
  // If we have exactly 10 digits (Indian number), add +91
  if (finalCleaned.length === 10) {
    return `+91 ${finalCleaned.slice(0, 5)} ${finalCleaned.slice(5)}`;
  }
  
  // If we have 11 or 12 digits starting with 91, format it
  if ((finalCleaned.length === 11 || finalCleaned.length === 12) && finalCleaned.startsWith('91')) {
    const withoutCountry = finalCleaned.slice(2);
    return `+91 ${withoutCountry.slice(0, 5)} ${withoutCountry.slice(5)}`;
  }
  
  // International format - just add +
  if (finalCleaned.length > 10) {
    return `+${finalCleaned}`;
  }
  
  return undefined;
};
