import React, { useState, useEffect } from 'react';
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
import { inspectionDB } from '../database';
import { DatabaseInspection, DatabasePhoto } from '../types';

interface ReviewScreenProps {
  inspectionId: string;
  onBack?: () => void;
}

/**
 * ReviewScreen component for reviewing captured photos and inspection details
 * Displays thumbnails with timestamps and allows navigation back to camera
 */
export const ReviewScreen: React.FC<ReviewScreenProps> = ({ 
  inspectionId, 
  onBack 
}) => {
  const [inspection, setInspection] = useState<DatabaseInspection | null>(null);
  const [photos, setPhotos] = useState<DatabasePhoto[]>([]);
  const [loading, setLoading] = useState(true);

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
   * Render individual photo item
   */
  const renderPhotoItem = ({ item }: { item: DatabasePhoto }) => (
    <View style={styles.photoItem}>
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
        {item.caption && (
          <Text style={styles.photoCaption} numberOfLines={2}>
            {item.caption}
          </Text>
        )}
      </View>
    </View>
  );

  /**
   * Handle photo press for full view (placeholder)
   */
  const handlePhotoPress = (photo: DatabasePhoto) => {
    Alert.alert(
      'Photo Details',
      `Timestamp: ${formatTimestamp(photo.timestamp)}\nAudio: ${formatAudioTimestamp(photo.audio_timestamp)}`,
      [{ text: 'OK' }]
    );
  };

  // Load data on mount
  useEffect(() => {
    loadInspectionData();
  }, [inspectionId]);

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
}); 