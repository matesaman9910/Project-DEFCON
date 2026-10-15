// Firebase WEB configuration. These values are public by design.
// Copy the exact values from Firebase Console > Project settings > Your apps > Config.
window.DEFCON_FIREBASE_CONFIG = {
  apiKey: "PASTE_FIREBASE_WEB_API_KEY",
  authDomain: "PASTE_AUTH_DOMAIN",
  databaseURL: "https://project-defcon-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "project-defcon",
  storageBucket: "PASTE_STORAGE_BUCKET",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID",
  appId: "PASTE_APP_ID"
};

// After your first Google sign-in, copy your UID displayed in the admin panel.
// This browser-side check is ONLY for user experience; Firebase Rules protect writes.
window.DEFCON_ADMIN_UID = "PASTE_YOUR_FIREBASE_UID";
