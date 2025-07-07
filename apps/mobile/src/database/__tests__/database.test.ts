import { openDatabaseSync } from 'expo-sqlite';
import { inspectionDB } from '../index';
import { DatabaseInspection, DatabasePhoto } from '../../types';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
}));

describe('InspectionDatabase', () => {
  let mockDb: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock database
    mockDb = {
      execSync: jest.fn(),
      prepareSync: jest.fn(),
      getAllSync: jest.fn(),
    };

    // Mock the openDatabaseSync function
    (openDatabaseSync as jest.Mock).mockReturnValue(mockDb);

    // Reset the database instance
    jest.resetModules();
  });

  describe('createInspection', () => {
    it('should create a new inspection successfully', async () => {
      // Mock the prepareSync method
      const mockStmt = {
        executeSync: jest.fn(),
        finalizeSync: jest.fn(),
      };
      mockDb.prepareSync.mockReturnValue(mockStmt);

      const inspection: Omit<DatabaseInspection, 'created_at' | 'updated_at'> = {
        id: 'test-inspection-1',
        client: 'Test Client',
        address: '123 Test St',
        claim_number: 'CLM-001',
        inspection_date: '2024-01-15',
        status: 'DRAFT',
      };

      await inspectionDB.createInspection(inspection);

      // Verify prepareSync was called with correct SQL
      expect(mockDb.prepareSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inspections')
      );

      // Verify executeSync was called
      expect(mockStmt.executeSync).toHaveBeenCalledWith(
        expect.arrayContaining([
          'test-inspection-1',
          'Test Client',
          '123 Test St',
          'CLM-001',
          '2024-01-15',
          null, // audio_uri
          'DRAFT',
          expect.any(Number), // created_at
          expect.any(Number), // updated_at
        ])
      );

      // Verify finalizeSync was called
      expect(mockStmt.finalizeSync).toHaveBeenCalled();
    });

    it('should handle inspection with audio URI', async () => {
      const mockStmt = {
        executeSync: jest.fn(),
        finalizeSync: jest.fn(),
      };
      mockDb.prepareSync.mockReturnValue(mockStmt);

      const inspection: Omit<DatabaseInspection, 'created_at' | 'updated_at'> = {
        id: 'test-inspection-2',
        client: 'Test Client',
        address: '123 Test St',
        claim_number: 'CLM-002',
        inspection_date: '2024-01-15',
        audio_uri: 'file://test-audio.m4a',
        status: 'DRAFT',
      };

      await inspectionDB.createInspection(inspection);

      expect(mockStmt.executeSync).toHaveBeenCalledWith(
        expect.arrayContaining([
          'test-inspection-2',
          'Test Client',
          '123 Test St',
          'CLM-002',
          '2024-01-15',
          'file://test-audio.m4a', // audio_uri
          'DRAFT',
          expect.any(Number),
          expect.any(Number),
        ])
      );
    });
  });

  describe('addPhoto', () => {
    it('should add a photo to an inspection successfully', async () => {
      const mockStmt = {
        executeSync: jest.fn(),
        finalizeSync: jest.fn(),
      };
      mockDb.prepareSync.mockReturnValue(mockStmt);

      const photo: Omit<DatabasePhoto, 'created_at'> = {
        id: 'photo-1',
        inspection_id: 'test-inspection-1',
        photo_uri: 'file://test-photo.jpg',
        timestamp: 1705312800000, // 2024-01-15 12:00:00
        audio_timestamp: 5000, // 5 seconds into recording
        caption: 'Test photo caption',
      };

      await inspectionDB.addPhoto(photo);

      // Verify prepareSync was called with correct SQL
      expect(mockDb.prepareSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO photos')
      );

      // Verify executeSync was called with correct parameters
      expect(mockStmt.executeSync).toHaveBeenCalledWith([
        'photo-1',
        'test-inspection-1',
        'file://test-photo.jpg',
        1705312800000,
        5000,
        'Test photo caption',
        expect.any(Number), // created_at
      ]);

      expect(mockStmt.finalizeSync).toHaveBeenCalled();
    });

    it('should handle photo without caption', async () => {
      const mockStmt = {
        executeSync: jest.fn(),
        finalizeSync: jest.fn(),
      };
      mockDb.prepareSync.mockReturnValue(mockStmt);

      const photo: Omit<DatabasePhoto, 'created_at'> = {
        id: 'photo-2',
        inspection_id: 'test-inspection-1',
        photo_uri: 'file://test-photo-2.jpg',
        timestamp: 1705312800000,
        audio_timestamp: 10000,
      };

      await inspectionDB.addPhoto(photo);

      expect(mockStmt.executeSync).toHaveBeenCalledWith([
        'photo-2',
        'test-inspection-1',
        'file://test-photo-2.jpg',
        1705312800000,
        10000,
        null, // caption
        expect.any(Number),
      ]);
    });
  });

  describe('getInspections', () => {
    it('should return all inspections ordered by creation date', async () => {
      const mockInspections: DatabaseInspection[] = [
        {
          id: 'inspection-1',
          client: 'Client A',
          address: '123 Main St',
          claim_number: 'CLM-001',
          inspection_date: '2024-01-15',
          status: 'DRAFT',
          created_at: 1705312800000,
          updated_at: 1705312800000,
        },
        {
          id: 'inspection-2',
          client: 'Client B',
          address: '456 Oak Ave',
          claim_number: 'CLM-002',
          inspection_date: '2024-01-16',
          status: 'READY',
          created_at: 1705399200000,
          updated_at: 1705399200000,
        },
      ];

      mockDb.getAllSync.mockReturnValue(mockInspections);

      const result = await inspectionDB.getInspections();

      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        'SELECT * FROM inspections ORDER BY created_at DESC'
      );
      expect(result).toEqual(mockInspections);
    });

    it('should return empty array when no inspections exist', async () => {
      mockDb.getAllSync.mockReturnValue([]);

      const result = await inspectionDB.getInspections();

      expect(result).toEqual([]);
    });
  });

  describe('getPhotosForInspection', () => {
    it('should return photos for a specific inspection', async () => {
      const mockPhotos: DatabasePhoto[] = [
        {
          id: 'photo-1',
          inspection_id: 'inspection-1',
          photo_uri: 'file://photo1.jpg',
          timestamp: 1705312800000,
          audio_timestamp: 5000,
          caption: 'First photo',
          created_at: 1705312800000,
        },
        {
          id: 'photo-2',
          inspection_id: 'inspection-1',
          photo_uri: 'file://photo2.jpg',
          timestamp: 1705312860000,
          audio_timestamp: 11000,
          caption: 'Second photo',
          created_at: 1705312860000,
        },
      ];

      mockDb.getAllSync.mockReturnValue(mockPhotos);

      const result = await inspectionDB.getPhotosForInspection('inspection-1');

      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        'SELECT * FROM photos WHERE inspection_id = ? ORDER BY timestamp ASC',
        ['inspection-1']
      );
      expect(result).toEqual(mockPhotos);
    });

    it('should return empty array when no photos exist for inspection', async () => {
      mockDb.getAllSync.mockReturnValue([]);

      const result = await inspectionDB.getPhotosForInspection('inspection-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateInspectionAudio', () => {
    it('should update inspection audio URI successfully', async () => {
      const mockStmt = {
        executeSync: jest.fn(),
        finalizeSync: jest.fn(),
      };
      mockDb.prepareSync.mockReturnValue(mockStmt);

      await inspectionDB.updateInspectionAudio('inspection-1', 'file://new-audio.m4a');

      expect(mockDb.prepareSync).toHaveBeenCalledWith(
        'UPDATE inspections SET audio_uri = ?, updated_at = ? WHERE id = ?'
      );
      expect(mockStmt.executeSync).toHaveBeenCalledWith([
        'file://new-audio.m4a',
        expect.any(Number), // updated_at
        'inspection-1',
      ]);
      expect(mockStmt.finalizeSync).toHaveBeenCalled();
    });
  });

  describe('updateInspectionStatus', () => {
    it('should update inspection status successfully', async () => {
      const mockStmt = {
        executeSync: jest.fn(),
        finalizeSync: jest.fn(),
      };
      mockDb.prepareSync.mockReturnValue(mockStmt);

      await inspectionDB.updateInspectionStatus('inspection-1', 'READY');

      expect(mockDb.prepareSync).toHaveBeenCalledWith(
        'UPDATE inspections SET status = ?, updated_at = ? WHERE id = ?'
      );
      expect(mockStmt.executeSync).toHaveBeenCalledWith([
        'READY',
        expect.any(Number), // updated_at
        'inspection-1',
      ]);
      expect(mockStmt.finalizeSync).toHaveBeenCalled();
    });
  });
}); 