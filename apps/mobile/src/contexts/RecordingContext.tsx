import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { RecordingState } from '../types';
import { firebaseStorage } from '../services/firebaseStorage';
import { firestoreService } from '../services/firestoreService';

interface RecordingContextType {
  recordingState: RecordingState;
  startRecording: () => Promise<void>;
  stopRecording: (inspectionId?: string) => Promise<string | null>;
  resetRecording: () => void;
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

interface RecordingProviderProps {
  children: React.ReactNode;
}

/**
 * RecordingContext provides audio recording functionality
 * Manages recording state and provides methods to start/stop recording
 */
export const RecordingProvider: React.FC<RecordingProviderProps> = ({ children }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    audioUri: undefined,
    startTime: undefined,
    duration: 0,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Request audio permissions and start recording
   */
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      console.log('Starting audio recording...');

      // Request audio permissions
      const permission = await Audio.requestPermissionsAsync();
      console.log('Audio permission status:', permission.status);

      if (permission.status !== 'granted') {
        throw new Error('Audio permission not granted');
      }

      // Configure audio mode for recording with better iOS compatibility
      console.log('Configuring audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false, // Changed to false to avoid session conflicts
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create recording with simplified settings to avoid session conflicts
      console.log('Creating recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      const startTime = Date.now();

      console.log('Recording started successfully');

      setRecordingState({
        isRecording: true,
        audioUri: undefined,
        startTime,
        duration: 0,
      });

      // Update duration every second
      intervalRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: Date.now() - (prev.startTime || startTime),
        }));
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, []);

  /**
   * Stop recording and return the audio file URI
   */
  const stopRecording = useCallback(async (inspectionId?: string): Promise<string | null> => {
    try {
      console.log('Stopping audio recording...');

      if (!recordingRef.current) {
        throw new Error('No active recording');
      }

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      console.log('Recording stopped successfully');

      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Get the recording URI
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      console.log('Recording URI:', uri);

      // Generate a unique filename
      const fileName = `inspection_audio_${Date.now()}.m4a`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;

      // Move the file to our app's document directory
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      console.log('Audio file saved to:', newUri);

      // Upload to Firebase if inspectionId is provided
      let firebaseUrl: string | undefined;
      if (inspectionId) {
        try {
          const uploadResult = await firebaseStorage.uploadAudio(newUri, inspectionId);
          firebaseUrl = uploadResult.downloadUrl;
          console.log('Audio uploaded to Firebase Storage:', firebaseUrl);

          // Save Firebase URL to Firestore
          await firestoreService.updateInspectionFirebaseAudioUrl(inspectionId, firebaseUrl);
          console.log('Firebase audio URL saved to Firestore');
        } catch (uploadError) {
          console.error('Failed to upload audio to Firebase Storage:', uploadError);
          // Continue without Firebase upload - local file is still saved
        }
      }

      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        audioUri: newUri,
        duration: prev.duration,
      }));

      return newUri;

    } catch (error) {
      console.error('Failed to stop recording:', error);

      // Reset state on error
      setRecordingState({
        isRecording: false,
        audioUri: undefined,
        startTime: undefined,
        duration: 0,
      });

      throw error;
    }
  }, []);

  /**
   * Reset recording state
   */
  const resetRecording = useCallback(() => {
    console.log('Resetting recording state...');

    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setRecordingState({
      isRecording: false,
      audioUri: undefined,
      startTime: undefined,
      duration: 0,
    });
  }, []);

  const value: RecordingContextType = {
    recordingState,
    startRecording,
    stopRecording,
    resetRecording,
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
};

/**
 * Hook to use the RecordingContext
 */
export const useRecording = (): RecordingContextType => {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
};