import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { inspectionDB } from '../database';
import { DatabaseInspection, DatabasePhoto } from '../types';

interface ReviewScreenProps {
  inspectionId: string;
  onBack?: () => void;
}

/**
 * ReviewScreen component for reviewing captured photos and inspection details
 * Displays thumbnails with timestamps and allows navigation back to camera
 * Now includes audio playback functionality
 */
export const ReviewScreen: React.FC<ReviewScreenProps> = ({ 
  inspectionId, 
  onBack 
}) => {
  const [inspection, setInspection] = useState<DatabaseInspection | null>(null);
  const [photos, setPhotos] = useState<DatabasePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load inspection and photos data
   */
  const loadInspectionData = async () => {
    try {
      setLoading(true);
      
      // Get all inspections and find the current one
      const inspections = await inspectionDB.getInspections();
      const currentInspection = inspections.find(ins => ins.id === inspectionId);
      
      if (!currentInspection) {
        Alert.alert('Error', 'Inspection not found');
        return;
      }

      setInspection(currentInspection);

      // Get photos for this inspection
      const inspectionPhotos = await inspectionDB.getPhotosForInspection(inspectionId);
      setPhotos(inspectionPhotos);

    } catch (error) {
      console.error('Failed to load inspection data:', error);
      Alert.alert('Error', 'Failed to load inspection data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load and prepare audio for playback
   */
  const loadAudio = async () => {
    if (!inspection?.audio_uri) {
      Alert.alert('No Audio', 'No audio recording found for this inspection');
      return;
    }

    try {
      setAudioLoading(true);
      
      // Unload any existing sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Load the audio file
      const { sound } = await Audio.Sound.createAsync(
        { uri: inspection.audio_uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      
      // Get audio duration
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setAudioDuration(status.durationMillis || 0);
      }

    } catch (error) {
      console.error('Failed to load audio:', error);
      Alert.alert('Error', 'Failed to load audio file');
    } finally {
      setAudioLoading(false);
    }
  };

  /**
   * Handle audio playback status updates
   */
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setAudioPosition(status.positionMillis || 0);
      
      // If audio finished playing, reset position
      if (status.didJustFinish) {
        setAudioPosition(0);
        setIsPlaying(false);
      }
    }
  };

  /**
   * Play or pause audio
   */
  const toggleAudioPlayback = async () => {
    if (!soundRef.current) {
      await loadAudio();
      return;
    }

    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (error) {
      console.error('Failed to toggle audio playback:', error);
      Alert.alert('Error', 'Failed to control audio playback');
    }
  };

  /**
   * Seek to a specific position in the audio
   */
  const seekAudio = async (position: number) => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.setPositionAsync(position);
    } catch (error) {
      console.error('Failed to seek audio:', error);
    }
  };

  /**
   * Format milliseconds to MM:SS format
   */
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Format timestamp to readable format
   */
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  /**
   * Format audio timestamp to seconds
   */
  const formatAudioTimestamp = (audioTimestamp: number): string => {
    const seconds = Math.floor(audioTimestamp / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Check if a photo is currently playing based on audio position
   */
  const isPhotoCurrentlyPlaying = (photo: DatabasePhoto): boolean => {
    if (!isPlaying || !soundRef.current) return false;
    
    const photoTime = photo.audio_timestamp;
    const currentTime = audioPosition;
    const tolerance = 2000; // 2 seconds tolerance
    
    return Math.abs(currentTime - photoTime) <= tolerance;
  };

  /**
   * Render individual photo item
   */
  const renderPhotoItem = ({ item }: { item: DatabasePhoto }) => {
    const isCurrentlyPlaying = isPhotoCurrentlyPlaying(item);
    
    return (
      <View style={[
        styles.photoItem,
        isCurrentlyPlaying && styles.photoItemPlaying
      ]}>
        <Image
          source={{ uri: item.photo_uri }}
          style={styles.photoThumbnail}
          resizeMode="cover"
        />
        <View style={styles.photoInfo}>
          <Text style={styles.photoTimestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>
          <Text style={styles.audioTimestamp}>
            Audio: {formatAudioTimestamp(item.audio_timestamp)}
          </Text>
          {isCurrentlyPlaying && (
            <View style={styles.playingIndicator}>
              <Text style={styles.playingText}>▶️ Currently Playing</Text>
            </View>
          )}
          {item.caption && (
            <Text style={styles.photoCaption} numberOfLines={2}>
              {item.caption}
            </Text>
          )}
        </View>
      </View>
    );
  };

  /**
   * Handle photo press for full view and audio sync
   */
  const handlePhotoPress = async (photo: DatabasePhoto) => {
    // If audio is available, seek to the photo's timestamp
    if (inspection?.audio_uri && soundRef.current) {
      try {
        await soundRef.current.setPositionAsync(photo.audio_timestamp);
        if (!isPlaying) {
          await soundRef.current.playAsync();
        }
        Alert.alert(
          'Photo Details',
          `Timestamp: ${formatTimestamp(photo.timestamp)}\nAudio: ${formatAudioTimestamp(photo.audio_timestamp)}\n\nAudio playback started at this timestamp!`,
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Failed to seek to photo timestamp:', error);
        Alert.alert(
          'Photo Details',
          `Timestamp: ${formatTimestamp(photo.timestamp)}\nAudio: ${formatAudioTimestamp(photo.audio_timestamp)}`,
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert(
        'Photo Details',
        `Timestamp: ${formatTimestamp(photo.timestamp)}\nAudio: ${formatAudioTimestamp(photo.audio_timestamp)}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Load data on mount
  useEffect(() => {
    loadInspectionData();
  }, [inspectionId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading inspection data...</Text>
      </View>
    );
  }

  if (!inspection) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Inspection not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection Review</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Inspection Details */}
      <View style={styles.inspectionDetails}>
        <Text style={styles.inspectionTitle}>{inspection.client}</Text>
        <Text style={styles.inspectionAddress}>{inspection.address}</Text>
        <Text style={styles.inspectionClaim}>Claim: {inspection.claim_number}</Text>
        <Text style={styles.inspectionDate}>
          Date: {new Date(inspection.inspection_date).toLocaleDateString()}
        </Text>
        <Text style={styles.photoCount}>
          Photos: {photos.length}
        </Text>
      </View>

      {/* Audio Player */}
      {inspection.audio_uri && (
        <View style={styles.audioPlayer}>
          <Text style={styles.audioTitle}>Audio Recording</Text>
          
          <View style={styles.audioControls}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={toggleAudioPlayback}
              disabled={audioLoading}
            >
              {audioLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.playButtonText}>
                  {isPlaying ? '⏸️' : '▶️'}
                </Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.audioInfo}>
              <Text style={styles.audioTime}>
                {formatTime(audioPosition)} / {formatTime(audioDuration)}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${audioDuration > 0 ? (audioPosition / audioDuration) * 100 : 0}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Photos List */}
      <View style={styles.photosContainer}>
        <Text style={styles.photosTitle}>Captured Photos</Text>
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No photos captured yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Go back to camera to start taking photos
            </Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.photoItemContainer}
                onPress={() => handlePhotoPress(item)}
              >
                {renderPhotoItem({ item })}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.photosList}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  headerSpacer: {
    width: 60,
  },
  inspectionDetails: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 10,
  },
  inspectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  inspectionAddress: {
    fontSize: 16,
    color: '#6C6C70',
    marginBottom: 4,
  },
  inspectionClaim: {
    fontSize: 14,
    color: '#6C6C70',
    marginBottom: 4,
  },
  inspectionDate: {
    fontSize: 14,
    color: '#6C6C70',
    marginBottom: 8,
  },
  photoCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  audioPlayer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 10,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 15,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  playButtonText: {
    fontSize: 20,
  },
  audioInfo: {
    flex: 1,
  },
  audioTime: {
    fontSize: 14,
    color: '#6C6C70',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E1E5E9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  photosContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  photosTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 15,
  },
  photosList: {
    paddingBottom: 20,
  },
  photoItemContainer: {
    marginBottom: 15,
  },
  photoItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoThumbnail: {
    width: '100%',
    height: 200,
  },
  photoInfo: {
    padding: 15,
  },
  photoTimestamp: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  audioTimestamp: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  photoCaption: {
    fontSize: 14,
    color: '#6C6C70',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6C6C70',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6C6C70',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 20,
  },
  photoItemPlaying: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
  },
  playingIndicator: {
    backgroundColor: '#007AFF',
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  playingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
}); 