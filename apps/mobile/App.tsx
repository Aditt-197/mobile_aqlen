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
import { firestoreService } from './src/services/firestoreService';
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
  const [pendingInspectionId, setPendingInspectionId] = useState<string | null>(null); // for async safety

  /**
   * Create a new inspection and start recording automatically
   */
  const createNewInspection = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const inspection: Omit<Inspection, 'photos' | 'createdAt' | 'updatedAt'> = {
        id: '', // Will be set by Firestore
        client: 'Demo Client',
        address: '123 Demo Street, Demo City',
        claimNumber: `CLM-${Date.now()}`,
        inspectionDate: today,
        status: 'DRAFT',
      };

      // Save to Firestore
      const inspectionId = await firestoreService.createInspection({
        client: inspection.client,
        address: inspection.address,
        claimNumber: inspection.claimNumber,
        inspectionDate: inspection.inspectionDate,
        status: inspection.status,
      });
      setPendingInspectionId(inspectionId); // Save for async safety
      console.log('Inspection created, Firestore ID:', inspectionId);

      // Get the created inspection from Firestore
      const createdInspection = await firestoreService.getInspection(inspectionId);
      if (createdInspection) {
        setCurrentInspection({
          id: inspectionId, // Always use Firestore ID
          client: createdInspection.client,
          address: createdInspection.address,
          claimNumber: createdInspection.claimNumber,
          inspectionDate: createdInspection.inspectionDate,
          photos: [],
          status: createdInspection.status,
          createdAt: createdInspection.createdAt?.toMillis?.() || Date.now(),
          updatedAt: createdInspection.updatedAt?.toMillis?.() || Date.now(),
        });
        setCapturedPhotos([]);
        setCurrentScreen('camera');
      } else {
        Alert.alert('Error', 'Failed to fetch created inspection from Firestore');
      }

      // Start recording automatically when inspection begins
      try {
        await startRecording();
        console.log('Audio recording started automatically');
      } catch (error) {
        console.error('Failed to start audio recording:', error);
        Alert.alert('Warning', 'Audio recording failed to start, but you can continue with photos.');
      }
    } catch (error) {
      console.error('Failed to create inspection:', error);
      Alert.alert('Error', 'Failed to create new inspection');
    }
  };

  /**
   * Stop the inspection recording and go to review
   */
  const handleStopInspection = async () => {
    try {
      const audioUri = await stopRecording(currentInspection?.id);
      if (audioUri && currentInspection) {
        // Update inspection with audio URI in Firestore
        await firestoreService.updateInspectionAudioUrl(currentInspection.id, audioUri);
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

          {/* Inspection Controls */}
          <View style={styles.inspectionControls}>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopInspection}
            >
              <Text style={styles.stopButtonText}>Stop Inspection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render review screen
  if (currentScreen === 'review') {
    const reviewInspectionId = currentInspection?.id || pendingInspectionId || '';
    console.log('Navigating to ReviewScreen with inspectionId:', reviewInspectionId);
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ReviewScreen
          inspectionId={reviewInspectionId}
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
  inspectionControls: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
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
