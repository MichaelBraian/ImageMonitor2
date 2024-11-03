import { initializeApp } from 'firebase/app';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { config } from 'dotenv';

// Load environment variables
config();

// Validate environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} environment variable is not set`);
    process.exit(1);
  }
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

console.log(`
CORS Configuration Instructions:

1. Go to Firebase Console (https://console.firebase.google.com)
2. Select your project: ${process.env.VITE_FIREBASE_PROJECT_ID}
3. Go to Storage > Rules
4. Add the following CORS configuration to your bucket:

gsutil cors set cors.json gs://${process.env.VITE_FIREBASE_STORAGE_BUCKET}

Create a cors.json file with:

[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers",
      "Access-Control-Max-Age",
      "Access-Control-Allow-Credentials",
      "Authorization",
      "Content-Length",
      "User-Agent",
      "x-goog-resumable",
      "Content-Disposition",
      "Accept",
      "Origin",
      "Cache-Control",
      "If-Match",
      "If-None-Match",
      "If-Modified-Since",
      "If-Unmodified-Since",
      "Range"
    ]
  }
]

5. Run this command in Google Cloud Console or local terminal with gcloud CLI:
   gsutil cors set cors.json gs://${process.env.VITE_FIREBASE_STORAGE_BUCKET}

Note: You'll need appropriate permissions to set CORS configuration.
`);

// Create cors.json file
const corsConfig = {
  origin: ['*'],
  method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  maxAgeSeconds: 3600,
  responseHeader: [
    'Content-Type',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Headers',
    'Access-Control-Max-Age',
    'Access-Control-Allow-Credentials',
    'Authorization',
    'Content-Length',
    'User-Agent',
    'x-goog-resumable',
    'Content-Disposition',
    'Accept',
    'Origin',
    'Cache-Control',
    'If-Match',
    'If-None-Match',
    'If-Modified-Since',
    'If-Unmodified-Since',
    'Range'
  ]
};