import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const serviceAccount = {
  // Your service account credentials should be added here
  // Get this from Firebase Console -> Project Settings -> Service Accounts
};

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'dentalimage-f9a18.appspot.com'
});

const bucket = getStorage().bucket();

async function configureCORS() {
  try {
    await bucket.setCorsConfiguration([
      {
        origin: ['https://bolt.new/~/sb1-a1jtgn'],
        method: ['GET', 'POST', 'PUT', 'DELETE'],
        maxAgeSeconds: 3600,
        responseHeader: [
          'Content-Type',
          'Access-Control-Allow-Origin',
          'Authorization',
          'Content-Length',
          'User-Agent',
          'x-goog-resumable'
        ]
      }
    ]);
    console.log('CORS configuration updated successfully');
  } catch (error) {
    console.error('Error updating CORS configuration:', error);
  }
}

configureCORS();