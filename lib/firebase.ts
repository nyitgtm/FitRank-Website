import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDWWFgBmEv9nROrVErXMXl23otaZwk7FZU",
  authDomain: "fitrank-86c36.firebaseapp.com",
  projectId: "fitrank-86c36",
  storageBucket: "fitrank-86c36.firebasestorage.app",
  messagingSenderId: "406436820553",
  appId: "1:406436820553:web:c14c1f3cc99ebfad633198"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
