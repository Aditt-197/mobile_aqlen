import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "<api_key>" // get from gcp firebase portal,
  authDomain: "aqlen-465501.firebaseapp.com",
  projectId: "aqlen-465501",
  storageBucket: "aqlen-465501.firebasestorage.app",
  messagingSenderId: "558704628076",
  appId: "1:558704628076:web:f003beb1555ac9f95ea349",
  measurementId: "G-Q3KBQL84W0"
};

console.log('Initializing Firebase with config:', {
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const firestore = getFirestore(app, 'aqlen-db');

// Enable Firestore logging in development
if (__DEV__) {
  console.log('Development mode: Firestore logging enabled');
}

console.log('Firebase initialized successfully');
console.log('Firestore instance created with database: aqlen-db');

export { storage, firestore };
export default app;