import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';
import * as FileSystem from 'expo-file-system';

export interface UploadResult {
  downloadUrl: string;
  filePath: string;
}

export class FirebaseStorageService {
  private bucketName = 'inspection-files';

  /**
   * Upload a file to Firebase Cloud Storage using fetch and blob
   */
  async uploadFile(
    localUri: string,
    fileName: string,
    inspectionId: string
  ): Promise<UploadResult> {
    try {
      console.log('Starting file upload:', fileName);
      console.log('Local URI:', localUri);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        throw new Error(`File does not exist: ${localUri}`);
      }
      console.log('File exists, size:', fileInfo.size);

      // Create storage reference
      const storageRef = ref(storage, `${this.bucketName}/${inspectionId}/${fileName}`);

      console.log('Storage ref created:', storageRef.fullPath);

      // Read file as blob using fetch
      console.log('Reading file as blob...');
      const response = await fetch(`file://${localUri}`);
      const blob = await response.blob();

      console.log('Blob created, size:', blob.size);

      // Upload blob
      console.log('Starting upload...');
      const snapshot = await uploadBytes(storageRef, blob);

      console.log('Upload successful, getting download URL...');

      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);

      console.log('Download URL obtained:', downloadUrl);

      return {
        downloadUrl,
        filePath: snapshot.ref.fullPath,
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      // Check if it's a Firebase error
      if (error.code) {
        throw new Error(`Firebase error (${error.code}): ${error.message}`);
      } else {
        throw new Error(`Upload failed: ${error.message}`);
      }
    }
  }

  /**
   * Upload audio file
   */
  async uploadAudio(audioUri: string, inspectionId: string): Promise<UploadResult> {
    const fileName = `audio_${Date.now()}.m4a`;
    return this.uploadFile(audioUri, fileName, inspectionId);
  }

  /**
   * Upload photo file
   */
  async uploadPhoto(photoUri: string, inspectionId: string, photoId: string): Promise<UploadResult> {
    const fileName = `photo_${photoId}_${Date.now()}.jpg`;
    return this.uploadFile(photoUri, fileName, inspectionId);
  }

  /**
   * Delete a file from Firebase Cloud Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Test Firebase connection
   */
  async testFirebaseConnection(): Promise<boolean> {
    try {
      console.log('Testing Firebase Storage connection...');

      const testContent = 'Hello Firebase!';
      const testFileName = `test_${Date.now()}.txt`;
      const testInspectionId = 'test_inspection';

      // Create a temporary test file
      const tempFileUri = `${FileSystem.documentDirectory}${testFileName}`;
      await FileSystem.writeAsStringAsync(tempFileUri, testContent);

      // Create storage reference
      const storageRef = ref(storage, `${this.bucketName}/${testInspectionId}/${testFileName}`);

      console.log('Test upload path:', storageRef.fullPath);

      // Read file as blob
      const response = await fetch(`file://${tempFileUri}`);
      const blob = await response.blob();

      // Upload test file
      const snapshot = await uploadBytes(storageRef, blob);

      console.log('Test upload successful');

      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log('Test download URL:', downloadUrl);

      // Clean up test file
      await deleteObject(storageRef);
      await FileSystem.deleteAsync(tempFileUri);
      console.log('Test file cleaned up');

      return true;
    } catch (error) {
      console.error('Firebase Storage test failed:', error);
      return false;
    }
  }
}

export const firebaseStorage = new FirebaseStorageService();