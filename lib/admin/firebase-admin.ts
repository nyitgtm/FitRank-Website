import admin from 'firebase-admin';

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase Admin credentials:', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey
    });
    throw new Error(
      'Firebase Admin credentials are not properly configured. ' +
      'Please check your environment variables and ensure FIREBASE_PROJECT_ID, ' +
      'FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set correctly.'
    );
  }

  try {
    // Handle different formats of private key
    // Netlify might strip quotes, so we need to handle both cases
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      // Remove surrounding quotes if present
      privateKey = privateKey.slice(1, -1);
    }
    
    // Replace literal \n with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

export function getAdminAuth() {
  const app = initializeFirebaseAdmin();
  return admin.auth(app);
}

export default initializeFirebaseAdmin;
