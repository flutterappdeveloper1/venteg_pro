importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Config object parsed from firebase-applet-config
// This registers messaging in the background for receiving push alerts
firebase.initializeApp({
  apiKey: "AIzaSyDHanhcy5-MMPxnNzJZ_F8nXRPQZN1_Ekc",
  authDomain: "venteg.firebaseapp.com",
  projectId: "venteg",
  messagingSenderId: "286335833550",
  appId: "1:286335833550:web:76dea2fd643b39dced079f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'venteg আপডেট';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
