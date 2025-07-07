import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { RecordingProvider, useRecording } from './src/contexts/RecordingContext';
import { CameraScreen } from './src/screens/CameraScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { inspectionDB } from './src/database';
import { Photo, Inspection } from './src/types';

type Screen = 'home' | 'camera' | 'review';

/**
 * Main inspection app component
 * Manages the core inspection workflow: recording + photo capture + review
 */
const InspectionApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<Photo[]>([]);
  const { recordingState, startRecording, stopRecording, resetRecording } = useRecording();

  /**
   * Create a new inspection
   */
  const createNewInspection = async () => {
    try {
      const inspectionId = `inspection_${Date.now()}`;
      const today = new Date().toISOString().split('T')[0];

      const inspection: Omit<Inspection, 'photos' | 'createdAt' | 'updatedAt'> = {
        id: inspectionId,
        client: 'Demo Client',
        address: '123 Demo Street, Demo City',
        claimNumber: `CLM-${Date.now()}`,
        inspectionDate: today,
        status: 'DRAFT',
      };

      // Save to database
      await inspectionDB.createInspection({
        id: inspectionId,
        client: inspection.client,
        address: inspection.address,
        claim_number: inspection.claimNumber,
        inspection_date: inspection.inspectionDate,
        status: inspection.status,
      });

      setCurrentInspection({
        ...inspection,
        photos: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      setCapturedPhotos([]);
      setCurrentScreen('camera');

    } catch (error) {
      console.error('Failed to create inspection:', error);
      Alert.alert('Error', 'Failed to create new inspection');
    }
  };

  /**
   * Start the inspection recording
   */
  const handleStartInspection = async () => {
    try {
      await startRecording();
      Alert.alert('Recording Started', 'Audio recording has begun. You can now take photos.');
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start audio recording');
    }
  };

  /**
   * Stop the inspection recording
   */
  const handleStopInspection = async () => {
    try {
      const audioUri = await stopRecording();
      if (audioUri && currentInspection) {
        // Update inspection with audio URI
        await inspectionDB.updateInspectionAudio(currentInspection.id, audioUri);
        setCurrentInspection(prev => prev ? { ...prev, audioUri } : null);
      }
      setCurrentScreen('review');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop audio recording');
    }
  };

  /**
   * Handle photo capture
   */
  const handlePhotoTaken = (photo: Photo) => {
    setCapturedPhotos(prev => [...prev, photo]);
  };

  /**
   * Navigate back to camera from review
   */
  const handleBackToCamera = () => {
    setCurrentScreen('camera');
  };

  /**
   * Reset and go back to home
   */
  const handleReset = () => {
    resetRecording();
    setCurrentInspection(null);
    setCapturedPhotos([]);
    setCurrentScreen('home');
  };

  // Render home screen
  if (currentScreen === 'home') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.homeContainer}>
          <Text style={styles.title}>Aqlen Inspection</Text>
          <Text style={styles.subtitle}>Mobile Inspection App</Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              This app allows you to:
            </Text>
            <Text style={styles.bulletPoint}>• Record audio during inspection</Text>
            <Text style={styles.bulletPoint}>• Take photos with timestamps</Text>
            <Text style={styles.bulletPoint}>• Sync photos with audio timeline</Text>
            <Text style={styles.bulletPoint}>• Review captured evidence</Text>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={createNewInspection}
          >
            <Text style={styles.startButtonText}>Start New Inspection</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render camera screen
  if (currentScreen === 'camera') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.cameraContainer}>
          {/* Camera Header */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleReset}
            >
              <Text style={styles.headerButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>
                {currentInspection?.client}
              </Text>
              <Text style={styles.headerSubtitle}>
                Photos: {capturedPhotos.length}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setCurrentScreen('review')}
            >
              <Text style={styles.headerButtonText}>Review</Text>
            </TouchableOpacity>
          </View>

          {/* Camera View */}
          <View style={styles.cameraView}>
            <CameraScreen
              inspectionId={currentInspection?.id || ''}
              onPhotoTaken={handlePhotoTaken}
            />
          </View>

          {/* Recording Controls */}
          <View style={styles.recordingControls}>
            {!recordingState.isRecording ? (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={handleStartInspection}
              >
                <Text style={styles.recordButtonText}>Start Recording</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopInspection}
              >
                <Text style={styles.stopButtonText}>Stop & Review</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render review screen
  if (currentScreen === 'review') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ReviewScreen
          inspectionId={currentInspection?.id || ''}
          onBack={handleBackToCamera}
        />
      </SafeAreaView>
    );
  }

  return null;
};

/**
 * App wrapper with RecordingProvider
 */
export default function App() {
  return (
    <RecordingProvider>
      <InspectionApp />
    </RecordingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6C6C70',
    marginBottom: 60,
  },
  infoContainer: {
    marginBottom: 60,
  },
  infoText: {
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 15,
    textAlign: 'center',
  },
  bulletPoint: {
    fontSize: 14,
    color: '#6C6C70',
    marginBottom: 8,
    textAlign: 'left',
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  cameraView: {
    flex: 1,
  },
  recordingControls: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  recordButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
