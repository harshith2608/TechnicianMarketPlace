/**
 * OTP Display Component
 * Shows the 4-digit OTP in large, easy-to-read format
 */

import { StyleSheet, Text, View } from 'react-native';

const OTPDisplay = ({ otp, size = 'large' }) => {
  if (!otp) {
    return null;
  }

  // Split OTP into individual digits for spacing
  const digits = otp.toString().split('');

  return (
    <View style={[
      styles.container,
      size === 'large' && styles.containerLarge,
      size === 'medium' && styles.containerMedium,
      size === 'small' && styles.containerSmall
    ]}>
      {digits.map((digit, index) => (
        <View
          key={`otp-digit-${index}`}
          style={[
            styles.digitBox,
            size === 'large' && styles.digitBoxLarge,
            size === 'medium' && styles.digitBoxMedium,
            size === 'small' && styles.digitBoxSmall
          ]}
        >
          <Text
            style={[
              styles.digit,
              size === 'large' && styles.digitLarge,
              size === 'medium' && styles.digitMedium,
              size === 'small' && styles.digitSmall
            ]}
          >
            {digit}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20
  },
  containerLarge: {
    gap: 20,
    paddingVertical: 30
  },
  containerMedium: {
    gap: 12,
    paddingVertical: 20
  },
  containerSmall: {
    gap: 8,
    paddingVertical: 10
  },
  digitBox: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    backgroundColor: '#F0F8FF'
  },
  digitBoxLarge: {
    width: 70,
    height: 70,
    borderRadius: 16
  },
  digitBoxMedium: {
    width: 50,
    height: 50,
    borderRadius: 12
  },
  digitBoxSmall: {
    width: 35,
    height: 35,
    borderRadius: 8
  },
  digit: {
    fontWeight: '700',
    color: '#007AFF'
  },
  digitLarge: {
    fontSize: 40
  },
  digitMedium: {
    fontSize: 28
  },
  digitSmall: {
    fontSize: 18
  }
});

export default OTPDisplay;
