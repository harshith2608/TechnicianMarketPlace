/**
 * OTP Input Component
 * 4-digit input field with auto-focus and auto-submit
 */

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

const OTPInput = ({ value, onChangeText = () => {}, onComplete, editable = true, maxAttempts = 3 }) => {
  const inputRefs = useRef([]);
  const [displayValue, setDisplayValue] = useState(['', '', '', '']);

  // Update display value when external value changes
  useEffect(() => {
    if (value) {
      const digits = value.toString().split('').slice(0, 4);
      setDisplayValue([
        digits[0] || '',
        digits[1] || '',
        digits[2] || '',
        digits[3] || ''
      ]);
    }
  }, [value]);

  const handleDigitChange = (text, index) => {
    // Only allow digits
    if (!/^\d*$/.test(text)) {
      return;
    }

    // Take only the last character if multiple were pasted
    const digit = text.slice(-1);

    // Update display value
    const newDisplay = [...displayValue];
    newDisplay[index] = digit;
    setDisplayValue(newDisplay);

    // Update parent with full OTP
    const fullOTP = newDisplay.join('');
    onChangeText(fullOTP);

    // Auto-focus next input
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits are entered
    if (digit && index === 3 && fullOTP.length === 4) {
      if (onComplete) {
        onComplete(fullOTP);
      }
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace') {
      if (!displayValue[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newDisplay = [...displayValue];
        newDisplay[index] = '';
        setDisplayValue(newDisplay);
        onChangeText(newDisplay.join(''));
      }
    }
  };

  const handlePaste = (text) => {
    // Handle pasted OTP
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length === 4) {
      const newDisplay = digits.split('');
      setDisplayValue(newDisplay);
      onChangeText(digits);
      if (onComplete) {
        onComplete(digits);
      }
    }
  };

  return (
    <View style={styles.container}>
      {[0, 1, 2, 3].map((index) => (
        <TextInput
          key={`otp-input-${index}`}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={styles.input}
          value={displayValue[index]}
          onChangeText={(text) => handleDigitChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="numeric"
          maxLength={1}
          editable={editable}
          secureTextEntry={false}
          placeholder="-"
          placeholderTextColor="#ccc"
          selectionColor="#007AFF"
          onFocus={(e) => {
            // Select all text on focus
            e.nativeEvent.target?.setSelection && 
            e.nativeEvent.target.setSelection(0, 1);
          }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20
  },
  input: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    backgroundColor: '#FFF',
    paddingHorizontal: 0
  }
});

export default OTPInput;
