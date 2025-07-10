import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { Inspection, Photo } from '../types';

export interface FirestoreInspection {
  id?: string;
  client: string;
  address: string;
  claimNumber: string;
  inspectionDate: string;
  audioUri?: string;
  firebaseAudioUrl?: string;
  status: 'DRAFT' | 'PROCESSING' | 'READY' | 'ERROR';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestorePhoto {
  id?: string;
  inspectionId: string;
  photoUri: string;
  firebaseUrl?: string;
  timestamp: number;
  audioTimestamp: number;
  caption?: string;
  createdAt: Timestamp;
}

export class FirestoreService {
  private inspectionsCollection = 'inspections';
  private photosCollection = 'photos';

  /**
   * Create a new inspection in Firestore
   */
  async createInspection(inspection: Omit<FirestoreInspection, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('Creating inspection in Firestore:', inspection);

      const inspectionData = {
        ...inspection,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestore, this.inspectionsCollection), inspectionData);
      console.log('Inspection created in Firestore with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Failed to create inspection in Firestore:', error);
      throw error;
    }
  }

  /**
   * Add a photo to an inspection in Firestore
   */
  async addPhoto(photo: Omit<FirestorePhoto, 'createdAt'>): Promise<string> {
    try {
      console.log('Adding photo to Firestore:', photo);

      const photoData = {
        ...photo,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestore, this.photosCollection), photoData);
      console.log('Photo added to Firestore with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Failed to add photo to Firestore:', error);
      throw error;
    }
  }

  /**
   * Get all inspections from Firestore
   */
  async getInspections(): Promise<FirestoreInspection[]> {
    try {
      const q = query(
        collection(firestore, this.inspectionsCollection),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const inspections: FirestoreInspection[] = [];

      querySnapshot.forEach((doc) => {
        inspections.push({
          id: doc.id,
          ...doc.data()
        } as FirestoreInspection);
      });

      console.log('Retrieved inspections from Firestore:', inspections.length);
      return inspections;
    } catch (error) {
      console.error('Failed to get inspections from Firestore:', error);
      throw error;
    }
  }

  /**
   * Get a specific inspection by ID
   */
  async getInspection(inspectionId: string): Promise<FirestoreInspection | null> {
    try {
      const docRef = doc(firestore, this.inspectionsCollection, inspectionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as FirestoreInspection;
      } else {
        console.log('Inspection not found:', inspectionId);
        return null;
      }
    } catch (error) {
      console.error('Failed to get inspection from Firestore:', error);
      throw error;
    }
  }

  /**
   * Get photos for a specific inspection from Firestore
   */
  async getPhotosForInspection(inspectionId: string): Promise<FirestorePhoto[]> {
    try {
      const q = query(
        collection(firestore, this.photosCollection),
        where('inspectionId', '==', inspectionId),
        orderBy('timestamp', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const photos: FirestorePhoto[] = [];

      querySnapshot.forEach((doc) => {
        photos.push({
          id: doc.id,
          ...doc.data()
        } as FirestorePhoto);
      });

      console.log('Retrieved photos from Firestore:', photos.length);
      return photos;
    } catch (error) {
      console.error('Failed to get photos from Firestore:', error);
      throw error;
    }
  }

  /**
   * Update inspection audio URI in Firestore
   */
  async updateInspectionAudioUrl(inspectionId: string, audioUri: string): Promise<void> {
    try {
      const docRef = doc(firestore, this.inspectionsCollection, inspectionId);
      await updateDoc(docRef, {
        audioUri,
        updatedAt: serverTimestamp(),
      });
      console.log('Inspection audio URL updated in Firestore');
    } catch (error) {
      console.error('Failed to update inspection audio URL in Firestore:', error);
      throw error;
    }
  }

  /**
   * Update inspection Firebase audio URL in Firestore
   */
  async updateInspectionFirebaseAudioUrl(inspectionId: string, firebaseUrl: string): Promise<void> {
    try {
      const docRef = doc(firestore, this.inspectionsCollection, inspectionId);
      await updateDoc(docRef, {
        firebaseAudioUrl: firebaseUrl,
        updatedAt: serverTimestamp(),
      });
      console.log('Inspection Firebase audio URL updated in Firestore');
    } catch (error) {
      console.error('Failed to update inspection Firebase audio URL in Firestore:', error);
      throw error;
    }
  }

  /**
   * Update photo Firebase URL in Firestore
   */
  async updatePhotoFirebaseUrl(photoId: string, firebaseUrl: string): Promise<void> {
    try {
      const docRef = doc(firestore, this.photosCollection, photoId);
      await updateDoc(docRef, {
        firebaseUrl,
      });
      console.log('Photo Firebase URL updated in Firestore');
    } catch (error) {
      console.error('Failed to update photo Firebase URL in Firestore:', error);
      throw error;
    }
  }

  /**
   * Update photo caption in Firestore
   */
  async updatePhotoCaption(photoId: string, caption: string): Promise<void> {
    try {
      const docRef = doc(firestore, this.photosCollection, photoId);
      await updateDoc(docRef, {
        caption,
      });
      console.log('Photo caption updated in Firestore');
    } catch (error) {
      console.error('Failed to update photo caption in Firestore:', error);
      throw error;
    }
  }

  /**
   * Update inspection status in Firestore
   */
  async updateInspectionStatus(inspectionId: string, status: string): Promise<void> {
    try {
      const docRef = doc(firestore, this.inspectionsCollection, inspectionId);
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp(),
      });
      console.log('Inspection status updated in Firestore');
    } catch (error) {
      console.error('Failed to update inspection status in Firestore:', error);
      throw error;
    }
  }

  /**
   * Delete an inspection and all its photos
   */
  async deleteInspection(inspectionId: string): Promise<void> {
    try {
      // Delete all photos for this inspection
      const photos = await this.getPhotosForInspection(inspectionId);
      for (const photo of photos) {
        if (photo.id) {
          await deleteDoc(doc(firestore, this.photosCollection, photo.id));
        }
      }

      // Delete the inspection
      await deleteDoc(doc(firestore, this.inspectionsCollection, inspectionId));
      console.log('Inspection and photos deleted from Firestore');
    } catch (error) {
      console.error('Failed to delete inspection from Firestore:', error);
      throw error;
    }
  }
}

export const firestoreService = new FirestoreService();