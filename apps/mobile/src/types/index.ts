export interface Photo {
  id: string;
  uri: string;
  timestamp: number;
  audioTimestamp: number;
  caption?: string;
}

export interface Inspection {
  id: string;
  client: string;
  address: string;
  claimNumber: string;
  inspectionDate: string;
  photos: Photo[];
  audioUri?: string;
  firebaseAudioUrl?: string;
  status: 'DRAFT' | 'PROCESSING' | 'READY' | 'ERROR';
  createdAt: number;
  updatedAt: number;
}

export interface RecordingState {
  isRecording: boolean;
  audioUri?: string;
  startTime?: number;
  duration: number;
}

export interface DatabasePhoto {
  id: string;
  inspection_id: string;
  photo_uri: string;
  firebase_url?: string;
  timestamp: number;
  audio_timestamp: number;
  caption?: string;
  created_at: number;
}

export interface DatabaseInspection {
  id: string;
  client: string;
  address: string;
  claim_number: string;
  inspection_date: string;
  audio_uri?: string;
  firebase_audio_url?: string;
  status: string;
  created_at: number;
  updated_at: number;
}