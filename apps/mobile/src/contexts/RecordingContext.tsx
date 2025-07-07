import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { RecordingState } from '../types';

interface RecordingContextType {
  recordingState: RecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
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
      // Request audio permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Audio permission not granted');
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      const startTime = Date.now();

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
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) {
        throw new Error('No active recording');
      }

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      
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

      // Generate a unique filename
      const fileName = `inspection_audio_${Date.now()}.m4a`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;

      // Move the file to our app's document directory
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

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