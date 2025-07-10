import * as SQLite from 'expo-sqlite';
import { DatabaseInspection, DatabasePhoto } from '../types';

/**
 * Database utility for managing inspections and photos
 * Uses SQLite for offline-first data storage
 */
class InspectionDatabase {
  private db: SQLite.SQLiteDatabase;

  constructor() {
    this.db = SQLite.openDatabaseSync('inspection.db');
    this.initDatabase();
  }

  /**
   * Initialize database tables if they don't exist
   */
  private initDatabase(): void {
    const createInspectionsTable = `
      CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        client TEXT NOT NULL,
        address TEXT NOT NULL,
        claim_number TEXT NOT NULL,
        inspection_date TEXT NOT NULL,
        audio_uri TEXT,
        firebase_audio_url TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `;

    const createPhotosTable = `
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        photo_uri TEXT NOT NULL,
        firebase_url TEXT,
        timestamp INTEGER NOT NULL,
        audio_timestamp INTEGER NOT NULL,
        caption TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id) ON DELETE CASCADE
      );
    `;

    this.db.execSync(createInspectionsTable);
    this.db.execSync(createPhotosTable);
  }

  /**
   * Create a new inspection
   */
  async createInspection(inspection: Omit<DatabaseInspection, 'created_at' | 'updated_at'>): Promise<void> {
    const now = Date.now();
    const sql = `INSERT INTO inspections (id, client, address, claim_number, inspection_date, audio_uri, firebase_audio_url, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const args = [
      inspection.id,
      inspection.client,
      inspection.address,
      inspection.claim_number,
      inspection.inspection_date,
      inspection.audio_uri || null,
      inspection.firebase_audio_url || null,
      inspection.status,
      now,
      now
    ];

    const stmt = this.db.prepareSync(sql);
    stmt.executeSync(args);
    stmt.finalizeSync();
  }

  /**
   * Add a photo to an inspection
   */
  async addPhoto(photo: Omit<DatabasePhoto, 'created_at'>): Promise<void> {
    const now = Date.now();
    const sql = `INSERT INTO photos (id, inspection_id, photo_uri, firebase_url, timestamp, audio_timestamp, caption, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const args = [
      photo.id,
      photo.inspection_id,
      photo.photo_uri,
      photo.firebase_url || null,
      photo.timestamp,
      photo.audio_timestamp,
      photo.caption || null,
      now
    ];

    const stmt = this.db.prepareSync(sql);
    stmt.executeSync(args);
    stmt.finalizeSync();
  }

  /**
   * Get all inspections with their photos
   */
  async getInspections(): Promise<DatabaseInspection[]> {
    const sql = 'SELECT * FROM inspections ORDER BY created_at DESC';
    const result = this.db.getAllSync<DatabaseInspection>(sql);
    return result;
  }

  /**
   * Get photos for a specific inspection
   */
  async getPhotosForInspection(inspectionId: string): Promise<DatabasePhoto[]> {
    const sql = 'SELECT * FROM photos WHERE inspection_id = ? ORDER BY timestamp ASC';
    const result = this.db.getAllSync<DatabasePhoto>(sql, [inspectionId]);
    return result;
  }

  /**
   * Update inspection audio URI
   */
  async updateInspectionAudio(inspectionId: string, audioUri: string): Promise<void> {
    const sql = 'UPDATE inspections SET audio_uri = ?, updated_at = ? WHERE id = ?';
    const args = [audioUri, Date.now(), inspectionId];
    const stmt = this.db.prepareSync(sql);
    stmt.executeSync(args);
    stmt.finalizeSync();
  }

  /**
   * Update inspection Firebase audio URL
   */
  async updateInspectionFirebaseAudioUrl(inspectionId: string, firebaseUrl: string): Promise<void> {
    const sql = 'UPDATE inspections SET firebase_audio_url = ?, updated_at = ? WHERE id = ?';
    const args = [firebaseUrl, Date.now(), inspectionId];
    const stmt = this.db.prepareSync(sql);
    stmt.executeSync(args);
    stmt.finalizeSync();
  }

  /**
   * Update photo Firebase URL
   */
  async updatePhotoFirebaseUrl(photoId: string, firebaseUrl: string): Promise<void> {
    const sql = 'UPDATE photos SET firebase_url = ? WHERE id = ?';
    const args = [firebaseUrl, photoId];
    const stmt = this.db.prepareSync(sql);
    stmt.executeSync(args);
    stmt.finalizeSync();
  }

  /**
   * Update inspection status
   */
  async updateInspectionStatus(inspectionId: string, status: string): Promise<void> {
    const sql = 'UPDATE inspections SET status = ?, updated_at = ? WHERE id = ?';
    const args = [status, Date.now(), inspectionId];
    const stmt = this.db.prepareSync(sql);
    stmt.executeSync(args);
    stmt.finalizeSync();
  }
}

// Export singleton instance
export const inspectionDB = new InspectionDatabase();