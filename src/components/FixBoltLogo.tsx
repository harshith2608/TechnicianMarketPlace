import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const FixBoltLogo = ({ width = 100, height = 100, style = {} }) => {
  return (
    <View style={[styles.container, { width, height }, style]}>
      {/* Background circle */}
      <View style={[styles.outerCircle, { width, height }]} />
      <View style={[styles.innerCircle, { width, height }]} />
      
      {/* Lightning Bolt Symbol */}
      <View style={styles.boltContainer}>
        <Text style={styles.boltEmoji}>⚡</Text>
      </View>
      
      {/* Wrench accent */}
      <View style={styles.wrenchContainer}>
        <Text style={styles.wrenchEmoji}>🔧</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  outerCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: '#0066FF',
    opacity: 0.1,
  },
  innerCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'white',
    opacity: 0.95,
  },
  boltContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  boltEmoji: {
    fontSize: 50,
  },
  wrenchContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrenchEmoji: {
    fontSize: 24,
    color: '#FF6B35',
  },
});
