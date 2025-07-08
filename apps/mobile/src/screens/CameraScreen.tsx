import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { useRecording } from '../contexts/RecordingContext';
import { inspectionDB } from '../database';
import { Photo } from '../types';

interface CameraScreenProps {
  inspectionId: string;
  onPhotoTaken?: (photo: Photo) => void;
}

/**
 * CameraScreen component for capturing photos during inspection
 * Integrates with recording context to sync photo timestamps with audio
 */
export const CameraScreen: React.FC<CameraScreenProps> = ({ 
  inspectionId, 
  onPhotoTaken 
}) => {
  const [permission, setPermission] = useState<any>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { recordingState } = useRecording();

  /**
   * Request camera permissions if not granted
   */
  const handlePermissionRequest = useCallback(async () => {
    const result = await Camera.requestCameraPermissionsAsync();
    setPermission(result);
    if (!result.granted) {
      Alert.alert(
        'Camera Permission Required',
        'This app needs camera access to take inspection photos.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  /**
   * Take a photo and save it to the database
   */
  const takePicture = useCallback(async () => {
    if (!cameraRef.current || isTakingPhoto) {
      return;
    }

    try {
      setIsTakingPhoto(true);

      // Take the photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      // Generate unique filename
      const fileName = `inspection_photo_${Date.now()}.jpg`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;

      // Move the photo to our app's document directory
      await FileSystem.moveAsync({
        from: photo.uri,
        to: newUri,
      });

      // Calculate current audio timestamp
      const currentAudioTimestamp = recordingState.duration;

      // Create photo object
      const photoData: Omit<Photo, 'id'> = {
        uri: newUri,
        timestamp: Date.now(),
        audioTimestamp: currentAudioTimestamp,
      };

      // Save to database
      const photoId = `photo_${Date.now()}`;
      await inspectionDB.addPhoto({
        id: photoId,
        inspection_id: inspectionId,
        photo_uri: newUri,
        timestamp: photoData.timestamp,
        audio_timestamp: photoData.audioTimestamp,
      });

      const savedPhoto: Photo = {
        id: photoId,
        ...photoData,
      };

      // Notify parent component
      onPhotoTaken?.(savedPhoto);

      // Show success feedback
      Alert.alert('Photo Captured', 'Photo saved successfully!', [
        { text: 'OK' }
      ]);

    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert(
        'Error',
        'Failed to capture photo. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsTakingPhoto(false);
    }
  }, [cameraRef, isTakingPhoto, recordingState.duration, inspectionId, onPhotoTaken]);

  // Request permissions on mount
  React.useEffect(() => {
    handlePermissionRequest();
  }, [handlePermissionRequest]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Camera permission is required to take inspection photos.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={handlePermissionRequest}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />
      
      {/* Recording indicator - positioned absolutely */}
      {recordingState.isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>
            Recording: {Math.floor(recordingState.duration / 1000)}s
          </Text>
        </View>
      )}

      {/* Camera controls - positioned absolutely */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.captureButton, isTakingPhoto && styles.captureButtonDisabled]}
          onPress={takePicture}
          disabled={isTakingPhoto}
        >
          {isTakingPhoto ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 40,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 30,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 