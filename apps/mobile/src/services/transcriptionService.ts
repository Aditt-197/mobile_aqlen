import { storage } from '../config/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  confidence: number;
}

export interface TranscriptionSegment {
  start: number; // Start time in milliseconds
  end: number;   // End time in milliseconds
  text: string;
  confidence: number;
}

export class TranscriptionService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    // You can use OpenAI Whisper API, Google Speech-to-Text, or other services
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiUrl = 'https://api.openai.com/v1/audio/transcriptions';
  }

  /**
   * Transcribe audio file from Firebase Storage URL
   */
  async transcribeAudio(firebaseAudioUrl: string): Promise<TranscriptionResult> {
    try {
      console.log('Starting audio transcription for:', firebaseAudioUrl);

      // Download audio file from Firebase Storage
      const audioBlob = await this.downloadAudioFromFirebase(firebaseAudioUrl);
      
      // Create form data for API request
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.m4a');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', 'segment');

      // Make API request to OpenAI Whisper
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('Transcription completed successfully');
      
      return {
        text: result.text,
        segments: result.segments.map((segment: any) => ({
          start: segment.start * 1000, // Convert to milliseconds
          end: segment.end * 1000,
          text: segment.text,
          confidence: segment.confidence || 0.8,
        })),
        confidence: result.confidence || 0.8,
      };

    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Transcription failed: ${errorMessage}`);
    }
  }

  /**
   * Download audio file from Firebase Storage as blob
   */
  private async downloadAudioFromFirebase(firebaseUrl: string): Promise<Blob> {
    try {
      console.log('Downloading audio from Firebase:', firebaseUrl);
      
      const response = await fetch(firebaseUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('Audio downloaded successfully, size:', blob.size);
      
      return blob;
    } catch (error) {
      console.error('Failed to download audio from Firebase:', error);
      throw error;
    }
  }

  /**
   * Get transcription segment for a specific timestamp
   */
  getSegmentForTimestamp(segments: TranscriptionSegment[], timestamp: number): TranscriptionSegment | null {
    return segments.find(segment => 
      timestamp >= segment.start && timestamp <= segment.end
    ) || null;
  }

  /**
   * Get context around a specific timestamp (previous + current + next segments)
   */
  getContextAroundTimestamp(segments: TranscriptionSegment[], timestamp: number, contextRange: number = 5000): string {
    const relevantSegments = segments.filter(segment => 
      Math.abs(segment.start - timestamp) <= contextRange ||
      Math.abs(segment.end - timestamp) <= contextRange
    );

    return relevantSegments
      .map(segment => segment.text)
      .join(' ')
      .trim();
  }

  /**
   * Test transcription service with a sample audio file
   */
  async testTranscription(audioUrl: string): Promise<boolean> {
    try {
      console.log('Testing transcription service...');
      
      const result = await this.transcribeAudio(audioUrl);
      
      console.log('Test transcription successful:');
      console.log('Text:', result.text);
      console.log('Segments:', result.segments.length);
      console.log('Confidence:', result.confidence);
      
      return true;
    } catch (error) {
      console.error('Test transcription failed:', error);
      return false;
    }
  }
}

export const transcriptionService = new TranscriptionService(); 