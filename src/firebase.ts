import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// VAPID Public Key for Web Push Notifications requested by user
export const VAPID_KEY = 'BHnOlNZqE0u1UP0kWvu4Oa0gF5ds55aRfOkPMBkIh5YIDXUVpaXPcaksOj0MGsvktgNLX2bU-mVGgwI3E4oli3k';

// Safe lazy loading of Firebase Messaging
export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    if (await isSupported()) {
      return getMessaging(app);
    }
  } catch (err) {
    console.warn('Firebase Messaging is not supported in this environment/browser.', err);
  }
  return null;
};

