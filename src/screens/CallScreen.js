import { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { endCall } from '../redux/callSlice';

export const CallScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { conversationId, callId, otherUserName, isIncoming } = route.params;
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { currentCall, incomingCall } = useSelector((state) => state.calls);
  const [callDuration, setCallDuration] = useState(0);
  const [isOnCall, setIsOnCall] = useState(!isIncoming);

  useEffect(() => {
    let callTimer;
    if (isOnCall) {
      callTimer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(callTimer);
  }, [isOnCall]);

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = () => {
    setIsOnCall(true);
    // In a real app, WebRTC would establish here
  };

  const handleRejectCall = async () => {
    try {
      await dispatch(endCall({ conversationId, callId })).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to reject call');
    }
  };

  const handleEndCall = async () => {
    try {
      await dispatch(endCall({ conversationId, callId })).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to end call');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Call Header */}
      <View style={styles.header}>
        <Text style={styles.callerName}>{otherUserName}</Text>
        {isOnCall && <Text style={styles.callStatus}>Call in progress</Text>}
        {!isOnCall && isIncoming && <Text style={styles.callStatus}>Incoming call</Text>}
      </View>

      {/* Call Duration */}
      {isOnCall && (
        <View style={styles.durationContainer}>
          <Text style={styles.duration}>{formatCallDuration(callDuration)}</Text>
        </View>
      )}

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        {!isOnCall && isIncoming ? (
          <>
            <TouchableOpacity
              style={[styles.controlButton, styles.rejectButton]}
              onPress={handleRejectCall}
            >
              <Text style={styles.controlButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.acceptButton]}
              onPress={handleAcceptCall}
            >
              <Text style={styles.controlButtonText}>Accept</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <Text style={styles.controlButtonText}>End Call</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Additional Controls */}
      {isOnCall && (
        <View style={styles.additionalControls}>
          <TouchableOpacity style={[styles.miniButton, styles.muteButton]}>
            <Text style={styles.miniButtonText}>🔇 Mute</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.miniButton, styles.speakerButton]}>
            <Text style={styles.miniButtonText}>🔊 Speaker</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  callStatus: {
    fontSize: 14,
    color: '#aaa',
  },
  durationContainer: {
    marginVertical: 20,
  },
  duration: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 30,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
    width: 80,
    height: 80,
  },
  additionalControls: {
    flexDirection: 'row',
    gap: 15,
  },
  miniButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  miniButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  muteButton: {},
  speakerButton: {},
});
