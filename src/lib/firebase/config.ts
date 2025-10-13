import { getAuth, Auth } from 'firebase/auth';

/**
 * Firebase Configuration
 * Contains Firebase project credentials from environment variables
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Firebase Auth Instance
 *
 * IMPORTANT: This must be called AFTER Firebase app initialization.
 * Use getAuthInstance() instead of directly accessing this.
 */
let authInstance: Auth | null = null;

/**
 * Get Firebase Auth instance
 *
 * @returns Firebase Auth instance (initialized lazily)
 * @throws Error if Firebase app is not initialized
 */
export function getAuthInstance(): Auth {
  if (!authInstance) {
    try {
      authInstance = getAuth();
    } catch (error) {
      throw new Error('Firebase app must be initialized before accessing Auth. Call initializeFirebase() first.');
    }
  }
  return authInstance;
}
