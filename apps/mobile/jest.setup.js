// Mock expo modules
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  },
  CameraView: 'CameraView',
}));

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    Recording: {
      createAsync: jest.fn(() => Promise.resolve({ recording: { stopAndUnloadAsync: jest.fn(), getURI: jest.fn(() => 'file://test.m4a') } })),
      RecordingOptionsPresets: {
        HIGH_QUALITY: {},
      },
    },
  },
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://test-dir/',
  moveAsync: jest.fn(() => Promise.resolve()),
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}; 