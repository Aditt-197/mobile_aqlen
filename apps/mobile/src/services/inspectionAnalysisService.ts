import { transcriptionService, TranscriptionResult } from './transcriptionService';
import { llmCaptionService, CaptionRequest, CaptionResult } from './llmCaptionService';
import { firestoreService } from './firestoreService';
import { Photo, Inspection } from '../types';

export interface AnalysisResult {
  inspectionId: string;
  transcription: TranscriptionResult;
  photoCaptions: PhotoCaptionResult[];
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  error?: string;
}

export interface PhotoCaptionResult {
  photoId: string;
  caption: string;
  confidence: number;
  audioContext: string;
  timestamp: number;
}

export class InspectionAnalysisService {
  /**
   * Complete analysis pipeline: transcribe audio and generate captions for all photos
   */
  async analyzeInspection(inspectionId: string): Promise<AnalysisResult> {
    try {
      console.log('Starting complete analysis for inspection:', inspectionId);

      // 1. Get inspection details
      const inspection = await firestoreService.getInspection(inspectionId);
      if (!inspection) {
        throw new Error('Inspection not found');
      }

      if (!inspection.firebaseAudioUrl) {
        throw new Error('No audio file found for inspection');
      }

      // 2. Transcribe audio
      console.log('Step 1: Transcribing audio...');
      const transcription = await transcriptionService.transcribeAudio(inspection.firebaseAudioUrl);
      console.log('Audio transcription completed');

      // 3. Get all photos for this inspection
      console.log('Step 2: Getting photos...');
      const photos = await firestoreService.getPhotosForInspection(inspectionId);
      console.log('Found', photos.length, 'photos');

      // 4. Generate captions for each photo
      console.log('Step 3: Generating captions...');
      const photoCaptions = await this.generateCaptionsForPhotos(
        photos,
        transcription,
        {
          client: inspection.client,
          address: inspection.address,
          claimNumber: inspection.claimNumber,
        }
      );

      // 5. Update photos with captions in Firestore
      console.log('Step 4: Updating photos with captions...');
      await this.updatePhotosWithCaptions(photoCaptions);

      // 6. Update inspection status
      await firestoreService.updateInspectionStatus(inspectionId, 'READY');

      console.log('Analysis completed successfully');

      return {
        inspectionId,
        transcription,
        photoCaptions,
        status: 'COMPLETED',
      };

    } catch (error) {
      console.error('Analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update inspection status to ERROR
      try {
        await firestoreService.updateInspectionStatus(inspectionId, 'ERROR');
      } catch (updateError) {
        console.error('Failed to update inspection status:', updateError);
      }

      return {
        inspectionId,
        transcription: { text: '', segments: [], confidence: 0 },
        photoCaptions: [],
        status: 'FAILED',
        error: errorMessage,
      };
    }
  }

  /**
   * Generate captions for all photos based on transcription
   */
  private async generateCaptionsForPhotos(
    photos: any[],
    transcription: TranscriptionResult,
    inspectionDetails: { client: string; address: string; claimNumber: string }
  ): Promise<PhotoCaptionResult[]> {
    // Filter photos with valid IDs first
    const validPhotos = photos.filter(photo => photo.id);
    
    const captionRequests: CaptionRequest[] = validPhotos.map(photo => {
      const audioContext = transcriptionService.getContextAroundTimestamp(
        transcription.segments,
        photo.audioTimestamp,
        3000 // 3 seconds context
      );

      return {
        photoTimestamp: photo.audioTimestamp,
        audioContext: audioContext || 'No audio context available',
        inspectionDetails,
      };
    });

    console.log('Generating captions for', captionRequests.length, 'photos');

    const captionResults = await llmCaptionService.generateCaptionsBatch(captionRequests);

    return validPhotos.map((photo, index) => ({
      photoId: photo.id!,
      caption: captionResults[index]?.caption || 'No caption generated',
      confidence: captionResults[index]?.confidence || 0,
      audioContext: captionResults[index]?.context || 'No context',
      timestamp: photo.audioTimestamp,
    }));
  }

  /**
   * Update photos in Firestore with generated captions
   */
  private async updatePhotosWithCaptions(photoCaptions: PhotoCaptionResult[]): Promise<void> {
    const updatePromises = photoCaptions.map(async (photoCaption) => {
      try {
        // Update photo with caption in Firestore
        await firestoreService.updatePhotoCaption(
          photoCaption.photoId,
          photoCaption.caption
        );
        console.log('Updated photo', photoCaption.photoId, 'with caption');
      } catch (error) {
        console.error('Failed to update photo caption:', photoCaption.photoId, error);
      }
    });

    await Promise.all(updatePromises);
    console.log('All photo captions updated in Firestore');
  }

  /**
   * Get analysis results for an inspection
   */
  async getAnalysisResults(inspectionId: string): Promise<AnalysisResult | null> {
    try {
      const inspection = await firestoreService.getInspection(inspectionId);
      if (!inspection || !inspection.firebaseAudioUrl) {
        return null;
      }

      const photos = await firestoreService.getPhotosForInspection(inspectionId);
      
      // Check if photos have captions
      const photosWithCaptions = photos.filter(photo => photo.caption);
      
      if (photosWithCaptions.length === 0) {
        return null; // No analysis has been run yet
      }

      // For now, return basic info. In a full implementation, you might store
      // transcription results separately or retrieve them from cache
      return {
        inspectionId,
        transcription: { text: 'Transcription available', segments: [], confidence: 0.8 },
        photoCaptions: photosWithCaptions.map(photo => ({
          photoId: photo.id,
          caption: photo.caption || '',
          confidence: 0.8,
          audioContext: 'Context available',
          timestamp: photo.audioTimestamp,
        })),
        status: 'COMPLETED',
      };

    } catch (error) {
      console.error('Failed to get analysis results:', error);
      return null;
    }
  }

  /**
   * Test the complete analysis pipeline
   */
  async testAnalysisPipeline(inspectionId: string): Promise<boolean> {
    try {
      console.log('Testing analysis pipeline for inspection:', inspectionId);
      
      const result = await this.analyzeInspection(inspectionId);
      
      console.log('Test analysis completed:');
      console.log('Status:', result.status);
      console.log('Photos processed:', result.photoCaptions.length);
      console.log('Transcription confidence:', result.transcription.confidence);
      
      return result.status === 'COMPLETED';
    } catch (error) {
      console.error('Test analysis failed:', error);
      return false;
    }
  }
}

export const inspectionAnalysisService = new InspectionAnalysisService(); 