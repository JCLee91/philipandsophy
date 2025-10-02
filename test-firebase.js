// Simple Firebase test script
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testWrite() {
  try {
    console.log('🧪 Testing simple write to Firestore...');

    const testData = {
      name: 'Test Cohort',
      accessCode: '9999',
      startDate: '2025-10-01',
      endDate: '2025-10-14',
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    console.log('📝 Data to write:', JSON.stringify(testData, null, 2));

    const testRef = doc(db, 'cohorts', 'test');
    await setDoc(testRef, testData);

    console.log('✅ Test write successful!');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
  }
}

testWrite();
